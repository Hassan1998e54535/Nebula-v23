// SPDX-License-Identifier: Nebula

import {
	fetchGamingProfile,
	saveGamingProfile,
	startGamingActivity,
	stopGamingActivity,
} from '@app/features/gaming/GamingClient';
import type {GamingEntry} from '@app/features/gaming/GamingTypes';
import {getElectronAPI} from '@app/features/ui/utils/NativeUtils';
import {useEffect} from 'react';

const STORAGE_PREFIX = 'nexus:gaming:active:';
const DETECTION_STORAGE_PREFIX = 'nexus:gaming:detection:';
const DETECTION_SETTINGS_CHANGED_EVENT = 'nexus:gaming:detection-settings-changed';
const MAX_RESUME_AGE_MS = 120_000;
const HEARTBEAT_INTERVAL_MS = 45_000;
const DETECTION_INTERVAL_MS = 15_000;

interface RunningHeartbeat {
	timer: number;
	detectionTimer: number;
	subscribers: number;
	settingsChangedHandler: () => void;
}

const running = new Map<string, RunningHeartbeat>();
const detectionInFlight = new Set<string>();

export interface GamingProcessRegistration {
	game: GamingEntry;
	process_name: string;
}

export interface GamingDetectionPreferences {
	enabled: boolean;
	registrations: Array<GamingProcessRegistration>;
	suppressed_process_names: Array<string>;
	suppressed_game_ids: Array<string>;
	suppressed_game_names: Array<string>;
}

interface StoredGamingActivity {
	game: GamingEntry;
	shareWithGuilds: boolean;
	startedAt: string;
	updatedAt: number;
	source?: 'manual' | 'auto';
}

function normalizeProcessName(value: string): string {
	return value.trim().replace(/^"|"$/g, '').split(/[\\/]/).at(-1)?.toLocaleLowerCase() ?? '';
}

function normalizeGameTitle(value: string): string {
	return value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
}

function detectionKey(userId: string): string {
	return `${DETECTION_STORAGE_PREFIX}${userId}`;
}

function readStoredActivity(userId: string): StoredGamingActivity | null {
	try {
		const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
		if (!raw) return null;
		const stored = JSON.parse(raw) as Partial<StoredGamingActivity>;
		if (
			typeof stored.game?.id !== 'string' ||
			typeof stored.game.name !== 'string' ||
			typeof stored.game.platform !== 'string' ||
			typeof stored.shareWithGuilds !== 'boolean' ||
			typeof stored.startedAt !== 'string' ||
			typeof stored.updatedAt !== 'number'
		) {
			return null;
		}
		return stored as StoredGamingActivity;
	} catch {
		return null;
	}
}

export function getGamingDetectionPreferences(userId: string): GamingDetectionPreferences {
	try {
		const raw = window.localStorage.getItem(detectionKey(userId));
		if (!raw) {
			return {
				enabled: false,
				registrations: [],
				suppressed_process_names: [],
				suppressed_game_ids: [],
				suppressed_game_names: [],
			};
		}
		const parsed = JSON.parse(raw) as Partial<GamingDetectionPreferences>;
		const registrations = Array.isArray(parsed.registrations)
			? parsed.registrations.filter(
					(registration): registration is GamingProcessRegistration =>
						typeof registration?.game?.id === 'string' &&
						typeof registration.game.name === 'string' &&
						typeof registration.process_name === 'string' &&
						normalizeProcessName(registration.process_name).length > 0,
				)
			: [];
		return {
			enabled: parsed.enabled === true,
			registrations,
			suppressed_process_names: Array.isArray(parsed.suppressed_process_names)
				? parsed.suppressed_process_names
						.filter((name): name is string => typeof name === 'string')
						.map(normalizeProcessName)
						.filter(Boolean)
				: [],
			suppressed_game_ids: Array.isArray(parsed.suppressed_game_ids)
				? [...new Set(parsed.suppressed_game_ids.filter((id): id is string => typeof id === 'string' && id.trim()))]
				: [],
			suppressed_game_names: Array.isArray(parsed.suppressed_game_names)
				? [
						...new Set(
							parsed.suppressed_game_names
								.filter((name): name is string => typeof name === 'string')
								.map(normalizeGameTitle)
								.filter(Boolean),
						),
					]
				: [],
		};
	} catch {
		return {
			enabled: false,
			registrations: [],
			suppressed_process_names: [],
			suppressed_game_ids: [],
			suppressed_game_names: [],
		};
	}
}

export function saveGamingDetectionPreferences(userId: string, preferences: GamingDetectionPreferences): boolean {
	try {
		const registrations = preferences.registrations
			.map((registration) => ({
				game: registration.game,
				process_name: normalizeProcessName(registration.process_name),
			}))
			.filter((registration) => registration.process_name.length > 0);
		const suppressed_process_names = [
			...new Set(preferences.suppressed_process_names.map(normalizeProcessName).filter(Boolean)),
		];
		const suppressed_game_ids = [...new Set(preferences.suppressed_game_ids.map((id) => id.trim()).filter(Boolean))];
		const suppressed_game_names = [
			...new Set(preferences.suppressed_game_names.map(normalizeGameTitle).filter(Boolean)),
		];
		window.localStorage.setItem(
			detectionKey(userId),
			JSON.stringify({
				...preferences,
				registrations,
				suppressed_process_names,
				suppressed_game_ids,
				suppressed_game_names,
			}),
		);
		window.dispatchEvent(new Event(DETECTION_SETTINGS_CHANGED_EVENT));
		return true;
	} catch {
		return false;
	}
}

export function removeGamingProcessRegistration(userId: string, gameId: string): boolean {
	const preferences = getGamingDetectionPreferences(userId);
	return saveGamingDetectionPreferences(userId, {
		...preferences,
		registrations: preferences.registrations.filter((registration) => registration.game.id !== gameId),
	});
}

export function suppressGamingProcessForGame(userId: string, gameId: string, gameName?: string): boolean {
	const preferences = getGamingDetectionPreferences(userId);
	const processNames = preferences.registrations
		.filter((registration) => registration.game.id === gameId)
		.map((registration) => registration.process_name);
	if (processNames.length === 0) return true;
	return saveGamingDetectionPreferences(userId, {
		...preferences,
		suppressed_process_names: [...preferences.suppressed_process_names, ...processNames],
		suppressed_game_ids: [...preferences.suppressed_game_ids, gameId],
		suppressed_game_names: [...preferences.suppressed_game_names, ...(gameName ? [gameName] : [])],
	});
}

export function storeGamingActivity(
	userId: string,
	game: GamingEntry,
	shareWithGuilds: boolean,
	startedAt: string,
	source?: 'manual' | 'auto',
): void {
	try {
		const existing = readStoredActivity(userId);
		const value: StoredGamingActivity = {
			game,
			shareWithGuilds,
			startedAt,
			updatedAt: Date.now(),
			source: source ?? (existing?.game.id === game.id && existing.source === 'auto' ? 'auto' : 'manual'),
		};
		window.localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(value));
		window.dispatchEvent(new CustomEvent('nexus:gaming:activity-changed', {detail: value}));
	} catch {
		// Private browsing may disable local storage; the initial API request still succeeds.
	}
}

export function clearStoredGamingActivity(userId: string): void {
	try {
		window.localStorage.removeItem(`${STORAGE_PREFIX}${userId}`);
		window.dispatchEvent(new CustomEvent('nexus:gaming:activity-changed', {detail: null}));
	} catch {
		// Ignore unavailable local storage.
	}
}

function heartbeat(userId: string): void {
	try {
		const key = `${STORAGE_PREFIX}${userId}`;
		const stored = readStoredActivity(userId);
		if (!stored) return;
		if (Date.now() - stored.updatedAt > MAX_RESUME_AGE_MS) {
			window.localStorage.removeItem(key);
			return;
		}
		if (stored.source === 'auto' && !getElectronAPI()?.getRunningGameProcessNames) return;
		stored.updatedAt = Date.now();
		window.localStorage.setItem(key, JSON.stringify(stored));
		void startGamingActivity(stored.game, stored.shareWithGuilds).catch(() => undefined);
	} catch {
		// A malformed or unavailable local record must not interrupt the application shell.
	}
}

export const KNOWN_GAME_PROCESSES_MAP: Record<string, {id: string; name: string}> = {
	'arcraiders.exe': {id: 'arc-raiders', name: 'ARC Raiders'},
	'arcraiders-win64-shipping.exe': {id: 'arc-raiders', name: 'ARC Raiders'},
	'pioneer.exe': {id: 'arc-raiders', name: 'ARC Raiders'},
	'pioneer-win64-shipping.exe': {id: 'arc-raiders', name: 'ARC Raiders'},
	'discovery.exe': {id: 'the-finals', name: 'THE FINALS'},
	'discovery-win64-shipping.exe': {id: 'the-finals', name: 'THE FINALS'},
	'robrun.exe': {id: 'rob-run', name: 'ROB RUN'},
	'robrun-win64-shipping.exe': {id: 'rob-run', name: 'ROB RUN'},
	'soundpad.exe': {id: 'soundpad', name: 'Soundpad'},
	'blender.exe': {id: 'blender', name: 'Blender'},
	'wallpaper32.exe': {id: 'wallpaper-engine', name: 'Wallpaper Engine'},
	'wallpaper64.exe': {id: 'wallpaper-engine', name: 'Wallpaper Engine'},
	'beamng.drive.x64.exe': {id: 'beamng-drive', name: 'BeamNG.drive'},
	'beamng.drive.exe': {id: 'beamng-drive', name: 'BeamNG.drive'},
	'cs2.exe': {id: 'cs2', name: 'Counter-Strike 2'},
	'csgo.exe': {id: 'csgo', name: 'Counter-Strike: Global Offensive'},
	'gta5.exe': {id: 'gta5', name: 'Grand Theft Auto V'},
	'gtav.exe': {id: 'gta5', name: 'Grand Theft Auto V'},
	'playgtav.exe': {id: 'gta5', name: 'Grand Theft Auto V'},
	'cod.exe': {id: 'cod', name: 'Call of Duty'},
	'modernwarfare.exe': {id: 'cod-mw', name: 'Call of Duty: Modern Warfare'},
	'blackops6.exe': {id: 'cod-bo6', name: 'Call of Duty: Black Ops 6'},
	'bootstrapper.exe': {id: 'cod', name: 'Call of Duty'},
	'fc25.exe': {id: 'ea-fc-25', name: 'EA SPORTS FC 25'},
	'eafc25.exe': {id: 'ea-fc-25', name: 'EA SPORTS FC 25'},
	'fc24.exe': {id: 'ea-fc-24', name: 'EA SPORTS FC 24'},
	'eafc24.exe': {id: 'ea-fc-24', name: 'EA SPORTS FC 24'},
	'fifa23.exe': {id: 'fifa-23', name: 'FIFA 23'},
	'fifa22.exe': {id: 'fifa-22', name: 'FIFA 22'},
	'fifa21.exe': {id: 'fifa-21', name: 'FIFA 21'},
	'bodycam.exe': {id: 'bodycam', name: 'Bodycam'},
	'bodycam-win64-shipping.exe': {id: 'bodycam', name: 'Bodycam'},
	'acs.exe': {id: 'assetto-corsa', name: 'Assetto Corsa'},
	'assettocorsa.exe': {id: 'assetto-corsa', name: 'Assetto Corsa'},
	'ac2-win64-shipping.exe': {id: 'assetto-corsa-evo', name: 'Assetto Corsa EVO'},
	'fortniteclient-win64-shipping.exe': {id: 'fortnite', name: 'Fortnite'},
	'valorant-win64-shipping.exe': {id: 'valorant', name: 'VALORANT'},
	'valorant.exe': {id: 'valorant', name: 'VALORANT'},
	'robloxplayerbeta.exe': {id: 'roblox', name: 'Roblox'},
	'robloxplayerlauncher.exe': {id: 'roblox', name: 'Roblox'},
	'javaw.exe': {id: 'minecraft', name: 'Minecraft'},
	'minecraft.exe': {id: 'minecraft', name: 'Minecraft'},
	'leagueclient.exe': {id: 'league-of-legends', name: 'League of Legends'},
	'leagueclientux.exe': {id: 'league-of-legends', name: 'League of Legends'},
	'league of legends.exe': {id: 'league-of-legends', name: 'League of Legends'},
	'rocketleague.exe': {id: 'rocket-league', name: 'Rocket League'},
	'overwatch.exe': {id: 'overwatch-2', name: 'Overwatch 2'},
	'r5apex.exe': {id: 'apex-legends', name: 'Apex Legends'},
	'tslgame.exe': {id: 'pubg', name: 'PUBG: BATTLEGROUNDS'},
	'genshinimpact.exe': {id: 'genshin-impact', name: 'Genshin Impact'},
	'cyberpunk2077.exe': {id: 'cyberpunk-2077', name: 'Cyberpunk 2077'},
	'eurotrucks2.exe': {id: 'euro-truck-simulator-2', name: 'Euro Truck Simulator 2'},
	'forzahorizon5.exe': {id: 'forza-horizon-5', name: 'Forza Horizon 5'},
	'dota2.exe': {id: 'dota-2', name: 'Dota 2'},
	'rainbowsix.exe': {id: 'rainbow-six-siege', name: "Tom Clancy's Rainbow Six Siege"},
	'destiny2.exe': {id: 'destiny-2', name: 'Destiny 2'},
	'rustclient.exe': {id: 'rust', name: 'Rust'},
	'palworld-win64-shipping.exe': {id: 'palworld', name: 'Palworld'},
	'helldivers2.exe': {id: 'helldivers-2', name: 'HELLDIVERS 2'},
};

async function reconcileDetectedGame(userId: string): Promise<void> {
	const electronApi = getElectronAPI();
	if (!electronApi?.getRunningGameProcessNames || detectionInFlight.has(userId)) return;
	detectionInFlight.add(userId);

	try {
		const preferences = getGamingDetectionPreferences(userId);
		const currentActivity = readStoredActivity(userId);
		if (!preferences.enabled) {
			if (currentActivity?.source === 'auto') {
				await stopGamingActivity();
				clearStoredGamingActivity(userId);
			}
			return;
		}

		const rawProcesses = (await electronApi.getRunningGameProcessNames()) ?? [];
		const runningProcessNamesList = rawProcesses.map(normalizeProcessName).filter(Boolean);
		const runningProcessNames = new Set(runningProcessNamesList);

		const knownGamesDetected: Array<GamingEntry> = [];
		for (const proc of runningProcessNamesList) {
			const known = KNOWN_GAME_PROCESSES_MAP[proc];
			if (known && !knownGamesDetected.some((g) => g.id === known.id)) {
				knownGamesDetected.push({id: known.id, name: known.name, platform: 'computer'});
			}
		}

		let runningSteamGames: Array<GamingEntry> = [];
		try {
			runningSteamGames = (await electronApi.getRunningSteamGames?.()) ?? [];
		} catch {
			// A Steam path scan failure must not disable manual process registrations.
		}
		const suppressedProcessNames = new Set(preferences.suppressed_process_names);
		const stillSuppressed = [...suppressedProcessNames].filter((name) => runningProcessNames.has(name));
		const gameRegistration = preferences.registrations.find(
			(registration) =>
				runningProcessNames.has(normalizeProcessName(registration.process_name)) &&
				!suppressedProcessNames.has(normalizeProcessName(registration.process_name)),
		);
		const runningGames = [
			...(gameRegistration ? [gameRegistration.game] : []),
			...knownGamesDetected,
			...runningSteamGames,
		];
		const runningGameIds = new Set(runningGames.map((game) => game.id));
		const runningGameNames = new Set(runningGames.map((game) => normalizeGameTitle(game.name)));
		const stillSuppressedGameIds = preferences.suppressed_game_ids.filter((id) => runningGameIds.has(id));
		const stillSuppressedGameNames = preferences.suppressed_game_names.filter((name) => runningGameNames.has(name));
		if (
			stillSuppressed.length !== preferences.suppressed_process_names.length ||
			stillSuppressedGameIds.length !== preferences.suppressed_game_ids.length ||
			stillSuppressedGameNames.length !== preferences.suppressed_game_names.length
		) {
			saveGamingDetectionPreferences(userId, {
				...preferences,
				suppressed_process_names: stillSuppressed,
				suppressed_game_ids: stillSuppressedGameIds,
				suppressed_game_names: stillSuppressedGameNames,
			});
		}

		const suppressedGameIds = new Set(stillSuppressedGameIds);
		const suppressedGameNames = new Set(stillSuppressedGameNames);
		const eligibleGames = runningGames.filter(
			(game) => !suppressedGameIds.has(game.id) && !suppressedGameNames.has(normalizeGameTitle(game.name)),
		);
		const detectedGame = eligibleGames.find((game) => game.id === currentActivity?.game.id) ?? eligibleGames[0];

		if (detectedGame) {
			if (currentActivity?.game.id === detectedGame.id) {
				if (currentActivity.source !== 'auto') return;
				currentActivity.updatedAt = Date.now();
				window.localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(currentActivity));
				return;
			}

			let profile = await fetchGamingProfile();
			const existingGame = profile.games.find(
				(game) =>
					game.id === detectedGame.id || normalizeGameTitle(game.name) === normalizeGameTitle(detectedGame.name),
			);
			const game = existingGame ?? detectedGame;
			const shareWithGuilds = profile.share_with_guilds;
			if (!existingGame) {
				profile = await saveGamingProfile([...profile.games, game], shareWithGuilds);
			}
			const next = await startGamingActivity(game, shareWithGuilds);
			storeGamingActivity(userId, game, shareWithGuilds, next.activity?.started_at ?? new Date().toISOString(), 'auto');
			return;
		}

		if (currentActivity?.source === 'auto') {
			await stopGamingActivity();
			clearStoredGamingActivity(userId);
		}
	} catch {
		// A temporary local process or network failure must not interrupt NEXUS.
	} finally {
		detectionInFlight.delete(userId);
	}
}

export function useGamingPresenceHeartbeat(userId: string): void {
	useEffect(() => {
		const existing = running.get(userId);
		if (existing) {
			existing.subscribers += 1;
			return () => {
				existing.subscribers -= 1;
				if (existing.subscribers <= 0) {
					window.clearInterval(existing.timer);
					window.clearInterval(existing.detectionTimer);
					window.removeEventListener(DETECTION_SETTINGS_CHANGED_EVENT, existing.settingsChangedHandler);
					running.delete(userId);
				}
			};
		}

		heartbeat(userId);
		const timer = window.setInterval(() => heartbeat(userId), HEARTBEAT_INTERVAL_MS);
		const detectionTimer = window.setInterval(() => void reconcileDetectedGame(userId), DETECTION_INTERVAL_MS);
		const settingsChangedHandler = () => void reconcileDetectedGame(userId);
		window.addEventListener(DETECTION_SETTINGS_CHANGED_EVENT, settingsChangedHandler);
		void reconcileDetectedGame(userId);
		const entry = {timer, detectionTimer, subscribers: 1, settingsChangedHandler};
		running.set(userId, entry);
		return () => {
			entry.subscribers -= 1;
			if (entry.subscribers <= 0) {
				window.clearInterval(entry.timer);
				window.clearInterval(entry.detectionTimer);
				window.removeEventListener(DETECTION_SETTINGS_CHANGED_EVENT, entry.settingsChangedHandler);
				running.delete(userId);
			}
		};
	}, [userId]);
}

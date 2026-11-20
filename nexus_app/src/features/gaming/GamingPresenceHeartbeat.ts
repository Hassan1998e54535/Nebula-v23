// SPDX-License-Identifier: Nebula

import {
	fetchGamingProfile,
	saveGamingProfile,
	startGamingActivity,
	stopGamingActivity,
} from '@app/features/gaming/GamingClient';
import type {GamingEntry} from '@app/features/gaming/GamingTypes';
import {getProtectedLocalStorage} from '@app/features/platform/state/ProtectedWebStorage';
import {getElectronAPI} from '@app/features/ui/utils/NativeUtils';
import {useEffect} from 'react';

const memoryStorageFallback = new Map<string, string>();

function readGamingStorage(key: string): string | null {
	try {
		const storage = getProtectedLocalStorage() ?? (typeof window !== 'undefined' ? window.localStorage ?? null : null);
		if (storage != null) {
			return storage.getItem(key) ?? memoryStorageFallback.get(key) ?? null;
		}
	} catch {}
	return memoryStorageFallback.get(key) ?? null;
}

function writeGamingStorage(key: string, value: string): void {
	memoryStorageFallback.set(key, value);
	try {
		const storage = getProtectedLocalStorage() ?? (typeof window !== 'undefined' ? window.localStorage ?? null : null);
		storage?.setItem(key, value);
	} catch {}
}

function removeGamingStorage(key: string): void {
	memoryStorageFallback.delete(key);
	try {
		const storage = getProtectedLocalStorage() ?? (typeof window !== 'undefined' ? window.localStorage ?? null : null);
		storage?.removeItem(key);
	} catch {}
}

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

function normalizeProcessName(value?: string | null): string {
	if (!value || typeof value !== 'string') return '';
	return value.trim().replace(/^"|"$/g, '').split(/[\\/]/).at(-1)?.toLocaleLowerCase() ?? '';
}

function normalizeGameTitle(value?: string | null): string {
	if (!value || typeof value !== 'string') return '';
	return value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
}

function detectionKey(userId: string): string {
	return `${DETECTION_STORAGE_PREFIX}${userId}`;
}

function readStoredActivity(userId: string): StoredGamingActivity | null {
	try {
		const raw = readGamingStorage(`${STORAGE_PREFIX}${userId}`);
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
		const raw = readGamingStorage(detectionKey(userId));
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
		const registrations = (preferences?.registrations ?? [])
			.map((registration) => ({
				game: registration.game,
				process_name: normalizeProcessName(registration?.process_name),
			}))
			.filter((registration) => registration.process_name.length > 0);
		const suppressed_process_names = [
			...new Set((preferences?.suppressed_process_names ?? []).map(normalizeProcessName).filter(Boolean)),
		];
		const suppressed_game_ids = [
			...new Set(
				(preferences?.suppressed_game_ids ?? [])
					.map((id) => (typeof id === 'string' ? id.trim() : ''))
					.filter(Boolean),
			),
		];
		const suppressed_game_names = [
			...new Set((preferences?.suppressed_game_names ?? []).map(normalizeGameTitle).filter(Boolean)),
		];
		writeGamingStorage(
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
		writeGamingStorage(`${STORAGE_PREFIX}${userId}`, JSON.stringify(value));
		window.dispatchEvent(new CustomEvent('nexus:gaming:activity-changed', {detail: value}));
	} catch {
		// Private browsing may disable local storage; the initial API request still succeeds.
	}
}

export function clearStoredGamingActivity(userId: string): void {
	try {
		removeGamingStorage(`${STORAGE_PREFIX}${userId}`);
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
			removeGamingStorage(key);
			return;
		}
		const electronApi = getElectronAPI();
		if (stored.source === 'auto' && !electronApi?.getRunningGameProcessNames && !electronApi?.getRunningSteamGames) {
			return;
		}
		stored.updatedAt = Date.now();
		writeGamingStorage(key, JSON.stringify(stored));
		void startGamingActivity(stored.game, stored.shareWithGuilds).catch(() => undefined);
	} catch {
		// A malformed or unavailable local record must not interrupt the application shell.
	}
}

async function reconcileDetectedGame(userId: string): Promise<void> {
	const electronApi = getElectronAPI();
	if (
		(!electronApi?.getRunningGameProcessNames && !electronApi?.getRunningSteamGames) ||
		detectionInFlight.has(userId)
	) {
		return;
	}
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

		let rawProcesses: Array<string> = [];
		try {
			rawProcesses = (await electronApi.getRunningGameProcessNames?.()) ?? [];
		} catch {
			// Continue with the independent installed-game-path scan below.
		}
		const runningProcessNamesList = rawProcesses.map(normalizeProcessName).filter(Boolean);
		const runningProcessNames = new Set(runningProcessNamesList);

		let runningSteamGames: Array<GamingEntry> = [];
		try {
			runningSteamGames = (await electronApi.getRunningSteamGames?.()) ?? [];
		} catch {
			// A Steam path scan failure must not disable manually linked processes.
		}
		const suppressedProcessNames = new Set(preferences.suppressed_process_names);
		const stillSuppressed = [...suppressedProcessNames].filter((name) => runningProcessNames.has(name));
		const gameRegistration = preferences.registrations.find(
			(registration) =>
				runningProcessNames.has(normalizeProcessName(registration.process_name)) &&
				!suppressedProcessNames.has(normalizeProcessName(registration.process_name)),
		);
		const runningGames = [...(gameRegistration ? [gameRegistration.game] : []), ...runningSteamGames];
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
				writeGamingStorage(`${STORAGE_PREFIX}${userId}`, JSON.stringify(currentActivity));
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

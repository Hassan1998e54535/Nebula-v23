// SPDX-License-Identifier: Nebula

import {execFile} from 'node:child_process';
import {existsSync, readdirSync, readFileSync, readlinkSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {promisify} from 'node:util';

const execFileAsync = promisify(execFile);
const MAX_PROCESS_OUTPUT_BYTES = 1024 * 1024;
const MAX_PROCESS_NAMES = 1000;
const MAX_PROCESS_PATH_OUTPUT_BYTES = 4 * 1024 * 1024;
const STEAM_LIBRARY_CACHE_MS = 30_000;
const IGNORED_PROCESS_NAMES = new Set([
	'crashpad_handler',
	'crashpad_handler.exe',
	'electron',
	'electron.exe',
	'nexus',
	'nexus.exe',
]);

export interface SteamInstallation {
	appId: string;
	name: string;
	installDirectory: string;
}

export interface RunningSteamGame {
	id: string;
	name: string;
	platform: 'computer';
}

type VdfValue = string | {[key: string]: VdfValue};

let steamInstallationsCache: {expiresAt: number; installations: Array<SteamInstallation>} | null = null;
let steamInstallationsInFlight: Promise<Array<SteamInstallation>> | null = null;

function normalizeProcessName(value: string): string {
	return path.basename(value.trim().replace(/^"|"$/g, '')).toLocaleLowerCase();
}

function decodeVdfToken(token: string): string {
	if (!token.startsWith('"')) return token;
	try {
		return JSON.parse(token) as string;
	} catch {
		return token.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
	}
}

function parseVdfObject(tokens: Array<string>, startIndex: number): [Record<string, VdfValue>, number] {
	const object: Record<string, VdfValue> = {};
	let index = startIndex;

	while (index < tokens.length) {
		const keyToken = tokens[index++];
		if (keyToken === '}') return [object, index];
		if (keyToken === '{') continue;

		const valueToken = tokens[index++];
		if (valueToken == null || valueToken === '}') break;
		const key = decodeVdfToken(keyToken);
		if (valueToken === '{') {
			const [child, nextIndex] = parseVdfObject(tokens, index);
			object[key] = child;
			index = nextIndex;
		} else {
			object[key] = decodeVdfToken(valueToken);
		}
	}

	return [object, index];
}

function parseVdf(content: string): Record<string, VdfValue> {
	const tokens = content.replace(/^\s*\/\/.*$/gm, '').match(/"(?:\\.|[^"\\])*"|[{}]|[^\s{}]+/gu);
	if (!tokens) return {};
	return parseVdfObject(tokens, 0)[0];
}

export function parseSteamLibraryPaths(content: string, mainSteamPath: string): Array<string> {
	const parsed = parseVdf(content);
	const libraryFolders = parsed.libraryfolders ?? parsed.LibraryFolders ?? parsed;
	if (typeof libraryFolders !== 'object') return mainSteamPath ? [mainSteamPath] : [];

	const paths = new Set<string>();
	if (mainSteamPath.trim()) paths.add(path.normalize(mainSteamPath.trim()));
	for (const [key, value] of Object.entries(libraryFolders)) {
		if (/^\d+$/u.test(key) && typeof value === 'string' && value.trim()) {
			paths.add(path.normalize(value.trim()));
			continue;
		}
		if (typeof value === 'object' && typeof value.path === 'string' && value.path.trim()) {
			paths.add(path.normalize(value.path.trim()));
		}
	}
	return [...paths];
}

export function parseSteamAppManifest(content: string): {name: string; installDir: string} | null {
	const parsed = parseVdf(content);
	const appState = parsed.AppState ?? parsed.appstate;
	if (typeof appState !== 'object') return null;
	const rawName = appState.name;
	const rawInstallDir = appState.installdir;
	if (typeof rawName !== 'string' || typeof rawInstallDir !== 'string') return null;
	const name = rawName.trim();
	const installDir = rawInstallDir.trim();
	if (!name || !installDir || /\p{Cc}/u.test(name) || /\p{Cc}/u.test(installDir)) return null;
	return {name, installDir};
}

function isPathWithinDirectory(directory: string, candidatePath: string): boolean {
	const relativePath = path.relative(path.resolve(directory), path.resolve(candidatePath));
	const comparable = process.platform === 'win32' ? relativePath.toLocaleLowerCase() : relativePath;
	return (
		relativePath.length > 0 &&
		comparable !== '..' &&
		!comparable.startsWith(`..${path.sep}`) &&
		!path.isAbsolute(relativePath)
	);
}

export function findSteamInstallationForExecutable(
	executablePath: string,
	installations: Array<SteamInstallation>,
): SteamInstallation | null {
	return (
		installations
			.filter((installation) => isPathWithinDirectory(installation.installDirectory, executablePath))
			.sort((left, right) => right.installDirectory.length - left.installDirectory.length)[0] ?? null
	);
}

function parseWindowsCsvLine(line: string): string | null {
	let imageName = '';
	let inQuotes = false;

	for (let index = 0; index < line.length; index += 1) {
		const character = line[index];
		if (character === '"') {
			if (inQuotes && line[index + 1] === '"') {
				imageName += '"';
				index += 1;
			} else {
				inQuotes = !inQuotes;
			}
			continue;
		}
		if (character === ',' && !inQuotes) break;
		imageName += character;
	}

	const normalized = normalizeProcessName(imageName);
	return normalized && !IGNORED_PROCESS_NAMES.has(normalized) ? normalized : null;
}

function uniqueProcessNames(names: Array<string>): Array<string> {
	return [...new Set(names.map(normalizeProcessName).filter((name) => name && !IGNORED_PROCESS_NAMES.has(name)))]
		.sort((left, right) => left.localeCompare(right))
		.slice(0, MAX_PROCESS_NAMES);
}

export async function getRunningGameProcessNames(): Promise<Array<string>> {
	if (process.platform === 'win32') {
		const {stdout} = await execFileAsync('tasklist', ['/fo', 'csv', '/nh'], {
			windowsHide: true,
			maxBuffer: MAX_PROCESS_OUTPUT_BYTES,
		});
		return uniqueProcessNames(
			stdout
				.split(/\r?\n/)
				.map(parseWindowsCsvLine)
				.filter((name): name is string => name != null),
		);
	}

	const {stdout} = await execFileAsync('ps', ['-A', '-o', 'comm='], {
		maxBuffer: MAX_PROCESS_OUTPUT_BYTES,
	});
	return uniqueProcessNames(stdout.split(/\r?\n/));
}

async function getWindowsSteamRootFromRegistry(): Promise<string | null> {
	for (const key of ['HKCU\\Software\\Valve\\Steam', 'HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam']) {
		try {
			const {stdout} = await execFileAsync('reg.exe', ['query', key, '/v', 'SteamPath'], {
				windowsHide: true,
				maxBuffer: 64 * 1024,
				timeout: 5000,
			});
			const match = stdout.match(/^\s*SteamPath\s+REG_\w+\s+(.+?)\s*$/imu);
			if (match?.[1]) return match[1].trim();
		} catch {
			// Steam may be installed under the other registry hive or a default location.
		}
	}
	return null;
}

async function getSteamRootCandidates(): Promise<Array<string>> {
	const home = os.homedir();
	const candidates = new Set<string>();
	if (process.env.STEAM_PATH) candidates.add(process.env.STEAM_PATH);

	if (process.platform === 'win32') {
		const programFilesX86 = process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)';
		const programFiles = process.env.ProgramFiles ?? 'C:\\Program Files';
		candidates.add(path.join(programFilesX86, 'Steam'));
		candidates.add(path.join(programFiles, 'Steam'));
		const registryRoot = await getWindowsSteamRootFromRegistry();
		if (registryRoot) candidates.add(registryRoot);
	} else if (process.platform === 'linux') {
		candidates.add(path.join(home, '.steam', 'steam'));
		candidates.add(path.join(home, '.local', 'share', 'Steam'));
		candidates.add(path.join(home, '.var', 'app', 'com.valvesoftware.Steam', '.local', 'share', 'Steam'));
	} else if (process.platform === 'darwin') {
		candidates.add(path.join(home, 'Library', 'Application Support', 'Steam'));
	}

	return [...candidates].filter((candidate) => existsSync(candidate));
}

async function loadSteamInstallations(): Promise<Array<SteamInstallation>> {
	const steamRoots = await getSteamRootCandidates();
	const libraryRoots = new Set<string>();

	for (const steamRoot of steamRoots) {
		const libraryFoldersPath = path.join(steamRoot, 'steamapps', 'libraryfolders.vdf');
		if (existsSync(libraryFoldersPath)) {
			try {
				for (const libraryPath of parseSteamLibraryPaths(readFileSync(libraryFoldersPath, 'utf8'), steamRoot)) {
					if (existsSync(libraryPath)) libraryRoots.add(path.resolve(libraryPath));
				}
			} catch {
				libraryRoots.add(path.resolve(steamRoot));
			}
		} else {
			libraryRoots.add(path.resolve(steamRoot));
		}
	}

	const installations: Array<SteamInstallation> = [];
	for (const libraryRoot of libraryRoots) {
		const steamAppsDirectory = path.join(libraryRoot, 'steamapps');
		const commonDirectory = path.join(steamAppsDirectory, 'common');
		if (!existsSync(steamAppsDirectory) || !existsSync(commonDirectory)) continue;

		let manifestNames: Array<string>;
		try {
			manifestNames = readdirSync(steamAppsDirectory);
		} catch {
			continue;
		}

		for (const manifestName of manifestNames) {
			const appId = manifestName.match(/^appmanifest_(\d+)\.acf$/iu)?.[1];
			if (!appId) continue;
			try {
				const manifest = parseSteamAppManifest(readFileSync(path.join(steamAppsDirectory, manifestName), 'utf8'));
				if (!manifest) continue;
				const installDirectory = path.resolve(commonDirectory, manifest.installDir);
				if (!isPathWithinDirectory(commonDirectory, installDirectory) || !existsSync(installDirectory)) {
					continue;
				}
				installations.push({appId, name: manifest.name, installDirectory});
			} catch {
				// Ignore malformed manifests; other installed games remain detectable.
			}
		}
	}

	return installations;
}

async function getSteamInstallations(): Promise<Array<SteamInstallation>> {
	if (steamInstallationsCache && steamInstallationsCache.expiresAt > Date.now()) {
		return steamInstallationsCache.installations;
	}
	if (steamInstallationsInFlight) return steamInstallationsInFlight;

	steamInstallationsInFlight = loadSteamInstallations()
		.then((installations) => {
			steamInstallationsCache = {expiresAt: Date.now() + STEAM_LIBRARY_CACHE_MS, installations};
			return installations;
		})
		.finally(() => {
			steamInstallationsInFlight = null;
		});
	return steamInstallationsInFlight;
}

async function getRunningExecutablePaths(): Promise<Array<string>> {
	if (process.platform === 'win32') {
		const command =
			"$ErrorActionPreference='SilentlyContinue'; Get-CimInstance Win32_Process -Property ExecutablePath | ForEach-Object { if ($_.ExecutablePath) { $_.ExecutablePath } }";
		const {stdout} = await execFileAsync(
			'powershell.exe',
			['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command],
			{
				windowsHide: true,
				maxBuffer: MAX_PROCESS_PATH_OUTPUT_BYTES,
				timeout: 8000,
			},
		);
		return [
			...new Set(
				stdout
					.split(/\r?\n/u)
					.map((value) => value.trim())
					.filter((value) => path.isAbsolute(value)),
			),
		];
	}

	if (process.platform === 'linux') {
		const executablePaths = new Set<string>();
		for (const processId of readdirSync('/proc').filter((entry) => /^\d+$/u.test(entry))) {
			try {
				const executablePath = readlinkSync(path.join('/proc', processId, 'exe'));
				if (path.isAbsolute(executablePath) && !executablePath.endsWith(' (deleted)')) {
					executablePaths.add(executablePath);
				}
			} catch {
				// Processes may exit between enumeration and reading their executable link.
			}
		}
		return [...executablePaths];
	}

	return [];
}

export const KNOWN_GAME_PROCESSES: Record<string, {name: string; id: string}> = {
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

export async function getRunningSteamGames(): Promise<Array<RunningSteamGame>> {
	if (process.platform !== 'win32' && process.platform !== 'linux') return [];

	const runningGames = new Map<string, RunningSteamGame>();

	try {
		const processNames = await getRunningGameProcessNames();
		for (const name of processNames) {
			const lower = normalizeProcessName(name);
			const known = KNOWN_GAME_PROCESSES[lower];
			if (known && !runningGames.has(known.id)) {
				runningGames.set(known.id, {
					id: known.id,
					name: known.name,
					platform: 'computer',
				});
			}
		}
	} catch {
		// Ignore process scan error
	}

	try {
		const [installations, executablePaths] = await Promise.all([getSteamInstallations(), getRunningExecutablePaths()]);
		for (const executablePath of executablePaths) {
			const baseName = path.basename(executablePath).toLowerCase();
			const known = KNOWN_GAME_PROCESSES[baseName];
			if (known && !runningGames.has(known.id)) {
				runningGames.set(known.id, {
					id: known.id,
					name: known.name,
					platform: 'computer',
				});
				continue;
			}

			const installation = findSteamInstallationForExecutable(executablePath, installations);
			if (!installation) continue;
			if (process.platform === 'linux' && /^(?:proton(?:\s|$)|steam linux runtime)/iu.test(installation.name)) {
				continue;
			}
			runningGames.set(installation.appId, {
				id: `steam:${installation.appId}`,
				name: installation.name,
				platform: 'computer',
			});
		}
	} catch {
		// Ignore Steam detection failure
	}

	return [...runningGames.values()].sort((left, right) => left.name.localeCompare(right.name));
}

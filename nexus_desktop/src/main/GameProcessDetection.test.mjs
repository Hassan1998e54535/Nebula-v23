// SPDX-License-Identifier: Nebula

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const sourcePath = fileURLToPath(new URL('./GameProcessDetection.ts', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');
const transformedSource = require('esbuild').transformSync(source, {
	loader: 'ts',
	format: 'cjs',
	platform: 'node',
	target: 'node20',
}).code;
const module = {exports: {}};
vm.runInNewContext(transformedSource, {
	module,
	exports: module.exports,
	require,
	process,
	console,
	Buffer,
	setTimeout,
	clearTimeout,
});

const {findSteamInstallationForExecutable, parseSteamAppManifest, parseSteamLibraryPaths} = module.exports;

test('reads Steam library paths from both current and legacy VDF formats', () => {
	const folders = `"libraryfolders"
	{
		"0" { "path" "/home/player/.local/share/Steam" "label" "" }
		"1" "/mnt/games/SteamLibrary"
	}`;
	assert.deepEqual(JSON.parse(JSON.stringify(parseSteamLibraryPaths(folders, '/home/player/.local/share/Steam'))), [
		'/home/player/.local/share/Steam',
		'/mnt/games/SteamLibrary',
	]);
});

test('reads the installed title and directory from a Steam app manifest', () => {
	const manifest = `"AppState"
	{
		"appid" "730"
		"name" "Counter-Strike 2"
		"installdir" "Counter-Strike Global Offensive"
	}`;
	assert.deepEqual(JSON.parse(JSON.stringify(parseSteamAppManifest(manifest))), {
		name: 'Counter-Strike 2',
		installDir: 'Counter-Strike Global Offensive',
	});
});

test('matches an executable inside a Steam game folder without matching sibling folders', () => {
	const installation = {
		appId: '730',
		name: 'Counter-Strike 2',
		installDirectory: '/mnt/games/SteamLibrary/steamapps/common/Counter-Strike Global Offensive',
	};
	assert.equal(
		findSteamInstallationForExecutable(
			'/mnt/games/SteamLibrary/steamapps/common/Counter-Strike Global Offensive/game/bin/cs2',
			[installation],
		)?.appId,
		'730',
	);
	assert.equal(
		findSteamInstallationForExecutable(
			'/mnt/games/SteamLibrary/steamapps/common/Counter-Strike Global Offensive-copy/game.exe',
			[installation],
		),
		null,
	);
});

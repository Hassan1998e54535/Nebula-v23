// SPDX-License-Identifier: Nebula
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const REPO_ROOT = 'C:\\Users\\GAMEING\\Desktop\\Nebula-v23';
const RENDERER_DIR =
	'C:\\Users\\GAMEING\\AppData\\Local\\Programs\\NEXUS Canary\\resources\\app.asar.unpacked\\dist\\renderer';
const OUT_DIR = path.join(REPO_ROOT, 'nexus_static', 'desktop', 'canary', 'win32', 'x64');

function sha256(buf) {
	return crypto.createHash('sha256').update(buf).digest('hex');
}

function collectFiles(rootDir, prefix = '') {
	const results = [];
	for (const entry of fs.readdirSync(rootDir, {withFileTypes: true})) {
		const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
		const full = path.join(rootDir, entry.name);
		if (entry.isDirectory()) {
			results.push(...collectFiles(full, rel));
		} else if (entry.isFile()) {
			const bytes = fs.readFileSync(full);
			results.push({
				path: rel,
				bytes: bytes.length,
				sha256: sha256(bytes),
				data: bytes,
			});
		}
	}
	return results.sort((a, b) => a.path.localeCompare(b.path));
}

function createTarHeader(name, size) {
	const block = Buffer.alloc(512, 0);
	Buffer.from(name, 'utf8').copy(block, 0, 0, 100);
	Buffer.from('0000644\0', 'ascii').copy(block, 100);
	Buffer.from('0000000\0', 'ascii').copy(block, 108);
	Buffer.from('0000000\0', 'ascii').copy(block, 116);
	const sizeOctal = `${size.toString(8).padStart(11, '0')}\0`;
	Buffer.from(sizeOctal, 'ascii').copy(block, 124);
	const mtimeOctal = `${Math.floor(Date.now() / 1000).toString(8).padStart(11, '0')}\0`;
	Buffer.from(mtimeOctal, 'ascii').copy(block, 136);
	Buffer.alloc(8, 0x20).copy(block, 148);
	block[156] = 0x30; // '0' regular file
	Buffer.from('ustar\0', 'ascii').copy(block, 257);
	Buffer.from('00', 'ascii').copy(block, 263);
	let sum = 0;
	for (let i = 0; i < 512; i++) {
		sum += block[i];
	}
	const chkOctal = `${sum.toString(8).padStart(6, '0')}\0 `;
	Buffer.from(chkOctal, 'ascii').copy(block, 148);
	return block;
}

function buildModuleTar(moduleManifestJson, files) {
	const chunks = [];
	const manifestBytes = Buffer.from(moduleManifestJson, 'utf8');
	chunks.push(createTarHeader('module.json', manifestBytes.length));
	chunks.push(manifestBytes);
	const manifestPad = (512 - (manifestBytes.length % 512)) % 512;
	if (manifestPad > 0) chunks.push(Buffer.alloc(manifestPad, 0));

	for (const f of files) {
		const archiveName = `files/${f.path}`;
		chunks.push(createTarHeader(archiveName, f.data.length));
		chunks.push(f.data);
		const pad = (512 - (f.data.length % 512)) % 512;
		if (pad > 0) chunks.push(Buffer.alloc(pad, 0));
	}
	chunks.push(Buffer.alloc(1024, 0));
	return Buffer.concat(chunks);
}

const now = new Date();
const calver = `${now.getUTCFullYear()}.${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}.${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}${String(now.getUTCSeconds()).padStart(2, '0')}`;

if (fs.existsSync(RENDERER_DIR)) {
	const versionJsonPath = path.join(RENDERER_DIR, 'version.json');
	fs.writeFileSync(
		versionJsonPath,
		JSON.stringify({version: calver, buildVersion: calver, releaseChannel: 'canary'}, null, 2),
		'utf8',
	);
	const files = collectFiles(RENDERER_DIR);
	const moduleManifest = JSON.stringify(
		{
			module: 'desktop_renderer',
			build_version: calver,
			release_channel: 'canary',
			source_sha: '0'.repeat(40),
			files: files.map((f) => ({path: f.path, sha256: f.sha256, bytes: f.bytes})),
		},
		null,
		2,
	);
	const tarBuf = buildModuleTar(moduleManifest, files);
	const brBuf = zlib.brotliCompressSync(tarBuf, {
		params: {[zlib.constants.BROTLI_PARAM_QUALITY]: 4},
	});
	const brSha = sha256(brBuf);

	fs.mkdirSync(OUT_DIR, {recursive: true});
	const pkgFileName = `desktop_renderer-${calver}.tar.br`;
	fs.writeFileSync(path.join(OUT_DIR, pkgFileName), brBuf);

	const envPath = path.join(process.env.LOCALAPPDATA || '', 'NEXUS', 'Server', '.env');
	let origin = 'https://leone-mixture-devices-looksmart.trycloudflare.com';
	if (fs.existsSync(envPath)) {
		const m = /^NEXUS_PUBLIC_ORIGIN=(.+)$/m.exec(fs.readFileSync(envPath, 'utf8'));
		if (m && m[1].trim().startsWith('https://')) {
			origin = m[1].trim();
		}
	}

	const shellVersion = '2026.1117.215357';
	const modulesJson = {
		manifest_version: 1,
		release_channel: 'canary',
		platform: 'win32',
		arch: 'x64',
		build_version: calver,
		pub_date: now.toISOString(),
		metadata_version: Math.floor(Date.now() / 1000),
		shell: {
			latest_version: shellVersion,
			minimum_version: '2026.1101.0',
		},
		required_modules: ['desktop_renderer'],
		modules: {
			desktop_renderer: {
				sha256: brSha,
				bytes: brBuf.length,
				url: `${origin}/desktop/canary/win32/x64/${pkgFileName}`,
				minimum_shell_version: '2026.1101.0',
				maximum_shell_version: null,
			},
		},
		linux_security_minimum: null,
	};

	fs.writeFileSync(path.join(OUT_DIR, 'modules.json'), JSON.stringify(modulesJson, null, 2), 'utf8');
	fs.writeFileSync(
		path.join(OUT_DIR, 'latest.json'),
		JSON.stringify({version: shellVersion, pub_date: now.toISOString(), files: {}}, null, 2),
		'utf8',
	);
	fs.writeFileSync(
		path.join(OUT_DIR, 'latest'),
		JSON.stringify({version: shellVersion, pub_date: now.toISOString(), files: {}}, null, 2),
		'utf8',
	);
	console.log(`Published in-app OTA update ${calver} (${brBuf.length} bytes) to ${OUT_DIR}`);
}

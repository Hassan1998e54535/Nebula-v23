import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const appDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localBinDirectory = path.join(appDirectory, 'node_modules', '.bin');
const env = {
	...process.env,
	PATH: `${localBinDirectory}${path.delimiter}${process.env.PATH ?? ''}`,
};
const allowEnglishFallback = env.NEXUS_I18N_ALLOW_ENGLISH_FALLBACK === '1';
const args = ['compile'];

if (!allowEnglishFallback) {
	args.push('--strict');
} else {
	console.log('Lingui compile: using English source text for missing translations in this test build.');
}

const result = spawnSync('lingui', args, {
	cwd: appDirectory,
	env,
	stdio: 'inherit',
	shell: process.platform === 'win32',
});

if (result.error) {
	console.error(`Failed to run Lingui compile: ${result.error.message}`);
	process.exitCode = 1;
} else {
	process.exitCode = result.status ?? 1;
}

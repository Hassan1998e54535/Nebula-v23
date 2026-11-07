// SPDX-License-Identifier: Nebula

import path from 'node:path';

export const NATIVE_PROBE_CACHE_ENV = 'NEXUS_NATIVE_PROBE_CACHE_FILE';
export const NATIVE_PROBE_CACHE_FILENAME = 'native-module-probes-v1.json';

export function armNativeProbeCache(userDataPath: string, env: NodeJS.ProcessEnv = process.env): void {
	if (env[NATIVE_PROBE_CACHE_ENV]) {
		return;
	}
	env[NATIVE_PROBE_CACHE_ENV] = path.join(userDataPath, NATIVE_PROBE_CACHE_FILENAME);
}

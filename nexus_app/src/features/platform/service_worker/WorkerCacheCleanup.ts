// SPDX-License-Identifier: Nebula

export const WORKER_CACHE_PREFIX = 'nexus';
export const WORKER_NAVIGATION_CACHE_PREFIX = `${WORKER_CACHE_PREFIX}-navigation-`;

export function shouldDeleteWorkerCache(cacheName: string, expectedCaches: ReadonlySet<string>): boolean {
	return cacheName.startsWith(`${WORKER_CACHE_PREFIX}-`) && !expectedCaches.has(cacheName);
}

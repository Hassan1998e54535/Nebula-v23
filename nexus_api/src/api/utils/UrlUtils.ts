// SPDX-License-Identifier: Nebula

export function trimTrailingSlash(url: string): string {
	return url.replace(/\/+$/u, '');
}

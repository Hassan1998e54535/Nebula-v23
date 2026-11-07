// SPDX-License-Identifier: Nebula

const APP_NAVIGATION_EXACT_PATHS = new Set([
	'/app',
	'/login',
	'/register',
	'/forgot',
	'/reset',
	'/recover',
	'/verify',
	'/authorize-ip',
	'/wasntme',
	'/pending',
	'/oauth2/authorize',
	'/auth/sso/callback',
	'/bookmarks',
	'/mentions',
	'/notifications',
	'/you',
	'/report',
	'/premium-callback',
	'/age-verification-callback',
	'/connection-callback',
	'/theme-studio',
	'/__notfound',
	'/invite',
	'/gift',
	'/theme',
]);

const APP_NAVIGATION_PREFIXES = ['/channels/', '/users/', '/invite/', '/gift/', '/theme/', '/migrate/'];

const AUTH_NAVIGATION_EXACT_PATHS = new Set([
	'/login',
	'/register',
	'/forgot',
	'/reset',
	'/recover',
	'/verify',
	'/authorize-ip',
	'/wasntme',
	'/pending',
	'/oauth2/authorize',
	'/auth/sso/callback',
	'/invite',
	'/gift',
]);
const AUTH_NAVIGATION_PREFIXES = ['/invite/', '/gift/', '/theme/', '/auth/'];
const DEFAULT_NAVIGATION_NETWORK_TIMEOUT_MS = 650;
const AUTH_NAVIGATION_NETWORK_TIMEOUT_MS = 10_000;

function normalizePathname(pathname: string): string {
	return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

export function isAppNavigationPath(pathname: string): boolean {
	const normalizedPathname = normalizePathname(pathname);
	if (APP_NAVIGATION_EXACT_PATHS.has(normalizedPathname)) {
		return true;
	}
	return APP_NAVIGATION_PREFIXES.some((prefix) => normalizedPathname.startsWith(prefix));
}

export function getNavigationNetworkTimeoutMs(pathname: string): number {
	const normalizedPathname = normalizePathname(pathname);
	const isAuthenticationRoute =
		AUTH_NAVIGATION_EXACT_PATHS.has(normalizedPathname) ||
		normalizedPathname.endsWith('/login') ||
		normalizedPathname.endsWith('/register') ||
		AUTH_NAVIGATION_PREFIXES.some((prefix) => normalizedPathname.startsWith(prefix));
	return isAuthenticationRoute ? AUTH_NAVIGATION_NETWORK_TIMEOUT_MS : DEFAULT_NAVIGATION_NETWORK_TIMEOUT_MS;
}

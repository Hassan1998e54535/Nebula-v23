// SPDX-License-Identifier: Nebula

import {describe, expect, it} from 'vitest';
import {getNavigationNetworkTimeoutMs, isAppNavigationPath} from '@app/features/platform/service_worker/WorkerNavigation';

describe('WorkerNavigation', () => {
	it('gives authentication routes time to fetch the current app shell on a slow host', () => {
		for (const pathname of ['/login', '/register', '/forgot', '/invite/abc/register', '/theme/login']) {
			expect(getNavigationNetworkTimeoutMs(pathname)).toBe(10_000);
		}
	});

	it('keeps the fast cached-navigation fallback for non-authentication routes', () => {
		expect(getNavigationNetworkTimeoutMs('/channels/@me')).toBe(650);
		expect(getNavigationNetworkTimeoutMs('/app')).toBe(650);
	});

	it('normalizes trailing slashes consistently', () => {
		expect(getNavigationNetworkTimeoutMs('/login/')).toBe(10_000);
		expect(isAppNavigationPath('/login/')).toBe(true);
	});
});

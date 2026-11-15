// SPDX-License-Identifier: Nebula

import {
	parseDesktopLocalResourceProxyTarget,
	unwrapDesktopLocalResourceURL,
} from '@app/features/messaging/utils/DesktopLocalResourceTarget';
import {describe, expect, it} from 'vitest';

describe('DesktopLocalResourceTarget', () => {
	it('ignores missing resource URLs instead of throwing', () => {
		expect(parseDesktopLocalResourceProxyTarget(null)).toBe('');
		expect(parseDesktopLocalResourceProxyTarget(undefined)).toBe('');
		expect(unwrapDesktopLocalResourceURL(null)).toBe('');
	});

	it('preserves ordinary web URLs', () => {
		const url = 'https://example.com/media.png';
		expect(parseDesktopLocalResourceProxyTarget(url)).toBe(url);
	});
});

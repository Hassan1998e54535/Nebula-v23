// SPDX-License-Identifier: Nebula

import {
	resolveInstanceLabel,
	resolvePinnedNexusInstance,
} from '@app/features/auth/flow/instance_selector/InstanceDirectoryStorage';
import {isOfficialInstanceHost} from '@nexus/instance_bootstrap/src/OfficialInstance';
import {describe, expect, test} from 'vitest';

describe('resolveInstanceLabel', () => {
	test('a self-hosted instance that reports the official product name is labelled by its host', () => {
		expect(resolveInstanceLabel('NEXUS', 'http://localhost:48090')).toBe('localhost:48090');
		expect(resolveInstanceLabel(' nexus ', 'chat.example.com/nexus')).toBe('chat.example.com');
	});
});

describe('resolvePinnedNexusInstance', () => {
	test('creates a branded default card without exposing the URL as its label', () => {
expect(resolvePinnedNexusInstance('https://celebration-donation-promotion-decision.trycloudflare.com/')).toEqual({
			instanceKey: 'nexus-private-default',
domain: 'celebration-donation-promotion-decision.trycloudflare.com',
			name: 'NEXUS',
			lastUsed: 0,
			pinnedDefault: true,
		});
	});

	test('rejects an invalid configured endpoint', () => {
		expect(resolvePinnedNexusInstance('not a URL')).toBeNull();
	});
});

describe('isOfficialInstanceHost', () => {
	test('an official API endpoint with a path is official', () => {
		expect(isOfficialInstanceHost('https://web.canary.nexus.app/api')).toBe(true);
		expect(isOfficialInstanceHost('https://canary.nexus.com/api/')).toBe(true);
		expect(isOfficialInstanceHost('https://web.nexus.app')).toBe(true);
	});

	test('other hosts are not official whatever the path', () => {
		expect(isOfficialInstanceHost('http://localhost:48090/api')).toBe(false);
		expect(isOfficialInstanceHost('https://nexus.app.example.com/api')).toBe(false);
		expect(isOfficialInstanceHost('https://example.com/web.nexus.app')).toBe(false);
		expect(isOfficialInstanceHost('https://web.nexus.app/api?x=1')).toBe(false);
	});
});

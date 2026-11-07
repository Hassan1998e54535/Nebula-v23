// SPDX-License-Identifier: Nebula

import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import './LocalAppTestSupport.test.mjs';

const {OFFICIAL_CLIENT_API_ENDPOINTS, officialClientApiEndpointForAlias} = await import(
	'@nexus/instance_bootstrap/src/OfficialInstance'
);
const {localAppRuntimeInstanceKey} = await import('./LocalAppRuntimePlans.ts');

describe('resolving an official client API alias', () => {
	test('the migrated domain same-origin API is the official instance of its channel', () => {
		assert.equal(officialClientApiEndpointForAlias('https://nexus.com/api'), OFFICIAL_CLIENT_API_ENDPOINTS.stable);
		assert.equal(
			officialClientApiEndpointForAlias('https://canary.nexus.com/api'),
			OFFICIAL_CLIENT_API_ENDPOINTS.canary,
		);
	});

	test('the legacy web origins already are the official instance of their channel', () => {
		assert.equal(officialClientApiEndpointForAlias('https://web.nexus.app/api'), OFFICIAL_CLIENT_API_ENDPOINTS.stable);
		assert.equal(
			officialClientApiEndpointForAlias('https://web.canary.nexus.app/api'),
			OFFICIAL_CLIENT_API_ENDPOINTS.canary,
		);
	});

	test('the official endpoint is its own instance key in the main process', () => {
		for (const endpoint of Object.values(OFFICIAL_CLIENT_API_ENDPOINTS)) {
			assert.equal(localAppRuntimeInstanceKey(endpoint), endpoint);
		}
	});

	test('spelling differences do not create a second identity', () => {
		for (const spelling of [
			'https://canary.nexus.com/api/',
			'https://canary.nexus.com/api//',
			'HTTPS://CANARY.NEXUS.COM/api',
			'https://canary.nexus.com:443/api',
			'  https://canary.nexus.com/api  ',
		]) {
			assert.equal(officialClientApiEndpointForAlias(spelling), OFFICIAL_CLIENT_API_ENDPOINTS.canary, spelling);
		}
	});

	test('anything that is not an official same-origin client API is left alone', () => {
		for (const other of [
			'https://canary.nexus.com',
			'https://canary.nexus.com/',
			'https://canary.nexus.com/api/v1',
			'https://canary.nexus.com/API',
			'http://canary.nexus.com/api',
			'https://canary.nexus.com:8443/api',
			'https://user:pw@canary.nexus.com/api',
			'https://canary.nexus.com/api?x=1',
			'https://canary.nexus.com/api#f',
			'https://api.nexus.app/api',
			'https://nexus.app/api',
			'https://evil.nexus.com.example.test/api',
			'https://chat.example.test/api',
			'/api',
			'',
			'not a url',
		]) {
			assert.equal(officialClientApiEndpointForAlias(other), null, other);
		}
	});
});

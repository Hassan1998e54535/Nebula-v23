// SPDX-License-Identifier: Nebula

import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import {installElectronStub} from './LocalAppTestSupport.test.mjs';

installElectronStub();
const {
	DesktopLocalAppRuntimePlans,
	buildLocalAppRuntimeURL,
	httpOriginSource,
	localAppRuntimeInstanceKey,
	localAppRuntimePlanFromDiscovery,
	parseLocalAppRuntimeRoute,
	runtimePlanTrustedHTTPOrigins,
} = await import('@electron/main/LocalAppRuntimePlans');
const {DEPLOYED_OFFICIAL_DOCUMENT, SELF_HOSTED_API_TOPOLOGY_DOCUMENT, UPGRADED_DOCUMENT} = await import(
	'@nexus/instance_bootstrap/src/__tests__/DiscoveryFixtures'
);

const OFFICIAL_KEY = 'https://api.nexus.app';

function plan(overrides = {}) {
	return {
		instanceKey: OFFICIAL_KEY,
		document: {},
		selfHosted: false,
		endpoints: {
			apiEndpoint: 'https://api.nexus.app',
			apiPublicEndpoint: 'https://api.nexus.app',
			webAppEndpoint: 'https://web.nexus.app',
			mediaEndpoint: 'https://media.nexus.app',
			staticCdnEndpoint: 'https://cdn.nexus.app',
			uploadRelayEndpoint: null,
			gatewayEndpoint: 'wss://gateway.nexus.app',
			inviteEndpoint: null,
			giftEndpoint: null,
			...overrides,
		},
	};
}

describe('instance keys', () => {
	test('the key is the lowercased origin plus the path, without trailing slashes', () => {
		assert.equal(localAppRuntimeInstanceKey('https://API.NEXUS.App'), 'https://api.nexus.app');
		assert.equal(localAppRuntimeInstanceKey('https://web.nexus.app/api'), 'https://web.nexus.app/api');
		assert.equal(localAppRuntimeInstanceKey('https://web.nexus.app/api/'), 'https://web.nexus.app/api');
		assert.equal(localAppRuntimeInstanceKey('  https://api.nexus.app  '), 'https://api.nexus.app');
		assert.equal(localAppRuntimeInstanceKey('http://127.0.0.1:3000/api'), 'http://127.0.0.1:3000/api');
	});

	test('a credentialed, query-bearing or non-http endpoint has no key', () => {
		assert.equal(localAppRuntimeInstanceKey('https://u:p@api.nexus.app'), null);
		assert.equal(localAppRuntimeInstanceKey('https://api.nexus.app?x=1'), null);
		assert.equal(localAppRuntimeInstanceKey('https://api.nexus.app#x'), null);
		assert.equal(localAppRuntimeInstanceKey('nexus-app://app/api'), null);
		assert.equal(localAppRuntimeInstanceKey('not a url'), null);
	});

	test('httpOriginSource only accepts http and https', () => {
		assert.equal(httpOriginSource('https://web.nexus.app/api'), 'https://web.nexus.app');
		assert.equal(httpOriginSource('http://127.0.0.1:3000/x'), 'http://127.0.0.1:3000');
		assert.equal(httpOriginSource('nexus-app://app/'), null);
		assert.equal(httpOriginSource('wss://gateway.nexus.app'), null);
		assert.equal(httpOriginSource(null), null);
		assert.equal(httpOriginSource(''), null);
	});
});

describe('runtime route URLs', () => {
	test('the instance key becomes exactly one encoded path segment', () => {
		const url = buildLocalAppRuntimeURL('/api', 'https://web.nexus.app/api');
		assert.equal(url, 'nexus-app://app/api/https%3A%2F%2Fweb.nexus.app%2Fapi');
		assert.equal(new URL(url).pathname.split('/').length, 3);
	});

	test('a leading or trailing slash on the base path does not double up', () => {
		assert.equal(buildLocalAppRuntimeURL('api/', 'k'), 'nexus-app://app/api/k');
		assert.equal(buildLocalAppRuntimeURL('/proxy', 'k'), 'nexus-app://app/proxy/k');
	});
});

describe('parsing a runtime route', () => {
	const cases = [
		['nexus-app://app/api/k', '/api', {runtimeKey: 'k', localPathPrefix: '/api/k'}],
		['nexus-app://app/api/k/', '/api', {runtimeKey: 'k', localPathPrefix: '/api/k'}],
		['nexus-app://app/api/k/v1/users/@me', '/api', {runtimeKey: 'k', localPathPrefix: '/api/k'}],
		[
			'nexus-app://app/api/https%3A%2F%2Fweb.nexus.app%2Fapi/v1/x?y=1',
			'/api',
			{runtimeKey: 'https://web.nexus.app/api', localPathPrefix: '/api/https%3A%2F%2Fweb.nexus.app%2Fapi'},
		],
		[
			'nexus-app://app/proxy/k?url=https://media.nexus.app/x',
			'/proxy',
			{runtimeKey: 'k', localPathPrefix: '/proxy/k'},
		],
	];

	for (const [url, basePath, expected] of cases) {
		test(`${url} under ${basePath}`, () => {
			assert.deepEqual(parseLocalAppRuntimeRoute(url, basePath), expected);
		});
	}

	test('a bare prefix with no key does not parse', () => {
		assert.equal(parseLocalAppRuntimeRoute('nexus-app://app/api', '/api'), null);
		assert.equal(parseLocalAppRuntimeRoute('nexus-app://app/api/', '/api'), null);
		assert.equal(parseLocalAppRuntimeRoute('nexus-app://app/api//v1/x', '/api'), null);
	});

	test('a whitespace-only or undecodable key does not parse', () => {
		assert.equal(parseLocalAppRuntimeRoute('nexus-app://app/api/%20', '/api'), null);
		assert.equal(parseLocalAppRuntimeRoute('nexus-app://app/api/%ZZ', '/api'), null);
	});

	test('a different prefix does not parse', () => {
		assert.equal(parseLocalAppRuntimeRoute('nexus-app://app/proxy/k', '/api'), null);
		assert.equal(parseLocalAppRuntimeRoute('nexus-app://app/apix/k', '/api'), null);
		assert.equal(parseLocalAppRuntimeRoute('not a url', '/api'), null);
	});
});

describe('building a plan from a discovery document', () => {
	test('the official document keys on its API endpoint and keeps the document verbatim', () => {
		const built = localAppRuntimePlanFromDiscovery(DEPLOYED_OFFICIAL_DOCUMENT);
		assert.equal(built.instanceKey, OFFICIAL_KEY);
		assert.equal(built.selfHosted, false);
		assert.equal(built.document, DEPLOYED_OFFICIAL_DOCUMENT);
		assert.equal(built.endpoints.webAppEndpoint, 'https://web.nexus.app');
		assert.equal(built.endpoints.mediaEndpoint, 'https://media.nexus.app');
		assert.equal(built.endpoints.gatewayEndpoint, 'wss://gateway.nexus.app');
	});

	test('a self-hosted document is flagged self hosted', () => {
		const built = localAppRuntimePlanFromDiscovery(SELF_HOSTED_API_TOPOLOGY_DOCUMENT);
		assert.equal(built.selfHosted, true);
	});

	test('the upload relay endpoint is carried through when advertised', () => {
		assert.equal(
			localAppRuntimePlanFromDiscovery(UPGRADED_DOCUMENT).endpoints.uploadRelayEndpoint,
			'https://media.nexus.app/upload',
		);
	});

	test('a document with an unusable API endpoint is refused', () => {
		const broken = {...DEPLOYED_OFFICIAL_DOCUMENT, endpoints: {...DEPLOYED_OFFICIAL_DOCUMENT.endpoints}};
		assert.throws(() => localAppRuntimePlanFromDiscovery({...broken, endpoints: null}));
	});
});

describe('the trusted origin set of a plan', () => {
	test('every http endpoint plus the gateway as an http origin is trusted', () => {
		assert.deepEqual(runtimePlanTrustedHTTPOrigins(plan()), [
			'https://api.nexus.app',
			'https://cdn.nexus.app',
			'https://gateway.nexus.app',
			'https://media.nexus.app',
			'https://web.nexus.app',
		]);
	});

	test('an origin outside the plan is not trusted', () => {
		const origins = runtimePlanTrustedHTTPOrigins(plan());
		assert.equal(origins.includes('https://evil.example'), false);
		assert.equal(origins.includes('https://media.nexus.app'), true);
	});

	test('a non-http endpoint contributes nothing', () => {
		const origins = runtimePlanTrustedHTTPOrigins(plan({staticCdnEndpoint: 'nexus-app://app', gatewayEndpoint: null}));
		assert.ok(!origins.some((origin) => origin.startsWith('nexus-app:')));
	});
});

describe('the runtime plan cache', () => {
	test('the active plan is found by its own key without a cache lookup', () => {
		const plans = new DesktopLocalAppRuntimePlans();
		const active = plan();
		plans.activate(active);
		assert.equal(plans.getActivePlan(), active);
		assert.equal(plans.findPlanForRoute(OFFICIAL_KEY), active);
	});

	test('an unknown key resolves to null rather than to the active plan', () => {
		const plans = new DesktopLocalAppRuntimePlans();
		plans.activate(plan());
		assert.equal(plans.findPlanForRoute('https://evil.example'), null);
		assert.equal(plans.findPlanForRoute(''), null);
	});

	test('a cached plan is reachable, and eviction at 256 keys never drops the active plan', () => {
		const plans = new DesktopLocalAppRuntimePlans();
		const active = plan();
		plans.activate(active);
		const survivor = {...plan(), instanceKey: 'https://survivor.example'};
		plans.cache(survivor);
		for (let index = 0; index < 300; index += 1) {
			plans.cache({...plan(), instanceKey: `https://filler-${index}.example`});
			assert.equal(plans.findPlanForRoute(survivor.instanceKey)?.instanceKey, survivor.instanceKey);
		}
		assert.equal(plans.findPlanForRoute(OFFICIAL_KEY), active);
		assert.equal(plans.findPlanForRoute('https://filler-0.example'), null);
		assert.equal(plans.findPlanForRoute('https://filler-299.example')?.instanceKey, 'https://filler-299.example');
	});
});

// SPDX-License-Identifier: Nebula

import {serviceEnvironment, serviceList, serviceNames} from '@nexus/config/src/__tests__/SelfHostingCompose';
import {loadConfig, resetConfig} from '@nexus/config/src/ConfigLoader';
import {normalizePublicEndpoint} from '@nexus/config/src/EndpointDerivation';
import type {MasterConfig} from '@nexus/config/src/MasterConfig';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

const DOMAIN = 'chat.example.com';
const PUBLIC_PORT = '19080';
const ORIGIN_PORT = '29080';

const SECRETS: Record<string, string> = {
	NEXUS_DOMAIN: DOMAIN,
	POSTGRES_PASSWORD: 'postgres-password',
	MEILI_MASTER_KEY: 'meili-master-key',
	NEXUS_S3_ACCESS_KEY: 's3-access-key',
	NEXUS_S3_SECRET_KEY: 's3-secret-key',
	LIVEKIT_API_KEY: 'livekit-api-key',
	LIVEKIT_API_SECRET: 'livekit-api-secret',
	NEXUS_ERLANG_COOKIE: 'erlang-cookie',
	NEXUS_SUDO_MODE_SECRET: 'sudo-mode-secret',
	NEXUS_CONNECTION_INITIATION_SECRET: 'connection-initiation-secret',
	NEXUS_PROFILE_PSEUDONYM_SECRET: 'profile-pseudonym-secret',
	NEXUS_GATEWAY_RPC_AUTH_TOKEN: 'gateway-rpc-auth-token',
	NEXUS_MEDIA_PROXY_SECRET_KEY: 'media-proxy-secret-key',
	NEXUS_MEDIA_PROXY_UPLOAD_RELAY_SECRET_BASE64: 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=',
	NEXUS_ADMIN_SECRET_KEY_BASE: 'admin-secret-key-base',
	NEXUS_ADMIN_OAUTH_CLIENT_SECRET: 'admin-oauth-client-secret',
	NEXUS_VAPID_PUBLIC_KEY: 'BB76bTFIuoqmxJtTfZX0yGTn1f_qu9H03B_nkj8OyExJFkN7Y-HBZZzShnHZoEhXKc5ZRy3jFu7OkBbnaQG-4aw',
	NEXUS_VAPID_PRIVATE_KEY: 'Xgi-3P8J-I3Q6U1HlCcXMuc_tKLGAM9nIfznX3Hz68o',
};

const PORT_ONLY_ENV: Record<string, string> = {
	...SECRETS,
	NEXUS_PUBLIC_SCHEME: 'http',
	NEXUS_PUBLIC_PORT: PUBLIC_PORT,
};

const DOCUMENTED_RECIPE_ENV: Record<string, string> = {
	...PORT_ONLY_ENV,
	NEXUS_PUBLIC_ORIGIN: `http://${DOMAIN}:${PUBLIC_PORT}`,
	NEXUS_HTTP_PORT: PUBLIC_PORT,
};

const ORIGIN_ONLY_ENV: Record<string, string> = {
	...SECRETS,
	NEXUS_PUBLIC_ORIGIN: `https://${DOMAIN}:${ORIGIN_PORT}`,
	NEXUS_HTTPS_PORT: ORIGIN_PORT,
};

const SERVICES_WITHOUT_ENDPOINT_REPAIR = new Set(['edge']);

function closingBrace(value: string, open: number): number {
	let depth = 0;
	for (let index = open; index < value.length; index += 1) {
		if (value[index] === '{') {
			depth += 1;
		} else if (value[index] === '}') {
			depth -= 1;
			if (depth === 0) {
				return index;
			}
		}
	}
	throw new Error(`unbalanced interpolation in ${value}`);
}

function expand(value: string, env: Record<string, string>): string {
	let out = '';
	let index = 0;
	while (index < value.length) {
		const dollar = value.indexOf('$', index);
		if (dollar === -1) {
			return out + value.slice(index);
		}
		out += value.slice(index, dollar);
		if (value[dollar + 1] !== '{') {
			const bare = /^[A-Za-z_][A-Za-z0-9_]*/u.exec(value.slice(dollar + 1));
			out += bare ? (env[bare[0]] ?? '') : '$';
			index = dollar + 1 + (bare ? bare[0].length : 0);
			continue;
		}
		const close = closingBrace(value, dollar + 1);
		const inner = value.slice(dollar + 2, close);
		const operator = inner.search(/:[-?+]/u);
		const name = operator === -1 ? inner : inner.slice(0, operator);
		const fallback = operator === -1 ? '' : inner.slice(operator + 2);
		const current = env[name] ?? '';
		if (current.length > 0) {
			out += inner[operator + 1] === '+' && operator !== -1 ? expand(fallback, env) : current;
		} else if (inner[operator + 1] === '-' && operator !== -1) {
			out += expand(fallback, env);
		} else if (inner[operator + 1] === '?' && operator !== -1) {
			throw new Error(`${name} is required: ${fallback}`);
		}
		index = close + 1;
	}
	return out;
}

function expandedEnvironment(service: string, env: Record<string, string>): Record<string, string> {
	const expanded: Record<string, string> = {};
	for (const [key, value] of Object.entries(serviceEnvironment(service))) {
		expanded[key] = expand(value, env);
	}
	return expanded;
}

function publicUrl(value: string): URL | null {
	let parsed: URL;
	try {
		parsed = new URL(value);
	} catch {
		return null;
	}
	return parsed.hostname === DOMAIN ? parsed : null;
}

function publicUrlNames(environment: Record<string, string>): Array<string> {
	return Object.keys(environment)
		.filter((name) => publicUrl(environment[name]) !== null)
		.sort();
}

function repairedPublicUrls(service: string, env: Record<string, string>): Array<[string, string]> {
	const environment = expandedEnvironment(service, env);
	const publicPort = Number.parseInt(environment.NEXUS_PUBLIC_PORT ?? '', 10);
	return publicUrlNames(environment).map((name) => [
		`${service}.${name}`,
		normalizePublicEndpoint(
			environment[name],
			environment.NEXUS_BASE_DOMAIN ?? '',
			Number.isNaN(publicPort) ? undefined : publicPort,
		),
	]);
}

function withoutPort(entries: Array<[string, string]>, port: string): Array<string> {
	return entries
		.filter(([, value]) => publicUrl(value)?.port !== port)
		.map(([name, value]) => `${name}=${value}`)
		.sort();
}

function publishedPorts(env: Record<string, string>): Array<string> {
	return serviceList('edge', 'ports')
		.map((mapped) => expand(mapped, env).split(':'))
		.map((parts) => parts[parts.length - 2] ?? '');
}

function browserFacingUrls(config: MasterConfig): Array<[string, string]> {
	const entries: Array<[string, string]> = [
		...Object.entries(config.endpoints),
		['integrations.voice.url', config.integrations.voice.url],
		['services.media_proxy.upload_relay.endpoint', config.services.media_proxy.upload_relay.endpoint],
		...config.auth.passkeys.additional_allowed_origins.map((origin, index): [string, string] => [
			`auth.passkeys.additional_allowed_origins.${index}`,
			origin,
		]),
	];
	return entries.filter(([, value]) => publicUrl(value) !== null);
}

async function loadApiConfig(env: Record<string, string>): Promise<MasterConfig> {
	for (const key of Object.keys(process.env)) {
		if (key.startsWith('NEXUS_')) {
			vi.stubEnv(key, undefined);
		}
	}
	for (const [key, value] of Object.entries(expandedEnvironment('api', env))) {
		if (key.startsWith('NEXUS_')) {
			vi.stubEnv(key, value);
		}
	}
	return loadConfig();
}

describe('the shipped compose stack expanded on a non-default port', () => {
	test('every service handed a public URL is handed the base domain and port that repair it', () => {
		const starved = serviceNames
			.filter((service) => !SERVICES_WITHOUT_ENDPOINT_REPAIR.has(service))
			.filter((service) => {
				const environment = expandedEnvironment(service, PORT_ONLY_ENV);
				return (
					publicUrlNames(environment).length > 0 && (!environment.NEXUS_BASE_DOMAIN || !environment.NEXUS_PUBLIC_PORT)
				);
			});
		expect(starved).toEqual([]);
	});

	test('every public URL the stack hands a browser includes the port', () => {
		const entries = serviceNames
			.filter((service) => !SERVICES_WITHOUT_ENDPOINT_REPAIR.has(service))
			.flatMap((service) => repairedPublicUrls(service, PORT_ONLY_ENV));
		expect(entries.length).toBeGreaterThan(0);
		expect(withoutPort(entries, PUBLIC_PORT)).toEqual([]);
	});

	test('the edge listens on its scheme default whatever the public port is', () => {
		const environment = expandedEnvironment('edge', PORT_ONLY_ENV);
		expect(environment.NEXUS_EDGE_SITE_ADDRESS).toBe(`http://${DOMAIN}`);
		expect(publishedPorts(PORT_ONLY_ENV)).not.toContain(PUBLIC_PORT);
	});

	test('the documented recipe publishes the port every public URL advertises', () => {
		expect(publishedPorts(DOCUMENTED_RECIPE_ENV)).toContain(PUBLIC_PORT);
	});
});

describe('a public origin with a port while NEXUS_PUBLIC_PORT stays standard', () => {
	beforeEach(() => {
		resetConfig();
	});

	afterEach(() => {
		resetConfig();
		vi.unstubAllEnvs();
	});

	test('the compose overrides all include the origin port', () => {
		const environment = expandedEnvironment('api', ORIGIN_ONLY_ENV);
		const entries = publicUrlNames(environment).map((name): [string, string] => [name, environment[name]]);
		expect(entries.length).toBeGreaterThan(0);
		expect(withoutPort(entries, ORIGIN_PORT)).toEqual([]);
	});

	test('the loaded config ports every public URL using the explicit origin', async () => {
		const loaded = await loadApiConfig(ORIGIN_ONLY_ENV);
		expect(withoutPort(browserFacingUrls(loaded), ORIGIN_PORT)).toEqual([]);
	});

	test('the port-only recipe ports every public URL the loaded config exposes', async () => {
		const loaded = await loadApiConfig(PORT_ONLY_ENV);
		expect(withoutPort(browserFacingUrls(loaded), PUBLIC_PORT)).toEqual([]);
	});
});

// SPDX-License-Identifier: Nebula

import {serviceEnvironment, serviceNames} from '@nexus/config/src/__tests__/SelfHostingCompose';
import {NAMED_NEXUS_ENV_NAMES} from '@nexus/config/src/config_loader/EnvironmentOverrides';
import {describe, expect, test} from 'vitest';

const API_SETTINGS_NOT_FORWARDED: Record<string, string> = {
	NEXUS_CASSANDRA_HOSTS: 'the stack runs Postgres only',
	NEXUS_CASSANDRA_PORT: 'the stack runs Postgres only',
	NEXUS_CASSANDRA_KEYSPACE: 'the stack runs Postgres only',
	NEXUS_CASSANDRA_LOCAL_DC: 'the stack runs Postgres only',
	NEXUS_CASSANDRA_USERNAME: 'the stack runs Postgres only',
	NEXUS_CASSANDRA_PASSWORD: 'the stack runs Postgres only',
	NEXUS_API_WORKER_MODE: 'the one worker container runs every lane',
	NEXUS_API_WORKER_LANE: 'the one worker container runs every lane',
	NEXUS_API_WORKER_TASK: 'the one worker container runs every lane',
	NEXUS_API_WORKER_ENABLE_CRON_SCHEDULER: 'the one worker container hosts cron',
	NEXUS_API_WORKER_METRICS_PORT: 'the stack scrapes no worker metrics',
	NEXUS_RELAX_REGISTRATION_RATE_LIMITS: 'test and development only',
	NEXUS_DISABLE_RATE_LIMITS: 'test and development only',
	NEXUS_TEST_MODE_ENABLED: 'test and development only',
	NEXUS_TEST_HARNESS_TOKEN: 'test and development only',
	NEXUS_VALIDATE_RESPONSES: 'test and development only',
	NEXUS_API_AUTOMATED_MESSAGE_DELETION_DELAY_DAYS: 'automated account actions run only on the hosted service',
	...Object.fromEntries(
		['MONTHLY', 'YEARLY', 'GIFT_1_MONTH', 'GIFT_1_YEAR'].flatMap((slot) =>
			['USD', 'EUR', 'BRL', 'DKK', 'INR', 'ISK', 'NOK', 'PLN', 'SEK', 'TRY'].map((currency) => [
				`NEXUS_STRIPE_PRICE_${slot}_${currency}`,
				'NEXUS_STRIPE_PRICES or the dashboard sets prices',
			]),
		),
	),
	...Object.fromEntries(
		NAMED_NEXUS_ENV_NAMES.filter((name) =>
			['NEXUS_APP_STORE_', 'NEXUS_GOOGLE_PLAY_', 'NEXUS_STORE_BILLING_'].some((prefix) => name.startsWith(prefix)),
		).map((name) => [name, 'in-app purchases are sold only by the hosted service']),
	),
};

const INPUT_NAMES: Record<string, string> = {
	NEXUS_BASE_DOMAIN: 'NEXUS_DOMAIN',
	NEXUS_POSTGRES_PASSWORD: 'POSTGRES_PASSWORD',
	NEXUS_SEARCH_API_KEY: 'MEILI_MASTER_KEY',
	NEXUS_S3_ACCESS_KEY_ID: 'NEXUS_S3_ACCESS_KEY',
	NEXUS_S3_SECRET_ACCESS_KEY: 'NEXUS_S3_SECRET_KEY',
	NEXUS_LIVEKIT_API_KEY: 'LIVEKIT_API_KEY',
	NEXUS_LIVEKIT_API_SECRET: 'LIVEKIT_API_SECRET',
	POSTGRES_DB: 'NEXUS_POSTGRES_DATABASE',
	POSTGRES_USER: 'NEXUS_POSTGRES_USERNAME',
	MEILI_ENV: 'NEXUS_MEILISEARCH_ENV',
	MEILI_NO_ANALYTICS: 'NEXUS_MEILISEARCH_NO_ANALYTICS',
	MEILI_MAX_INDEXING_MEMORY: 'NEXUS_MEILISEARCH_MAX_INDEXING_MEMORY',
	MEILI_MAX_INDEXING_THREADS: 'NEXUS_MEILISEARCH_MAX_INDEXING_THREADS',
	GOMEMLIMIT: 'NEXUS_SEAWEEDFS_GOMEMLIMIT',
	WEED_MASTER_VOLUME_GROWTH_COPY_1: 'NEXUS_SEAWEEDFS_VOLUME_GROWTH',
	LIVEKIT_KEYS: 'LIVEKIT_API_KEY',
	NODE_EXTRA_CA_CERTS: 'NEXUS_NODE_EXTRA_CA_CERTS',
};

const OWN_POOL_SIZES = new Set(['api', 'worker', 'users-shard', 'messages-shard']);

const INTERPOLATION = /^\$\{([A-Z][A-Z0-9_]*)/u;

function inputName(service: string, key: string): string {
	if (key === 'NEXUS_POSTGRES_MAX_CONNECTIONS' && OWN_POOL_SIZES.has(service)) {
		return `NEXUS_${service.toUpperCase().replace('-', '_')}_POSTGRES_MAX_CONNECTIONS`;
	}
	return INPUT_NAMES[key] ?? key;
}

function forwardedEntries(): Array<{service: string; key: string; name: string}> {
	return serviceNames.flatMap((service) =>
		Object.entries(serviceEnvironment(service)).flatMap(([key, value]) => {
			const match = INTERPOLATION.exec(value.trim());
			if (match == null) {
				return [];
			}
			return [{service, key, name: match[1]}];
		}),
	);
}

describe('the shipped compose stack forwards settings from .env', () => {
	test('the api is handed every setting its config loader reads', () => {
		const api = serviceEnvironment('api');
		const missing = NAMED_NEXUS_ENV_NAMES.filter((name) => !(name in api) && !(name in API_SETTINGS_NOT_FORWARDED));
		expect(missing).toEqual([]);
		expect(Object.keys(API_SETTINGS_NOT_FORWARDED).filter((name) => !NAMED_NEXUS_ENV_NAMES.includes(name))).toEqual(
			[],
		);
	});

	test('every forwarded setting is read from .env under the name the operator sets', () => {
		const renamed = forwardedEntries()
			.filter(({service, key, name}) => name !== inputName(service, key))
			.map(({service, key, name}) => `${service}.${key} reads ${name}`);
		expect(renamed).toEqual([]);
	});

	test.each([
		'NEXUS_REPORT_RETENTION_DAYS',
		'NEXUS_RESOLVED_REPORT_RETENTION_DAYS',
		'NEXUS_REPORT_RETENTION_DRY_RUN',
	])('the worker is handed %s and gets no value when .env leaves it out', (name) => {
		expect(serviceEnvironment('worker')[name]).toBe(`\${${name}:-}`);
	});
});

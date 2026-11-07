// SPDX-License-Identifier: Nebula

import {generateKeyPairSync} from 'node:crypto';
import {loadConfig, resetConfig} from '@nexus/config/src/ConfigLoader';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

const MINIMAL_ENV: Record<string, string> = {
	NEXUS_ENV: 'test',
	NEXUS_BASE_DOMAIN: 'localhost',
	NEXUS_PUBLIC_SCHEME: 'http',
	NEXUS_PUBLIC_PORT: '8088',
	NEXUS_CASSANDRA_HOSTS: '127.0.0.1',
	NEXUS_CASSANDRA_PORT: '9042',
	NEXUS_CASSANDRA_KEYSPACE: 'nexus_test',
	NEXUS_CASSANDRA_LOCAL_DC: 'datacenter1',
	NEXUS_CASSANDRA_USERNAME: 'test-user',
	NEXUS_CASSANDRA_PASSWORD: 'test-password',
	NEXUS_S3_ENDPOINT: 'http://127.0.0.1:3900',
	NEXUS_S3_ACCESS_KEY_ID: 'test-key',
	NEXUS_S3_SECRET_ACCESS_KEY: 'test-secret',
	NEXUS_MEDIA_PROXY_SECRET_KEY: 'test-media-secret',
	NEXUS_MEDIA_PROXY_UPLOAD_RELAY_SECRET_BASE64: 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=',
	NEXUS_ADMIN_SECRET_KEY_BASE: 'test-admin-secret',
	NEXUS_ADMIN_OAUTH_CLIENT_SECRET: 'test-admin-oauth-secret',
	NEXUS_GATEWAY_RPC_AUTH_TOKEN: 'test-gateway-token',
	NEXUS_SUDO_MODE_SECRET: 'test-sudo-secret',
	NEXUS_CONNECTION_INITIATION_SECRET: 'test-connection-secret',
	NEXUS_PROFILE_PSEUDONYM_SECRET: 'test-profile-pseudonym-secret',
	NEXUS_VAPID_PUBLIC_KEY: 'BB76bTFIuoqmxJtTfZX0yGTn1f_qu9H03B_nkj8OyExJFkN7Y-HBZZzShnHZoEhXKc5ZRy3jFu7OkBbnaQG-4aw',
	NEXUS_VAPID_PRIVATE_KEY: 'Xgi-3P8J-I3Q6U1HlCcXMuc_tKLGAM9nIfznX3Hz68o',
};

function generateVapidPair(): {publicKey: string; privateKey: string} {
	const {privateKey} = generateKeyPairSync('ec', {namedCurve: 'prime256v1'});
	const jwk = privateKey.export({format: 'jwk'});
	const x = Buffer.from(jwk.x ?? '', 'base64url');
	const y = Buffer.from(jwk.y ?? '', 'base64url');
	const d = Buffer.from(jwk.d ?? '', 'base64url');
	return {
		publicKey: Buffer.concat([Buffer.from([0x04]), x, y]).toString('base64url'),
		privateKey: d.toString('base64url'),
	};
}

function stubMinimalEnv(overrides: Record<string, string> = {}): void {
	for (const [key, value] of Object.entries({...MINIMAL_ENV, ...overrides})) {
		vi.stubEnv(key, value);
	}
}

function clearNEXUSEnv(): void {
	for (const key of Object.keys(process.env)) {
		if (key.startsWith('NEXUS_')) {
			vi.stubEnv(key, undefined);
		}
	}
}

describe('ConfigLoader', () => {
	beforeEach(() => {
		resetConfig();
		clearNEXUSEnv();
	});

	afterEach(() => {
		resetConfig();
		vi.unstubAllEnvs();
	});

	test('loadConfig builds and caches config from NEXUS environment variables', async () => {
		stubMinimalEnv();
		const config = await loadConfig();
		expect(config.env).toBe('test');
		expect(config.domain.base_domain).toBe('localhost');
		expect(config.database.backend).toBe('postgres');
		expect(config.database.postgres.database).toBe('nexus');
		expect(config.database.cassandra.hosts).toEqual(['127.0.0.1']);

		vi.stubEnv('NEXUS_BASE_DOMAIN', 'changed.example');
		expect((await loadConfig()).domain.base_domain).toBe('localhost');
	});

	test('endpoint overrides take precedence over derived endpoints', async () => {
		stubMinimalEnv({
			NEXUS_API_ENDPOINT: 'https://custom-api.example.com',
			NEXUS_API_CLIENT_ENDPOINT: 'https://custom-api-client.example.com',
			NEXUS_GATEWAY_ENDPOINT: 'wss://custom-gw.example.com',
		});

		const config = await loadConfig();

		expect(config.endpoints.api).toBe('https://custom-api.example.com');
		expect(config.endpoints.api_client).toBe('https://custom-api-client.example.com');
		expect(config.endpoints.gateway).toBe('wss://custom-gw.example.com');
		expect(config.endpoints.app).toBe('http://localhost:8088');
	});

	test('inserts the public port into portless endpoints on a non-standard port', async () => {
		stubMinimalEnv({
			NEXUS_MARKETING_ENDPOINT: 'http://localhost',
			NEXUS_MEDIA_ENDPOINT: 'http://localhost/media',
			NEXUS_MEDIA_PROXY_UPLOAD_RELAY_ENDPOINT: 'http://localhost/media',
			NEXUS_PASSKEY_ADDITIONAL_ALLOWED_ORIGINS: 'http://localhost',
		});

		const config = await loadConfig();

		expect(config.endpoints.marketing).toBe('http://localhost:8088');
		expect(config.endpoints.media).toBe('http://localhost:8088/media');
		expect(config.services.media_proxy.upload_relay.endpoint).toBe('http://localhost:8088/media');
		expect(config.auth.passkeys.additional_allowed_origins).toEqual(['http://localhost:8088']);
	});

	test('leaves a default https install untouched', async () => {
		stubMinimalEnv({
			NEXUS_BASE_DOMAIN: 'chat.example',
			NEXUS_PUBLIC_SCHEME: 'https',
			NEXUS_PUBLIC_PORT: '443',
			NEXUS_MARKETING_ENDPOINT: 'https://chat.example',
			NEXUS_MEDIA_ENDPOINT: 'https://chat.example/media',
			NEXUS_MEDIA_PROXY_UPLOAD_RELAY_ENDPOINT: 'https://chat.example/media',
			NEXUS_PASSKEY_ADDITIONAL_ALLOWED_ORIGINS: 'https://chat.example',
		});

		const config = await loadConfig();

		expect(config.endpoints.marketing).toBe('https://chat.example');
		expect(config.endpoints.media).toBe('https://chat.example/media');
		expect(config.endpoints.api).toBe('https://chat.example/api');
		expect(config.endpoints.gateway).toBe('wss://chat.example/gateway');
		expect(config.services.media_proxy.upload_relay.endpoint).toBe('https://chat.example/media');
		expect(config.auth.passkeys.additional_allowed_origins).toEqual(['https://chat.example']);
	});

	test('leaves a default http install untouched', async () => {
		stubMinimalEnv({
			NEXUS_BASE_DOMAIN: 'chat.example',
			NEXUS_PUBLIC_SCHEME: 'http',
			NEXUS_PUBLIC_PORT: '80',
			NEXUS_MARKETING_ENDPOINT: 'http://chat.example',
			NEXUS_MEDIA_ENDPOINT: 'http://chat.example/media',
			NEXUS_MEDIA_PROXY_UPLOAD_RELAY_ENDPOINT: 'http://chat.example/media',
		});

		const config = await loadConfig();

		expect(config.endpoints.marketing).toBe('http://chat.example');
		expect(config.endpoints.media).toBe('http://chat.example/media');
		expect(config.endpoints.gateway).toBe('ws://chat.example/gateway');
		expect(config.services.media_proxy.upload_relay.endpoint).toBe('http://chat.example/media');
	});

	test('leaves foreign hosts and already ported endpoints untouched', async () => {
		stubMinimalEnv({
			NEXUS_STATIC_CDN_ENDPOINT: 'https://cdn.example.net',
			NEXUS_MEDIA_ENDPOINT: 'https://media.example.net/media',
			NEXUS_MARKETING_ENDPOINT: 'http://localhost:9999',
			NEXUS_MEDIA_PROXY_UPLOAD_RELAY_ENDPOINT: 'http://localhost:8088/media',
		});

		const config = await loadConfig();

		expect(config.endpoints.static_cdn).toBe('https://cdn.example.net');
		expect(config.endpoints.media).toBe('https://media.example.net/media');
		expect(config.endpoints.marketing).toBe('http://localhost:9999');
		expect(config.services.media_proxy.upload_relay.endpoint).toBe('http://localhost:8088/media');
	});

	test('normalizes each passkey origin independently', async () => {
		stubMinimalEnv({
			NEXUS_PASSKEY_ADDITIONAL_ALLOWED_ORIGINS:
				'http://localhost,http://localhost:3000,https://desktop.example.net,android:apk-key-hash:keSY4bimyLqZQV7bKXgpa2xYuqXi0qZJzsYtp6gpx7w',
		});

		const config = await loadConfig();

		expect(config.auth.passkeys.additional_allowed_origins).toEqual([
			'http://localhost:8088',
			'http://localhost:3000',
			'https://desktop.example.net',
			'android:apk-key-hash:keSY4bimyLqZQV7bKXgpa2xYuqXi0qZJzsYtp6gpx7w',
		]);
	});

	test('includes the app origin alongside the default passkey origins', async () => {
		stubMinimalEnv();
		const config = await loadConfig();
		expect(config.auth.passkeys.additional_allowed_origins).toEqual([
			'https://nexus.app',
			'https://web.nexus.app',
			'https://web.canary.nexus.app',
			'https://nexus.com',
			'https://canary.nexus.com',
			'android:apk-key-hash:keSY4bimyLqZQV7bKXgpa2xYuqXi0qZJzsYtp6gpx7w',
			'http://localhost:8088',
		]);
	});

	test('defaults to no app origin aliases', async () => {
		stubMinimalEnv();
		const config = await loadConfig();
		expect(config.services.api.app_origin_aliases).toEqual([]);
	});

	test('normalizes and deduplicates app origin aliases', async () => {
		stubMinimalEnv({
			NEXUS_APP_ORIGIN_ALIASES:
				'https://Web.NEXUS.App/, https://nexus.com,https://nexus.com:443,http://localhost:3000',
		});
		const config = await loadConfig();
		expect(config.services.api.app_origin_aliases).toEqual([
			'https://web.nexus.app',
			'https://nexus.com',
			'http://localhost:3000',
		]);
	});

	test.each(['nexus.com', 'https://nexus.com/app', 'ftp://nexus.com', 'https://user@nexus.com'])(
		'rejects the app origin alias %s',
		async (alias) => {
			stubMinimalEnv({NEXUS_APP_ORIGIN_ALIASES: alias});
			await expect(loadConfig()).rejects.toThrow('NEXUS_APP_ORIGIN_ALIASES entry 1 must be an HTTP(S) origin');
		},
	);

	test('an empty client API endpoint override falls back to the derived endpoint', async () => {
		stubMinimalEnv({NEXUS_API_CLIENT_ENDPOINT: ''});
		expect((await loadConfig()).endpoints.api_client).toBe('http://localhost:8088/api');
	});

	test('defaults the passkey relying party to the deployment domain', async () => {
		stubMinimalEnv({
			NEXUS_BASE_DOMAIN: 'chat.example.com',
			NEXUS_PUBLIC_SCHEME: 'https',
			NEXUS_PUBLIC_PORT: '443',
		});

		const config = await loadConfig();

		expect(config.auth.passkeys.rp_id).toBe('chat.example.com');
	});

	test('a blank origin list keeps the built-in origins', async () => {
		stubMinimalEnv({
			NEXUS_BASE_DOMAIN: 'chat.example.com',
			NEXUS_PUBLIC_SCHEME: 'https',
			NEXUS_PUBLIC_PORT: '443',
			NEXUS_PASSKEY_ADDITIONAL_ALLOWED_ORIGINS: ' ',
		});

		const config = await loadConfig();

		expect(config.auth.passkeys.additional_allowed_origins).toContain('https://web.nexus.app');
		expect(config.auth.passkeys.additional_allowed_origins).toContain('https://chat.example.com');
	});

	test('blank values fall back to the code defaults', async () => {
		stubMinimalEnv({
			NEXUS_API_PORT: '',
			NEXUS_EMAIL_FROM_NAME: '',
			NEXUS_KV_URL: ' ',
			NEXUS_S3_FORCE_PATH_STYLE: '',
			NEXUS_API_STORAGE_CHANGE_FEED_SKIP_BUCKETS: '',
		});

		const config = await loadConfig();

		expect(config.services.api.port).toBe(8080);
		expect(config.integrations.email.from_name).toBe('');
		expect(config.internal.kv).toBe('redis://localhost:6379/0');
		expect(config.s3?.force_path_style).toBe(false);
		expect(config.services.api.storage_change_feed?.skip_buckets).toBeUndefined();
	});

	test.each(['support', 'Support <support@example.com>', 'a@example.com,b@example.com', ' support@example.com'])(
		'rejects %j as the email reply-to address',
		async (value) => {
			stubMinimalEnv({NEXUS_EMAIL_REPLY_TO_EMAIL: value});
			await expect(loadConfig()).rejects.toThrow('NEXUS_EMAIL_REPLY_TO_EMAIL must be a single email address');
		},
	);

	test('keeps explicit passkey relying party values', async () => {
		stubMinimalEnv({
			NEXUS_BASE_DOMAIN: 'chat.example.com',
			NEXUS_PUBLIC_SCHEME: 'https',
			NEXUS_PUBLIC_PORT: '443',
			NEXUS_PASSKEY_RP_ID: 'example.com',
			NEXUS_PASSKEY_ADDITIONAL_ALLOWED_ORIGINS: 'https://example.com,https://app.example.com',
		});

		const config = await loadConfig();

		expect(config.auth.passkeys.rp_id).toBe('example.com');
		expect(config.auth.passkeys.additional_allowed_origins).toEqual(['https://example.com', 'https://app.example.com']);
	});

	test('parses typed named environment variables', async () => {
		stubMinimalEnv({
			NEXUS_API_PORT: '9090',
			NEXUS_CASSANDRA_HOSTS: 'db1,db2',
			NEXUS_POSTGRES_HOST: 'pg1',
			NEXUS_POSTGRES_PORT: '5544',
			NEXUS_POSTGRES_MAX_CONNECTIONS: '7',
			NEXUS_POSTGRES_SSL_CA: '-----BEGIN CERTIFICATE-----\\n-----END CERTIFICATE-----',
			NEXUS_POSTGRES_PREPARED_STATEMENTS: 'false',
			NEXUS_API_WORKER_MODE: 'single_task',
			NEXUS_API_WORKER_TASK: 'processStripeWebhook',
			NEXUS_LIVEKIT_ENABLED: 'true',
			NEXUS_LIVEKIT_DEFAULT_REGION:
				'{"id":"local","name":"Local","emoji":"LC","latitude":59.3293,"longitude":18.0686}',
		});

		const config = await loadConfig();

		expect(config.services.api.port).toBe(9090);
		expect(config.database.cassandra.hosts).toEqual(['db1', 'db2']);
		expect(config.database.postgres.host).toBe('pg1');
		expect(config.database.postgres.port).toBe(5544);
		expect(config.database.postgres.max_connections).toBe(7);
		expect(config.database.postgres.ssl_ca).toBe('-----BEGIN CERTIFICATE-----\\n-----END CERTIFICATE-----');
		expect(config.database.postgres.prepared_statements).toBe(false);
		expect(config.services.api.worker?.mode).toBe('single_task');
		expect(config.services.api.worker?.task).toBe('processStripeWebhook');
		expect(config.integrations.voice.default_region?.id).toBe('local');
	});

	test('rejects an unknown worker lane', async () => {
		stubMinimalEnv({NEXUS_API_WORKER_MODE: 'single_lane', NEXUS_API_WORKER_LANE: 'publishing'});
		await expect(loadConfig()).rejects.toThrow('NEXUS_API_WORKER_LANE');
	});

	test('rejects single task worker mode without task env', async () => {
		stubMinimalEnv({NEXUS_API_WORKER_MODE: 'single_task'});
		await expect(loadConfig()).rejects.toThrow('NEXUS_API_WORKER_TASK');
	});

	test('rejects a storage change feed stream name that JetStream cannot use', async () => {
		stubMinimalEnv({
			NEXUS_API_STORAGE_CHANGE_FEED_ENABLED: 'true',
			NEXUS_API_STORAGE_CHANGE_FEED_STREAM: 'storage.changes',
		});
		await expect(loadConfig()).rejects.toThrow('NEXUS_API_STORAGE_CHANGE_FEED_STREAM');
	});

	test('rejects invalid Postgres typed environment values', async () => {
		stubMinimalEnv({NEXUS_POSTGRES_PORT: 'abc'});
		await expect(loadConfig()).rejects.toThrow('NEXUS_POSTGRES_PORT');
	});

	test('rejects a non-boolean Postgres prepared statements value', async () => {
		stubMinimalEnv({NEXUS_POSTGRES_PREPARED_STATEMENTS: 'maybe'});
		await expect(loadConfig()).rejects.toThrow('NEXUS_POSTGRES_PREPARED_STATEMENTS');
	});

	test('reads the profile pseudonym secret and requires it in production', async () => {
		stubMinimalEnv();
		expect((await loadConfig()).auth.profile_pseudonym_secret).toBe('test-profile-pseudonym-secret');
		resetConfig();
		stubMinimalEnv({NEXUS_PROFILE_PSEUDONYM_SECRET: ''});
		expect((await loadConfig()).auth.profile_pseudonym_secret).toBe('nexus-dev-profile-pseudonym-secret');
		resetConfig();
		stubMinimalEnv({
			NEXUS_ENV: 'production',
			NEXUS_POSTGRES_HOST: 'postgres.internal',
			NEXUS_POSTGRES_DATABASE: 'nexus_prod',
			NEXUS_POSTGRES_USERNAME: 'nexus_app',
			NEXUS_POSTGRES_PASSWORD: 'prod-postgres-secret',
			NEXUS_POSTGRES_SSL: 'true',
			NEXUS_PROFILE_PSEUDONYM_SECRET: '',
		});
		await expect(loadConfig()).rejects.toThrow('NEXUS_PROFILE_PSEUDONYM_SECRET is required');
	});

	test('rejects unsafe production Postgres defaults', async () => {
		stubMinimalEnv({NEXUS_ENV: 'production'});
		await expect(loadConfig()).rejects.toThrow('NEXUS_POSTGRES_HOST');
	});

	test('accepts explicitly configured production Postgres with TLS', async () => {
		stubMinimalEnv({
			NEXUS_ENV: 'production',
			NEXUS_POSTGRES_HOST: 'postgres.internal',
			NEXUS_POSTGRES_DATABASE: 'nexus_prod',
			NEXUS_POSTGRES_USERNAME: 'nexus_app',
			NEXUS_POSTGRES_PASSWORD: 'prod-postgres-secret',
			NEXUS_POSTGRES_SSL: 'true',
		});

		const config = await loadConfig();

		expect(config.database.postgres.host).toBe('postgres.internal');
		expect(config.database.postgres.ssl).toBe(true);
	});

	test('allows self-hosted production Postgres without TLS', async () => {
		stubMinimalEnv({
			NEXUS_ENV: 'production',
			NEXUS_SELF_HOSTED: 'true',
			NEXUS_POSTGRES_HOST: 'postgres',
			NEXUS_POSTGRES_DATABASE: 'nexus',
			NEXUS_POSTGRES_USERNAME: 'nexus',
			NEXUS_POSTGRES_PASSWORD: 'self-hosted-postgres-secret',
			NEXUS_POSTGRES_SSL: 'false',
		});

		const config = await loadConfig();

		expect(config.instance.self_hosted).toBe(true);
		expect(config.database.postgres.ssl).toBe(false);
	});

	test('still requires TLS for non-self-hosted production Postgres', async () => {
		stubMinimalEnv({
			NEXUS_ENV: 'production',
			NEXUS_POSTGRES_HOST: 'postgres.internal',
			NEXUS_POSTGRES_DATABASE: 'nexus_prod',
			NEXUS_POSTGRES_USERNAME: 'nexus_app',
			NEXUS_POSTGRES_PASSWORD: 'prod-postgres-secret',
			NEXUS_POSTGRES_SSL: 'false',
		});

		await expect(loadConfig()).rejects.toThrow('NEXUS_POSTGRES_SSL must be true');
	});

	test.each([
		['email', 'email'],
		['username', 'username'],
		[' Username ', 'username'],
	])('parses NEXUS_ACCOUNT_IDENTITY=%j', async (raw, expected) => {
		stubMinimalEnv({NEXUS_ACCOUNT_IDENTITY: raw});
		const config = await loadConfig();
		expect(config.instance.account_identity).toBe(expected);
	});

	test.each([
		['none', 'none'],
		[' Random ', 'random'],
		['', null],
	])('parses NEXUS_TAG_STYLE=%j', async (raw, expected) => {
		stubMinimalEnv({NEXUS_TAG_STYLE: raw});
		const config = await loadConfig();
		expect(config.instance.tag_style).toBe(expected);
	});

	test.each([
		['implicit', 'implicit'],
		[' StartTLS ', 'starttls'],
		['opportunistic', 'opportunistic'],
		['none', 'none'],
		['', undefined],
	])('parses NEXUS_EMAIL_SMTP_TLS_MODE=%j', async (raw, expected) => {
		stubMinimalEnv({NEXUS_EMAIL_SMTP_HOST: 'smtp.example.com', NEXUS_EMAIL_SMTP_TLS_MODE: raw});
		const config = await loadConfig();
		expect(config.integrations.email.smtp?.tls_mode).toBe(expected);
	});

	test.each(['tls', 'true'])('rejects the SMTP TLS mode %j', async (raw) => {
		stubMinimalEnv({NEXUS_EMAIL_SMTP_TLS_MODE: raw});
		await expect(loadConfig()).rejects.toThrow(
			'NEXUS_EMAIL_SMTP_TLS_MODE must be implicit, starttls, opportunistic or none',
		);
	});

	test.each(['sequential', 'zero_first'])('rejects the tag style %j', async (raw) => {
		stubMinimalEnv({NEXUS_TAG_STYLE: raw});
		await expect(loadConfig()).rejects.toThrow('NEXUS_TAG_STYLE must be none or random');
	});

	test('rejects an unknown account identity', async () => {
		stubMinimalEnv({NEXUS_ACCOUNT_IDENTITY: 'phone'});
		await expect(loadConfig()).rejects.toThrow('NEXUS_ACCOUNT_IDENTITY must be email or username');
	});

	test('loads a valid store catalogue', async () => {
		stubMinimalEnv({
			NEXUS_APP_STORE_ENABLED: 'true',
			NEXUS_APP_STORE_APPS: '[{"bundle_id":"com.nexus","app_apple_id":1234567890}]',
			NEXUS_APP_STORE_PRODUCTS: '{"com.nexus.plutonium.monthly":"monthly","com.nexus.gift.1month":"gift_1_month"}',
			NEXUS_GOOGLE_PLAY_ENABLED: 'true',
			NEXUS_GOOGLE_PLAY_PACKAGES: 'com.nexus',
			NEXUS_GOOGLE_PLAY_PRODUCTS: '{"plutonium:yearly":"yearly","gift_1_year":"gift_1_year"}',
			NEXUS_STORE_BILLING_SANDBOX_USER_IDS: '1234567890123456',
		});
		const config = await loadConfig();
		expect(config.integrations.app_store.apps).toEqual([{bundle_id: 'com.nexus', app_apple_id: 1234567890}]);
		expect(config.integrations.google_play.products).toEqual({
			'plutonium:yearly': 'yearly',
			gift_1_year: 'gift_1_year',
		});
		expect(config.integrations.store_billing.sandbox_user_ids).toEqual(['1234567890123456']);
	});

	test('rejects an App Store app without a numeric app_apple_id', async () => {
		for (const apps of [
			'[{"bundle_id":"com.nexus"}]',
			'[{"bundle_id":"com.nexus","app_apple_id":"1234567890"}]',
			'[{"bundle_id":"com.nexus","app_apple_id":0}]',
		]) {
			resetConfig();
			stubMinimalEnv({NEXUS_APP_STORE_APPS: apps});
			await expect(loadConfig()).rejects.toThrow('NEXUS_APP_STORE_APPS entry 1 must have a numeric app_apple_id');
		}
	});

	test('rejects an App Store app without a bundle id', async () => {
		stubMinimalEnv({NEXUS_APP_STORE_APPS: '[{"app_apple_id":1234567890}]'});
		await expect(loadConfig()).rejects.toThrow('NEXUS_APP_STORE_APPS entry 1 must have a bundle_id');
	});

	test('rejects an App Store product mapped to an unknown slot', async () => {
		stubMinimalEnv({NEXUS_APP_STORE_PRODUCTS: '{"com.nexus.visionary":"visionary"}'});
		await expect(loadConfig()).rejects.toThrow(
			'Invalid NEXUS_APP_STORE_PRODUCTS slot for com.nexus.visionary: visionary',
		);
	});

	test('rejects a Google Play product mapped to an unknown slot', async () => {
		stubMinimalEnv({NEXUS_GOOGLE_PLAY_PRODUCTS: '{"plutonium:weekly":"weekly"}'});
		await expect(loadConfig()).rejects.toThrow('Invalid NEXUS_GOOGLE_PLAY_PRODUCTS slot for plutonium:weekly: weekly');
	});

	test('rejects a Google Play product key that does not fit its slot kind', async () => {
		stubMinimalEnv({NEXUS_GOOGLE_PLAY_PRODUCTS: '{"plutonium":"monthly"}'});
		await expect(loadConfig()).rejects.toThrow(
			'NEXUS_GOOGLE_PLAY_PRODUCTS key plutonium does not match its monthly slot',
		);
		resetConfig();
		stubMinimalEnv({NEXUS_GOOGLE_PLAY_PRODUCTS: '{"gift:one":"gift_1_month"}'});
		await expect(loadConfig()).rejects.toThrow(
			'NEXUS_GOOGLE_PLAY_PRODUCTS key gift:one does not match its gift_1_month slot',
		);
	});

	test('rejects a sandbox user id that is not a snowflake', async () => {
		stubMinimalEnv({NEXUS_STORE_BILLING_SANDBOX_USER_IDS: '123,abc'});
		await expect(loadConfig()).rejects.toThrow(
			'NEXUS_STORE_BILLING_SANDBOX_USER_IDS must be a comma separated list of user ids',
		);
	});

	test('rejects an unknown cache purge adapter', async () => {
		stubMinimalEnv({NEXUS_CACHE_PURGE_ADAPTER: 'varnish'});
		await expect(loadConfig()).rejects.toThrow('Invalid NEXUS_CACHE_PURGE_ADAPTER: varnish');
	});

	test('rejects the http cache purge adapter without an endpoint', async () => {
		stubMinimalEnv({NEXUS_CACHE_PURGE_ADAPTER: 'http'});
		await expect(loadConfig()).rejects.toThrow('NEXUS_CACHE_PURGE_HTTP_ENDPOINT is required');
	});

	test('rejects the http cache purge adapter without a token', async () => {
		stubMinimalEnv({
			NEXUS_CACHE_PURGE_ADAPTER: 'http',
			NEXUS_CACHE_PURGE_HTTP_ENDPOINT: 'https://purge.internal/purge',
		});
		await expect(loadConfig()).rejects.toThrow('NEXUS_CACHE_PURGE_HTTP_TOKEN is required');
	});

	test('rejects a cache purge endpoint that is not an absolute http URL', async () => {
		for (const endpoint of ['/purge', 'purge.internal/purge', 'ftp://purge.internal/purge']) {
			stubMinimalEnv({NEXUS_CACHE_PURGE_ADAPTER: 'http', NEXUS_CACHE_PURGE_HTTP_ENDPOINT: endpoint});
			await expect(loadConfig()).rejects.toThrow(
				'NEXUS_CACHE_PURGE_HTTP_ENDPOINT must be an absolute http or https URL without credentials',
			);
		}
	});

	test('rejects a cache purge endpoint that contains credentials', async () => {
		stubMinimalEnv({
			NEXUS_CACHE_PURGE_ADAPTER: 'http',
			NEXUS_CACHE_PURGE_HTTP_ENDPOINT: 'https://purger:secret@purge.internal/purge',
		});
		await expect(loadConfig()).rejects.toThrow(
			'NEXUS_CACHE_PURGE_HTTP_ENDPOINT must be an absolute http or https URL without credentials',
		);
	});

	test('rejects a cache purge timeout outside 1000 to 10000', async () => {
		for (const timeout of ['999', '10001']) {
			stubMinimalEnv({
				NEXUS_CACHE_PURGE_ADAPTER: 'http',
				NEXUS_CACHE_PURGE_HTTP_ENDPOINT: 'https://purge.internal/purge',
				NEXUS_CACHE_PURGE_HTTP_TOKEN: 'purge-token',
				NEXUS_CACHE_PURGE_HTTP_TIMEOUT_MS: timeout,
			});
			await expect(loadConfig()).rejects.toThrow(
				'NEXUS_CACHE_PURGE_HTTP_TIMEOUT_MS must be an integer between 1000 and 10000',
			);
		}
	});

	test('rejects a cache purge token with spaces or control characters without echoing it', async () => {
		for (const token of ['secret\nvalue', 'secret\rvalue', 'secret value', 'secret-value\n']) {
			stubMinimalEnv({
				NEXUS_CACHE_PURGE_ADAPTER: 'http',
				NEXUS_CACHE_PURGE_HTTP_ENDPOINT: 'https://purge.internal/purge',
				NEXUS_CACHE_PURGE_HTTP_TOKEN: token,
			});
			await expect(loadConfig()).rejects.toThrow(
				/^NEXUS_CACHE_PURGE_HTTP_TOKEN must contain only visible ASCII characters$/,
			);
		}
	});

	test('leaves the cache purge settings unvalidated when the adapter is none', async () => {
		stubMinimalEnv({
			NEXUS_CACHE_PURGE_HTTP_ENDPOINT: 'ftp://purge.internal/purge',
			NEXUS_CACHE_PURGE_HTTP_TIMEOUT_MS: '1',
		});
		expect((await loadConfig()).integrations.cache_purge.adapter).toBe('none');
	});

	test('rejects a missing upload relay secret', async () => {
		stubMinimalEnv();
		vi.stubEnv('NEXUS_MEDIA_PROXY_UPLOAD_RELAY_SECRET_BASE64', '');

		await expect(loadConfig()).rejects.toThrow('NEXUS_MEDIA_PROXY_UPLOAD_RELAY_SECRET_BASE64 is required');
	});

	test('rejects a non-base64 upload relay secret', async () => {
		stubMinimalEnv({NEXUS_MEDIA_PROXY_UPLOAD_RELAY_SECRET_BASE64: 'not base64!'});
		await expect(loadConfig()).rejects.toThrow('NEXUS_MEDIA_PROXY_UPLOAD_RELAY_SECRET_BASE64 must be base64');
	});

	test('rejects an upload relay secret shorter than 32 bytes', async () => {
		stubMinimalEnv({NEXUS_MEDIA_PROXY_UPLOAD_RELAY_SECRET_BASE64: Buffer.alloc(16, 7).toString('base64')});
		await expect(loadConfig()).rejects.toThrow(
			'NEXUS_MEDIA_PROXY_UPLOAD_RELAY_SECRET_BASE64 must decode to at least 32 bytes',
		);
	});

	test('rejects a VAPID public key that is not a 65-byte uncompressed point', async () => {
		const {privateKey} = generateVapidPair();
		stubMinimalEnv({
			NEXUS_VAPID_PUBLIC_KEY: Buffer.alloc(64, 4).toString('base64url'),
			NEXUS_VAPID_PRIVATE_KEY: privateKey,
		});
		await expect(loadConfig()).rejects.toThrow(
			'NEXUS_VAPID_PUBLIC_KEY must be the base64url 65-byte uncompressed P-256 point',
		);
	});

	test('rejects a VAPID private key that is not a 32-byte scalar', async () => {
		const {publicKey} = generateVapidPair();
		stubMinimalEnv({
			NEXUS_VAPID_PUBLIC_KEY: publicKey,
			NEXUS_VAPID_PRIVATE_KEY: Buffer.alloc(31, 9).toString('base64url'),
		});
		await expect(loadConfig()).rejects.toThrow('NEXUS_VAPID_PRIVATE_KEY must be the base64url 32-byte P-256 scalar');
	});

	test('rejects a well formed VAPID scalar that does not derive the public point', async () => {
		const {publicKey} = generateVapidPair();
		const other = generateVapidPair();
		stubMinimalEnv({
			NEXUS_VAPID_PUBLIC_KEY: publicKey,
			NEXUS_VAPID_PRIVATE_KEY: other.privateKey,
		});
		await expect(loadConfig()).rejects.toThrow('NEXUS_VAPID_PRIVATE_KEY does not match NEXUS_VAPID_PUBLIC_KEY');
	});

	test('accepts a generated VAPID pair', async () => {
		const pair = generateVapidPair();
		stubMinimalEnv({
			NEXUS_VAPID_PUBLIC_KEY: pair.publicKey,
			NEXUS_VAPID_PRIVATE_KEY: pair.privateKey,
		});

		const config = await loadConfig();

		expect(config.auth.vapid.public_key).toBe(pair.publicKey);
		expect(config.auth.vapid.private_key).toBe(pair.privateKey);
	});

	test('inserts the public port into the LiveKit url', async () => {
		stubMinimalEnv({NEXUS_LIVEKIT_URL: 'http://localhost/livekit'});

		const config = await loadConfig();

		expect(config.integrations.voice.url).toBe('http://localhost:8088/livekit');
	});

	test('inserts the public port into every other public url the config contains', async () => {
		stubMinimalEnv({
			NEXUS_S3_PUBLIC_ENDPOINT: 'http://localhost/s3',
			NEXUS_EMAIL_APP_BASE_URL: 'http://localhost',
			NEXUS_AUTH_BLUESKY_CLIENT_URI: 'http://localhost',
			NEXUS_AUTH_BLUESKY_TOS_URI: 'http://localhost/terms',
			NEXUS_APP_ICON_URL: 'http://localhost/icon.png',
			NEXUS_LIVEKIT_INTERNAL_URL: 'http://livekit:7880',
		});

		const config = await loadConfig();

		expect(config.s3?.presigned_url_base).toBe('http://localhost:8088/s3');
		expect(config.integrations.email.app_base_url).toBe('http://localhost:8088');
		expect(config.auth.bluesky.client_uri).toBe('http://localhost:8088');
		expect(config.auth.bluesky.tos_uri).toBe('http://localhost:8088/terms');
		expect(config.instance.branding.icon_url).toBe('http://localhost:8088/icon.png');
		expect(config.integrations.voice.internal_url).toBe('http://livekit:7880');
	});

	test('rejects a public port outside the valid range', async () => {
		stubMinimalEnv({NEXUS_PUBLIC_PORT: '70000'});
		await expect(loadConfig()).rejects.toThrow('NEXUS_PUBLIC_PORT must be an integer between 1 and 65535');
	});
});

describe('report retention settings', () => {
	beforeEach(() => {
		resetConfig();
		clearNEXUSEnv();
	});

	afterEach(() => {
		resetConfig();
		vi.unstubAllEnvs();
	});

	test('deletes reports for real after 365 days with no resolved-report rule by default', async () => {
		stubMinimalEnv();
		const config = await loadConfig();
		expect(config.report_retention).toEqual({days: 365, resolved_days: null, dry_run: false});
	});

	test('reads both day settings and the dry run switch from the environment', async () => {
		stubMinimalEnv({
			NEXUS_REPORT_RETENTION_DAYS: '730',
			NEXUS_RESOLVED_REPORT_RETENTION_DAYS: ' 90 ',
			NEXUS_REPORT_RETENTION_DRY_RUN: 'TRUE',
		});
		const config = await loadConfig();
		expect(config.report_retention).toEqual({days: 730, resolved_days: 90, dry_run: true});
	});

	test('an empty resolved-report setting leaves the rule off', async () => {
		stubMinimalEnv({NEXUS_RESOLVED_REPORT_RETENTION_DAYS: '', NEXUS_REPORT_RETENTION_DRY_RUN: 'false'});
		const config = await loadConfig();
		expect(config.report_retention).toEqual({days: 365, resolved_days: null, dry_run: false});
	});

	test.each([
		['NEXUS_REPORT_RETENTION_DAYS', '0', 'NEXUS_REPORT_RETENTION_DAYS must be an integer between 1 and 36500'],
		['NEXUS_REPORT_RETENTION_DAYS', '36501', 'NEXUS_REPORT_RETENTION_DAYS must be an integer between 1 and 36500'],
		['NEXUS_REPORT_RETENTION_DAYS', '1.5', 'NEXUS_REPORT_RETENTION_DAYS must be an integer, got "1.5"'],
		[
			'NEXUS_RESOLVED_REPORT_RETENTION_DAYS',
			'0',
			'NEXUS_RESOLVED_REPORT_RETENTION_DAYS must be an integer between 1 and 36500',
		],
		[
			'NEXUS_RESOLVED_REPORT_RETENTION_DAYS',
			'-30',
			'NEXUS_RESOLVED_REPORT_RETENTION_DAYS must be an integer between 1 and 36500',
		],
		['NEXUS_REPORT_RETENTION_DRY_RUN', '1', 'NEXUS_REPORT_RETENTION_DRY_RUN must be true or false'],
	])('refuses %s=%j', async (name, value, message) => {
		stubMinimalEnv({[name]: value});
		await expect(loadConfig()).rejects.toThrow(message);
	});
});

describe('NEXUS_PUBLIC_ORIGIN', () => {
	beforeEach(() => {
		resetConfig();
		clearNEXUSEnv();
	});

	afterEach(() => {
		resetConfig();
		vi.unstubAllEnvs();
	});

	test('a ported origin ports every derived endpoint and every compose override', async () => {
		stubMinimalEnv({
			NEXUS_BASE_DOMAIN: 'chat.example.com',
			NEXUS_PUBLIC_SCHEME: 'https',
			NEXUS_PUBLIC_PORT: '',
			NEXUS_PUBLIC_ORIGIN: 'https://chat.example.com:29080',
			NEXUS_MARKETING_ENDPOINT: 'https://chat.example.com:29080',
			NEXUS_MEDIA_ENDPOINT: 'https://chat.example.com:29080/media',
			NEXUS_MEDIA_PROXY_UPLOAD_RELAY_ENDPOINT: 'https://chat.example.com:29080/media',
			NEXUS_LIVEKIT_URL: 'https://chat.example.com:29080/livekit',
			NEXUS_PASSKEY_ADDITIONAL_ALLOWED_ORIGINS: 'https://chat.example.com:29080',
		});

		const config = await loadConfig();

		expect(config.domain.public_port).toBe(29080);
		expect(config.domain.public_origin).toBe('https://chat.example.com:29080');
		expect(config.endpoints.api_client).toBe('https://chat.example.com:29080/api');
		expect(config.endpoints.app).toBe('https://chat.example.com:29080');
		expect(config.endpoints.gateway).toBe('wss://chat.example.com:29080/gateway');
		expect(config.endpoints.admin).toBe('https://chat.example.com:29080/admin');
		expect(config.endpoints.marketing).toBe('https://chat.example.com:29080');
		expect(config.endpoints.media).toBe('https://chat.example.com:29080/media');
		expect(config.services.media_proxy.upload_relay.endpoint).toBe('https://chat.example.com:29080/media');
		expect(config.integrations.voice.url).toBe('https://chat.example.com:29080/livekit');
		expect(config.auth.passkeys.additional_allowed_origins).toEqual(['https://chat.example.com:29080']);
	});

	test('the origin port wins over a NEXUS_PUBLIC_PORT that disagrees', async () => {
		stubMinimalEnv({
			NEXUS_BASE_DOMAIN: 'chat.example.com',
			NEXUS_PUBLIC_SCHEME: 'https',
			NEXUS_PUBLIC_PORT: '443',
			NEXUS_PUBLIC_ORIGIN: 'https://chat.example.com:29080',
		});

		const config = await loadConfig();

		expect(config.domain.public_port).toBe(29080);
		expect(config.endpoints.app).toBe('https://chat.example.com:29080');
		expect(config.endpoints.api_client).toBe('https://chat.example.com:29080/api');
		expect(config.endpoints.gateway).toBe('wss://chat.example.com:29080/gateway');
		expect(config.endpoints.admin).toBe('https://chat.example.com:29080/admin');
	});

	test('accepts an origin whose port matches NEXUS_PUBLIC_PORT', async () => {
		stubMinimalEnv({
			NEXUS_BASE_DOMAIN: 'chat.example.com',
			NEXUS_PUBLIC_SCHEME: 'https',
			NEXUS_PUBLIC_PORT: '29080',
			NEXUS_PUBLIC_ORIGIN: 'https://chat.example.com:29080',
		});

		expect((await loadConfig()).endpoints.gateway).toBe('wss://chat.example.com:29080/gateway');
	});

	test('normalizes an origin written with an explicit default port', async () => {
		stubMinimalEnv({
			NEXUS_BASE_DOMAIN: 'chat.example.com',
			NEXUS_PUBLIC_SCHEME: 'https',
			NEXUS_PUBLIC_PORT: '443',
			NEXUS_PUBLIC_ORIGIN: 'https://chat.example.com:443',
			NEXUS_ADMIN_ENDPOINT: 'https://chat.example.com/admin',
		});

		const config = await loadConfig();

		expect(config.domain.public_port).toBe(443);
		expect(config.domain.public_origin).toBe('https://chat.example.com');
		expect(config.endpoints.admin).toBe('https://chat.example.com/admin');
		expect(config.endpoints.app).toBe('https://chat.example.com');
		expect(config.endpoints.gateway).toBe('wss://chat.example.com/gateway');
	});

	test('takes the scheme and the domain from the origin when neither is set', async () => {
		stubMinimalEnv({
			NEXUS_BASE_DOMAIN: '',
			NEXUS_PUBLIC_SCHEME: '',
			NEXUS_PUBLIC_PORT: '',
			NEXUS_PUBLIC_ORIGIN: 'https://chat.example.com:29080',
		});

		const config = await loadConfig();

		expect(config.domain.base_domain).toBe('chat.example.com');
		expect(config.domain.public_scheme).toBe('https');
		expect(config.domain.public_port).toBe(29080);
	});

	test('the origin scheme wins over a NEXUS_PUBLIC_SCHEME that disagrees', async () => {
		stubMinimalEnv({
			NEXUS_BASE_DOMAIN: 'chat.example.com',
			NEXUS_PUBLIC_SCHEME: 'http',
			NEXUS_PUBLIC_PORT: '',
			NEXUS_PUBLIC_ORIGIN: 'https://chat.example.com',
		});

		const config = await loadConfig();

		expect(config.domain.public_scheme).toBe('https');
		expect(config.endpoints.app).toBe('https://chat.example.com');
		expect(config.endpoints.gateway).toBe('wss://chat.example.com/gateway');
	});

	test('the origin host wins over a NEXUS_BASE_DOMAIN that disagrees', async () => {
		stubMinimalEnv({
			NEXUS_BASE_DOMAIN: 'chat.example.com',
			NEXUS_PUBLIC_SCHEME: 'https',
			NEXUS_PUBLIC_PORT: '',
			NEXUS_PUBLIC_ORIGIN: 'https://other.example.com',
		});

		const config = await loadConfig();

		expect(config.domain.base_domain).toBe('other.example.com');
		expect(config.endpoints.app).toBe('https://other.example.com');
	});

	test('refuses to boot on an origin that is not a bare origin', async () => {
		stubMinimalEnv({NEXUS_PUBLIC_ORIGIN: 'https://chat.example.com/app'});
		await expect(loadConfig()).rejects.toThrow(
			'NEXUS_PUBLIC_ORIGIN must be a scheme, host and optional port such as https://chat.example.com:8443',
		);
	});

	test('leaves the derived origin canonical when nothing is set', async () => {
		stubMinimalEnv();
		expect((await loadConfig()).domain.public_origin).toBe('http://localhost:8088');
	});
});

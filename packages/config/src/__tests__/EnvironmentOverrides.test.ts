// SPDX-License-Identifier: Nebula

import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildNamedNEXUSEnvOverrides, readEnvValue} from '@nexus/config/src/config_loader/EnvironmentOverrides';
import {afterAll, describe, expect, test} from 'vitest';

describe('buildNamedNEXUSEnvOverrides', () => {
	test('builds canonical split env overrides', () => {
		const overrides = buildNamedNEXUSEnvOverrides({
			NEXUS_BASE_DOMAIN: 'canonical.example',
			NEXUS_API_ENDPOINT: 'https://canonical.example/api',
			NEXUS_PASSKEY_ADDITIONAL_ALLOWED_ORIGINS: 'https://a.example, https://b.example',
			NEXUS_S3_FORCE_PATH_STYLE: 'true',
			NEXUS_AUTH_BLUESKY_KEYS: '[{"kid":"key-1","private_key_path":"/etc/nexus/keys/bluesky.pem"}]',
			NEXUS_STRIPE_PRICE_MONTHLY_USD: 'price_monthly_usd',
			NEXUS_EMAIL_REPLY_TO_EMAIL: 'support@example.com',
		});

		expect(overrides).toMatchObject({
			domain: {base_domain: 'canonical.example'},
			endpoint_overrides: {api: 'https://canonical.example/api'},
			auth: {
				passkeys: {additional_allowed_origins: ['https://a.example', 'https://b.example']},
				bluesky: {keys: [{kid: 'key-1', private_key_path: '/etc/nexus/keys/bluesky.pem'}]},
			},
			s3: {force_path_style: true},
			integrations: {
				stripe: {prices: {monthly_usd: 'price_monthly_usd'}},
				email: {reply_to_email: 'support@example.com'},
			},
		});
	});

	test.each(['', ' ', '\t\n'])('treats %j as unset for every value type', (blank) => {
		expect(
			buildNamedNEXUSEnvOverrides({
				NEXUS_BASE_DOMAIN: blank,
				NEXUS_API_PORT: blank,
				NEXUS_S3_FORCE_PATH_STYLE: blank,
				NEXUS_API_IP_BAN_EXEMPT_IPS: blank,
				NEXUS_PASSKEY_ADDITIONAL_ALLOWED_ORIGINS: blank,
				NEXUS_LIVEKIT_DEFAULT_REGION: blank,
				NEXUS_VOICE_P2P_STUN_URLS: blank,
				NEXUS_AUTH_BLUESKY_KEYS: blank,
				NEXUS_EMAIL_FROM_NAME: blank,
				NEXUS_EMAIL_REPLY_TO_EMAIL: blank,
			}),
		).toEqual({});
	});

	test('maps the setup token onto the instance setup section', () => {
		expect(buildNamedNEXUSEnvOverrides({NEXUS_SETUP_TOKEN: 'a-setup-token-of-at-least-32-characters'})).toEqual({
			instance: {setup: {token: 'a-setup-token-of-at-least-32-characters'}},
		});
	});

	test('a blank canonical name falls through to its alias', () => {
		expect(
			buildNamedNEXUSEnvOverrides({
				NEXUS_NATS_URL: '',
				NEXUS_NATS_CORE_URL: 'nats://alias',
			}),
		).toMatchObject({
			services: {nats: {core_url: 'nats://alias'}},
		});
	});

	test('a blank alias is unset too', () => {
		expect(buildNamedNEXUSEnvOverrides({NEXUS_NATS_URL: '', NEXUS_NATS_CORE_URL: ' '})).toEqual({});
	});

	test('none clears the storage change feed skip list', () => {
		expect(buildNamedNEXUSEnvOverrides({NEXUS_API_STORAGE_CHANGE_FEED_SKIP_BUCKETS: ' None '})).toEqual({
			services: {api: {storage_change_feed: {skip_buckets: []}}},
		});
	});

	test('rejects a non-integer value for an integer override', () => {
		expect(() => buildNamedNEXUSEnvOverrides({NEXUS_API_PORT: '80a'})).toThrow(
			'NEXUS_API_PORT must be an integer, got "80a"',
		);
	});

	test('the canonical name wins over its alias regardless of declaration order', () => {
		expect(
			buildNamedNEXUSEnvOverrides({
				NEXUS_MEDIA_PROXY_ENDPOINT: 'http://alias',
				NEXUS_INTERNAL_MEDIA_PROXY_ENDPOINT: 'http://canonical',
				NEXUS_NATS_CORE_URL: 'nats://alias',
				NEXUS_NATS_URL: 'nats://canonical',
			}),
		).toMatchObject({
			internal: {media_proxy: 'http://canonical'},
			services: {nats: {core_url: 'nats://canonical'}},
		});
	});

	test('an alias alone still applies', () => {
		expect(
			buildNamedNEXUSEnvOverrides({
				NEXUS_MEDIA_PROXY_ENDPOINT: 'http://alias',
				NEXUS_NATS_CORE_URL: 'nats://alias',
			}),
		).toMatchObject({
			internal: {media_proxy: 'http://alias'},
			services: {nats: {core_url: 'nats://alias'}},
		});
	});

	test('maps the peer-to-peer STUN urls onto integrations.voice', () => {
		expect(
			buildNamedNEXUSEnvOverrides({
				NEXUS_VOICE_P2P_STUN_URLS: 'stun:stun.example.com:3478, stun:stun2.example.com:3478',
			}),
		).toEqual({
			integrations: {
				voice: {
					p2p_stun_urls: ['stun:stun.example.com:3478', 'stun:stun2.example.com:3478'],
				},
			},
		});
	});

	test('rejects malformed JSON for a JSON-shaped override', () => {
		expect(() => buildNamedNEXUSEnvOverrides({NEXUS_LIVEKIT_DEFAULT_REGION: '{bad'})).toThrow(
			'NEXUS_LIVEKIT_DEFAULT_REGION must be valid JSON',
		);
	});

	test('parses the legacy Stripe price map onto integrations.stripe.legacy_prices', () => {
		const overrides = buildNamedNEXUSEnvOverrides({
			NEXUS_STRIPE_LEGACY_PRICES:
				'{"monthly_brl":["price_old_monthly_brl","price_older_monthly_brl"],"yearly_brl":["price_old_yearly_brl"],"monthly_try":["price_archived_monthly_try"],"gift_1_month_brl":["price_old_gift_1_month_brl"],"gift_1_year_brl":["price_old_gift_1_year_brl"]}',
		});

		expect(overrides).toMatchObject({
			integrations: {
				stripe: {
					legacy_prices: {
						monthly_brl: ['price_old_monthly_brl', 'price_older_monthly_brl'],
						yearly_brl: ['price_old_yearly_brl'],
						monthly_try: ['price_archived_monthly_try'],
						gift_1_month_brl: ['price_old_gift_1_month_brl'],
						gift_1_year_brl: ['price_old_gift_1_year_brl'],
					},
				},
			},
		});
	});

	test('the legacy Stripe price map does not disturb the live price map', () => {
		const overrides = buildNamedNEXUSEnvOverrides({
			NEXUS_STRIPE_PRICES: '{"monthly_brl":"price_new_monthly_brl"}',
			NEXUS_STRIPE_LEGACY_PRICES: '{"monthly_brl":["price_old_monthly_brl"]}',
		});

		const stripe = (overrides.integrations as {stripe: Record<string, unknown>}).stripe;
		expect(stripe.prices).toEqual({monthly_brl: 'price_new_monthly_brl'});
		expect(stripe.legacy_prices).toEqual({monthly_brl: ['price_old_monthly_brl']});
	});

	test('rejects malformed JSON for the legacy Stripe price map', () => {
		expect(() => buildNamedNEXUSEnvOverrides({NEXUS_STRIPE_LEGACY_PRICES: '{"monthly_brl":['})).toThrow(
			'NEXUS_STRIPE_LEGACY_PRICES must be valid JSON',
		);
	});

	test('an individual Stripe price env var wins over the blob, and the blob keys it does not name survive', () => {
		// The deploy runbook flips one slot at a time with NEXUS_STRIPE_PRICE_* while the blob stays
		// pinned to the previous release. The individual variable is declared after the blob, so it is
		// merged into the blob rather than replaced by it.
		const overrides = buildNamedNEXUSEnvOverrides({
			NEXUS_STRIPE_PRICES:
				'{"monthly_brl":"price_blob_monthly_brl","yearly_brl":"price_blob_yearly_brl","monthly_usd":"price_blob_monthly_usd"}',
			NEXUS_STRIPE_PRICE_MONTHLY_BRL: 'price_individual_monthly_brl',
		});

		expect((overrides.integrations as {stripe: {prices: unknown}}).stripe.prices).toEqual({
			monthly_brl: 'price_individual_monthly_brl',
			yearly_brl: 'price_blob_yearly_brl',
			monthly_usd: 'price_blob_monthly_usd',
		});
	});

	test('several individual Stripe price env vars merge into the blob together', () => {
		const overrides = buildNamedNEXUSEnvOverrides({
			NEXUS_STRIPE_PRICES: '{"monthly_brl":"price_blob_monthly_brl","yearly_brl":"price_blob_yearly_brl"}',
			NEXUS_STRIPE_PRICE_MONTHLY_BRL: 'price_individual_monthly_brl',
			NEXUS_STRIPE_PRICE_YEARLY_BRL: 'price_individual_yearly_brl',
			NEXUS_STRIPE_PRICE_MONTHLY_EUR: 'price_individual_monthly_eur',
		});

		expect((overrides.integrations as {stripe: {prices: unknown}}).stripe.prices).toEqual({
			monthly_brl: 'price_individual_monthly_brl',
			yearly_brl: 'price_individual_yearly_brl',
			monthly_eur: 'price_individual_monthly_eur',
		});
	});

	test('maps the four ISK Stripe price variables', () => {
		const overrides = buildNamedNEXUSEnvOverrides({
			NEXUS_STRIPE_PRICE_MONTHLY_ISK: 'price_monthly_isk',
			NEXUS_STRIPE_PRICE_YEARLY_ISK: 'price_yearly_isk',
			NEXUS_STRIPE_PRICE_GIFT_1_MONTH_ISK: 'price_gift_1_month_isk',
			NEXUS_STRIPE_PRICE_GIFT_1_YEAR_ISK: 'price_gift_1_year_isk',
		});

		expect((overrides.integrations as {stripe: {prices: unknown}}).stripe.prices).toEqual({
			monthly_isk: 'price_monthly_isk',
			yearly_isk: 'price_yearly_isk',
			gift_1_month_isk: 'price_gift_1_month_isk',
			gift_1_year_isk: 'price_gift_1_year_isk',
		});
	});

	test('the Stripe price blob applies on its own when no individual price var is set', () => {
		const overrides = buildNamedNEXUSEnvOverrides({
			NEXUS_STRIPE_PRICES: '{"monthly_brl":"price_blob_monthly_brl","yearly_brl":"price_blob_yearly_brl"}',
		});

		expect((overrides.integrations as {stripe: {prices: unknown}}).stripe.prices).toEqual({
			monthly_brl: 'price_blob_monthly_brl',
			yearly_brl: 'price_blob_yearly_brl',
		});
	});

	test('maps the App Store variables onto integrations.app_store', () => {
		const overrides = buildNamedNEXUSEnvOverrides({
			NEXUS_APP_STORE_ENABLED: 'true',
			NEXUS_APP_STORE_ISSUER_ID: 'issuer-1',
			NEXUS_APP_STORE_KEY_ID: 'KEY123',
			NEXUS_APP_STORE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----',
			NEXUS_APP_STORE_PRIVATE_KEY_PATH: '/etc/nexus/keys/app-store.p8',
			NEXUS_APP_STORE_APPS: '[{"bundle_id":"com.nexus","app_apple_id":1234567890}]',
			NEXUS_APP_STORE_PRODUCTS: '{"com.nexus.plutonium.monthly":"monthly","com.nexus.gift.1year":"gift_1_year"}',
		});

		expect(overrides).toEqual({
			integrations: {
				app_store: {
					enabled: true,
					issuer_id: 'issuer-1',
					key_id: 'KEY123',
					private_key: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----',
					private_key_path: '/etc/nexus/keys/app-store.p8',
					apps: [{bundle_id: 'com.nexus', app_apple_id: 1234567890}],
					products: {'com.nexus.plutonium.monthly': 'monthly', 'com.nexus.gift.1year': 'gift_1_year'},
				},
			},
		});
	});

	test('maps the Google Play variables onto integrations.google_play', () => {
		const overrides = buildNamedNEXUSEnvOverrides({
			NEXUS_GOOGLE_PLAY_ENABLED: 'true',
			NEXUS_GOOGLE_PLAY_PACKAGES: 'com.nexus, com.nexus.canary',
			NEXUS_GOOGLE_PLAY_CLIENT_EMAIL: 'billing@nexus.iam.gserviceaccount.com',
			NEXUS_GOOGLE_PLAY_PRIVATE_KEY: 'pem',
			NEXUS_GOOGLE_PLAY_PRIVATE_KEY_PATH: '/etc/nexus/keys/play.pem',
			NEXUS_GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH: '/etc/nexus/keys/play.json',
			NEXUS_GOOGLE_PLAY_TOKEN_URI: 'https://oauth2.example/token',
			NEXUS_GOOGLE_PLAY_PRODUCTS: '{"plutonium:monthly":"monthly","gift_1_month":"gift_1_month"}',
			NEXUS_GOOGLE_PLAY_PUSH_AUDIENCE: 'https://api.nexus.app/webhooks/google-play',
			NEXUS_GOOGLE_PLAY_PUSH_SERVICE_ACCOUNT_EMAIL: 'rtdn@nexus.iam.gserviceaccount.com',
		});

		expect(overrides).toEqual({
			integrations: {
				google_play: {
					enabled: true,
					packages: ['com.nexus', 'com.nexus.canary'],
					client_email: 'billing@nexus.iam.gserviceaccount.com',
					private_key: 'pem',
					private_key_path: '/etc/nexus/keys/play.pem',
					service_account_json_path: '/etc/nexus/keys/play.json',
					token_uri: 'https://oauth2.example/token',
					products: {'plutonium:monthly': 'monthly', gift_1_month: 'gift_1_month'},
					push_audience: 'https://api.nexus.app/webhooks/google-play',
					push_service_account_email: 'rtdn@nexus.iam.gserviceaccount.com',
				},
			},
		});
	});

	test('maps the store billing sandbox variables onto integrations.store_billing', () => {
		expect(
			buildNamedNEXUSEnvOverrides({
				NEXUS_STORE_BILLING_SANDBOX_USER_IDS: '1234, 5678',
				NEXUS_STORE_BILLING_SANDBOX_ENTITLES_ALL: 'true',
			}),
		).toEqual({
			integrations: {store_billing: {sandbox_user_ids: ['1234', '5678'], sandbox_entitles_all: true}},
		});
	});

	test('rejects a store enabled flag that is not a boolean', () => {
		expect(() => buildNamedNEXUSEnvOverrides({NEXUS_APP_STORE_ENABLED: 'yes'})).toThrow(
			'NEXUS_APP_STORE_ENABLED must be true or false',
		);
		expect(() => buildNamedNEXUSEnvOverrides({NEXUS_GOOGLE_PLAY_ENABLED: '1'})).toThrow(
			'NEXUS_GOOGLE_PLAY_ENABLED must be true or false',
		);
	});

	test('rejects a store app list or product map with the wrong JSON shape', () => {
		expect(() => buildNamedNEXUSEnvOverrides({NEXUS_APP_STORE_APPS: '{"bundle_id":"com.nexus"}'})).toThrow(
			'NEXUS_APP_STORE_APPS must be a JSON array',
		);
		expect(() => buildNamedNEXUSEnvOverrides({NEXUS_APP_STORE_PRODUCTS: '["monthly"]'})).toThrow(
			'NEXUS_APP_STORE_PRODUCTS must be a JSON object',
		);
		expect(() => buildNamedNEXUSEnvOverrides({NEXUS_GOOGLE_PLAY_PRODUCTS: '{bad'})).toThrow(
			'NEXUS_GOOGLE_PLAY_PRODUCTS must be valid JSON',
		);
	});
});

describe('readEnvValue with NAME_FILE', () => {
	const dir = mkdtempSync(join(tmpdir(), 'nexus-env-file-'));
	afterAll(() => rmSync(dir, {recursive: true, force: true}));

	function secretFile(name: string, contents: string): string {
		const path = join(dir, name);
		writeFileSync(path, contents);
		return path;
	}

	test('reads the value from NAME_FILE when NAME is unset', () => {
		const path = secretFile('plain', 'from-file\n');
		expect(readEnvValue({NEXUS_SUDO_MODE_SECRET_FILE: path}, 'NEXUS_SUDO_MODE_SECRET')).toBe('from-file');
	});

	test('reads the value from NAME_FILE when NAME is blank', () => {
		const path = secretFile('blank', 'from-file');
		expect(
			readEnvValue({NEXUS_SUDO_MODE_SECRET: ' ', NEXUS_SUDO_MODE_SECRET_FILE: path}, 'NEXUS_SUDO_MODE_SECRET'),
		).toBe('from-file');
	});

	test('trims only one trailing newline', () => {
		const crlf = secretFile('crlf', 'value\r\n');
		const multi = secretFile('multi', '-----BEGIN-----\nabc\n-----END-----\n\n');
		expect(readEnvValue({X_FILE: crlf}, 'X')).toBe('value');
		expect(readEnvValue({X_FILE: multi}, 'X')).toBe('-----BEGIN-----\nabc\n-----END-----\n');
	});

	test('treats an empty file as unset', () => {
		const path = secretFile('empty', '\n');
		expect(readEnvValue({X_FILE: path}, 'X')).toBeUndefined();
	});

	test('keeps NAME when NAME_FILE is blank', () => {
		expect(readEnvValue({X: 'direct', X_FILE: ''}, 'X')).toBe('direct');
	});

	test('rejects NAME and NAME_FILE together', () => {
		const path = secretFile('both', 'from-file');
		expect(() => readEnvValue({X: 'direct', X_FILE: path}, 'X')).toThrow('X and X_FILE are both set, set only one');
	});

	test('names NAME_FILE and the path when the file is missing', () => {
		const path = join(dir, 'missing');
		expect(() => readEnvValue({X_FILE: path}, 'X')).toThrow(`X_FILE could not read ${path} (ENOENT)`);
	});

	test('rejects a file that is not valid UTF-8', () => {
		const path = join(dir, 'binary');
		writeFileSync(path, Buffer.from([0xff, 0x61]));
		expect(() => readEnvValue({X_FILE: path}, 'X')).toThrow(`X_FILE could not read ${path} (`);
	});

	test('feeds named overrides and aliases', () => {
		const secret = secretFile('stripe', 'sk_test_file\n');
		const nats = secretFile('nats', 'nats://nats:4222\n');
		expect(
			buildNamedNEXUSEnvOverrides({NEXUS_STRIPE_SECRET_KEY_FILE: secret, NEXUS_NATS_CORE_URL_FILE: nats}),
		).toMatchObject({
			integrations: {stripe: {secret_key: 'sk_test_file'}},
			services: {nats: {core_url: 'nats://nats:4222'}},
		});
	});
});

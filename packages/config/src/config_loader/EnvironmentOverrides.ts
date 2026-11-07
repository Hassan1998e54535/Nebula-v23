// SPDX-License-Identifier: Nebula

import {readFileSync} from 'node:fs';
import {type ConfigObject, isConfigObject} from '@nexus/config/src/config_loader/ConfigObject';

type ConfigPathKey = string | number;
type ConfigContainer = ConfigObject | Array<unknown>;

type EnvValueParser = (raw: string) => unknown;

interface NamedEnvOverride {
	path: Array<ConfigPathKey>;
	parse?: EnvValueParser;
}

const NAMED_NEXUS_ENV_OVERRIDES: Record<string, NamedEnvOverride> = {
	NEXUS_ENV: {path: ['env']},
	NEXUS_BASE_DOMAIN: {path: ['domain', 'base_domain']},
	NEXUS_PUBLIC_ORIGIN: {path: ['domain', 'public_origin']},
	NEXUS_PUBLIC_SCHEME: {path: ['domain', 'public_scheme']},
	NEXUS_PUBLIC_PORT: {path: ['domain', 'public_port'], parse: parseInteger},
	NEXUS_STATIC_CDN_DOMAIN: {path: ['domain', 'static_cdn_domain']},
	NEXUS_INVITE_DOMAIN: {path: ['domain', 'invite_domain']},
	NEXUS_GIFT_DOMAIN: {path: ['domain', 'gift_domain']},
	NEXUS_API_ENDPOINT: {path: ['endpoint_overrides', 'api']},
	NEXUS_API_CLIENT_ENDPOINT: {path: ['endpoint_overrides', 'api_client']},
	NEXUS_APP_ENDPOINT: {path: ['endpoint_overrides', 'app']},
	NEXUS_GATEWAY_ENDPOINT: {path: ['endpoint_overrides', 'gateway']},
	NEXUS_MEDIA_ENDPOINT: {path: ['endpoint_overrides', 'media']},
	NEXUS_STATIC_CDN_ENDPOINT: {path: ['endpoint_overrides', 'static_cdn']},
	NEXUS_ADMIN_ENDPOINT: {path: ['endpoint_overrides', 'admin']},
	NEXUS_MARKETING_ENDPOINT: {path: ['endpoint_overrides', 'marketing']},
	NEXUS_INVITE_ENDPOINT: {path: ['endpoint_overrides', 'invite']},
	NEXUS_GIFT_ENDPOINT: {path: ['endpoint_overrides', 'gift']},
	NEXUS_TRUST_CLIENT_IP_HEADER: {path: ['proxy', 'trust_client_ip_header'], parse: parseBoolean},
	NEXUS_CLIENT_IP_HEADER_NAME: {path: ['proxy', 'client_ip_header']},
	NEXUS_CASSANDRA_HOSTS: {path: ['database', 'cassandra', 'hosts'], parse: parseCsv},
	NEXUS_CASSANDRA_PORT: {path: ['database', 'cassandra', 'port'], parse: parseInteger},
	NEXUS_CASSANDRA_KEYSPACE: {path: ['database', 'cassandra', 'keyspace']},
	NEXUS_CASSANDRA_LOCAL_DC: {path: ['database', 'cassandra', 'local_dc']},
	NEXUS_CASSANDRA_USERNAME: {path: ['database', 'cassandra', 'username']},
	NEXUS_CASSANDRA_PASSWORD: {path: ['database', 'cassandra', 'password']},
	NEXUS_POSTGRES_URL: {path: ['database', 'postgres', 'url']},
	NEXUS_POSTGRES_HOST: {path: ['database', 'postgres', 'host']},
	NEXUS_POSTGRES_PORT: {path: ['database', 'postgres', 'port'], parse: parseInteger},
	NEXUS_POSTGRES_DATABASE: {path: ['database', 'postgres', 'database']},
	NEXUS_POSTGRES_USERNAME: {path: ['database', 'postgres', 'username']},
	NEXUS_POSTGRES_PASSWORD: {path: ['database', 'postgres', 'password']},
	NEXUS_POSTGRES_SSL: {path: ['database', 'postgres', 'ssl'], parse: parseBoolean},
	NEXUS_POSTGRES_SSL_CA: {path: ['database', 'postgres', 'ssl_ca']},
	NEXUS_POSTGRES_MAX_CONNECTIONS: {path: ['database', 'postgres', 'max_connections'], parse: parseInteger},
	NEXUS_POSTGRES_KV_TABLE: {path: ['database', 'postgres', 'kv_table']},
	NEXUS_POSTGRES_PREPARED_STATEMENTS: {path: ['database', 'postgres', 'prepared_statements'], parse: parseBoolean},
	NEXUS_DATABASE_BACKEND: {path: ['database', 'backend']},
	NEXUS_KV_URL: {path: ['internal', 'kv']},
	NEXUS_KV_MODE: {path: ['internal', 'kv_mode']},
	NEXUS_INTERNAL_MEDIA_PROXY_ENDPOINT: {path: ['internal', 'media_proxy']},
	NEXUS_S3_ENDPOINT: {path: ['s3', 'endpoint']},
	NEXUS_S3_PUBLIC_ENDPOINT: {path: ['s3', 'presigned_url_base']},
	NEXUS_S3_FORCE_PATH_STYLE: {path: ['s3', 'force_path_style'], parse: parseBoolean},
	NEXUS_S3_REGION: {path: ['s3', 'region']},
	NEXUS_S3_ACCESS_KEY_ID: {path: ['s3', 'access_key_id']},
	NEXUS_S3_SECRET_ACCESS_KEY: {path: ['s3', 'secret_access_key']},
	NEXUS_S3_BUCKET_CDN: {path: ['s3', 'buckets', 'cdn']},
	NEXUS_S3_BUCKET_UPLOADS: {path: ['s3', 'buckets', 'uploads']},
	NEXUS_S3_BUCKET_REPORTS: {path: ['s3', 'buckets', 'reports']},
	NEXUS_S3_BUCKET_HARVESTS: {path: ['s3', 'buckets', 'harvests']},
	NEXUS_NATS_URL: {path: ['services', 'nats', 'core_url']},
	NEXUS_NATS_JETSTREAM_URL: {path: ['services', 'nats', 'jetstream_url']},
	NEXUS_NATS_AUTH_TOKEN: {path: ['services', 'nats', 'auth_token']},
	NEXUS_API_PORT: {path: ['services', 'api', 'port'], parse: parseInteger},
	NEXUS_API_HEADERS_TIMEOUT_MS: {path: ['services', 'api', 'headers_timeout_ms'], parse: parseInteger},
	NEXUS_API_REQUEST_TIMEOUT_MS: {path: ['services', 'api', 'request_timeout_ms'], parse: parseInteger},
	NEXUS_API_MAX_INFLIGHT_REQUESTS: {path: ['services', 'api', 'max_inflight_requests'], parse: parseInteger},
	NEXUS_API_AUTOMATED_MESSAGE_DELETION_DELAY_DAYS: {
		path: ['services', 'api', 'automated_message_deletion_delay_days'],
		parse: parseInteger,
	},
	NEXUS_API_IP_BAN_EXEMPT_IPS: {path: ['services', 'api', 'ip_ban_exempt_ips'], parse: parseCsv},
	NEXUS_API_DONATION_PROXY_KEY: {path: ['services', 'api', 'donation_proxy_key']},
	NEXUS_API_TRUSTED_CALLERS: {path: ['services', 'api', 'trusted_callers'], parse: parseJsonArray},
	NEXUS_API_PRESIGNED_ATTACHMENT_UPLOADS_ENABLED: {
		path: ['services', 'api', 'presigned_attachment_uploads_enabled'],
		parse: parseBoolean,
	},
	NEXUS_API_PRESIGNED_HARVEST_DOWNLOADS_ENABLED: {
		path: ['services', 'api', 'presigned_harvest_downloads_enabled'],
		parse: parseBoolean,
	},
	NEXUS_API_WORKER_MODE: {path: ['services', 'api', 'worker', 'mode']},
	NEXUS_API_WORKER_LANE: {path: ['services', 'api', 'worker', 'lane']},
	NEXUS_API_WORKER_TASK: {path: ['services', 'api', 'worker', 'task']},
	NEXUS_API_WORKER_ENABLE_CRON_SCHEDULER: {
		path: ['services', 'api', 'worker', 'enable_cron_scheduler'],
		parse: parseBoolean,
	},
	NEXUS_API_WORKER_METRICS_PORT: {path: ['services', 'api', 'worker', 'metrics_port'], parse: parseInteger},
	NEXUS_API_WORKER_LANE_CONCURRENCY_OVERRIDES: {
		path: ['services', 'api', 'worker', 'lane_concurrency_overrides'],
		parse: parseJsonObject,
	},
	NEXUS_API_STORAGE_CHANGE_FEED_ENABLED: {
		path: ['services', 'api', 'storage_change_feed', 'enabled'],
		parse: parseBoolean,
	},
	NEXUS_API_STORAGE_CHANGE_FEED_STREAM: {path: ['services', 'api', 'storage_change_feed', 'stream']},
	NEXUS_API_STORAGE_CHANGE_FEED_SKIP_BUCKETS: {
		path: ['services', 'api', 'storage_change_feed', 'skip_buckets'],
		parse: parseBucketList,
	},
	NEXUS_API_UNFURL_IGNORED_HOSTS: {path: ['services', 'api', 'unfurl_ignored_hosts'], parse: parseCsv},
	NEXUS_APP_ORIGIN_ALIASES: {path: ['services', 'api', 'app_origin_aliases'], parse: parseCsv},
	NEXUS_MEDIA_PROXY_SECRET_KEY: {path: ['services', 'media_proxy', 'secret_key']},
	NEXUS_MEDIA_PROXY_UPLOAD_RELAY_ENDPOINT: {path: ['services', 'media_proxy', 'upload_relay', 'endpoint']},
	NEXUS_MEDIA_PROXY_UPLOAD_RELAY_SECRET_BASE64: {path: ['services', 'media_proxy', 'upload_relay', 'secret_base64']},
	NEXUS_MEDIA_PROXY_UPLOAD_RELAY_MAX_BODY_BYTES: {
		path: ['services', 'media_proxy', 'upload_relay', 'max_body_bytes'],
		parse: parseInteger,
	},
	NEXUS_MEDIA_PROXY_UPLOAD_RELAY_TOKEN_TTL_SECS: {
		path: ['services', 'media_proxy', 'upload_relay', 'token_ttl_secs'],
		parse: parseInteger,
	},
	NEXUS_MEDIA_PROXY_UPLOAD_RELAY_KEEP_DIRECT_COUNTRIES: {
		path: ['services', 'media_proxy', 'upload_relay', 'keep_direct_countries'],
		parse: parseCsv,
	},
	NEXUS_MEDIA_PROXY_ATTACHMENT_URL_SECRETS_BASE64: {
		path: ['services', 'media_proxy', 'attachment_urls', 'secrets_base64'],
		parse: parseCsv,
	},
	NEXUS_ADMIN_SECRET_KEY_BASE: {path: ['services', 'admin', 'secret_key_base']},
	NEXUS_ADMIN_OAUTH_CLIENT_SECRET: {path: ['services', 'admin', 'oauth_client_secret']},
	NEXUS_GATEWAY_RPC_AUTH_TOKEN: {path: ['services', 'gateway', 'rpc_auth_token']},
	NEXUS_SUDO_MODE_SECRET: {path: ['auth', 'sudo_mode_secret']},
	NEXUS_CONNECTION_INITIATION_SECRET: {path: ['auth', 'connection_initiation_secret']},
	NEXUS_PROFILE_PSEUDONYM_SECRET: {path: ['auth', 'profile_pseudonym_secret']},
	NEXUS_SSO_ALLOW_PRIVATE_ADDRESSES: {path: ['auth', 'sso_allow_private_addresses'], parse: parseBoolean},
	NEXUS_VAPID_PUBLIC_KEY: {path: ['auth', 'vapid', 'public_key']},
	NEXUS_VAPID_PRIVATE_KEY: {path: ['auth', 'vapid', 'private_key']},
	NEXUS_VAPID_EMAIL: {path: ['auth', 'vapid', 'email']},
	NEXUS_PASSKEY_RP_NAME: {path: ['auth', 'passkeys', 'rp_name']},
	NEXUS_PASSKEY_RP_ID: {path: ['auth', 'passkeys', 'rp_id']},
	NEXUS_PASSKEY_ADDITIONAL_ALLOWED_ORIGINS: {
		path: ['auth', 'passkeys', 'additional_allowed_origins'],
		parse: parsePasskeyOrigins,
	},
	NEXUS_AUTH_BLUESKY_ENABLED: {path: ['auth', 'bluesky', 'enabled'], parse: parseBoolean},
	NEXUS_AUTH_BLUESKY_CLIENT_NAME: {path: ['auth', 'bluesky', 'client_name']},
	NEXUS_AUTH_BLUESKY_CLIENT_URI: {path: ['auth', 'bluesky', 'client_uri']},
	NEXUS_AUTH_BLUESKY_LOGO_URI: {path: ['auth', 'bluesky', 'logo_uri']},
	NEXUS_AUTH_BLUESKY_TOS_URI: {path: ['auth', 'bluesky', 'tos_uri']},
	NEXUS_AUTH_BLUESKY_POLICY_URI: {path: ['auth', 'bluesky', 'policy_uri']},
	NEXUS_AUTH_BLUESKY_KEYS: {path: ['auth', 'bluesky', 'keys'], parse: parseJsonArray},
	NEXUS_EMAIL_ENABLED: {path: ['integrations', 'email', 'enabled'], parse: parseBoolean},
	NEXUS_EMAIL_PROVIDER: {path: ['integrations', 'email', 'provider']},
	NEXUS_EMAIL_FROM_EMAIL: {path: ['integrations', 'email', 'from_email']},
	NEXUS_EMAIL_FROM_NAME: {path: ['integrations', 'email', 'from_name']},
	NEXUS_EMAIL_REPLY_TO_EMAIL: {path: ['integrations', 'email', 'reply_to_email']},
	NEXUS_EMAIL_APP_BASE_URL: {path: ['integrations', 'email', 'app_base_url']},
	NEXUS_EMAIL_WEBHOOK_SECRET: {path: ['integrations', 'email', 'webhook_secret']},
	NEXUS_EMAIL_SMTP_HOST: {path: ['integrations', 'email', 'smtp', 'host']},
	NEXUS_EMAIL_SMTP_PORT: {path: ['integrations', 'email', 'smtp', 'port'], parse: parseInteger},
	NEXUS_EMAIL_SMTP_USERNAME: {path: ['integrations', 'email', 'smtp', 'username']},
	NEXUS_EMAIL_SMTP_PASSWORD: {path: ['integrations', 'email', 'smtp', 'password']},
	NEXUS_EMAIL_SMTP_TLS_MODE: {path: ['integrations', 'email', 'smtp', 'tls_mode'], parse: parseSmtpTlsMode},
	NEXUS_EMAIL_SMTP_SECURE: {path: ['integrations', 'email', 'smtp', 'secure'], parse: parseBoolean},
	NEXUS_LIVEKIT_ENABLED: {path: ['integrations', 'voice', 'enabled'], parse: parseBoolean},
	NEXUS_LIVEKIT_API_KEY: {path: ['integrations', 'voice', 'api_key']},
	NEXUS_LIVEKIT_API_SECRET: {path: ['integrations', 'voice', 'api_secret']},
	NEXUS_LIVEKIT_URL: {path: ['integrations', 'voice', 'url']},
	NEXUS_LIVEKIT_INTERNAL_URL: {path: ['integrations', 'voice', 'internal_url']},
	NEXUS_LIVEKIT_DEFAULT_REGION: {path: ['integrations', 'voice', 'default_region'], parse: parseJsonObject},
	NEXUS_VOICE_P2P_STUN_URLS: {path: ['integrations', 'voice', 'p2p_stun_urls'], parse: parseCsv},
	NEXUS_SEARCH_ENGINE: {path: ['integrations', 'search', 'engine']},
	NEXUS_SEARCH_URL: {path: ['integrations', 'search', 'url']},
	NEXUS_SEARCH_API_KEY: {path: ['integrations', 'search', 'api_key']},
	NEXUS_SEARCH_USERNAME: {path: ['integrations', 'search', 'username']},
	NEXUS_SEARCH_PASSWORD: {path: ['integrations', 'search', 'password']},
	NEXUS_SEARCH_TLS_REJECT_UNAUTHORIZED: {
		path: ['integrations', 'search', 'tls_reject_unauthorized'],
		parse: parseBoolean,
	},
	NEXUS_STRIPE_ENABLED: {path: ['integrations', 'stripe', 'enabled'], parse: parseBoolean},
	NEXUS_STRIPE_SECRET_KEY: {path: ['integrations', 'stripe', 'secret_key']},
	NEXUS_STRIPE_WEBHOOK_SECRET: {path: ['integrations', 'stripe', 'webhook_secret']},
	NEXUS_STRIPE_PRICES: {path: ['integrations', 'stripe', 'prices'], parse: parseJsonObject},
	NEXUS_STRIPE_LEGACY_PRICES: {path: ['integrations', 'stripe', 'legacy_prices'], parse: parseJsonObject},
	NEXUS_STRIPE_PRICE_MONTHLY_USD: {path: ['integrations', 'stripe', 'prices', 'monthly_usd']},
	NEXUS_STRIPE_PRICE_MONTHLY_EUR: {path: ['integrations', 'stripe', 'prices', 'monthly_eur']},
	NEXUS_STRIPE_PRICE_MONTHLY_BRL: {path: ['integrations', 'stripe', 'prices', 'monthly_brl']},
	NEXUS_STRIPE_PRICE_MONTHLY_DKK: {path: ['integrations', 'stripe', 'prices', 'monthly_dkk']},
	NEXUS_STRIPE_PRICE_MONTHLY_INR: {path: ['integrations', 'stripe', 'prices', 'monthly_inr']},
	NEXUS_STRIPE_PRICE_MONTHLY_ISK: {path: ['integrations', 'stripe', 'prices', 'monthly_isk']},
	NEXUS_STRIPE_PRICE_MONTHLY_NOK: {path: ['integrations', 'stripe', 'prices', 'monthly_nok']},
	NEXUS_STRIPE_PRICE_MONTHLY_PLN: {path: ['integrations', 'stripe', 'prices', 'monthly_pln']},
	NEXUS_STRIPE_PRICE_MONTHLY_SEK: {path: ['integrations', 'stripe', 'prices', 'monthly_sek']},
	NEXUS_STRIPE_PRICE_MONTHLY_TRY: {path: ['integrations', 'stripe', 'prices', 'monthly_try']},
	NEXUS_STRIPE_PRICE_YEARLY_USD: {path: ['integrations', 'stripe', 'prices', 'yearly_usd']},
	NEXUS_STRIPE_PRICE_YEARLY_EUR: {path: ['integrations', 'stripe', 'prices', 'yearly_eur']},
	NEXUS_STRIPE_PRICE_YEARLY_BRL: {path: ['integrations', 'stripe', 'prices', 'yearly_brl']},
	NEXUS_STRIPE_PRICE_YEARLY_DKK: {path: ['integrations', 'stripe', 'prices', 'yearly_dkk']},
	NEXUS_STRIPE_PRICE_YEARLY_INR: {path: ['integrations', 'stripe', 'prices', 'yearly_inr']},
	NEXUS_STRIPE_PRICE_YEARLY_ISK: {path: ['integrations', 'stripe', 'prices', 'yearly_isk']},
	NEXUS_STRIPE_PRICE_YEARLY_NOK: {path: ['integrations', 'stripe', 'prices', 'yearly_nok']},
	NEXUS_STRIPE_PRICE_YEARLY_PLN: {path: ['integrations', 'stripe', 'prices', 'yearly_pln']},
	NEXUS_STRIPE_PRICE_YEARLY_SEK: {path: ['integrations', 'stripe', 'prices', 'yearly_sek']},
	NEXUS_STRIPE_PRICE_YEARLY_TRY: {path: ['integrations', 'stripe', 'prices', 'yearly_try']},
	NEXUS_STRIPE_PRICE_GIFT_1_MONTH_USD: {path: ['integrations', 'stripe', 'prices', 'gift_1_month_usd']},
	NEXUS_STRIPE_PRICE_GIFT_1_MONTH_EUR: {path: ['integrations', 'stripe', 'prices', 'gift_1_month_eur']},
	NEXUS_STRIPE_PRICE_GIFT_1_MONTH_SEK: {path: ['integrations', 'stripe', 'prices', 'gift_1_month_sek']},
	NEXUS_STRIPE_PRICE_GIFT_1_YEAR_SEK: {path: ['integrations', 'stripe', 'prices', 'gift_1_year_sek']},
	NEXUS_STRIPE_PRICE_GIFT_1_MONTH_DKK: {path: ['integrations', 'stripe', 'prices', 'gift_1_month_dkk']},
	NEXUS_STRIPE_PRICE_GIFT_1_YEAR_DKK: {path: ['integrations', 'stripe', 'prices', 'gift_1_year_dkk']},
	NEXUS_STRIPE_PRICE_GIFT_1_MONTH_NOK: {path: ['integrations', 'stripe', 'prices', 'gift_1_month_nok']},
	NEXUS_STRIPE_PRICE_GIFT_1_YEAR_NOK: {path: ['integrations', 'stripe', 'prices', 'gift_1_year_nok']},
	NEXUS_STRIPE_PRICE_GIFT_1_MONTH_ISK: {path: ['integrations', 'stripe', 'prices', 'gift_1_month_isk']},
	NEXUS_STRIPE_PRICE_GIFT_1_YEAR_ISK: {path: ['integrations', 'stripe', 'prices', 'gift_1_year_isk']},
	NEXUS_STRIPE_PRICE_GIFT_1_MONTH_BRL: {path: ['integrations', 'stripe', 'prices', 'gift_1_month_brl']},
	NEXUS_STRIPE_PRICE_GIFT_1_MONTH_INR: {path: ['integrations', 'stripe', 'prices', 'gift_1_month_inr']},
	NEXUS_STRIPE_PRICE_GIFT_1_MONTH_PLN: {path: ['integrations', 'stripe', 'prices', 'gift_1_month_pln']},
	NEXUS_STRIPE_PRICE_GIFT_1_MONTH_TRY: {path: ['integrations', 'stripe', 'prices', 'gift_1_month_try']},
	NEXUS_STRIPE_PRICE_GIFT_1_YEAR_USD: {path: ['integrations', 'stripe', 'prices', 'gift_1_year_usd']},
	NEXUS_STRIPE_PRICE_GIFT_1_YEAR_EUR: {path: ['integrations', 'stripe', 'prices', 'gift_1_year_eur']},
	NEXUS_STRIPE_PRICE_GIFT_1_YEAR_BRL: {path: ['integrations', 'stripe', 'prices', 'gift_1_year_brl']},
	NEXUS_STRIPE_PRICE_GIFT_1_YEAR_INR: {path: ['integrations', 'stripe', 'prices', 'gift_1_year_inr']},
	NEXUS_STRIPE_PRICE_GIFT_1_YEAR_PLN: {path: ['integrations', 'stripe', 'prices', 'gift_1_year_pln']},
	NEXUS_STRIPE_PRICE_GIFT_1_YEAR_TRY: {path: ['integrations', 'stripe', 'prices', 'gift_1_year_try']},
	NEXUS_CLAMAV_ENABLED: {path: ['integrations', 'clamav', 'enabled'], parse: parseBoolean},
	NEXUS_CLAMAV_HOST: {path: ['integrations', 'clamav', 'host']},
	NEXUS_CLAMAV_PORT: {path: ['integrations', 'clamav', 'port'], parse: parseInteger},
	NEXUS_CLAMAV_FAIL_OPEN: {path: ['integrations', 'clamav', 'fail_open'], parse: parseBoolean},
	NEXUS_KLIPY_API_KEY: {path: ['integrations', 'klipy', 'api_key']},
	NEXUS_YOUTUBE_API_KEY: {path: ['integrations', 'youtube', 'api_key']},
	NEXUS_CACHE_PURGE_ADAPTER: {path: ['integrations', 'cache_purge', 'adapter']},
	NEXUS_CACHE_PURGE_HTTP_ENDPOINT: {path: ['integrations', 'cache_purge', 'http', 'endpoint']},
	NEXUS_CACHE_PURGE_HTTP_TOKEN: {path: ['integrations', 'cache_purge', 'http', 'token']},
	NEXUS_CACHE_PURGE_HTTP_TIMEOUT_MS: {
		path: ['integrations', 'cache_purge', 'http', 'timeout_ms'],
		parse: parseInteger,
	},
	NEXUS_BLOCKLIST_FEEDS_ENABLED: {path: ['integrations', 'blocklist_feeds', 'enabled'], parse: parseBoolean},
	NEXUS_BREACHED_PASSWORD_CHECK_ENABLED: {
		path: ['integrations', 'breached_password_check', 'enabled'],
		parse: parseBoolean,
	},
	NEXUS_PUSH_APNS_ENABLED: {path: ['integrations', 'push', 'apns', 'enabled'], parse: parseBoolean},
	NEXUS_PUSH_APNS_TEAM_ID: {path: ['integrations', 'push', 'apns', 'team_id']},
	NEXUS_PUSH_APNS_KEY_ID: {path: ['integrations', 'push', 'apns', 'key_id']},
	NEXUS_PUSH_APNS_PRIVATE_KEY: {path: ['integrations', 'push', 'apns', 'private_key']},
	NEXUS_PUSH_APNS_PRIVATE_KEY_PATH: {path: ['integrations', 'push', 'apns', 'private_key_path']},
	NEXUS_PUSH_APNS_APPS: {path: ['integrations', 'push', 'apns', 'apps'], parse: parseJsonArray},
	NEXUS_APP_STORE_ENABLED: {path: ['integrations', 'app_store', 'enabled'], parse: parseBoolean},
	NEXUS_APP_STORE_ISSUER_ID: {path: ['integrations', 'app_store', 'issuer_id']},
	NEXUS_APP_STORE_KEY_ID: {path: ['integrations', 'app_store', 'key_id']},
	NEXUS_APP_STORE_PRIVATE_KEY: {path: ['integrations', 'app_store', 'private_key']},
	NEXUS_APP_STORE_PRIVATE_KEY_PATH: {path: ['integrations', 'app_store', 'private_key_path']},
	NEXUS_APP_STORE_APPS: {path: ['integrations', 'app_store', 'apps'], parse: parseJsonArray},
	NEXUS_APP_STORE_PRODUCTS: {path: ['integrations', 'app_store', 'products'], parse: parseJsonObject},
	NEXUS_GOOGLE_PLAY_ENABLED: {path: ['integrations', 'google_play', 'enabled'], parse: parseBoolean},
	NEXUS_GOOGLE_PLAY_PACKAGES: {path: ['integrations', 'google_play', 'packages'], parse: parseCsv},
	NEXUS_GOOGLE_PLAY_CLIENT_EMAIL: {path: ['integrations', 'google_play', 'client_email']},
	NEXUS_GOOGLE_PLAY_PRIVATE_KEY: {path: ['integrations', 'google_play', 'private_key']},
	NEXUS_GOOGLE_PLAY_PRIVATE_KEY_PATH: {path: ['integrations', 'google_play', 'private_key_path']},
	NEXUS_GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH: {path: ['integrations', 'google_play', 'service_account_json_path']},
	NEXUS_GOOGLE_PLAY_TOKEN_URI: {path: ['integrations', 'google_play', 'token_uri']},
	NEXUS_GOOGLE_PLAY_PRODUCTS: {path: ['integrations', 'google_play', 'products'], parse: parseJsonObject},
	NEXUS_GOOGLE_PLAY_PUSH_AUDIENCE: {path: ['integrations', 'google_play', 'push_audience']},
	NEXUS_GOOGLE_PLAY_PUSH_SERVICE_ACCOUNT_EMAIL: {
		path: ['integrations', 'google_play', 'push_service_account_email'],
	},
	NEXUS_STORE_BILLING_SANDBOX_USER_IDS: {path: ['integrations', 'store_billing', 'sandbox_user_ids'], parse: parseCsv},
	NEXUS_STORE_BILLING_SANDBOX_ENTITLES_ALL: {
		path: ['integrations', 'store_billing', 'sandbox_entitles_all'],
		parse: parseBoolean,
	},
	NEXUS_SELF_HOSTED: {path: ['instance', 'self_hosted'], parse: parseBoolean},
	NEXUS_AUTO_JOIN_INVITE_CODE: {path: ['instance', 'auto_join_invite_code']},
	NEXUS_VISIONARIES_GUILD_ID: {path: ['instance', 'visionaries_guild_id']},
	NEXUS_VISIONARIES_GUILD_VISIONARY_ROLE_ID: {path: ['instance', 'visionaries_guild_visionary_role_id']},
	NEXUS_APP_PRODUCT_NAME: {path: ['instance', 'branding', 'product_name']},
	NEXUS_APP_ICON_URL: {path: ['instance', 'branding', 'icon_url']},
	NEXUS_APP_SYMBOL_URL: {path: ['instance', 'branding', 'symbol_url']},
	NEXUS_APP_LOGO_URL: {path: ['instance', 'branding', 'logo_url']},
	NEXUS_APP_WORDMARK_URL: {path: ['instance', 'branding', 'wordmark_url']},
	NEXUS_APP_FAVICON_URL: {path: ['instance', 'branding', 'favicon_url']},
	NEXUS_APP_THEME_COLOR: {path: ['instance', 'branding', 'theme_color']},
	NEXUS_APP_STATUS_PAGE_URL: {path: ['instance', 'branding', 'status_page_url']},
	NEXUS_APP_STATUS_PAGE_INCIDENT_HISTORY_URL: {path: ['instance', 'branding', 'status_page_incident_history_url']},
	NEXUS_INSTANCE_SETUP_CONFIGURED: {path: ['instance', 'setup', 'configured'], parse: parseBoolean},
	NEXUS_SETUP_TOKEN: {path: ['instance', 'setup', 'token']},
	NEXUS_ACCOUNT_IDENTITY: {path: ['instance', 'account_identity'], parse: parseAccountIdentity},
	NEXUS_TAG_STYLE: {path: ['instance', 'tag_style'], parse: parseTagStyle},
	NEXUS_DISCOVERY_ENABLED: {path: ['discovery', 'enabled'], parse: parseBoolean},
	NEXUS_DISCOVERY_MIN_MEMBER_COUNT: {path: ['discovery', 'min_member_count'], parse: parseInteger},
	NEXUS_DELETION_GRACE_PERIOD_HOURS: {path: ['deletion_grace_period_hours'], parse: parseInteger},
	NEXUS_REPORT_RETENTION_DAYS: {path: ['report_retention', 'days'], parse: parseInteger},
	NEXUS_RESOLVED_REPORT_RETENTION_DAYS: {path: ['report_retention', 'resolved_days'], parse: parseInteger},
	NEXUS_REPORT_RETENTION_DRY_RUN: {path: ['report_retention', 'dry_run'], parse: parseBoolean},
	NEXUS_RELAX_REGISTRATION_RATE_LIMITS: {path: ['dev', 'relax_registration_rate_limits'], parse: parseBoolean},
	NEXUS_DISABLE_RATE_LIMITS: {path: ['dev', 'disable_rate_limits'], parse: parseBoolean},
	NEXUS_TEST_MODE_ENABLED: {path: ['dev', 'test_mode_enabled'], parse: parseBoolean},
	NEXUS_TEST_HARNESS_TOKEN: {path: ['dev', 'test_harness_token']},
	NEXUS_VALIDATE_RESPONSES: {path: ['dev', 'validate_responses'], parse: parseBoolean},
	NEXUS_GEOIP_DB_PATH: {path: ['geoip', 'maxmind_db_path']},
};

function isContainer(value: unknown): value is ConfigContainer {
	return isConfigObject(value) || Array.isArray(value);
}

function createChildContainer(nextKey: ConfigPathKey | undefined): ConfigContainer {
	return typeof nextKey === 'number' ? [] : {};
}

function getChildValue(target: ConfigContainer, key: ConfigPathKey): unknown {
	return Object.hasOwn(target, key) ? Reflect.get(target, key) : undefined;
}

function setChildValue(target: ConfigContainer, key: ConfigPathKey, value: unknown): void {
	if (key === '__proto__') {
		Object.defineProperty(target, key, {value, writable: true, enumerable: true, configurable: true});
		return;
	}
	if (Array.isArray(target) && typeof key === 'number') {
		target[key] = value;
		return;
	}
	(target as ConfigObject)[String(key)] = value;
}

function parseBoolean(raw: string): boolean {
	switch (raw.trim().toLowerCase()) {
		case 'true':
			return true;
		case 'false':
			return false;
		default:
			throw new Error('must be true or false');
	}
}

function parseAccountIdentity(raw: string): string {
	const value = raw.trim().toLowerCase();
	if (value === 'email' || value === 'username') return value;
	throw new Error('must be email or username');
}

function parseTagStyle(raw: string): string {
	const value = raw.trim().toLowerCase();
	if (value === 'none' || value === 'random') return value;
	throw new Error('must be none or random');
}

function parseSmtpTlsMode(raw: string): string {
	const value = raw.trim().toLowerCase();
	if (value === 'implicit' || value === 'starttls' || value === 'opportunistic' || value === 'none') return value;
	throw new Error('must be implicit, starttls, opportunistic or none');
}

function parseJson(raw: string): unknown {
	try {
		return JSON.parse(raw);
	} catch {
		throw new Error('must be valid JSON');
	}
}

function parseJsonObject(raw: string): ConfigObject {
	const value = parseJson(raw);
	if (isConfigObject(value)) return value;
	throw new Error('must be a JSON object');
}

function parseJsonArray(raw: string): Array<unknown> {
	const value = parseJson(raw);
	if (Array.isArray(value)) return value;
	throw new Error('must be a JSON array');
}

function parseInteger(raw: string): number {
	const trimmed = raw.trim();
	if (!/^-?\d+$/.test(trimmed)) {
		throw new Error(`must be an integer, got ${JSON.stringify(raw)}`);
	}
	const value = Number(trimmed);
	if (!Number.isSafeInteger(value)) throw new Error('must be a safe integer');
	return value;
}

function parseCsv(raw: string): Array<string> {
	return raw
		.split(',')
		.map((part) => part.trim())
		.filter((part) => part.length > 0);
}

function parseBucketList(raw: string): Array<string> {
	return raw.trim().toLowerCase() === 'none' ? [] : parseCsv(raw);
}

function parsePasskeyOrigins(raw: string): Array<string> {
	if (/\p{Cc}/u.test(raw)) {
		throw new Error('must not contain control characters');
	}
	return parseCsv(raw);
}

export function setNestedValue(target: ConfigContainer, keys: Array<ConfigPathKey>, value: unknown): void {
	if (keys.length === 0) {
		return;
	}
	const [first, ...rest] = keys;
	if (rest.length === 0) {
		setChildValue(target, first, value);
		return;
	}
	const current = getChildValue(target, first);
	let child: ConfigContainer;
	if (isContainer(current)) {
		child = current;
	} else {
		child = createChildContainer(rest[0]);
		setChildValue(target, first, child);
	}
	setNestedValue(child, rest, value);
}

const NAMED_NEXUS_ENV_ALIASES: Record<string, string | undefined> = {
	NEXUS_INTERNAL_MEDIA_PROXY_ENDPOINT: 'NEXUS_MEDIA_PROXY_ENDPOINT',
	NEXUS_NATS_URL: 'NEXUS_NATS_CORE_URL',
};

export const NAMED_NEXUS_ENV_NAMES = Object.keys(NAMED_NEXUS_ENV_OVERRIDES);

function nonBlank(value: string | undefined): string | undefined {
	return value === undefined || value.trim().length === 0 ? undefined : value;
}

export function readEnvValue(env: NodeJS.ProcessEnv, name: string): string | undefined {
	const value = nonBlank(env[name]);
	const filePath = nonBlank(env[`${name}_FILE`]);
	if (filePath === undefined) {
		return value;
	}
	if (value !== undefined) {
		throw new Error(`${name} and ${name}_FILE are both set, set only one`);
	}
	let contents: string;
	try {
		contents = new TextDecoder('utf-8', {fatal: true}).decode(readFileSync(filePath));
	} catch (error) {
		const reason = error instanceof Error && 'code' in error ? String(error.code) : 'unreadable';
		throw new Error(`${name}_FILE could not read ${filePath} (${reason})`);
	}
	return nonBlank(contents.replace(/\r?\n$/, ''));
}

export function buildNamedNEXUSEnvOverrides(env: NodeJS.ProcessEnv): ConfigObject {
	const overrides: ConfigObject = {};
	for (const [envKey, mapping] of Object.entries(NAMED_NEXUS_ENV_OVERRIDES)) {
		const alias = NAMED_NEXUS_ENV_ALIASES[envKey];
		const raw = readEnvValue(env, envKey) ?? (alias === undefined ? undefined : readEnvValue(env, alias));
		if (raw === undefined) {
			continue;
		}
		let parsed: unknown;
		try {
			parsed = mapping.parse ? mapping.parse(raw) : raw;
		} catch (error) {
			throw new Error(`${envKey} ${error instanceof Error ? error.message : String(error)}`);
		}
		setNestedValue(overrides, mapping.path, parsed);
	}
	return overrides;
}

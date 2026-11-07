// SPDX-License-Identifier: Nebula

import {AuthSessionStorageKey} from '@app/features/platform/state/auth_session/AuthSessionStorage';

export const AppStorageKey = Object.freeze({
	ACCESSIBILITY_LEGACY_STORE: 'Accessibility',
	ACCOUNT_RESET_KEPT_KEYS: 'nexus:internal:account-reset-kept-keys',
	AUTH_ACCOUNT_KEY: AuthSessionStorageKey.ActiveAccountKey,
	AUTH_DESKTOP_CLIENT_INTRO_COMPLETED: 'nexus:auth:desktop-client-intro:completed',
	AUTH_DESKTOP_CLIENT_PERMISSIONS_SKIPPED: 'nexus:auth:desktop-client-intro:permissions-skipped',
	AUTH_DESKTOP_CLIENT_PREFERENCES_SEEN: 'nexus:auth:desktop-client-intro:preferences-seen',
	AUTH_DESKTOP_CLIENT_WELCOME_SEEN: 'nexus:auth:desktop-client-intro:welcome-seen',
	AUTH_SESSION_TOKEN: AuthSessionStorageKey.Token,
	AUTH_SESSION_USER_ID: AuthSessionStorageKey.UserId,
	DELETED_KEYS: 'nexus:internal:deleted-keys',
	I18N_CHOSEN_LOCALE: 'nexus:i18n:chosen-locale',
	MESSAGING_DRAFTS: 'Drafts',
	MESSAGING_MESSAGE_EDIT: 'MessageEdit',
	NOTIFICATION: 'Notification',
	SSO_PENDING_CONTEXT_PREFIX: 'nexus:sso:pending-context',
	THEME: 'Theme',
	THEME_LIBRARY_ENABLED_IDS: 'nexus:theme-library:enabled-ids',
	THEME_LIBRARY_LOCAL_FILES: 'nexus:theme-library:local-files',
	THEME_LIBRARY_MIGRATED: 'nexus:theme-library:migrated-to-app-storage',
	THEME_LIBRARY_THEMES: 'nexus:theme-library:themes',
	THEME_PREBOOT_MIRROR: 'theme',
	UI_CHANNEL_PINS_POPOUT_SIZE: 'nexus:ui:channel-pins-popout-size',
	UI_EXPRESSION_PICKER_SIZE: 'nexus:ui:expression-picker-size',
	UI_FEATURE_DISCOVERY: 'nexus:ui:feature-discovery',
	UI_INBOX_POPOUT_SIZE: 'nexus:ui:inbox-popout-size',
	UI_SIDEBAR_WIDTH: 'nexus:ui:sidebar-width',
	VOICE_SETTINGS: 'VoiceSettings',
	WINDOWS_FONT: 'WindowsFont',
} as const);

export type AppStorageKey = (typeof AppStorageKey)[keyof typeof AppStorageKey];

export const LEGACY_APP_STORAGE_MIGRATION_MARKER_KEY = 'nexus:migration:legacy-app-storage';
export const LEGACY_SHARED_CONTENT_REVIEW_KEY = 'nexus:migration:shared-content-review';

export const LegacySharedContentReviewState = Object.freeze({
	PENDING: 'pending',
	DONE: 'done',
} as const);

const GLOBAL_APP_STORAGE_KEY_LOOKUP: Readonly<Record<string, true>> = Object.freeze({
	[AppStorageKey.AUTH_ACCOUNT_KEY]: true,
	[AppStorageKey.AUTH_DESKTOP_CLIENT_INTRO_COMPLETED]: true,
	[AppStorageKey.AUTH_DESKTOP_CLIENT_PERMISSIONS_SKIPPED]: true,
	[AppStorageKey.AUTH_DESKTOP_CLIENT_PREFERENCES_SEEN]: true,
	[AppStorageKey.AUTH_DESKTOP_CLIENT_WELCOME_SEEN]: true,
	[AppStorageKey.AUTH_SESSION_TOKEN]: true,
	[AppStorageKey.AUTH_SESSION_USER_ID]: true,
	[AppStorageKey.I18N_CHOSEN_LOCALE]: true,
	[AppStorageKey.THEME_LIBRARY_ENABLED_IDS]: true,
	[AppStorageKey.THEME_LIBRARY_LOCAL_FILES]: true,
	[AppStorageKey.THEME_LIBRARY_MIGRATED]: true,
	[AppStorageKey.THEME_LIBRARY_THEMES]: true,
	[AppStorageKey.WINDOWS_FONT]: true,
});

function keyStartsWithPrefix(key: string, prefix: AppStorageKey): boolean {
	return key.startsWith(`${prefix}:`);
}

export function ssoPendingContextKey(state: string): string {
	return `${AppStorageKey.SSO_PENDING_CONTEXT_PREFIX}:${encodeURIComponent(state)}`;
}

export function isSsoPendingContextKey(key: string): boolean {
	return keyStartsWithPrefix(key, AppStorageKey.SSO_PENDING_CONTEXT_PREFIX);
}

export function isGlobalAppStorageKey(key: string): boolean {
	return Object.hasOwn(GLOBAL_APP_STORAGE_KEY_LOOKUP, key) || isSsoPendingContextKey(key);
}

// SPDX-License-Identifier: Nebula

import {getContentMessage} from '@app/api/content_i18n/ContentI18n';
import type {LimitConfigService} from '@app/api/limits/LimitConfigService';
import {resolveLimitSafe} from '@app/api/limits/LimitConfigUtils';
import {createLimitMatchContext} from '@app/api/limits/LimitMatchContextBuilder';
import type {LimitKey} from '@nexus/constants/src/LimitConfigMetadata';
import {NexusError} from '@nexus/errors/src/NexusError';
import {getErrorMessageUnsafe} from '@nexus/errors/src/i18n/ErrorI18n';

export function resolveGuildLimit(
	limitConfigService: LimitConfigService,
	key: LimitKey,
	fallback: number,
	guildFeatures: Iterable<string> | null,
): number {
	const context = createLimitMatchContext({user: null, guildFeatures});
	return Math.floor(resolveLimitSafe(limitConfigService.getConfigSnapshot(), context, key, fallback, 'guild'));
}

export function getLocalizedBulkCreateError(error: unknown, locale: string | null | undefined): string {
	if (error instanceof NexusError) {
		return getErrorMessageUnsafe(error.code, locale, error.messageVariables, error.message);
	}
	return getContentMessage('guild.bulk_create.unknown_error', locale);
}

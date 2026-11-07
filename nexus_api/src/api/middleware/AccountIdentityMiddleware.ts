// SPDX-License-Identifier: Nebula

import type {HonoEnv} from '@app/api/types/HonoEnv';
import {AccountIdentityModes, TagStyles} from '@nexus/constants/src/AccountIdentityConstants';
import {EmailUnavailableOnInstanceError} from '@nexus/errors/src/domains/auth/EmailUnavailableOnInstanceError';
import {UsernameSignInOnlyError} from '@nexus/errors/src/domains/auth/UsernameSignInOnlyError';
import type {Context} from 'hono';
import {createMiddleware} from 'hono/factory';
import type {ZodType} from 'zod';

export const RequireEmailAccountIdentity = createMiddleware<HonoEnv>(async (ctx, next) => {
	const mode = await ctx.get('instanceConfigRepository').getAccountIdentityMode();
	if (mode === AccountIdentityModes.USERNAME) {
		throw new EmailUnavailableOnInstanceError();
	}
	await next();
});

export const RequireUsernameAccountIdentity = createMiddleware<HonoEnv>(async (ctx, next) => {
	const mode = await ctx.get('instanceConfigRepository').getAccountIdentityMode();
	if (mode !== AccountIdentityModes.USERNAME) {
		throw new UsernameSignInOnlyError();
	}
	await next();
});

export const RequireUsernameLookup = createMiddleware<HonoEnv>(async (ctx, next) => {
	const identity = await ctx.get('instanceConfigRepository').getAccountIdentity();
	if (identity.mode !== AccountIdentityModes.USERNAME && identity.tagStyle !== TagStyles.NONE) {
		throw new UsernameSignInOnlyError();
	}
	await next();
});

export function onUsernameInstance<T extends ZodType>(schema: T) {
	return async (ctx: Context<HonoEnv>): Promise<T | null> => {
		const mode = await ctx.get('instanceConfigRepository').getAccountIdentityMode();
		return mode === AccountIdentityModes.USERNAME ? schema : null;
	};
}

// SPDX-License-Identifier: Nebula

import type {HonoEnv} from '@app/api/types/HonoEnv';
import {SsoRequiredError} from '@nexus/errors/src/domains/auth/SsoRequiredError';
import {createMiddleware} from 'hono/factory';

export const LocalAuthMiddleware = createMiddleware<HonoEnv>(async (ctx, next) => {
	const ssoService = ctx.get('ssoService');
	if (await ssoService.isEnforced()) {
		throw new SsoRequiredError();
	}
	await next();
});

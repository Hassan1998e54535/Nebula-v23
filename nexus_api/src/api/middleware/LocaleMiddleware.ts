// SPDX-License-Identifier: Nebula

import type {HonoEnv} from '@app/api/types/HonoEnv';
import {Locales} from '@nexus/constants/src/Locales';
import {parseAcceptLanguage} from '@nexus/i18n/src/locale/resolution/AcceptLanguageNegotiation';
import {createMiddleware} from 'hono/factory';

export const LocaleMiddleware = createMiddleware<HonoEnv>(async (ctx, next) => {
	const acceptLanguage = ctx.req.header('accept-language');
	const headerLocale = parseAcceptLanguage(acceptLanguage);
	const user = ctx.get('user');
	const locale = user?.locale ?? headerLocale ?? Locales.EN_US;
	ctx.set('requestLocale', locale);
	return next();
});

// SPDX-License-Identifier: Nebula

import {ActivityContextMiddleware} from '@app/api/infrastructure/activity/ActivityMeta';
import {AuditLogMiddleware} from '@app/api/middleware/AuditLogMiddleware';
import {ClientFeaturesMiddleware} from '@app/api/middleware/ClientFeaturesMiddleware';
import {ConcurrencyLimitMiddleware} from '@app/api/middleware/ConcurrencyLimitMiddleware';
import ContentFilterMiddleware from '@app/api/middleware/ContentFilterMiddleware';
import {GuildAvailabilityMiddleware} from '@app/api/middleware/GuildAvailabilityMiddleware';
import {IpBanMiddleware} from '@app/api/middleware/IpBanMiddleware';
import {LocaleMiddleware} from '@app/api/middleware/LocaleMiddleware';
import {RequestCacheMiddleware} from '@app/api/middleware/RequestCacheMiddleware';
import {RequestErrorTelemetry} from '@app/api/middleware/RequestErrorTelemetry';
import {RequireClientIpMiddleware} from '@app/api/middleware/RequireClientIpMiddleware';
import {ServiceMiddleware} from '@app/api/middleware/ServiceMiddleware';
import {TrustedClientIpHeaderMiddleware} from '@app/api/middleware/TrustedClientIpHeaderMiddleware';
import {UserMiddleware} from '@app/api/middleware/UserMiddleware';
import type {HonoApp} from '@app/api/types/HonoEnv';
import {PeerAddressMiddleware} from '@app/api/utils/RequestClientIp';
import {Headers as HttpHeaders} from '@nexus/constants/src/Headers';
import {InvalidApiOriginError} from '@nexus/errors/src/domains/core/InvalidApiOriginError';
import {cors} from '@nexus/hono/src/middleware/Cors';
import {applyMiddlewareStack} from '@nexus/hono/src/middleware/MiddlewareStack';
import {createInfoRequestLogger, requestLogger} from '@nexus/hono/src/middleware/RequestLogger';
import {resolveClientIpHeaderName} from '@nexus/ip_utils/src/ClientIp';
import type {LoggerInterface} from '@nexus/logger/src/LoggerInterface';

interface MiddlewarePipelineOptions {
	logger: LoggerInterface;
	nodeEnv: string;
	corsOrigins: Array<string>;
	trustClientIpHeader: boolean;
	clientIpHeaderName?: string;
	maxInflightRequests: number;
}

export function configureMiddleware(routes: HonoApp, options: MiddlewarePipelineOptions): void {
	const {logger, nodeEnv, corsOrigins, trustClientIpHeader, clientIpHeaderName, maxInflightRequests} = options;
	const resolvedHeader = resolveClientIpHeaderName(clientIpHeaderName);
	routes.use(PeerAddressMiddleware);
	routes.use('/webhooks/:webhook_id/:token', cors({origins: '*'}));
	routes.use('/webhooks/:webhook_id/:token/messages/:message_id', cors({origins: '*'}));
	routes.use(
		'/.well-known/nexus',
		cors({
			origins: '*',
			methods: ['GET', 'HEAD', 'OPTIONS'],
			allowedHeaders: [
				HttpHeaders.ACCEPT,
				HttpHeaders.CONTENT_TYPE,
				HttpHeaders.IF_MODIFIED_SINCE,
				HttpHeaders.IF_NONE_MATCH,
			],
			exposedHeaders: [HttpHeaders.ETAG, HttpHeaders.LAST_MODIFIED],
		}),
	);
	applyMiddlewareStack(routes, {
		requestId: {},
		cors: {
			origins: corsOrigins,
			allowedHeaders: [
				HttpHeaders.CONTENT_TYPE,
				HttpHeaders.AUTHORIZATION,
				HttpHeaders.X_REQUESTED_WITH,
				HttpHeaders.ACCEPT_LANGUAGE,
				HttpHeaders.X_REQUEST_ID,
				HttpHeaders.IF_NONE_MATCH,
				HttpHeaders.X_AUDIT_LOG_REASON,
				HttpHeaders.X_CAPTCHA_ID,
				HttpHeaders.X_CAPTCHA_TOKEN,
				HttpHeaders.X_NEXUS_CLIENT_INSTALLATION_ID,
				HttpHeaders.X_NEXUS_FEATURES,
				HttpHeaders.X_NEXUS_PLATFORM,
				HttpHeaders.X_NEXUS_SUDO_MODE_JWT,
			],
			exposedHeaders: [HttpHeaders.X_NEXUS_VERSION, HttpHeaders.ETAG],
		},
	});
	routes.use(ConcurrencyLimitMiddleware({maxInflightRequests}));
	routes.get('/_health', async (ctx) => ctx.text('OK'));
	routes.use(IpBanMiddleware);
	routes.use(
		requestLogger({
			log: createInfoRequestLogger(logger),
			skip: ['/_health'],
		}),
	);
	routes.use(RequestErrorTelemetry);
	routes.use(RequestCacheMiddleware);
	routes.use(ClientFeaturesMiddleware);
	if (nodeEnv === 'production') {
		routes.use('*', async (ctx, next) => {
			const host = ctx.req.header('host');
			if (ctx.req.method !== 'GET' && (host === 'web.nexus.app' || host === 'web.canary.nexus.app')) {
				const origin = ctx.req.header('origin');
				if (!origin || origin !== `https://${host}`) {
					throw new InvalidApiOriginError();
				}
			}
			await next();
		});
	}
	if (trustClientIpHeader) {
		routes.use(
			TrustedClientIpHeaderMiddleware({
				enabled: true,
				logger,
				trustClientIpHeader,
				clientIpHeaderName: resolvedHeader,
			}),
		);
	}
	routes.use(AuditLogMiddleware);
	routes.use(RequireClientIpMiddleware());
	routes.use(ActivityContextMiddleware);
	routes.use(ServiceMiddleware);
	routes.use(UserMiddleware);
	routes.use(ContentFilterMiddleware);
	routes.use(GuildAvailabilityMiddleware);
	routes.use(LocaleMiddleware);
}

// SPDX-License-Identifier: Nebula

import {Headers as HttpHeaders} from '@nexus/constants/src/Headers';
import type {MiddlewareHandler} from 'hono';

function resolveNEXUSVersion(): string {
	const value = process.env.BUILD_VERSION?.trim();
	return value && value.length > 0 ? value : 'dev';
}

export function applyNEXUSVersionHeader(response: Response, version = resolveNEXUSVersion()): Response {
	const headers = new Headers(response.headers);
	headers.set(HttpHeaders.X_NEXUS_VERSION, version);
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

export function nexusVersionHeader(version = resolveNEXUSVersion()): MiddlewareHandler {
	return async (c, next) => {
		await next();
		c.res.headers.set(HttpHeaders.X_NEXUS_VERSION, version);
	};
}

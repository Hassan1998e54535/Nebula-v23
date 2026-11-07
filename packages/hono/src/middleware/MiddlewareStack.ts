// SPDX-License-Identifier: Nebula

import type {CacheHeadersOptions} from '@nexus/hono/src/middleware/CacheHeaders';
import {cacheHeaders} from '@nexus/hono/src/middleware/CacheHeaders';
import type {CorsOptions} from '@nexus/hono/src/middleware/Cors';
import {cors} from '@nexus/hono/src/middleware/Cors';
import type {RequestIdOptions} from '@nexus/hono/src/middleware/RequestId';
import {requestId} from '@nexus/hono/src/middleware/RequestId';
import {nexusVersionHeader} from '@nexus/hono/src/middleware/VersionHeader';
import type {Env, Hono, MiddlewareHandler} from 'hono';

interface MiddlewareStackOptions {
	requestId?: RequestIdOptions;
	cors?: CorsOptions;
	cacheHeaders?: CacheHeadersOptions | false;
}

function createStandardMiddlewareStack(options: MiddlewareStackOptions): Array<MiddlewareHandler> {
	const stack: Array<MiddlewareHandler> = [nexusVersionHeader()];
	if (options.requestId) {
		stack.push(requestId(options.requestId));
	}
	if (options.cors && options.cors.enabled !== false) {
		stack.push(cors(options.cors));
	}
	if (options.cacheHeaders !== false) {
		stack.push(cacheHeaders(options.cacheHeaders ?? {}));
	}
	return stack;
}

export function applyMiddlewareStack<E extends Env = Env>(app: Hono<E>, options: MiddlewareStackOptions = {}): void {
	for (const middleware of createStandardMiddlewareStack(options)) {
		app.use('*', middleware);
	}
}

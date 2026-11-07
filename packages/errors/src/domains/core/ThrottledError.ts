// SPDX-License-Identifier: Nebula

import {sanitizeRetryAfterSeconds} from '@nexus/errors/src/domains/core/RetryAfterSeconds';
import {NexusError, type NexusErrorData} from '@nexus/errors/src/NexusError';

export class ThrottledError extends NexusError {
	constructor({
		code,
		message,
		retryAfterSeconds,
		data,
		headers,
		messageVariables,
	}: {
		code: string;
		message?: string;
		retryAfterSeconds: number;
		data?: NexusErrorData;
		headers?: Record<string, string>;
		messageVariables?: Record<string, unknown>;
	}) {
		super({
			code,
			message,
			status: 429,
			data,
			headers: {...headers, 'Retry-After': sanitizeRetryAfterSeconds(retryAfterSeconds).toString()},
			messageVariables,
		});
	}
}

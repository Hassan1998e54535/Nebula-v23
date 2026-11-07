// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';
import {
	sanitizeRetryAfterDecimalSeconds,
	sanitizeRetryAfterSeconds,
} from '@nexus/errors/src/domains/core/RetryAfterSeconds';

export class SlowmodeRateLimitError extends BadRequestError {
	constructor({
		retryAfter,
		retryAfterDecimal,
	}: {
		retryAfter: number | undefined;
		retryAfterDecimal?: number;
	}) {
		const safeRetryAfter = sanitizeRetryAfterSeconds(retryAfter);
		const safeRetryAfterDecimal = sanitizeRetryAfterDecimalSeconds(retryAfterDecimal, safeRetryAfter);
		super({
			code: APIErrorCodes.SLOWMODE_RATE_LIMITED,
			data: {
				retry_after: safeRetryAfterDecimal,
			},
			headers: {
				'Retry-After': safeRetryAfter.toString(),
			},
		});
	}
}

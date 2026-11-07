// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class MaxWebhooksPerGuildError extends BadRequestError {
	constructor(limit: number) {
		super({
			code: APIErrorCodes.MAX_WEBHOOKS_PER_GUILD,
			messageVariables: {count: limit},
			data: {
				max_webhooks_per_guild: limit,
			},
		});
	}
}

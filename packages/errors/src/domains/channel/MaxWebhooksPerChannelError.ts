// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class MaxWebhooksPerChannelError extends BadRequestError {
	constructor(limit: number) {
		super({
			code: APIErrorCodes.MAX_WEBHOOKS_PER_CHANNEL,
			messageVariables: {count: limit},
			data: {
				max_webhooks_per_channel: limit,
			},
		});
	}
}

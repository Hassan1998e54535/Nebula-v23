// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class WebhookThreadNameRequiresForumError extends BadRequestError {
	constructor() {
		super({
			code: APIErrorCodes.WEBHOOK_THREAD_NAME_REQUIRES_FORUM,
		});
	}
}

// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class WebhookServiceForumUnsupportedError extends BadRequestError {
	constructor() {
		super({
			code: APIErrorCodes.WEBHOOK_SERVICE_FORUM_UNSUPPORTED,
		});
	}
}

// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class ForumTagRequiredError extends BadRequestError {
	constructor() {
		super({
			code: APIErrorCodes.FORUM_TAG_REQUIRED,
		});
	}
}

// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class DirectMessagesDisabledError extends BadRequestError {
	constructor() {
		super({code: APIErrorCodes.DIRECT_MESSAGES_DISABLED});
	}
}

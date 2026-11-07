// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class CannotSendMessagesToUserError extends BadRequestError {
	constructor() {
		super({code: APIErrorCodes.CANNOT_SEND_MESSAGES_TO_USER});
	}
}

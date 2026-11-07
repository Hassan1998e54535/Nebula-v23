// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class CannotSendMessageToNonTextChannelError extends BadRequestError {
	constructor() {
		super({
			code: APIErrorCodes.CANNOT_SEND_MESSAGES_IN_NON_TEXT_CHANNEL,
		});
	}
}

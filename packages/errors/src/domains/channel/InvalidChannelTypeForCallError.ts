// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class InvalidChannelTypeForCallError extends BadRequestError {
	constructor() {
		super({
			code: APIErrorCodes.INVALID_CHANNEL_TYPE_FOR_CALL,
		});
	}
}

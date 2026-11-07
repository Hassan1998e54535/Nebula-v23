// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class CannotSendFriendRequestToSelfError extends BadRequestError {
	constructor() {
		super({
			code: APIErrorCodes.CANNOT_SEND_FRIEND_REQUEST_TO_SELF,
		});
	}
}

// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class CannotSendFriendRequestToBlockedUserError extends BadRequestError {
	constructor() {
		super({
			code: APIErrorCodes.CANNOT_SEND_FRIEND_REQUEST_TO_BLOCKED_USER,
		});
	}
}

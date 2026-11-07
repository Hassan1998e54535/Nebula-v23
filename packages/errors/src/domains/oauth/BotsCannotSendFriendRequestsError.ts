// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class BotsCannotSendFriendRequestsError extends BadRequestError {
	constructor() {
		super({
			code: APIErrorCodes.BOTS_CANNOT_SEND_FRIEND_REQUESTS,
		});
	}
}

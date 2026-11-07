// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class FriendRequestBlockedError extends BadRequestError {
	constructor() {
		super({
			code: APIErrorCodes.FRIEND_REQUEST_BLOCKED,
		});
	}
}

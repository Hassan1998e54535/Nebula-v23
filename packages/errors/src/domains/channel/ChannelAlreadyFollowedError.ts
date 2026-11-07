// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class ChannelAlreadyFollowedError extends BadRequestError {
	constructor() {
		super({
			code: APIErrorCodes.CHANNEL_ALREADY_FOLLOWED,
		});
	}
}

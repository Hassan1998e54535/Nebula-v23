// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class ChannelHasFollowedChannelsError extends BadRequestError {
	constructor() {
		super({
			code: APIErrorCodes.CHANNEL_HAS_FOLLOWED_CHANNELS,
		});
	}
}

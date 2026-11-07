// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class MessageAlreadyCrosspostedError extends BadRequestError {
	constructor() {
		super({
			code: APIErrorCodes.MESSAGE_ALREADY_CROSSPOSTED,
		});
	}
}

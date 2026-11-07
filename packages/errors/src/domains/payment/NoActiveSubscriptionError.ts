// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class NoActiveSubscriptionError extends BadRequestError {
	constructor() {
		super({code: APIErrorCodes.NO_ACTIVE_SUBSCRIPTION});
	}
}

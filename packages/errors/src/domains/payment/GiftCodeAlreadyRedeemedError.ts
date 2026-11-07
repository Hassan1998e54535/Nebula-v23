// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class GiftCodeAlreadyRedeemedError extends BadRequestError {
	constructor() {
		super({
			code: APIErrorCodes.GIFT_CODE_ALREADY_REDEEMED,
		});
	}
}

// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class StorePurchaseInvalidError extends BadRequestError {
	constructor() {
		super({
			code: APIErrorCodes.STORE_PURCHASE_INVALID,
		});
	}
}

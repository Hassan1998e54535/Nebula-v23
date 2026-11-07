// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {ForbiddenError} from '@nexus/errors/src/domains/core/ForbiddenError';

export class StorePurchaseOwnedByOtherAccountError extends ForbiddenError {
	constructor() {
		super({
			code: APIErrorCodes.STORE_PURCHASE_OWNED_BY_OTHER_ACCOUNT,
		});
	}
}

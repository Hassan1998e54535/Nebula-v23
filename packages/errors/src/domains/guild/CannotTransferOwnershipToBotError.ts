// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class CannotTransferOwnershipToBotError extends BadRequestError {
	constructor() {
		super({
			code: APIErrorCodes.CANNOT_TRANSFER_OWNERSHIP_TO_BOT,
		});
	}
}

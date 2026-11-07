// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class NoPendingDeletionError extends BadRequestError {
	constructor() {
		super({code: APIErrorCodes.NO_PENDING_DELETION});
	}
}

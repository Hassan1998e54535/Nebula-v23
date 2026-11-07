// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {NotFoundError} from '@nexus/errors/src/domains/core/NotFoundError';

export class UnknownOriginHandoffError extends NotFoundError {
	constructor() {
		super({code: APIErrorCodes.UNKNOWN_ORIGIN_HANDOFF});
	}
}

// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class InvalidTimestampError extends BadRequestError {
	constructor(detail?: string) {
		super({
			code: APIErrorCodes.INVALID_TIMESTAMP,
			messageVariables: detail ? {detail} : undefined,
		});
	}
}

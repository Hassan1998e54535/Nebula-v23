// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {InternalServerError} from '@nexus/errors/src/domains/core/InternalServerError';

export class UpdateFailedError extends InternalServerError {
	constructor(detail?: string) {
		super({
			code: APIErrorCodes.UPDATE_FAILED,
			messageVariables: detail ? {detail} : undefined,
		});
	}
}

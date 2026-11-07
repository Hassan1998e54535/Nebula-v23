// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {InternalServerError} from '@nexus/errors/src/domains/core/InternalServerError';

export class ProcessingFailedError extends InternalServerError {
	constructor(detail?: string) {
		super({
			code: APIErrorCodes.PROCESSING_FAILED,
			messageVariables: detail ? {detail} : undefined,
		});
	}
}

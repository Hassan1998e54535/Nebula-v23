// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class FileSizeTooLargeError extends BadRequestError {
	constructor(maxSize?: number) {
		super({
			code: APIErrorCodes.FILE_SIZE_TOO_LARGE,
			...(maxSize != null ? {messageVariables: {maxSize}} : {}),
		});
	}
}

// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class StreamKeyScopeMismatchError extends BadRequestError {
	constructor() {
		super({code: APIErrorCodes.STREAM_KEY_SCOPE_MISMATCH});
	}
}

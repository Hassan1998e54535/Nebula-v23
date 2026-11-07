// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class MaxGuildEmojisError extends BadRequestError {
	constructor(maxEmojis: number) {
		super({
			code: APIErrorCodes.MAX_EMOJIS,
			messageVariables: {count: maxEmojis},
		});
	}
}

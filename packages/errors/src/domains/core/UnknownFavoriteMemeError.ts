// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {NotFoundError} from '@nexus/errors/src/domains/core/NotFoundError';

export class UnknownFavoriteMemeError extends NotFoundError {
	constructor() {
		super({code: APIErrorCodes.UNKNOWN_FAVORITE_MEME});
	}
}

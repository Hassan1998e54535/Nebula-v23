// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class MaxFavoriteMemesError extends BadRequestError {
	constructor(limit: number) {
		super({
			code: APIErrorCodes.MAX_FAVORITE_MEMES,
			messageVariables: {count: limit},
			data: {
				max_favorite_memes: limit,
			},
		});
	}
}

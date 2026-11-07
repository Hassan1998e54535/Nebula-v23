// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class MaxBookmarksError extends BadRequestError {
	constructor(params: {maxBookmarks: number}) {
		const {maxBookmarks} = params;
		super({
			code: APIErrorCodes.MAX_BOOKMARKS,
			messageVariables: {count: maxBookmarks},
			data: {max_bookmarks: maxBookmarks},
		});
	}
}

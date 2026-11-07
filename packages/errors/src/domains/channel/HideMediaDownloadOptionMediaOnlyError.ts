// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class HideMediaDownloadOptionMediaOnlyError extends BadRequestError {
	constructor() {
		super({
			code: APIErrorCodes.HIDE_MEDIA_DOWNLOAD_OPTION_MEDIA_ONLY,
		});
	}
}

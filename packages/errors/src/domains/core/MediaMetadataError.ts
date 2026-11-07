// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class MediaMetadataError extends BadRequestError {
	constructor(source: string) {
		super({
			code: APIErrorCodes.MEDIA_METADATA_ERROR,
			messageVariables: {source},
		});
	}
}

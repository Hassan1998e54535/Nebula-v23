// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {NotFoundError} from '@nexus/errors/src/domains/core/NotFoundError';

export class DiscoveryApplicationNotFoundError extends NotFoundError {
	constructor() {
		super({
			code: APIErrorCodes.DISCOVERY_APPLICATION_NOT_FOUND,
		});
	}
}

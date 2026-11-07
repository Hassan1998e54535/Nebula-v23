// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {NotFoundError} from '@nexus/errors/src/domains/core/NotFoundError';

export class AdminApiKeyNotFoundError extends NotFoundError {
	constructor(messageVariables?: Record<string, unknown>) {
		super({
			code: APIErrorCodes.ADMIN_API_KEY_NOT_FOUND,
			messageVariables,
		});
	}
}

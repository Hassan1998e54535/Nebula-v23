// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {ConflictError} from '@nexus/errors/src/domains/core/ConflictError';

export class DiscoveryAlreadyAppliedError extends ConflictError {
	constructor() {
		super({
			code: APIErrorCodes.DISCOVERY_ALREADY_APPLIED,
		});
	}
}

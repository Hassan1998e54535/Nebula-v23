// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class InstancePolicyTransitionNotAllowedError extends BadRequestError {
	constructor() {
		super({code: APIErrorCodes.INSTANCE_POLICY_TRANSITION_NOT_ALLOWED});
	}
}

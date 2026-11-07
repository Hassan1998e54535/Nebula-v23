// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {BadRequestError} from '@nexus/errors/src/domains/core/BadRequestError';

export class InvalidPasskeyBridgeNonceError extends BadRequestError {
	constructor() {
		super({code: APIErrorCodes.INVALID_PASSKEY_BRIDGE_NONCE});
	}
}

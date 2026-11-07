// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import {ForbiddenError} from '@nexus/errors/src/domains/core/ForbiddenError';

export interface SudoModeMethods {
	totp: boolean;
	webauthn: boolean;
	backup_codes: boolean;
}

const EMPTY_METHODS: SudoModeMethods = {totp: false, webauthn: false, backup_codes: false};

export class SudoModeRequiredError extends ForbiddenError {
	constructor(hasMfa: boolean, methods: SudoModeMethods = EMPTY_METHODS) {
		super({
			code: APIErrorCodes.SUDO_MODE_REQUIRED,
			data: {
				has_mfa: hasMfa,
				methods,
			},
		});
	}
}

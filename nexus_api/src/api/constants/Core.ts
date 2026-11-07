// SPDX-License-Identifier: Nebula

import {createUserID, type UserID} from '@app/api/BrandedTypes';
import {DELETED_USER_ID} from '@nexus/constants/src/UserConstants';
import {UnknownUserError} from '@nexus/errors/src/domains/user/UnknownUserError';

export const SYSTEM_USER_ID = createUserID(0n);

export function isSyntheticUserId(userId: UserID): boolean {
	return userId === SYSTEM_USER_ID || userId === DELETED_USER_ID;
}

export function assertMutableUserId(userId: UserID): void {
	if (isSyntheticUserId(userId)) {
		throw new UnknownUserError();
	}
}

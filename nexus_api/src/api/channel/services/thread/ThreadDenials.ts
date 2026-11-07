// SPDX-License-Identifier: Nebula

import {APIErrorCodes} from '@nexus/constants/src/ApiErrorCodes';
import type {ThreadDenial} from '@nexus/constants/src/ThreadPermissionUtils';
import {ThreadArchivedError} from '@nexus/errors/src/domains/channel/ThreadArchivedError';
import {ThreadLockedError} from '@nexus/errors/src/domains/channel/ThreadLockedError';
import {UnknownThreadMemberError} from '@nexus/errors/src/domains/channel/UnknownThreadMemberError';
import {MissingAccessError} from '@nexus/errors/src/domains/core/MissingAccessError';
import {MissingPermissionsError} from '@nexus/errors/src/domains/core/MissingPermissionsError';
import {CommunicationDisabledError} from '@nexus/errors/src/domains/moderation/CommunicationDisabledError';

export function threadDenialError(denial: ThreadDenial): Error {
	switch (denial) {
		case APIErrorCodes.MISSING_ACCESS:
			return new MissingAccessError();
		case APIErrorCodes.MISSING_PERMISSIONS:
			return new MissingPermissionsError();
		case APIErrorCodes.COMMUNICATION_DISABLED:
			return new CommunicationDisabledError();
		case APIErrorCodes.THREAD_ARCHIVED:
			return new ThreadArchivedError();
		case APIErrorCodes.THREAD_LOCKED:
			return new ThreadLockedError();
		case APIErrorCodes.UNKNOWN_THREAD_MEMBER:
			return new UnknownThreadMemberError();
	}
}

export function assertThreadAllowed(denial: ThreadDenial | null): void {
	if (denial !== null) throw threadDenialError(denial);
}

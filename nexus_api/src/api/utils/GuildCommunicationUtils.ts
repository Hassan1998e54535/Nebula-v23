// SPDX-License-Identifier: Nebula

import {isGuildMemberTimedOut} from '@app/api/guild/GuildModel';
import {CommunicationDisabledError} from '@nexus/errors/src/domains/moderation/CommunicationDisabledError';
import type {GuildMemberResponse} from '@nexus/schema/src/domains/guild/GuildMemberSchemas';

export function assertGuildMemberCanCommunicate(member?: GuildMemberResponse | null): void {
	if (isGuildMemberTimedOut(member)) {
		throw new CommunicationDisabledError();
	}
}

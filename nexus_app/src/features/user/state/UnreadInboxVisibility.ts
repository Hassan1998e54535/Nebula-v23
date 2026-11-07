// SPDX-License-Identifier: Nebula

import {MessageNotifications} from '@nexus/constants/src/NotificationConstants';

export interface UnreadInboxVisibilityInput {
	unreadBadgesLevel: number | null;
	isMuted: boolean;
	hasUnread: boolean;
	hasMentions: boolean;
}

export function resolveUnreadInboxVisibility(input: UnreadInboxVisibilityInput): boolean {
	if (!input.hasUnread && !input.hasMentions) {
		return false;
	}
	if (input.unreadBadgesLevel === MessageNotifications.NO_MESSAGES) {
		return false;
	}
	if (input.hasMentions) {
		return true;
	}
	if (input.isMuted) {
		return false;
	}
	return input.unreadBadgesLevel !== MessageNotifications.ONLY_MENTIONS;
}

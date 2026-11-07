// SPDX-License-Identifier: Nebula

export interface NEXUSButtonBadgeCountInput {
	incomingFriendRequestCount: number;
	inlineDmsCollapsed: boolean;
	showCollapsedUnreadDmsBadge: boolean;
	showIncomingFriendRequestBadge: boolean;
	unreadDmCount: number;
}

export function getNEXUSButtonBadgeCount({
	incomingFriendRequestCount,
	inlineDmsCollapsed,
	showCollapsedUnreadDmsBadge,
	showIncomingFriendRequestBadge,
	unreadDmCount,
}: NEXUSButtonBadgeCountInput): number {
	let count = 0;
	if (inlineDmsCollapsed && showCollapsedUnreadDmsBadge) {
		count += unreadDmCount;
	}
	if (showIncomingFriendRequestBadge) {
		count += incomingFriendRequestCount;
	}
	return count;
}

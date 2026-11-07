// SPDX-License-Identifier: Nebula

import {initializeStore} from '@app/features/platform/utils/StoreInitialization';
import {makeSyncedField} from '@app/features/user/state/SyncedField';
import {SidebarPreferencesSchema} from '@nexus/schema/src/gen/nexus/user/preferences/v1/preferences_pb';
import {makeAutoObservable} from 'mobx';

const DEFAULT_SHOW_COLLAPSED_UNREAD_DMS_BADGE = true;
const DEFAULT_SHOW_INCOMING_FRIEND_REQUEST_BADGE = true;

class SidebarPreferences {
	inlineDmsCollapsed = false;
	showCollapsedUnreadDmsBadge = DEFAULT_SHOW_COLLAPSED_UNREAD_DMS_BADGE;
	showIncomingFriendRequestBadge = DEFAULT_SHOW_INCOMING_FRIEND_REQUEST_BADGE;
	showTypingOnSelectedChannel = false;
	openGuildsToLastChannel = false;

	constructor() {
		makeAutoObservable(this, {}, {autoBind: true});
		initializeStore(this, () =>
			makeSyncedField(this, {
				field: 'sidebar',
				schema: SidebarPreferencesSchema,
				persist: [
					'inlineDmsCollapsed',
					'showCollapsedUnreadDmsBadge',
					'showIncomingFriendRequestBadge',
					'showTypingOnSelectedChannel',
					'openGuildsToLastChannel',
				],
				toMessage: (s) => ({
					inlineDmsCollapsed: s.inlineDmsCollapsed,
					showCollapsedUnreadDmsBadge:
						s.showCollapsedUnreadDmsBadge === DEFAULT_SHOW_COLLAPSED_UNREAD_DMS_BADGE
							? undefined
							: s.showCollapsedUnreadDmsBadge,
					showIncomingFriendRequestBadge:
						s.showIncomingFriendRequestBadge === DEFAULT_SHOW_INCOMING_FRIEND_REQUEST_BADGE
							? undefined
							: s.showIncomingFriendRequestBadge,
				}),
				applyMessage: (s, m) => {
					s.inlineDmsCollapsed = m.inlineDmsCollapsed;
					s.showCollapsedUnreadDmsBadge = m.showCollapsedUnreadDmsBadge ?? DEFAULT_SHOW_COLLAPSED_UNREAD_DMS_BADGE;
					s.showIncomingFriendRequestBadge =
						m.showIncomingFriendRequestBadge ?? DEFAULT_SHOW_INCOMING_FRIEND_REQUEST_BADGE;
				},
			}),
		);
	}

	toggleInlineDmsCollapsed(): void {
		this.inlineDmsCollapsed = !this.inlineDmsCollapsed;
	}

	setInlineDmsCollapsed(value: boolean): void {
		this.inlineDmsCollapsed = value;
	}

	setShowCollapsedUnreadDmsBadge(value: boolean): void {
		this.showCollapsedUnreadDmsBadge = value;
	}

	setShowIncomingFriendRequestBadge(value: boolean): void {
		this.showIncomingFriendRequestBadge = value;
	}

	setShowTypingOnSelectedChannel(value: boolean): void {
		this.showTypingOnSelectedChannel = value;
	}

	setOpenGuildsToLastChannel(value: boolean): void {
		this.openGuildsToLastChannel = value;
	}
}

export default new SidebarPreferences();

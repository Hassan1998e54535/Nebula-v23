// SPDX-License-Identifier: Nebula

import {initializeStore} from '@app/features/platform/utils/StoreInitialization';
import {makeSyncedField} from '@app/features/user/state/SyncedField';
import Users from '@app/features/user/state/Users';
import {syncLocalVoiceStateWithServer} from '@app/features/voice/engine/VoiceMediaEngineBridge';
import {PrivacyPreferencesSchema} from '@nexus/schema/src/gen/nexus/user/preferences/v1/preferences_pb';
import {extractTimestamp} from '@nexus/snowflake/src/SnowflakeUtils';
import {makeAutoObservable, reaction} from 'mobx';

const SHOW_ACTIVE_NOW_DEFAULT = true;
const PREUPLOAD_MESSAGE_ATTACHMENTS_DEFAULT_ON_AFTER = '2026-06-04T16:10:00.000Z';
const PREUPLOAD_MESSAGE_ATTACHMENTS_DEFAULT_ON_AFTER_MS = Date.parse(PREUPLOAD_MESSAGE_ATTACHMENTS_DEFAULT_ON_AFTER);

function getPreuploadMessageAttachmentsDefaultForUserId(userId: string | null | undefined): boolean {
	if (!userId) {
		return false;
	}
	const createdAtMs = extractTimestamp(userId);
	return Number.isFinite(createdAtMs) && createdAtMs >= PREUPLOAD_MESSAGE_ATTACHMENTS_DEFAULT_ON_AFTER_MS;
}

function currentUserIdSafe(): string | null | undefined {
	return (Users as typeof Users | undefined)?.currentUserId;
}

class PrivacyPreferences {
	disableStreamPreviews = false;
	hideStreamPreviewOutsideChannel = false;
	showActiveNow = SHOW_ACTIVE_NOW_DEFAULT;
	preuploadMessageAttachments: boolean | undefined = undefined;

	constructor() {
		makeAutoObservable(this, {}, {autoBind: true});
		reaction(
			() => this.hideStreamPreviewOutsideChannel,
			(value) => syncLocalVoiceStateWithServer({hide_stream_preview_outside_channel: value}),
		);
		initializeStore(this, () => this.initPersistence());
	}

	private async initPersistence(): Promise<void> {
		await makeSyncedField(this, {
			field: 'privacy',
			schema: PrivacyPreferencesSchema,
			persist: [
				'disableStreamPreviews',
				'hideStreamPreviewOutsideChannel',
				'showActiveNow',
				'preuploadMessageAttachments',
			],
			toMessage: (s) => ({
				disableStreamPreviews: s.disableStreamPreviews,
				hideStreamPreviewOutsideChannel:
					s.hideStreamPreviewOutsideChannel === false ? undefined : s.hideStreamPreviewOutsideChannel,
				showActiveNow: s.showActiveNow === SHOW_ACTIVE_NOW_DEFAULT ? undefined : s.showActiveNow,
				preuploadMessageAttachments:
					s.preuploadMessageAttachments === getPreuploadMessageAttachmentsDefaultForUserId(currentUserIdSafe())
						? undefined
						: s.preuploadMessageAttachments,
			}),
			applyMessage: (s, m) => {
				s.disableStreamPreviews = m.disableStreamPreviews;
				s.hideStreamPreviewOutsideChannel = m.hideStreamPreviewOutsideChannel ?? false;
				if (m.showActiveNow !== undefined) {
					s.showActiveNow = m.showActiveNow;
				}
				s.preuploadMessageAttachments = m.preuploadMessageAttachments;
			},
		});
	}

	getDisableStreamPreviews(): boolean {
		return this.disableStreamPreviews;
	}

	getShowActiveNow(): boolean {
		return this.showActiveNow;
	}

	getPreuploadMessageAttachments(): boolean {
		return this.preuploadMessageAttachments ?? getPreuploadMessageAttachmentsDefaultForUserId(currentUserIdSafe());
	}

	setDisableStreamPreviews(value: boolean): void {
		this.disableStreamPreviews = value;
	}

	setHideStreamPreviewOutsideChannel(value: boolean): void {
		this.hideStreamPreviewOutsideChannel = value;
	}

	setShowActiveNow(value: boolean): void {
		this.showActiveNow = value;
	}

	setPreuploadMessageAttachments(value: boolean): void {
		const defaultValue = getPreuploadMessageAttachmentsDefaultForUserId(currentUserIdSafe());
		this.preuploadMessageAttachments = value === defaultValue ? undefined : value;
	}
}

export default new PrivacyPreferences();

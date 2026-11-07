// SPDX-License-Identifier: Nebula

import {initializeStore} from '@app/features/platform/utils/StoreInitialization';
import {makeSyncedField} from '@app/features/user/state/SyncedField';
import {TextualPreviewSettingsSchema} from '@nexus/schema/src/gen/nexus/user/preferences/v1/preferences_pb';
import {makeAutoObservable} from 'mobx';

class TextualPreview {
	wrapText = false;

	constructor() {
		makeAutoObservable(this, {}, {autoBind: true});
		initializeStore(this, () =>
			makeSyncedField(this, {
				field: 'textualPreview',
				schema: TextualPreviewSettingsSchema,
				persist: ['wrapText'],
				toMessage: (s) => ({wrapText: s.wrapText}),
				applyMessage: (s, m) => {
					s.wrapText = m.wrapText;
				},
			}),
		);
	}

	toggleWrapText(): void {
		this.wrapText = !this.wrapText;
	}
}

export default new TextualPreview();

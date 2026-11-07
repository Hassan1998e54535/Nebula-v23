// SPDX-License-Identifier: Nebula

import type {MessageEmbedFooter} from '@app/api/database/types/MessageTypes';
import {sanitizeOptionalAbsoluteUrlOrNull} from '@app/api/utils/UrlSanitizer';

export class EmbedFooter {
	readonly text: string | null;
	readonly iconUrl: string | null;

	constructor(footer: MessageEmbedFooter) {
		this.text = footer.text ?? null;
		this.iconUrl = sanitizeOptionalAbsoluteUrlOrNull(footer.icon_url);
	}

	toMessageEmbedFooter(): MessageEmbedFooter {
		return {
			text: this.text,
			icon_url: this.iconUrl,
		};
	}
}

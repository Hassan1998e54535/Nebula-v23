// SPDX-License-Identifier: Nebula

import {Logger} from '@app/features/platform/utils/AppLogger';
import {i18n} from '@lingui/core';

const logger = new Logger('LocaleChangeListener');

export function onLocaleChange(listener: () => void): () => void {
	return i18n.on('change', () => {
		try {
			listener();
		} catch (error) {
			logger.error('Locale change listener failed:', error);
		}
	});
}

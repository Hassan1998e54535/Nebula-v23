// SPDX-License-Identifier: Nebula

import {getDateFormatter} from '@nexus/date_utils/src/DateFormatterCache';

export function localeUses12Hour(locale: string): boolean {
	return getDateFormatter(locale, {hour: 'numeric'}).resolvedOptions().hour12 === true;
}

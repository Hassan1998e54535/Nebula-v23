// SPDX-License-Identifier: Nebula

import {PREMIUM_GRACE_PERIOD_DAYS} from '@nexus/constants/src/UserConstants';
import {MS_PER_DAY} from '@nexus/date_utils/src/DateConstants';

export function getPremiumGraceEndDate(premiumUntil: Date, premiumGraceEndsAt: Date | null | undefined): Date {
	const graceEnd = premiumGraceEndsAt ?? new Date(premiumUntil.getTime() + PREMIUM_GRACE_PERIOD_DAYS * MS_PER_DAY);
	return graceEnd.getTime() > premiumUntil.getTime() ? graceEnd : premiumUntil;
}

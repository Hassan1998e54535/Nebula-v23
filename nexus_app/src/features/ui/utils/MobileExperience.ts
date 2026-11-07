// SPDX-License-Identifier: Nebula

import MobileLayout from '@app/features/ui/state/MobileLayout';

export function isMobileExperienceEnabled(): boolean {
	return MobileLayout.platformMobileDetected || MobileLayout.isMobileLayout();
}

// SPDX-License-Identifier: Nebula

import Users from '@app/features/user/state/Users';

export function shouldShowClaimedAccountSections(): boolean {
	return Users.getCurrentUser()?.isClaimed() ?? true;
}

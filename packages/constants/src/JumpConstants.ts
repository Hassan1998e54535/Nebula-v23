// SPDX-License-Identifier: Nebula

import type {ValueOf} from '@nexus/constants/src/ValueOf';

export const JumpTypes = {
	ANIMATED: 'ANIMATED',
	INSTANT: 'INSTANT',
	NONE: 'NONE',
} as const;

export type JumpType = ValueOf<typeof JumpTypes>;

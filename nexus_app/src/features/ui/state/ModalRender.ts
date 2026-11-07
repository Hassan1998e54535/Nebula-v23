// SPDX-License-Identifier: Nebula

import type React from 'react';

export type ModalType = 'user-settings' | 'guild-settings' | 'channel-settings';

export interface ModalRender {
	(): React.ReactElement;
	modalType?: ModalType;
}

// SPDX-License-Identifier: Nebula

import type {Channel} from '@app/features/channel/models/Channel';

export type ChannelDetailsTab = 'members' | 'pins';

export interface ChannelDetailsBottomSheetProps {
	isOpen: boolean;
	onClose: () => void;
	channel: Channel;
	initialTab?: ChannelDetailsTab;
}

export interface QuickActionButtonProps {
	icon: React.ReactNode;
	label: string;
	onClick: () => void;
	isActive?: boolean;
	danger?: boolean;
	disabled?: boolean;
}

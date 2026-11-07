// SPDX-License-Identifier: Nebula

import type {Channel} from '@app/features/channel/models/Channel';
import {useThreadMenuData} from '@app/features/threads/hooks/useThreadMenuData';
import {DataMenuRenderer} from '@app/features/ui/action_menu/DataMenuRenderer';
import {observer} from 'mobx-react-lite';

interface ThreadContextMenuProps {
	thread: Channel;
	onClose: () => void;
}

export const ThreadContextMenu = observer(({thread, onClose}: ThreadContextMenuProps) => {
	const {groups} = useThreadMenuData(thread, {onClose});
	return <DataMenuRenderer groups={groups} data-flx="threads.thread-context-menu.data-menu-renderer" />;
});

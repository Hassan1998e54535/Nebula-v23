// SPDX-License-Identifier: Nebula

import {ChannelSettingsModal} from '@app/features/app/components/dialogs/LoadableSettingsModals';
import {selectChannelReorderResolution} from '@app/features/app/components/layout/dnd/ChannelReorderStateMachine';
import {type DragItem, DragItemType, type DropResult} from '@app/features/app/components/layout/types/DndTypes';
import {createChannelMoveOperation} from '@app/features/app/components/layout/utils/ChannelMoveOperation';
import {organizeChannels} from '@app/features/app/components/layout/utils/ChannelOrganization';
import {CategoryCreateModal} from '@app/features/channel/components/modals/CategoryCreateModal';
import {ChannelCreateModal} from '@app/features/channel/components/modals/ChannelCreateModal';
import type {Channel} from '@app/features/channel/models/Channel';
import Channels from '@app/features/channel/state/Channels';
import * as ChannelUtils from '@app/features/channel/utils/ChannelUtils';
import * as GuildCommands from '@app/features/guild/commands/GuildCommands';
import styles from '@app/features/guild/components/modals/guild_tabs/GuildChannelsTab.module.css';
import Guilds from '@app/features/guild/state/Guilds';
import {
	ADD_CHANNEL_DESCRIPTOR,
	CREATE_CATEGORY_DESCRIPTOR,
	CREATE_CHANNEL_DESCRIPTOR,
} from '@app/features/i18n/utils/CommonMessageDescriptors';
import Permission from '@app/features/permissions/state/Permission';
import {CreateCategoryIcon, CreateIcon} from '@app/features/ui/action_menu/ContextMenuIcons';
import * as ModalCommands from '@app/features/ui/commands/ModalCommands';
import {modal} from '@app/features/ui/commands/ModalCommands';
import * as ToastCommands from '@app/features/ui/commands/ToastCommands';
import {MenuBottomSheet, type MenuGroupType} from '@app/features/ui/menu_bottom_sheet/MenuBottomSheet';
import {CHANNELS_DESCRIPTOR} from '@app/features/user/components/settings_utils/GuildSettingsConstants';
import {msg} from '@lingui/core/macro';
import {useLingui} from '@lingui/react/macro';
import {ChannelTypes, Permissions} from '@nexus/constants/src/ChannelConstants';
import {PlusIcon} from '@phosphor-icons/react';
import {clsx} from 'clsx';
import {observer} from 'mobx-react-lite';
import type React from 'react';
import {useCallback, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

const DRAG_TO_REORDER_CHANNEL_DESCRIPTOR = msg({
	message: 'Drag to reorder {channelName}',
	context: 'mobile-channel-management',
	comment: 'Accessible label for the drag handle on a mobile community channel or category.',
});
const CHANNEL_MOVED_DESCRIPTOR = msg({
	message: 'Moved {channelName}.',
	context: 'mobile-channel-management',
	comment: 'Screen-reader announcement after a community channel or category is reordered.',
});
const CHANNEL_ORDER_SAVE_FAILED_DESCRIPTOR = msg({
	message: 'Could not save the channel order. Try again.',
	context: 'mobile-channel-management',
	comment: 'Error shown when saving the order of community channels fails.',
});
const TEXT_CHANNELS_DESCRIPTOR = msg({message: 'Text channels'});
const VOICE_CHANNELS_DESCRIPTOR = msg({message: 'Voice channels'});

interface ActiveDrag {
	item: DragItem;
	pointerId: number;
}

interface ResolvedDrop {
	targetId: string;
	edge: 'top' | 'bottom';
	result: DropResult;
}

interface DragPreviewPosition {
	x: number;
	y: number;
}

function createDragItem(channel: Channel, guildId: string): DragItem {
	return {
		type: channel.type === ChannelTypes.GUILD_CATEGORY ? DragItemType.CATEGORY : DragItemType.CHANNEL,
		id: channel.id,
		channelType: channel.type,
		parentId: channel.parentId ?? null,
		guildId,
	};
}

function getDragPreviewPosition(event: React.PointerEvent<HTMLElement>): DragPreviewPosition {
	const view = event.currentTarget.ownerDocument.defaultView;
	const viewportWidth = view?.innerWidth ?? 320;
	const viewportHeight = view?.innerHeight ?? 640;
	const previewWidth = Math.min(260, viewportWidth - 16);
	return {
		x: Math.min(Math.max(8, event.clientX + 14), Math.max(8, viewportWidth - previewWidth - 8)),
		y: Math.min(Math.max(8, event.clientY + 14), Math.max(8, viewportHeight - 60)),
	};
}

function findScrollableAncestor(element: HTMLElement): HTMLElement | null {
	let current = element.parentElement;
	while (current && current !== document.body) {
		const overflowY = window.getComputedStyle(current).overflowY;
		if ((overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight) {
			return current;
		}
		current = current.parentElement;
	}
	return null;
}

const GuildChannelsTab: React.FC<{guildId: string}> = observer(({guildId}) => {
	const {i18n} = useLingui();
	const guild = Guilds.getGuild(guildId);
	const channels = Channels.getGuildChannels(guildId);
	const activeDragRef = useRef<ActiveDrag | null>(null);
	const scrollContainerRef = useRef<HTMLElement | null>(null);
	const [draggingChannelId, setDraggingChannelId] = useState<string | null>(null);
	const [dropTarget, setDropTarget] = useState<Pick<ResolvedDrop, 'targetId' | 'edge'> | null>(null);
	const [announcement, setAnnouncement] = useState('');
	const [dragPreviewPosition, setDragPreviewPosition] = useState<DragPreviewPosition | null>(null);
	const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);

	const channelGroups = useMemo(() => {
		const groups = organizeChannels(channels);
		return [
			{type: 'text' as const, channels: groups.flatMap((group) => group.textChannels)},
			{type: 'voice' as const, channels: groups.flatMap((group) => group.voiceChannels)},
		];
	}, [channels]);
	const channelRows = useMemo(() => channelGroups.flatMap((group) => group.channels), [channelGroups]);

	const resolveDrop = useCallback(
		(item: DragItem, x: number, y: number): ResolvedDrop | null => {
			const elementAtPoint = document.elementFromPoint(x, y);
			const rowElement = elementAtPoint?.closest<HTMLElement>('[data-channel-management-row-id]');
			const targetId = rowElement?.dataset.channelManagementRowId;
			if (!rowElement || !targetId) return null;
			const targetChannel = channels.find((channel) => channel.id === targetId);
			if (!targetChannel) return null;
			const rect = rowElement.getBoundingClientRect();
			const resolution = selectChannelReorderResolution(
				item,
				{
					id: targetChannel.id,
					channelType: targetChannel.type,
					parentId: targetChannel.parentId ?? null,
					guildId,
				},
				{x, y},
				{top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right},
			);
			if (!resolution.intent || !resolution.indicator) return null;
			return {
				targetId,
				edge: resolution.indicator.position,
				result: resolution.intent.result,
			};
		},
		[channels, guildId],
	);

	const saveMove = useCallback(
		async (item: DragItem, result: DropResult, channelName: string) => {
			const operation = createChannelMoveOperation({
				channels: Channels.getGuildChannels(guildId),
				dragItem: item,
				dropResult: result,
			});
			if (!operation) return;
			try {
				await GuildCommands.moveChannel(guildId, operation);
				setAnnouncement(i18n._(CHANNEL_MOVED_DESCRIPTOR, {channelName}));
			} catch {
				ToastCommands.error(i18n._(CHANNEL_ORDER_SAVE_FAILED_DESCRIPTOR));
			}
		},
		[guildId, i18n],
	);

	const handlePointerDown = useCallback(
		(event: React.PointerEvent<HTMLButtonElement>, channel: Channel) => {
			if (event.button !== 0 || activeDragRef.current) return;
			event.preventDefault();
			const item = createDragItem(channel, guildId);
			activeDragRef.current = {item, pointerId: event.pointerId};
			scrollContainerRef.current = findScrollableAncestor(event.currentTarget);
			setDraggingChannelId(channel.id);
			setDragPreviewPosition(getDragPreviewPosition(event));
			setDropTarget(null);
			event.currentTarget.setPointerCapture(event.pointerId);
		},
		[guildId],
	);

	const handlePointerMove = useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			const activeDrag = activeDragRef.current;
			if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
			event.preventDefault();
			const scrollContainer = scrollContainerRef.current;
			setDragPreviewPosition(getDragPreviewPosition(event));
			if (scrollContainer) {
				const bounds = scrollContainer.getBoundingClientRect();
				const edgeDistance = 48;
				if (event.clientY < bounds.top + edgeDistance) scrollContainer.scrollTop -= 12;
				else if (event.clientY > bounds.bottom - edgeDistance) scrollContainer.scrollTop += 12;
			}
			const resolved = resolveDrop(activeDrag.item, event.clientX, event.clientY);
			setDropTarget(resolved ? {targetId: resolved.targetId, edge: resolved.edge} : null);
		},
		[resolveDrop],
	);

	const clearDrag = useCallback(() => {
		activeDragRef.current = null;
		scrollContainerRef.current = null;
		setDraggingChannelId(null);
		setDragPreviewPosition(null);
		setDropTarget(null);
	}, []);

	const handlePointerUp = useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			const activeDrag = activeDragRef.current;
			if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
			const resolved = resolveDrop(activeDrag.item, event.clientX, event.clientY);
			const channelName = Channels.getChannel(activeDrag.item.id)?.name ?? '';
			clearDrag();
			if (resolved) void saveMove(activeDrag.item, resolved.result, channelName);
		},
		[clearDrag, resolveDrop, saveMove],
	);

	const handleReorderKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLButtonElement>, channel: Channel) => {
			if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
			event.preventDefault();
			const isVoice = channel.type === ChannelTypes.GUILD_VOICE;
			const peers = channelRows.filter((candidate) => {
				return (
					candidate.type !== ChannelTypes.GUILD_CATEGORY &&
					(candidate.parentId ?? null) === (channel.parentId ?? null) &&
					(candidate.type === ChannelTypes.GUILD_VOICE) === isVoice
				);
			});
			const currentIndex = peers.findIndex((candidate) => candidate.id === channel.id);
			const targetIndex = event.key === 'ArrowUp' ? currentIndex - 1 : currentIndex + 1;
			const target = peers[targetIndex];
			if (!target) return;
			const result: DropResult = {
				targetId: target.id,
				position: event.key === 'ArrowUp' ? 'before' : 'after',
				targetParentId: target.parentId ?? null,
			};
			void saveMove(createDragItem(channel, guildId), result, channel.name);
		},
		[channelRows, guildId, saveMove],
	);

	const handleCloseCreateSheet = useCallback(() => {
		setIsCreateSheetOpen(false);
	}, []);

	const handleCreateChannel = useCallback(() => {
		ModalCommands.pushAfterBottomSheetClose(
			handleCloseCreateSheet,
			modal(() => (
				<ChannelCreateModal guildId={guildId} data-flx="guild.channels-tab.create-sheet.channel-create-modal" />
			)),
		);
	}, [guildId, handleCloseCreateSheet]);

	const handleCreateCategory = useCallback(() => {
		ModalCommands.pushAfterBottomSheetClose(
			handleCloseCreateSheet,
			modal(() => (
				<CategoryCreateModal guildId={guildId} data-flx="guild.channels-tab.create-sheet.category-create-modal" />
			)),
		);
	}, [guildId, handleCloseCreateSheet]);

	const createMenuGroups = useMemo<Array<MenuGroupType>>(
		() => [
			{
				items: [
					{
						icon: <CreateIcon size={20} data-flx="guild.channels-tab.create-sheet.create-channel-icon" />,
						label: i18n._(CREATE_CHANNEL_DESCRIPTOR),
						onClick: handleCreateChannel,
					},
					{
						icon: <CreateCategoryIcon size={20} data-flx="guild.channels-tab.create-sheet.create-category-icon" />,
						label: i18n._(CREATE_CATEGORY_DESCRIPTOR),
						onClick: handleCreateCategory,
					},
				],
			},
		],
		[handleCreateCategory, handleCreateChannel, i18n.locale],
	);

	const handleOpenActions = useCallback(() => {
		setIsCreateSheetOpen(true);
	}, []);

	const handleOpenSettings = useCallback((channelId: string) => {
		ModalCommands.push(
			modal(
				() => <ChannelSettingsModal channelId={channelId} data-flx="guild.channels-tab.channel-settings-modal" />,
				'channel-settings',
			),
		);
	}, []);

	if (!guild || !Permission.can(Permissions.MANAGE_CHANNELS, {guildId})) return null;

	const draggedChannel = draggingChannelId ? Channels.getChannel(draggingChannelId) : null;
	const dragPreview =
		draggedChannel && dragPreviewPosition
			? createPortal(
					<div
						className={styles.dragPreview}
						style={{left: dragPreviewPosition.x, top: dragPreviewPosition.y}}
						aria-hidden="true"
						data-flx="guild.channels-tab.drag-preview"
					>
						{ChannelUtils.getIcon(draggedChannel, {
							className: styles.dragPreviewIcon,
							weight: 'bold',
						})}
						<span className={styles.dragPreviewName}>{draggedChannel.name}</span>
					</div>,
					document.body,
				)
			: null;

	return (
		<div
			className={styles.container}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			onPointerCancel={clearDrag}
			data-flx="guild.guild-tabs.guild-channels-tab.container"
		>
			{channelGroups.map((group) => (
				<section className={styles.section} key={group.type}>
					<h3 className={styles.sectionTitle}>
						{i18n._(group.type === 'text' ? TEXT_CHANNELS_DESCRIPTOR : VOICE_CHANNELS_DESCRIPTOR)}
					</h3>
					<div className={styles.list} role="list" data-flx="guild.guild-tabs.guild-channels-tab.channel-list">
						{group.channels.map((channel) => {
							const dropPosition = dropTarget?.targetId === channel.id ? dropTarget.edge : null;
							const dragLabel = i18n._(DRAG_TO_REORDER_CHANNEL_DESCRIPTOR, {channelName: channel.name});
							return (
								<div
									key={channel.id}
									role="listitem"
									className={clsx(
										styles.row,
										draggingChannelId === channel.id && styles.dragging,
										dropPosition === 'top' && styles.dropBefore,
										dropPosition === 'bottom' && styles.dropAfter,
									)}
									data-channel-management-row-id={channel.id}
									data-flx="guild.guild-tabs.guild-channels-tab.channel-row"
								>
									<button
										type="button"
										className={styles.channelButton}
										onClick={() => handleOpenSettings(channel.id)}
										data-flx="guild.guild-tabs.guild-channels-tab.channel-settings-button"
									>
										{ChannelUtils.getIcon(channel, {
											className: styles.channelIcon,
											weight: 'bold',
										})}
										<span className={styles.channelName}>{channel.name}</span>
									</button>
									<button
										type="button"
										className={styles.dragHandle}
										aria-label={dragLabel}
										aria-keyshortcuts="ArrowUp ArrowDown"
										title={dragLabel}
										onPointerDown={(event) => handlePointerDown(event, channel)}
										onKeyDown={(event) => handleReorderKeyDown(event, channel)}
										data-flx="guild.guild-tabs.guild-channels-tab.drag-handle"
									>
										<span className={styles.gripDots} aria-hidden="true">
											{Array.from({length: 9}, (_, index) => (
												<span className={styles.gripDot} key={index} />
											))}
										</span>
									</button>
								</div>
							);
						})}
					</div>
				</section>
			))}
			<button
				type="button"
				className={styles.addButton}
				aria-label={i18n._(ADD_CHANNEL_DESCRIPTOR)}
				title={i18n._(ADD_CHANNEL_DESCRIPTOR)}
				onClick={handleOpenActions}
				data-flx="guild.guild-tabs.guild-channels-tab.add-channel-button"
			>
				<PlusIcon size={24} weight="bold" aria-hidden="true" />
			</button>
			<MenuBottomSheet
				isOpen={isCreateSheetOpen}
				onClose={handleCloseCreateSheet}
				title={i18n._(CHANNELS_DESCRIPTOR)}
				groups={createMenuGroups}
				data-flx="guild.channels-tab.create-sheet"
			/>
			{dragPreview}
			<div className={styles.liveRegion} aria-live="polite" aria-atomic="true">
				{announcement}
			</div>
		</div>
	);
});

export default GuildChannelsTab;

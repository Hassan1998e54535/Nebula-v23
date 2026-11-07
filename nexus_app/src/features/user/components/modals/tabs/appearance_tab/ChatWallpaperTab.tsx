// SPDX-License-Identifier: Nebula

import ChatWallpaperPreferences, {
	getChatWallpaperBackgroundImage,
} from '@app/features/theme/state/ChatWallpaperPreferences';
import {compressWallpaperImage} from '@app/features/theme/utils/ChatWallpaperImage';
import styles from '@app/features/user/components/modals/tabs/appearance_tab/ChatWallpaperTab.module.css';
import {msg} from '@lingui/core/macro';
import {Trans, useLingui} from '@lingui/react/macro';
import {observer} from 'mobx-react-lite';
import type React from 'react';
import {useRef, useState} from 'react';

const WALLPAPER_CHOICES = [
	{id: 'none' as const, label: msg({message: 'No wallpaper', comment: 'Chat wallpaper preset label.'})},
	{id: 'nexus-night' as const, label: msg({message: 'Starfield', comment: 'Chat wallpaper preset label.'})},
	{id: 'ocean' as const, label: msg({message: 'Ocean', comment: 'Chat wallpaper preset label.'})},
	{id: 'aurora' as const, label: msg({message: 'Aurora', comment: 'Chat wallpaper preset label.'})},
	{id: 'ember' as const, label: msg({message: 'Ember', comment: 'Chat wallpaper preset label.'})},
	{id: 'custom' as const, label: msg({message: 'Custom image', comment: 'Chat wallpaper preset label.'})},
];

const DIM_WALLPAPER_DESCRIPTOR = msg({
	message: 'Dim wallpaper',
	comment: 'Label for the chat wallpaper darkness slider.',
});
const DEVICE_ONLY_NOTE_DESCRIPTOR = msg({
	message: 'Custom images and wallpaper choices are saved on this device only.',
	comment: 'Explains that chat wallpaper settings are local to the current device.',
});
const IMAGE_PROCESSING_ERROR_DESCRIPTOR = msg({
	message: 'That image could not be used. Choose a JPEG, PNG, or WebP image up to 20 MB.',
	comment: 'Error shown when a chat wallpaper image cannot be processed.',
});
const SELECTED_WALLPAPER_ARIA_DESCRIPTOR = msg({
	message: '{wallpaper} wallpaper',
	comment: 'Accessible label for selecting a chat wallpaper preset.',
});

export const ChatWallpaperTabContent: React.FC = observer(() => {
	const {i18n} = useLingui();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const input = event.currentTarget;
		const file = input.files?.[0];
		if (!file) return;
		setErrorMessage(null);
		setIsProcessing(true);
		try {
			const dataUrl = await compressWallpaperImage(file);
			ChatWallpaperPreferences.setCustomImage(dataUrl);
		} catch {
			setErrorMessage(i18n._(IMAGE_PROCESSING_ERROR_DESCRIPTOR));
		} finally {
			setIsProcessing(false);
			input.value = '';
		}
	};

	return (
		<div className={styles.wallpaperSettings} data-flx="user.appearance-tab.chat-wallpaper">
			<p className={styles.description}>
				<Trans>Choose a background for chats. You can use a NEXUS preset or an image from this device.</Trans>
			</p>
			<div
				className={styles.presetGrid}
				role="group"
				aria-label={i18n._(
					msg({
						message: 'Chat wallpaper presets',
						comment: 'Accessible label for the chat wallpaper choices.',
					}),
				)}
			>
				{WALLPAPER_CHOICES.map(({id, label}) => {
					const selected = ChatWallpaperPreferences.wallpaperId === id;
					const customImageAvailable = ChatWallpaperPreferences.hasCustomImage;
					return (
						<button
							key={id}
							type="button"
							className={styles.presetButton}
							data-selected={selected}
							disabled={id === 'custom' && isProcessing}
							aria-pressed={selected}
							aria-label={i18n._(SELECTED_WALLPAPER_ARIA_DESCRIPTOR, {wallpaper: i18n._(label)})}
							onClick={() => {
								if (id === 'custom' && !customImageAvailable) {
									fileInputRef.current?.click();
									return;
								}
								ChatWallpaperPreferences.selectWallpaper(id);
							}}
							data-flx={`user.appearance-tab.chat-wallpaper.preset-${id}`}
						>
							<span
								className={styles.presetPreview}
								data-empty={id === 'none'}
								data-custom-empty={id === 'custom' && !customImageAvailable}
								style={{
									backgroundImage:
										id === 'none' || (id === 'custom' && !customImageAvailable)
											? undefined
											: getChatWallpaperBackgroundImage(id, ChatWallpaperPreferences.customImageDataUrl),
								}}
								aria-hidden="true"
							>
								{id === 'custom' && !customImageAvailable ? (
									<span className={styles.customImagePrompt} aria-hidden="true">
										+
									</span>
								) : null}
								{selected ? (
									<span className={styles.selectedMark} aria-hidden="true">
										✓
									</span>
								) : null}
							</span>
							<span className={styles.presetLabel}>{i18n._(label)}</span>
						</button>
					);
				})}
			</div>

			<div className={styles.customPanel}>
				<div className={styles.customActions}>
					<button
						type="button"
						className={styles.uploadButton}
						onClick={() => fileInputRef.current?.click()}
						disabled={isProcessing}
						data-flx="user.appearance-tab.chat-wallpaper.upload-image"
					>
						{isProcessing ? <Trans>Preparing image…</Trans> : <Trans>Upload custom image</Trans>}
					</button>
					{ChatWallpaperPreferences.hasCustomImage ? (
						<button
							type="button"
							className={styles.removeButton}
							onClick={ChatWallpaperPreferences.clearCustomImage}
							data-flx="user.appearance-tab.chat-wallpaper.remove-image"
						>
							<Trans>Remove image</Trans>
						</button>
					) : null}
				</div>
				<input
					ref={fileInputRef}
					className={styles.hiddenInput}
					type="file"
					accept="image/jpeg,image/png,image/webp"
					onChange={handleImageChange}
					tabIndex={-1}
					aria-hidden="true"
				/>
				<p className={styles.deviceNote}>{i18n._(DEVICE_ONLY_NOTE_DESCRIPTOR)}</p>
				{errorMessage ? (
					<p className={styles.error} role="alert">
						{errorMessage}
					</p>
				) : null}
			</div>

			<label className={styles.dimControl} htmlFor="chat-wallpaper-dim">
				<span className={styles.dimLabel}>
					<span>{i18n._(DIM_WALLPAPER_DESCRIPTOR)}</span>
					<span className={styles.dimValue}>{Math.round(ChatWallpaperPreferences.dim * 100)}%</span>
				</span>
				<input
					id="chat-wallpaper-dim"
					className={styles.dimSlider}
					type="range"
					min={0}
					max={80}
					step={5}
					value={Math.round(ChatWallpaperPreferences.dim * 100)}
					onChange={(event) => ChatWallpaperPreferences.setDim(Number(event.currentTarget.value) / 100)}
					aria-valuetext={`${Math.round(ChatWallpaperPreferences.dim * 100)}%`}
					data-flx="user.appearance-tab.chat-wallpaper.dim-slider"
				/>
			</label>
		</div>
	);
});

// SPDX-License-Identifier: Nebula

import {makePersistent} from '@app/features/platform/utils/MobXPersistence';
import {initializeStore} from '@app/features/platform/utils/StoreInitialization';
import {makeAutoObservable} from 'mobx';

export const CHAT_WALLPAPER_OPTIONS = ['none', 'nexus-night', 'ocean', 'aurora', 'ember'] as const;

export type ChatWallpaperPreset = (typeof CHAT_WALLPAPER_OPTIONS)[number];
export type ChatWallpaperId = ChatWallpaperPreset | 'custom';

const MAX_CUSTOM_IMAGE_DATA_URL_LENGTH = 2_400_000;
const CUSTOM_IMAGE_DATA_URL_PATTERN = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;

const PRESET_BACKGROUNDS: Record<ChatWallpaperPreset, string> = {
	none: 'none',
	'nexus-night':
		'radial-gradient(1px 1px at 12% 18%, rgb(255 255 255 / 76%) 99%, transparent 100%), radial-gradient(1px 1px at 27% 72%, rgb(255 255 255 / 62%) 99%, transparent 100%), radial-gradient(1px 1px at 44% 36%, rgb(255 255 255 / 70%) 99%, transparent 100%), radial-gradient(1px 1px at 68% 20%, rgb(255 255 255 / 80%) 99%, transparent 100%), radial-gradient(1px 1px at 84% 61%, rgb(255 255 255 / 68%) 99%, transparent 100%), radial-gradient(1px 1px at 56% 84%, rgb(255 255 255 / 58%) 99%, transparent 100%), radial-gradient(circle at 74% 22%, rgb(66 108 255 / 20%), transparent 34%), linear-gradient(145deg, #070713, #121126 58%, #080914)',
	ocean:
		'radial-gradient(circle at 78% 20%, rgb(44 203 232 / 22%), transparent 36%), radial-gradient(circle at 18% 82%, rgb(40 92 214 / 24%), transparent 42%), linear-gradient(145deg, #061822, #0a3150 55%, #071421)',
	aurora:
		'radial-gradient(ellipse at 20% 15%, rgb(69 225 178 / 24%), transparent 38%), radial-gradient(ellipse at 78% 58%, rgb(152 78 255 / 24%), transparent 42%), linear-gradient(145deg, #08131d, #17243b 56%, #100b22)',
	ember:
		'radial-gradient(circle at 75% 22%, rgb(255 142 74 / 22%), transparent 34%), radial-gradient(circle at 17% 82%, rgb(245 72 121 / 20%), transparent 42%), linear-gradient(145deg, #1d1014, #35202a 55%, #130d16)',
};

export function getChatWallpaperBackgroundImage(wallpaperId: ChatWallpaperId, customImageDataUrl = ''): string {
	if (wallpaperId === 'custom') {
		return isValidCustomImageDataUrl(customImageDataUrl) ? `url("${customImageDataUrl}")` : 'none';
	}
	return PRESET_BACKGROUNDS[wallpaperId] ?? 'none';
}

function isValidCustomImageDataUrl(value: string): boolean {
	return value.length <= MAX_CUSTOM_IMAGE_DATA_URL_LENGTH && CUSTOM_IMAGE_DATA_URL_PATTERN.test(value);
}

class ChatWallpaperPreferencesStore {
	wallpaperId: ChatWallpaperId = 'none';
	dim = 0.2;
	customImageDataUrl = '';

	constructor() {
		makeAutoObservable(this, {}, {autoBind: true});
		initializeStore(this, () => this.initPersistence());
	}

	get backgroundImage(): string {
		return getChatWallpaperBackgroundImage(this.wallpaperId, this.customImageDataUrl);
	}

	get hasCustomImage(): boolean {
		return isValidCustomImageDataUrl(this.customImageDataUrl);
	}

	private async initPersistence(): Promise<void> {
		await makePersistent(this, 'ChatWallpaperPreferences', ['wallpaperId', 'dim', 'customImageDataUrl'], {
			syncAcrossTabs: true,
		});
		if (!CHAT_WALLPAPER_OPTIONS.includes(this.wallpaperId as ChatWallpaperPreset) && this.wallpaperId !== 'custom') {
			this.wallpaperId = 'none';
		}
		if (!Number.isFinite(this.dim)) {
			this.dim = 0.2;
		}
		this.dim = Math.max(0, Math.min(0.8, this.dim));
		if (!this.hasCustomImage && this.customImageDataUrl !== '') {
			this.customImageDataUrl = '';
			if (this.wallpaperId === 'custom') this.wallpaperId = 'none';
		}
	}

	selectWallpaper(wallpaperId: ChatWallpaperId): void {
		if (wallpaperId === 'custom') {
			if (this.hasCustomImage) this.wallpaperId = 'custom';
			return;
		}
		if (CHAT_WALLPAPER_OPTIONS.includes(wallpaperId)) {
			this.wallpaperId = wallpaperId;
		}
	}

	setDim(value: number): void {
		if (!Number.isFinite(value)) return;
		this.dim = Math.max(0, Math.min(0.8, value));
	}

	setCustomImage(dataUrl: string): void {
		if (!isValidCustomImageDataUrl(dataUrl)) {
			throw new Error('Unsupported or oversized wallpaper image');
		}
		this.customImageDataUrl = dataUrl;
		this.wallpaperId = 'custom';
	}

	clearCustomImage(): void {
		this.customImageDataUrl = '';
		if (this.wallpaperId === 'custom') this.wallpaperId = 'none';
	}
}

export default new ChatWallpaperPreferencesStore();

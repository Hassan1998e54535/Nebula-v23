// SPDX-License-Identifier: Nebula

export interface GuildLike {
	id: string;
	name: string;
	icon: string | null;
	banner: string | null;
	bannerWidth?: number | null;
	bannerHeight?: number | null;
	splash: string | null;
	splashWidth?: number | null;
	splashHeight?: number | null;
	embedSplash?: string | null;
	embedSplashWidth?: number | null;
	embedSplashHeight?: number | null;
	features: ReadonlySet<string>;
}

export interface ChannelLike {
	id: string;
	name?: string | null;
}

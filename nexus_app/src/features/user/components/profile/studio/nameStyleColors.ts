// SPDX-License-Identifier: Nebula

import type {ProfileAppearance} from '@nexus/schema/src/domains/user/ProfileCustomizationSchemas';

type NameEffect = ProfileAppearance['nameEffect'];
type NameEffectSettings = NonNullable<ProfileAppearance['nameEffects']>[NameEffect];

export const NAME_EFFECT_COLOR_COUNTS: Record<NameEffect, number> = {
	solid: 1,
	gradient: 2,
	neon: 1,
	outline: 1,
	shimmer: 2,
	prism: 3,
	flow: 3,
	pulse: 2,
	aurora: 3,
	echo: 2,
	glass: 2,
	spectrum: 5,
	wave: 3,
	bounce: 2,
	flicker: 2,
	comet: 3,
	ripple: 3,
	orbit: 4,
	ember: 3,
	frost: 3,
};

const EFFECT_DEFAULT_COLORS: Record<NameEffect, string[]> = {
	solid: ['#5be7c4'],
	gradient: ['#40d9ff', '#8877ff'],
	neon: ['#a78bfa'],
	outline: ['#ff86a7'],
	shimmer: ['#6ee7d8', '#e8fff8'],
	prism: ['#ff6bb5', '#8a7cff', '#4ce2d0'],
	flow: ['#2ed3b7', '#56c8ff', '#b58aff'],
	pulse: ['#fb7185', '#ffc857'],
	aurora: ['#42e8c2', '#6a8bff', '#ee82d5'],
	echo: ['#8fa3ff', '#cf87ff'],
	glass: ['#80d8ff', '#f6b6d6'],
	spectrum: ['#ff5f7e', '#ffc371', '#4fe2b0', '#4aa3ff', '#b45cff'],
	wave: ['#56e5d1', '#7c8dff', '#f789c6'],
	bounce: ['#ffc66d', '#fa7185'],
	flicker: ['#f9d56e', '#ff9a5e'],
	comet: ['#4fe5d7', '#8a7cff', '#ff8ec7'],
	ripple: ['#5ce1e6', '#8993ff', '#d38bff'],
	orbit: ['#48e6d0', '#7b8cff', '#e4a8ff', '#f06ca8'],
	ember: ['#ffb45e', '#ff6a5c', '#ffd36e'],
	frost: ['#7ee7ff', '#c7b7ff', '#e6fcff'],
};

function legacyColors(appearance: ProfileAppearance, effect: NameEffect): string[] {
	const count = NAME_EFFECT_COLOR_COUNTS[effect];
	const saved = appearance.nameAnimationColors?.[appearance.nameAnimation]?.[effect]
		?? appearance.nameEffectColors?.[effect];
	if (saved?.length === count) return [...saved];
	const start = appearance.nameColorStart;
	const end = appearance.nameColorEnd;
	const hasScopedPalette = Object.keys(appearance.nameEffectColors ?? {}).length > 0
		|| Object.keys(appearance.nameEffects ?? {}).length > 0
		|| Object.values(appearance.nameAnimationColors ?? {}).some((effects) => Object.keys(effects ?? {}).length > 0);
	if (hasScopedPalette || (start.toLowerCase() === '#48e6d0' && end.toLowerCase() === '#7b8cff')) {
		return [...EFFECT_DEFAULT_COLORS[effect]];
	}
	if (count === 1) return [start];
	if (count === 2) return [start, end];
	if (count === 3) return [start, '#ffffff', end];
	if (count === 4) return [start, '#6edcac', '#ea85ba', end];
	return [start, '#6edcac', '#f3d376', '#ea85ba', end];
}

export function getNameEffectSettings(appearance: ProfileAppearance, effect: NameEffect = appearance.nameEffect): NameEffectSettings {
	const saved = appearance.nameEffects?.[effect];
	const count = NAME_EFFECT_COLOR_COUNTS[effect];
	return {
		colors: saved?.colors.length === count ? [...saved.colors] : legacyColors(appearance, effect),
		direction: saved?.direction ?? 'right',
		speed: saved?.speed ?? 'normal',
		intensity: saved?.intensity ?? 70,
	};
}

export function getNameColors(appearance: ProfileAppearance): string[] {
	return getNameEffectSettings(appearance).colors;
}

export function updateNameEffectSettings(
	appearance: ProfileAppearance,
	effect: NameEffect,
	patch: Partial<NameEffectSettings>,
): ProfileAppearance {
	return {
		...appearance,
		nameEffects: {
			...appearance.nameEffects,
			[effect]: {...getNameEffectSettings(appearance, effect), ...patch},
		},
	};
}

export function withNameColors(appearance: ProfileAppearance, colors: string[]): ProfileAppearance {
	const count = NAME_EFFECT_COLOR_COUNTS[appearance.nameEffect];
	if (colors.length !== count || !colors.every((color) => /^#[0-9a-fA-F]{6}$/.test(color))) {
		throw new Error('Invalid name-effect color palette');
	}
	const normalized = colors.map((color) => color.toLowerCase());
	const current = getNameEffectSettings(appearance);
	return {
		...appearance,
		nameStyleEnabled: true,
		nameColorEnabled: true,
		nameColorStart: normalized[0]!,
		nameColorEnd: normalized[normalized.length - 1]!,
		nameEffectColors: appearance.nameAnimation === 'off'
			? {...appearance.nameEffectColors, [appearance.nameEffect]: normalized}
			: appearance.nameEffectColors,
		nameAnimationColors: {
			...appearance.nameAnimationColors,
			[appearance.nameAnimation]: {
				...appearance.nameAnimationColors?.[appearance.nameAnimation],
				[appearance.nameEffect]: normalized,
			},
		},
		nameEffects: {
			...appearance.nameEffects,
			[appearance.nameEffect]: {...current, colors: normalized},
		},
	};
}

// @vitest-environment happy-dom
// SPDX-License-Identifier: Nebula

import type {ReactNode} from 'react';
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {readFileSync} from 'node:fs';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {ProfileCardLayout} from '@app/features/user/components/profile/profile_card/ProfileCardLayout';
import type {Profile} from '@app/features/user/models/Profile';
import {getProfileAppearance, getProfileMediaLayers} from '@app/features/user/utils/ProfileDisplayUtils';
import {
	DEFAULT_PROFILE_CUSTOMIZATION,
	type ProfileCustomization,
} from '@nexus/schema/src/domains/user/ProfileCustomizationSchemas';

vi.mock('@app/features/user/components/profile/media/ProfileMedia', () => ({
	ProfileEffectMedia: () => null,
	ProfileFrameMedia: () => null,
}));
vi.mock('@lingui/react/macro', () => ({
	Trans: ({children}: {children: ReactNode}) => children,
}));

const globalCustomization: ProfileCustomization = {
	...DEFAULT_PROFILE_CUSTOMIZATION,
	appearance: {
		...DEFAULT_PROFILE_CUSTOMIZATION.appearance,
		profileBackgroundPrimary: '#102030',
		profileBackgroundSecondary: '#203040',
		cardEffect: 'global-card-effect',
		cardFrame: 'global-frame',
		dividerMode: 'custom',
		dividerCustomColor: '#304050',
	},
	profileEffectId: 'global-effect',
};

const serverCustomization: ProfileCustomization = {
	...DEFAULT_PROFILE_CUSTOMIZATION,
	appearance: {
		...DEFAULT_PROFILE_CUSTOMIZATION.appearance,
		profileBackgroundPrimary: '#a01020',
		profileBackgroundSecondary: '#b02030',
		cardEffect: 'server-card-effect',
		cardFrame: 'server-frame',
		dividerMode: 'custom',
		dividerCustomColor: '#c03040',
	},
	profileEffectId: 'server-effect',
};

function makeProfile(serverCustomizationValue: ProfileCustomization | null): Profile {
	const userProfile = {profile_appearance: globalCustomization};
	const guildMemberProfile = {profile_appearance: serverCustomizationValue};
	return {
		userProfile,
		guildMemberProfile,
		getEffectiveProfile: () => ({
			profile_appearance: guildMemberProfile.profile_appearance ?? userProfile.profile_appearance,
		}),
	} as Profile;
}

let container: HTMLDivElement;
let root: Root;

function render(node: ReactNode) {
	act(() => root.render(node));
}

function renderProfileCard(profile: Profile) {
	const effectiveCustomization = profile.getEffectiveProfile().profile_appearance;
	const appearance = getProfileAppearance(effectiveCustomization);
	const mediaLayers = getProfileMediaLayers(
		profile.userProfile.profile_appearance,
		profile.guildMemberProfile?.profile_appearance,
	);

	render(
		<ProfileCardLayout
			borderColor={appearance?.profileBackgroundPrimary ?? '#000000'}
			appearance={appearance}
			profileEffectLayers={mediaLayers.profileEffectIds}
			profileFrameLayers={mediaLayers.cardFrameIds}
		>
			<div>Profile content</div>
		</ProfileCardLayout>,
	);

	return container.querySelector<HTMLElement>('[data-flx="user.profile.profile-card.profile-card-layout.profile-card"]')!;
}

beforeEach(() => {
	(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('profile appearance rendering', () => {
	it('shows the distinct server override while keeping both profiles and their media scoped', () => {
		const profile = makeProfile(serverCustomization);
		const card = renderProfileCard(profile);
		const mediaLayers = getProfileMediaLayers(
			profile.userProfile.profile_appearance,
			profile.guildMemberProfile?.profile_appearance,
		);

		expect(getProfileAppearance(profile.userProfile.profile_appearance)?.profileBackgroundPrimary).toBe('#102030');
		expect(card.style.getPropertyValue('--profile-background-primary')).toBe('#a01020');
		expect(card.style.getPropertyValue('--profile-background-secondary')).toBe('#b02030');
		expect(card.dataset.cardEffect).toBe('server-card-effect');
		expect(card.dataset.frame).toBe('server-frame');
		expect(card.dataset.openEffect).toBe('server-effect');
		expect(mediaLayers.profileEffectIds).toEqual(['global-effect', 'server-effect']);
		expect(mediaLayers.cardFrameIds).toEqual(['global-frame', 'server-frame']);
	});

	it('inherits all global appearance and media when the server override is null', () => {
		const profile = makeProfile(null);
		const card = renderProfileCard(profile);
		const mediaLayers = getProfileMediaLayers(
			profile.userProfile.profile_appearance,
			profile.guildMemberProfile?.profile_appearance,
		);

		expect(card.style.getPropertyValue('--profile-background-primary')).toBe('#102030');
		expect(card.style.getPropertyValue('--profile-background-secondary')).toBe('#203040');
		expect(card.dataset.cardEffect).toBe('global-card-effect');
		expect(card.dataset.frame).toBe('global-frame');
		expect(card.dataset.openEffect).toBe('global-effect');
		expect(container.querySelector('[data-mode="custom"]')?.getAttribute('style')).toContain('#304050');
		expect(mediaLayers.profileEffectIds).toEqual(['global-effect']);
		expect(mediaLayers.cardFrameIds).toEqual(['global-frame']);
	});
});

it.each([
	['editor preview', './src/features/user/components/profile/ProfilePreview.tsx'],
	['profile popout', './src/features/user/components/popouts/UserProfilePopout.tsx'],
	['mobile profile sheet', './src/features/user/components/modals/UserProfileMobileSheet.tsx'],
	['full profile modal', './src/features/user/components/modals/UserProfileModal.tsx'],
])('routes the %s appearance through the shared profile resolver', (_surface, path) => {
	expect(readFileSync(path, 'utf8')).toContain('ProfileDisplayUtils.getProfileAppearance(');
});

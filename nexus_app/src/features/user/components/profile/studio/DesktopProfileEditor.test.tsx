// @vitest-environment happy-dom
// SPDX-License-Identifier: Nebula

import {DEFAULT_PROFILE_CUSTOMIZATION} from '@nexus/schema/src/domains/user/ProfileCustomizationSchemas';
import {act, type ReactNode} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {DesktopProfileEditor} from './DesktopProfileEditor';

vi.mock('@lingui/core/macro', () => ({
	msg: (descriptor: unknown) => descriptor,
}));

vi.mock('@lingui/react/macro', () => ({
	Trans: ({children}: {children: ReactNode}) => children,
	useLingui: () => ({i18n: {_: (descriptor: {message?: string; id?: string}) => descriptor.message ?? descriptor.id ?? ''}}),
}));

vi.mock('@app/features/user/components/profile/media/ProfileMedia', () => ({
	AvatarDecorationMedia: () => null,
	NameplateMedia: () => null,
	ProfileEffectMedia: () => null,
	ProfileFrameMedia: () => null,
}));

vi.mock('@app/features/user/components/profile/media/ProfileDisplayName', () => ({
	ProfileDisplayName: ({name}: {name: string}) => name,
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
	vi.restoreAllMocks();
});

describe('DesktopProfileEditor details dialog', () => {
	it('keeps the live profile background visible and closes from the dialog control', () => {
		const renderPreview = (value: typeof DEFAULT_PROFILE_CUSTOMIZATION): ReactNode => (
			<div data-testid="profile-preview" data-background={value.appearance.profileBackgroundPrimary ?? 'default'} />
		);

		act(() => {
			root.render(
				<DesktopProfileEditor
					value={DEFAULT_PROFILE_CUSTOMIZATION}
					onChange={vi.fn()}
					disabled={false}
					displayName="HASOON"
					profileScopeLabel="NEXUS account"
					desktopDetailsControls={<div>Profile details controls</div>}
					renderDesktopPreview={renderPreview}
				/>,
			);
		});

		const openDetails = container.querySelector<HTMLButtonElement>('button[aria-label="Profile sections: Bio · Status"]');
		expect(openDetails).not.toBeNull();
		act(() => openDetails?.click());

		const dialog = document.body.querySelector('[role="dialog"]');
		expect(dialog).not.toBeNull();
		expect(dialog?.textContent).toContain('Profile details controls');
		expect(dialog?.querySelector('[data-testid="profile-preview"]')?.getAttribute('data-background')).toBe(
			DEFAULT_PROFILE_CUSTOMIZATION.appearance.profileBackgroundPrimary ?? 'default',
		);

		const close = dialog?.querySelector<HTMLButtonElement>('button[aria-label="Close dialog"]');
		expect(close).not.toBeNull();
		act(() => close?.click());
		expect(document.body.querySelector('[role="dialog"]')).toBeNull();
	});
});

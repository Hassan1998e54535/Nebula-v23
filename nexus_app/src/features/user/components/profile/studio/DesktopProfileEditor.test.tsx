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

it('keeps the edited field focused when the parent rerenders after a keystroke', () => {
const onChange = vi.fn();
const renderEditor = (displayName: string) => (
<DesktopProfileEditor
value={DEFAULT_PROFILE_CUSTOMIZATION}
onChange={onChange}
disabled={false}
displayName={displayName}
profileScopeLabel="NEXUS account"
desktopDetailsControls={
<label>
Display name
<input aria-label="Display name" value={displayName} onChange={() => {}} />
</label>
}
onDialogCancel={() => {}}
/>
);

act(() => root.render(renderEditor('HASOON')));
const openDetails = container.querySelector<HTMLButtonElement>('button[aria-label="Profile sections: Bio · Status"]');
act(() => openDetails?.click());
const dialog = document.body.querySelector('[role="dialog"]');
const input = dialog?.querySelector<HTMLInputElement>('input[aria-label="Display name"]');
expect(input).not.toBeNull();
act(() => input?.focus());

act(() => root.render(renderEditor('H')));

expect(document.activeElement).toBe(input);
expect(input?.value).toBe('H');
});

it('applies profile details and closes when Apply is clicked', () => {
const onChange = vi.fn();
act(() => {
root.render(
<DesktopProfileEditor
value={DEFAULT_PROFILE_CUSTOMIZATION}
onChange={onChange}
disabled={false}
displayName="HASOON"
profileScopeLabel="NEXUS account"
desktopDetailsControls={<div>Profile details controls</div>}
/>,
);
});

const openDetails = container.querySelector<HTMLButtonElement>('button[aria-label="Profile sections: Bio · Status"]');
act(() => openDetails?.click());
const dialog = document.body.querySelector('[role="dialog"]');
const applyButton = Array.from(dialog?.querySelectorAll<HTMLButtonElement>('button') ?? []).find((button) =>
button.textContent?.includes('Apply'),
);
expect(applyButton).toBeDefined();
act(() => applyButton?.click());

expect(onChange).toHaveBeenCalledTimes(1);
expect(document.body.querySelector('[role="dialog"]')).toBeNull();
});
});

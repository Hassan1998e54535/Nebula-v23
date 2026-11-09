// @vitest-environment happy-dom
// SPDX-License-Identifier: Nebula

import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {FeatureDiscovery} from './FeatureDiscovery';

vi.mock('@app/features/ui/components/icons/NexusIconMark', () => ({
	NEXUSIconMark: () => null,
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
});

describe('FeatureDiscovery', () => {
	it('keeps the Next action clickable with decorative artwork present', () => {
		const onNext = vi.fn();
		act(() => {
			root.render(
				<FeatureDiscovery
					mode="center"
					title="Welcome to NEXUS"
					description="A quick guide to the app."
					illustration="welcome"
					stepIndex={0}
					stepCount={2}
					labels={{next: 'Next', back: 'Back', skip: 'Skip', finish: 'Done', tour: 'Feature guide'}}
					onNext={onNext}
					onBack={vi.fn()}
					onSkip={vi.fn()}
					onFinish={vi.fn()}
				/>,
			);
		});

		const nextButton = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
			button.textContent?.includes('Next'),
		);
		expect(nextButton).toBeDefined();
		act(() => nextButton?.click());
		expect(onNext).toHaveBeenCalledTimes(1);
	});
});

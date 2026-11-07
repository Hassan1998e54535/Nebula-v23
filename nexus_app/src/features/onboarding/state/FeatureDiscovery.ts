// SPDX-License-Identifier: Nebula

import {
	completeFeatureDiscoveryTour,
	hasCompletedFeatureDiscoveryTour,
	parseFeatureDiscoveryHistory,
} from '@app/features/onboarding/state/FeatureDiscoveryHistory';
import {AppStorageKey} from '@app/features/platform/state/AppStorageKeys';
import AppStorage from '@app/features/platform/state/PersistentStorage';
import {makeAutoObservable} from 'mobx';

export type FeatureDiscoveryPresentation = 'center' | 'spotlight' | 'bottom-sheet';

export type FeatureDiscoveryIllustration =
	| 'welcome'
	| 'profile'
	| 'presence'
	| 'community-create'
	| 'community-join'
	| 'community-settings'
	| 'group-chat';

export interface FeatureDiscoveryStep {
	readonly title: string;
	readonly description: string;
	readonly targetSelector?: string;
	readonly presentation: FeatureDiscoveryPresentation;
	readonly illustration?: FeatureDiscoveryIllustration;
}

export interface FeatureDiscoveryTour {
	readonly id: string;
	readonly steps: ReadonlyArray<FeatureDiscoveryStep>;
}

class FeatureDiscovery {
	activeTour: FeatureDiscoveryTour | null = null;
	activeStepIndex = 0;
	private accountId: string | null = null;
	private history = parseFeatureDiscoveryHistory(null);

	constructor() {
		makeAutoObservable(this, {}, {autoBind: true});
	}

	setAccount(accountId: string | null): void {
		if (this.accountId === accountId) return;
		this.accountId = accountId;
		this.activeTour = null;
		this.activeStepIndex = 0;
		this.history = accountId
			? parseFeatureDiscoveryHistory(AppStorage.getJSON<unknown>(AppStorageKey.UI_FEATURE_DISCOVERY))
			: parseFeatureDiscoveryHistory(null);
	}

	startTour(tour: FeatureDiscoveryTour, options: {force?: boolean} = {}): boolean {
		if (!this.accountId || tour.steps.length === 0) return false;
		if (this.activeTour) return false;
		if (!options.force && hasCompletedFeatureDiscoveryTour(this.history, tour.id)) return false;
		this.activeTour = tour;
		this.activeStepIndex = 0;
		return true;
	}

	get activeStep(): FeatureDiscoveryStep | null {
		return this.activeTour?.steps[this.activeStepIndex] ?? null;
	}

	get activeStepCount(): number {
		return this.activeTour?.steps.length ?? 0;
	}

	next(): void {
		if (!this.activeTour) return;
		if (this.activeStepIndex >= this.activeTour.steps.length - 1) {
			this.finish();
			return;
		}
		this.activeStepIndex += 1;
	}

	back(): void {
		if (this.activeStepIndex > 0) this.activeStepIndex -= 1;
	}

	skip(): void {
		this.finish();
	}

	finish(): void {
		if (!this.activeTour) return;
		this.history = completeFeatureDiscoveryTour(this.history, this.activeTour.id);
		AppStorage.setJSON(AppStorageKey.UI_FEATURE_DISCOVERY, this.history);
		this.activeTour = null;
		this.activeStepIndex = 0;
	}
}

const FeatureDiscoveryState = new FeatureDiscovery();
export default FeatureDiscoveryState;

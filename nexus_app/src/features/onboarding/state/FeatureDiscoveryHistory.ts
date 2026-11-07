// SPDX-License-Identifier: Nebula

export interface FeatureDiscoveryHistory {
	readonly completedTourIds: ReadonlyArray<string>;
}

export function parseFeatureDiscoveryHistory(value: unknown): FeatureDiscoveryHistory {
	if (value == null || typeof value !== 'object' || Array.isArray(value)) {
		return {completedTourIds: []};
	}

	const completedTourIds = (value as {completedTourIds?: unknown}).completedTourIds;
	if (!Array.isArray(completedTourIds)) {
		return {completedTourIds: []};
	}

	return {
		completedTourIds: Array.from(
			new Set(completedTourIds.filter((tourId): tourId is string => typeof tourId === 'string' && tourId.length > 0)),
		),
	};
}

export function hasCompletedFeatureDiscoveryTour(history: FeatureDiscoveryHistory, tourId: string): boolean {
	return history.completedTourIds.includes(tourId);
}

export function completeFeatureDiscoveryTour(
	history: FeatureDiscoveryHistory,
	tourId: string,
): FeatureDiscoveryHistory {
	if (hasCompletedFeatureDiscoveryTour(history, tourId)) {
		return history;
	}

	return {completedTourIds: [...history.completedTourIds, tourId]};
}

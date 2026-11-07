// SPDX-License-Identifier: Nebula

import {
	completeFeatureDiscoveryTour,
	hasCompletedFeatureDiscoveryTour,
	parseFeatureDiscoveryHistory,
} from '@app/features/onboarding/state/FeatureDiscoveryHistory';
import {describe, expect, test} from 'vitest';

describe('FeatureDiscoveryHistory', () => {
	test('ignores malformed saved history', () => {
		expect(parseFeatureDiscoveryHistory(null)).toEqual({completedTourIds: []});
		expect(parseFeatureDiscoveryHistory({completedTourIds: 'welcome'})).toEqual({completedTourIds: []});
	});

	test('deduplicates valid completed tour identifiers', () => {
		expect(parseFeatureDiscoveryHistory({completedTourIds: ['welcome', '', 3, 'welcome']})).toEqual({
			completedTourIds: ['welcome'],
		});
	});

	test('records a tour only once', () => {
		const history = parseFeatureDiscoveryHistory({completedTourIds: ['welcome']});
		const next = completeFeatureDiscoveryTour(history, 'explore');

		expect(next.completedTourIds).toEqual(['welcome', 'explore']);
		expect(completeFeatureDiscoveryTour(next, 'explore')).toBe(next);
		expect(hasCompletedFeatureDiscoveryTour(next, 'explore')).toBe(true);
	});
});

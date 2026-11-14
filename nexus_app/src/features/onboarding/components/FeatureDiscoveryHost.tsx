// SPDX-License-Identifier: Nebula

import Initialization from '@app/features/app/state/Initialization';
import Authentication from '@app/features/auth/state/Authentication';
import FeatureDiscovery from '@app/features/onboarding/components/FeatureDiscovery';
import FeatureDiscoveryState from '@app/features/onboarding/state/FeatureDiscovery';
import {createWelcomeFeatureTour} from '@app/features/onboarding/utils/FeatureDiscoveryTours';
import MobileLayout from '@app/features/ui/state/MobileLayout';
import {msg} from '@lingui/core/macro';
import {useLingui} from '@lingui/react/macro';
import {observer} from 'mobx-react-lite';
import {useEffect, useState} from 'react';

const NEXT_DESCRIPTOR = msg({
	message: 'Next',
	comment: 'Continue button in the NEXUS feature discovery tour.',
});
const BACK_DESCRIPTOR = msg({
	message: 'Back',
	comment: 'Back button in the NEXUS feature discovery tour.',
});
const SKIP_DESCRIPTOR = msg({
	message: 'Skip',
	comment: 'Skip button in the NEXUS feature discovery tour.',
});
const FINISH_DESCRIPTOR = msg({
	message: 'Done',
	comment: 'Final button in a NEXUS feature discovery tour.',
});
const TOUR_LABEL_DESCRIPTOR = msg({
	message: 'FEATURE GUIDE',
	comment: 'Small label on the NEXUS feature discovery illustration.',
});

interface FeatureDiscoveryTargetRect {
	top: number;
	left: number;
	width: number;
	height: number;
}

export const FeatureDiscoveryHost = observer(() => {
	return null;
});

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
	const {i18n} = useLingui();
	const accountId = Authentication.currentUserId;
	const isAuthenticated = Authentication.isAuthenticated;
	const isReady = Initialization.isReady;
	const isMobile = MobileLayout.enabled;
	const activeStep = FeatureDiscoveryState.activeStep;
	const activeStepIndex = FeatureDiscoveryState.activeStepIndex;
	const stepCount = FeatureDiscoveryState.activeStepCount;
	const [targetRect, setTargetRect] = useState<FeatureDiscoveryTargetRect | undefined>();

	useEffect(() => {
		FeatureDiscoveryState.setAccount(isAuthenticated ? accountId : null);
		if (!isAuthenticated || !accountId || !isReady) return;
		FeatureDiscoveryState.startTour(createWelcomeFeatureTour(i18n, isMobile));
	}, [accountId, i18n, isAuthenticated, isMobile, isReady]);

	useEffect(() => {
		if (!activeStep?.targetSelector) {
			setTargetRect(undefined);
			return;
		}

		const updateTargetRect = () => {
			const target = document.querySelector<HTMLElement>(activeStep.targetSelector ?? '');
			if (!target) {
				setTargetRect(undefined);
				return;
			}

			const bounds = target.getBoundingClientRect();
			const isVisible =
				bounds.width > 0 &&
				bounds.height > 0 &&
				bounds.bottom > 0 &&
				bounds.top < window.innerHeight &&
				bounds.right > 0 &&
				bounds.left < window.innerWidth;
			setTargetRect(
				isVisible
					? {
							top: bounds.top,
							left: bounds.left,
							width: bounds.width,
							height: bounds.height,
						}
					: undefined,
			);
		};

		updateTargetRect();
		window.addEventListener('resize', updateTargetRect);
		window.addEventListener('scroll', updateTargetRect, true);
		return () => {
			window.removeEventListener('resize', updateTargetRect);
			window.removeEventListener('scroll', updateTargetRect, true);
		};
	}, [activeStep]);

	if (!isAuthenticated || !activeStep) return null;

	const mode = !targetRect && activeStep.presentation === 'spotlight' ? 'center' : activeStep.presentation;

	return (
		<FeatureDiscovery
			mode={mode}
			targetRect={targetRect}
			title={activeStep.title}
			description={activeStep.description}
			illustration={activeStep.illustration ?? 'welcome'}
			stepIndex={activeStepIndex}
			stepCount={stepCount}
			labels={{
				next: i18n._(NEXT_DESCRIPTOR),
				back: i18n._(BACK_DESCRIPTOR),
				skip: i18n._(SKIP_DESCRIPTOR),
				finish: i18n._(FINISH_DESCRIPTOR),
				tour: i18n._(TOUR_LABEL_DESCRIPTOR),
			}}
			onNext={FeatureDiscoveryState.next}
			onBack={FeatureDiscoveryState.back}
			onSkip={FeatureDiscoveryState.skip}
			onFinish={FeatureDiscoveryState.finish}
		/>
	);
});

// SPDX-License-Identifier: Nebula

import type {RuntimeConfigSnapshot} from '@app/features/app/state/InstanceSnapshotStore';
import RuntimeConfig from '@app/features/app/state/RuntimeConfig';
import {AuthLoginInstanceStep} from '@app/features/auth/flow/auth_login_core/AuthLoginInstanceStep';
import {useAuthRuntimeTarget} from '@app/features/auth/state/AuthRuntimeTarget';
import {useLocation} from '@app/features/platform/components/router/RouterReact';
import {Logger} from '@app/features/platform/utils/AppLogger';
import {Spinner} from '@app/features/ui/components/Spinner';
import {msg} from '@lingui/core/macro';
import {useLingui} from '@lingui/react/macro';
import {observer} from 'mobx-react-lite';
import {type ReactNode, useEffect, useState} from 'react';

const CHOOSE_INSTANCE_DESCRIPTOR = msg({
	message: 'Choose your instance',
	comment: 'Heading for an authentication step that requires an instance before continuing.',
});
const CONNECTING_TO_NEXUS_DESCRIPTOR = msg({
	message: 'Connecting to NEXUS',
	comment: 'Status shown while an app-only invite link selects the configured NEXUS instance.',
});

const logger = new Logger('AuthRuntimeTargetGate');

interface AuthRuntimeTargetGateProps {
	readonly children: (runtimeSnapshot: RuntimeConfigSnapshot) => ReactNode;
}

export const AuthRuntimeTargetGate = observer(function AuthRuntimeTargetGate({children}: AuthRuntimeTargetGateProps) {
	const {i18n} = useLingui();
	const runtimeTarget = useAuthRuntimeTarget();
	const runtimeSnapshot = runtimeTarget.snapshot;
	const location = useLocation();
	const privateInstanceUrl = globalThis.window?.electron?.nexusPrivateInstanceUrl ?? null;
	const isInviteRoute = location.pathname.startsWith('/invite/');
	const [isResolvingInviteInstance, setIsResolvingInviteInstance] = useState(false);
	const [inviteInstanceResolutionFailed, setInviteInstanceResolutionFailed] = useState(false);

	useEffect(() => {
		if (runtimeSnapshot != null || !isInviteRoute || privateInstanceUrl == null) {
			return;
		}
		const controller = new AbortController();
		setIsResolvingInviteInstance(true);
		setInviteInstanceResolutionFailed(false);
		void RuntimeConfig.resolveEndpoint({input: privateInstanceUrl, signal: controller.signal})
			.then((resolution) => {
				if (!controller.signal.aborted) {
					runtimeTarget.select(resolution.snapshot);
				}
			})
			.catch((error) => {
				if (!controller.signal.aborted) {
					logger.warn('Could not open a NEXUS app invite on its configured instance', error);
					setInviteInstanceResolutionFailed(true);
				}
			})
			.finally(() => {
				if (!controller.signal.aborted) {
					setIsResolvingInviteInstance(false);
				}
			});
		return () => controller.abort();
	}, [isInviteRoute, privateInstanceUrl, runtimeSnapshot, runtimeTarget]);

	if (runtimeSnapshot != null) {
		return children(runtimeSnapshot);
	}
	if (isResolvingInviteInstance) {
		return (
			<div role="status" aria-live="polite" data-flx="auth.flow.auth-runtime-target-gate.connecting-private-instance">
				<Spinner />
				<span>{i18n._(CONNECTING_TO_NEXUS_DESCRIPTOR)}</span>
			</div>
		);
	}
	return (
		<AuthLoginInstanceStep
			extraTopContent={null}
			title={i18n._(CHOOSE_INSTANCE_DESCRIPTOR)}
			initialInstanceUrl={inviteInstanceResolutionFailed ? privateInstanceUrl : null}
			onContinue={runtimeTarget.select}
			onBackActionChange={null}
			suppressInlineBackButton={false}
			data-flx="auth.flow.auth-runtime-target-gate.instance-step"
		/>
	);
});

// SPDX-License-Identifier: Nebula

import {BootstrapErrorScreen} from '@app/features/app/components/BootstrapErrorScreen';
import type {RuntimeConfigSnapshot} from '@app/features/app/state/InstanceSnapshotStore';
import RuntimeConfig from '@app/features/app/state/RuntimeConfig';
import {useAuthRuntimeTarget} from '@app/features/auth/state/AuthRuntimeTarget';
import {useLocation} from '@app/features/platform/components/router/RouterReact';
import {Logger} from '@app/features/platform/utils/AppLogger';
import {Spinner} from '@app/features/ui/components/Spinner';
import {msg} from '@lingui/core/macro';
import {useLingui} from '@lingui/react/macro';
import {observer} from 'mobx-react-lite';
import {type ReactNode, useEffect, useState} from 'react';

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
	const [resolutionError, setResolutionError] = useState<Error | null>(null);

	useEffect(() => {
		if (runtimeSnapshot != null || privateInstanceUrl == null) {
			return;
		}
		const controller = new AbortController();
		setIsResolvingInviteInstance(true);
		setResolutionError(null);
		void RuntimeConfig.resolveEndpoint({input: privateInstanceUrl, signal: controller.signal})
			.then((resolution) => {
				if (!controller.signal.aborted) {
					runtimeTarget.select(resolution.snapshot);
				}
			})
			.catch((error) => {
				if (!controller.signal.aborted) {
					logger.warn('Could not connect to the primary NEXUS server', error);
					setResolutionError(error instanceof Error ? error : new Error(String(error)));
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
	return <BootstrapErrorScreen error={resolutionError ?? new Error('DesktopRuntimeDiscoveryUnreachableError: Primary NEXUS server is offline')} />;
});

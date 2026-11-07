// SPDX-License-Identifier: Nebula

import {
	AUTHORIZE_APPLICATION_DESCRIPTOR,
	OAuthAuthorizeFlowPanel,
} from '@app/features/auth/components/pages/oauth_authorize_page/OAuthAuthorizeFlowPanel';
import {useAuthorizeFlow} from '@app/features/auth/components/pages/oauth_authorize_page/state/useAuthorizeFlow';
import {useAuthPresentation} from '@app/features/auth/flow/useAuthPresentation';
import {useNEXUSDocumentTitle} from '@app/features/window/hooks/useNexusDocumentTitle';
import {useLingui} from '@lingui/react/macro';
import {observer} from 'mobx-react-lite';
import type React from 'react';

const OAuthAuthorizePage: React.FC = observer(() => {
	const {i18n} = useLingui();
	useNEXUSDocumentTitle(i18n._(AUTHORIZE_APPLICATION_DESCRIPTOR));
	const flow = useAuthorizeFlow();
	const cardVariant = flow.phase.kind === 'review' && flow.phase.step === 'account' ? 'standard' : 'compact';
	useAuthPresentation({variant: cardVariant});
	return <OAuthAuthorizeFlowPanel flow={flow} data-flx="auth.o-auth-authorize-page.o-auth-authorize-flow-panel" />;
});

export default OAuthAuthorizePage;

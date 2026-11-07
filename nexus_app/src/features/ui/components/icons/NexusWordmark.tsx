// SPDX-License-Identifier: Nebula

import {DEFAULT_APP_SHELL_BRANDING, resolveAppShellBranding} from '@app/features/app/state/AppShellBranding';
import RuntimeConfig from '@app/features/app/state/RuntimeConfig';
import {type BrandSvgProps, getDataFlx, getImageSizingProps} from '@app/features/ui/components/icons/BrandImageUtils';
import NEXUSWordmarkMonochromeAsset from '@app/media/images/nexus-brand-icon-monochrome.svg?react';
import NEXUSWordmarkAsset from '@app/media/images/nexus-wordmark.svg?react';
import {msg} from '@lingui/core/macro';
import {useLingui} from '@lingui/react/macro';
import {observer} from 'mobx-react-lite';
import type React from 'react';

const APPLICATION_WORDMARK_DESCRIPTOR = msg({
	message: '{productName} wordmark',
	comment: 'Accessible label for the application wordmark.',
});

interface NEXUSWordmarkProps extends BrandSvgProps {
	variant?: 'default' | 'monochrome';
}

export const NEXUSWordmark = observer(({variant = 'default', ...props}: NEXUSWordmarkProps) => {
	const {i18n} = useLingui();
	const branding = resolveAppShellBranding(RuntimeConfig.getSnapshotOrNull());
	const productName = branding.productName;
	const ariaLabel = i18n._(APPLICATION_WORDMARK_DESCRIPTOR, {productName});
	if (branding.wordmarkUrl !== null) {
		return (
			<img
				{...getImageSizingProps(props)}
				src={branding.wordmarkUrl}
				alt={ariaLabel}
				data-flx={getDataFlx(props, 'ui.icons.nexus-wordmark.img')}
			/>
		);
	}
	if (productName !== DEFAULT_APP_SHELL_BRANDING.productName) {
		const style: React.CSSProperties = {
			...(props.style as React.CSSProperties | undefined),
			alignItems: 'center',
			display: 'inline-flex',
			fontWeight: 800,
			lineHeight: 1,
		};
		return (
			<span
				className={props.className}
				style={style}
				role="img"
				aria-label={ariaLabel}
				data-flx={getDataFlx(props, 'ui.icons.nexus-wordmark.text')}
			>
				{productName}
			</span>
		);
	}
	const Asset = variant === 'monochrome' ? NEXUSWordmarkMonochromeAsset : NEXUSWordmarkAsset;
	return <Asset role="img" aria-label={ariaLabel} data-flx="ui.icons.nexus-wordmark.img" {...props} />;
});

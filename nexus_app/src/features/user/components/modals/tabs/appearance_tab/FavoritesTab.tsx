// SPDX-License-Identifier: Nebula

import * as AccessibilityCommands from '@app/features/accessibility/commands/AccessibilityCommands';
import Accessibility from '@app/features/accessibility/state/Accessibility';
import {Switch} from '@app/features/ui/components/form/FormSwitch';
import {ENABLE_FAVORITES_DESCRIPTOR} from '@app/features/user/components/settings_utils/section_registry/SharedDescriptors';
import {msg} from '@lingui/core/macro';
import {useLingui} from '@lingui/react/macro';
import {observer} from 'mobx-react-lite';
import type React from 'react';

const SHOW_FAVORITES_THROUGHOUT_THE_APP_DESCRIPTOR = msg({
	message:
		"When enabled, you can favourite channels and they'll appear in the favourites section. When disabled, all favourite-related UI elements (buttons, menu items) will be hidden. Your existing favourites will be preserved.",
	comment: 'Description for the setting that enables or disables favorites.',
});

export const FavoritesTabContent: React.FC = observer(() => {
	const {i18n} = useLingui();
	return (
		<Switch
			label={i18n._(ENABLE_FAVORITES_DESCRIPTOR)}
			description={i18n._(SHOW_FAVORITES_THROUGHOUT_THE_APP_DESCRIPTOR)}
			value={Accessibility.showFavorites}
			onChange={(value) => AccessibilityCommands.update({showFavorites: value})}
			data-flx="user.appearance-tab.favorites-tab.switch"
		/>
	);
});

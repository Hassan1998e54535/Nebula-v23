// SPDX-License-Identifier: Nebula

import {SettingsSection} from '@app/features/app/components/dialogs/shared/SettingsSection';
import {SettingsTabContainer, SettingsTabContent} from '@app/features/app/components/dialogs/shared/SettingsTabLayout';
import {THEME_DESCRIPTOR} from '@app/features/i18n/utils/CommonMessageDescriptors';
import {ThemeTabContent} from '@app/features/user/components/modals/tabs/appearance_tab/theme/ThemeTabContent';
import inlineStyles from '@app/features/user/components/modals/tabs/TabInline.module.css';
import {useLingui} from '@lingui/react/macro';
import {observer} from 'mobx-react-lite';
import type React from 'react';

const ThemesContent: React.FC = observer(() => {
	const {i18n} = useLingui();
	return (
		<SettingsSection id="theme" tabType="themes" title={i18n._(THEME_DESCRIPTOR)} data-flx="user.themes-tab.theme">
			<ThemeTabContent data-flx="user.themes-tab.theme-tab-content" />
		</SettingsSection>
	);
});

export const ThemesTab: React.FC = observer(() => (
	<SettingsTabContainer data-flx="user.themes-tab.settings-tab-container">
		<SettingsTabContent data-flx="user.themes-tab.settings-tab-content">
			<ThemesContent data-flx="user.themes-tab.themes-content" />
		</SettingsTabContent>
	</SettingsTabContainer>
));

export const ThemesInlineContent: React.FC = observer(() => (
	<div className={inlineStyles.container} data-flx="user.themes-tab.inline-content">
		<ThemesContent data-flx="user.themes-tab.inline-themes-content" />
	</div>
));

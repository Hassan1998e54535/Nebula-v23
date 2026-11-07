// SPDX-License-Identifier: Nebula

import {Routes} from '@app/app/Routes';
import type {HelpCenterArticleSlug} from '@app/features/app/config/HelpCenterConstants';

export function getURL(slug: HelpCenterArticleSlug): string | null {
	return Routes.helpArticle(slug);
}

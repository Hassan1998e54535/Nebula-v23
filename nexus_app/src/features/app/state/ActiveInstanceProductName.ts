// SPDX-License-Identifier: Nebula

import {PRODUCT_NAME} from '@app/features/app/config/ProductConstants';
import RuntimeConfig from '@app/features/app/state/RuntimeConfig';

export function getActiveInstanceProductName(): string {
	return RuntimeConfig.getSnapshotOrNull()?.appPublic.branding.product_name?.trim() || PRODUCT_NAME;
}

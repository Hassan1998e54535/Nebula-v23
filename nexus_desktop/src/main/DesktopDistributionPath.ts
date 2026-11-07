// SPDX-License-Identifier: Nebula

import path from 'node:path';
import {app} from 'electron';

export function getDesktopDistributionPath(...segments: ReadonlyArray<string>): string {
	return path.join(app.getAppPath(), 'dist', ...segments);
}

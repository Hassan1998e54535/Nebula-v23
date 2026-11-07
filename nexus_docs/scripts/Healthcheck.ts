// SPDX-License-Identifier: Nebula

import {checkAstroServerHealth} from '@/server/AstroServer';
import {docsListenHost, docsListenPort} from '@/server/DocsConfig';

await checkAstroServerHealth({
	listenHost: docsListenHost(),
	listenPort: docsListenPort(),
	timeoutMs: 4_000,
});

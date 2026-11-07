// SPDX-License-Identifier: Nebula

import {runAstroServer} from '@/server/AstroServer';
import {docsListenHost, docsListenPort, docsPublicEndpoint} from '@/server/DocsConfig';

await runAstroServer({
	entrypoint: new URL('../dist/server/entry.mjs', import.meta.url),
	listenHost: docsListenHost(),
	listenPort: docsListenPort(),
	publicEndpoint: docsPublicEndpoint(),
});

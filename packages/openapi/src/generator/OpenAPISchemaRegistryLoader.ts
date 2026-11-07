// SPDX-License-Identifier: Nebula
import {OpenAPIGeneratorCatalog} from '@nexus/openapi/src/generator/OpenAPIGeneratorCatalog';
import {loadSchemas} from '@nexus/openapi/src/registry/SchemaLoader';
import type {SchemaRegistry} from '@nexus/openapi/src/registry/SchemaRegistry';

export async function loadSchemasIntoRegistry(basePath: string, schemaRegistry: SchemaRegistry): Promise<void> {
	for (const [name, schema] of OpenAPIGeneratorCatalog.builtInSchemas) {
		schemaRegistry.register(name, schema);
	}
	for (const [name, zodSchema] of await loadSchemas(basePath)) {
		schemaRegistry.registerZod(name, zodSchema);
	}
}

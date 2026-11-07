// SPDX-License-Identifier: Nebula

import type {AdminAuditLog} from '@app/api/admin/AdminRepository';
import type {
	ISearchAdapter as SchemaISearchAdapter,
	SearchResult as SchemaSearchResult,
} from '@nexus/schema/src/contracts/search/SearchAdapterTypes';
import type {AuditLogSearchFilters, SearchableAuditLog} from '@nexus/schema/src/contracts/search/SearchDocumentTypes';

export interface IAuditLogSearchService extends SchemaISearchAdapter<AuditLogSearchFilters, SearchableAuditLog> {
	indexAuditLog(log: AdminAuditLog): Promise<void>;
	indexAuditLogs(logs: Array<AdminAuditLog>): Promise<void>;
	searchAuditLogs(
		query: string,
		filters: AuditLogSearchFilters,
		options?: {
			limit?: number;
			offset?: number;
		},
	): Promise<SchemaSearchResult<SearchableAuditLog>>;
}

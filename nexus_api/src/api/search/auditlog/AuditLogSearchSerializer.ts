// SPDX-License-Identifier: Nebula

import type {AdminAuditLog} from '@app/api/admin/AdminRepository';
import type {SearchableAuditLog} from '@nexus/schema/src/contracts/search/SearchDocumentTypes';
import {snowflakeToDate} from '@nexus/snowflake/src/Snowflake';

export function convertToSearchableAuditLog(log: AdminAuditLog): SearchableAuditLog {
	const createdAt = Math.floor(snowflakeToDate(BigInt(log.logId)).getTime() / 1000);
	return {
		id: log.logId.toString(),
		logId: log.logId.toString(),
		adminUserId: log.adminUserId.toString(),
		targetType: log.targetType,
		targetId: log.targetId.toString(),
		action: log.action,
		auditLogReason: log.auditLogReason,
		createdAt,
	};
}

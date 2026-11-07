// SPDX-License-Identifier: Nebula

import {describeAdminAuditCoverage} from '@app/api/admin/tests/audit_coverage/AdminAuditCoverage';
import {SearchAdminAuditCases} from '@app/api/admin/tests/audit_coverage/SearchAdminAuditCases';

describeAdminAuditCoverage('SearchAdminController', SearchAdminAuditCases);

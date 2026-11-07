// SPDX-License-Identifier: Nebula

import {describeAdminAuditCoverage} from '@app/api/admin/tests/audit_coverage/AdminAuditCoverage';
import {BulkAdminAuditCases} from '@app/api/admin/tests/audit_coverage/BulkAdminAuditCases';

describeAdminAuditCoverage('BulkAdminController', BulkAdminAuditCases);

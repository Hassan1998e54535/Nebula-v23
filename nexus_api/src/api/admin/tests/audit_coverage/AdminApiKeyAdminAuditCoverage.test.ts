// SPDX-License-Identifier: Nebula

import {AdminApiKeyAdminAuditCases} from '@app/api/admin/tests/audit_coverage/AdminApiKeyAdminAuditCases';
import {describeAdminAuditCoverage} from '@app/api/admin/tests/audit_coverage/AdminAuditCoverage';

describeAdminAuditCoverage('AdminApiKeyAdminController', AdminApiKeyAdminAuditCases);

// SPDX-License-Identifier: Nebula

import {describeAdminAuditCoverage} from '@app/api/admin/tests/audit_coverage/AdminAuditCoverage';
import {ApplicationAdminAuditCases} from '@app/api/admin/tests/audit_coverage/ApplicationAdminAuditCases';

describeAdminAuditCoverage('ApplicationAdminController', ApplicationAdminAuditCases);

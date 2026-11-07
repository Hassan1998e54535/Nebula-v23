// SPDX-License-Identifier: Nebula

import {describeAdminAuditCoverage} from '@app/api/admin/tests/audit_coverage/AdminAuditCoverage';
import {SystemDmAdminAuditCases} from '@app/api/admin/tests/audit_coverage/SystemDmAdminAuditCases';

describeAdminAuditCoverage('SystemDmAdminController', SystemDmAdminAuditCases);

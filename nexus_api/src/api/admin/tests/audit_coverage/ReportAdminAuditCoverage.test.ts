// SPDX-License-Identifier: Nebula

import {describeAdminAuditCoverage} from '@app/api/admin/tests/audit_coverage/AdminAuditCoverage';
import {ReportAdminAuditCases} from '@app/api/admin/tests/audit_coverage/ReportAdminAuditCases';

describeAdminAuditCoverage('ReportAdminController', ReportAdminAuditCases);

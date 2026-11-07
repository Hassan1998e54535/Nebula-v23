// SPDX-License-Identifier: Nebula

import {describeAdminAuditCoverage} from '@app/api/admin/tests/audit_coverage/AdminAuditCoverage';
import {JobsAdminAuditCases} from '@app/api/admin/tests/audit_coverage/JobsAdminAuditCases';

describeAdminAuditCoverage('JobsAdminController', JobsAdminAuditCases);

// SPDX-License-Identifier: Nebula

import {describeAdminAuditCoverage} from '@app/api/admin/tests/audit_coverage/AdminAuditCoverage';
import {BanAdminAuditCases} from '@app/api/admin/tests/audit_coverage/BanAdminAuditCases';

describeAdminAuditCoverage('BanAdminController', BanAdminAuditCases);

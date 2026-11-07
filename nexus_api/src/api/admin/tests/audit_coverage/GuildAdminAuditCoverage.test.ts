// SPDX-License-Identifier: Nebula

import {describeAdminAuditCoverage} from '@app/api/admin/tests/audit_coverage/AdminAuditCoverage';
import {GuildAdminAuditCases} from '@app/api/admin/tests/audit_coverage/GuildAdminAuditCases';

describeAdminAuditCoverage('GuildAdminController', GuildAdminAuditCases);

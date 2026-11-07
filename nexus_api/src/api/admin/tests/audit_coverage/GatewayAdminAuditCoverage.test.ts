// SPDX-License-Identifier: Nebula

import {describeAdminAuditCoverage} from '@app/api/admin/tests/audit_coverage/AdminAuditCoverage';
import {GatewayAdminAuditCases} from '@app/api/admin/tests/audit_coverage/GatewayAdminAuditCases';

describeAdminAuditCoverage('GatewayAdminController', GatewayAdminAuditCases);

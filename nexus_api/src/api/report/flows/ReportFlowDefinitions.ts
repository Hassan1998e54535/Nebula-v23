// SPDX-License-Identifier: Nebula

import type {ReportFlowSurface, ReportFlowTargetType} from '@nexus/schema/src/domains/report/ReportFlowSchemas';

export interface ReportFlowDef {
	target: ReportFlowTargetType;
	start: Partial<Record<ReportFlowSurface, string>>;
}

export const REPORT_FLOWS: Record<ReportFlowTargetType, ReportFlowDef> = {
	message: {target: 'message', start: {in_app: 'root_message', dsa: 'root_message'}},
	user: {target: 'user', start: {in_app: 'profile_intro', dsa: 'profile_parts'}},
	guild: {target: 'guild', start: {dsa: 'community_parts'}},
};

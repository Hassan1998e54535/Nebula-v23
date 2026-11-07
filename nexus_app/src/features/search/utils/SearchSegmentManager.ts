// SPDX-License-Identifier: Nebula

type SearchSegmentType = 'user' | 'channel';

export interface SearchSegment {
	type: SearchSegmentType;
	filterKey: string;
	id: string;
	displayText: string;
	start: number;
	end: number;
}

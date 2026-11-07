// SPDX-License-Identifier: Nebula

import {$getRoot, CLEAR_HISTORY_COMMAND, HISTORY_MERGE_TAG, type LexicalEditor} from 'lexical';

export function resetComposerHistory(editor: LexicalEditor): void {
	editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
	editor.update(
		() => {
			$getRoot().markDirty();
		},
		{discrete: true, tag: HISTORY_MERGE_TAG},
	);
}

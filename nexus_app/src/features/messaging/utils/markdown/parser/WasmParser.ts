// SPDX-License-Identifier: Nebula

import {parseMarkdownAstWithWasm} from '@app/features/messaging/utils/markdown/parser/MarkdownParserWasm';
import type {Node} from '@app/features/messaging/utils/markdown/parser/Nodes';

export class WasmParser {
	private readonly input: string;
	private readonly parserFlags: number;

	constructor(input: string, flags: number) {
		this.input = input;
		this.parserFlags = flags;
	}

	parse(): {
		nodes: Array<Node>;
	} {
		return parseMarkdownAstWithWasm(this.input, this.parserFlags);
	}
}

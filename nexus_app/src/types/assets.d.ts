// SPDX-License-Identifier: Nebula

import type {FunctionComponent, SVGProps} from 'react';

declare module '*.css' {}

declare module '*.svg' {
	const url: string;
	export default url;
}

declare module '*.svg?react' {
	const ReactComponent: FunctionComponent<SVGProps<SVGSVGElement>>;
	export default ReactComponent;
}

declare module '*.png' {
	const url: string;
	export default url;
}

declare module '@pkgs/libfluxcore/libfluxcore_bg.wasm' {
	const url: string;
	export default url;
}

declare module '@pkgs/libfluxwebp/libfluxwebp_bg.wasm' {
	const url: string;
	export default url;
}

declare module '@pkgs/libfluxwebp/libfluxwebp_simd_bg.wasm' {
	const url: string;
	export default url;
}

declare module '*.onnx' {
	const url: string;
	export default url;
}

// SPDX-License-Identifier: Nebula

import {makeAutoObservable} from 'mobx';

class FocusRingManagerClass {
	ringsEnabled = true;

	constructor() {
		makeAutoObservable(this, {}, {autoBind: true});
	}

	setRingsEnabled(enabled: boolean) {
		if (this.ringsEnabled === enabled) return;
		this.ringsEnabled = enabled;
	}
}

const FocusRingManager = new FocusRingManagerClass();

export default FocusRingManager;

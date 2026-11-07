// SPDX-License-Identifier: Nebula

import Toast from '@app/features/ui/state/Toast';
import type {ToastProps} from '@app/features/ui/toast';

export function createToast(data: ToastProps): string {
	return Toast.createToast(data);
}

export function destroyToast(id: string): void {
	Toast.destroyToast(id);
}

export function success(message: string): string {
	return Toast.success(message);
}

export function error(message: string): string {
	return Toast.error(message);
}

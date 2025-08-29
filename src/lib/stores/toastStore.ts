/**
 * @deprecated This store is deprecated in favor of the new toastState.ts
 * Please use `import { toast } from '$lib/stores/toastState'` instead.
 * 
 * This file is kept for backward compatibility and will be removed in a future version.
 */

import { 
	toast as newToast, 
	createToast as newCreateToast,
	type ToastMessage 
} from './toastState';

console.warn('toastStore is deprecated. Please use toastState instead.');

// Compatibility wrapper for old toastStore API
export const toastStore = {
	subscribe: (_fn: (toasts: ToastMessage[]) => void) => {
		// Simple compatibility - in a real app you'd need proper store subscription
		console.warn('toastStore.subscribe is deprecated. Use the new toast API from toastState.');
		return { unsubscribe: () => {} };
	},
	addToast: newToast.add,
	removeToast: newToast.remove,
	clearAll: newToast.clear,
	success: newToast.success,
	error: newToast.error,
	warning: newToast.warning,
	info: newToast.info
};

// Re-export for compatibility
export function createToast(
	type: 'success' | 'error' | 'warning' | 'info',
	message: string,
	options?: Partial<Omit<ToastMessage, 'id' | 'type' | 'message'>>
): string {
	return newCreateToast(type, message, options);
}

export type { ToastMessage };

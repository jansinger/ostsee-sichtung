/**
 * Toast State Management using Svelte 5 $state runes
 */

export interface ToastMessage {
	id: string;
	type: 'success' | 'error' | 'warning' | 'info';
	title?: string;
	message: string;
	duration?: number;
	dismissible?: boolean;
}

export const toasts = $state<ToastMessage[]>([]);

export function getToasts(): ToastMessage[] {
	return toasts;
}

export function addToast(toast: Omit<ToastMessage, 'id'>): string {
	const id = crypto.randomUUID();
	toasts.push({ id, duration: 5000, dismissible: true, ...toast });
	return id;
}

export function removeToast(id: string): void {
	const idx = toasts.findIndex((t) => t.id === id);
	if (idx !== -1) toasts.splice(idx, 1);
}

export function clearAllToasts(): void {
	toasts.splice(0);
}

export function successToast(
	message: string,
	options?: Partial<Omit<ToastMessage, 'id' | 'type' | 'message'>>
): string {
	return addToast({ type: 'success', message, ...options });
}

export function errorToast(
	message: string,
	options?: Partial<Omit<ToastMessage, 'id' | 'type' | 'message'>>
): string {
	return addToast({ type: 'error', message, duration: 0, ...options });
}

export function warningToast(
	message: string,
	options?: Partial<Omit<ToastMessage, 'id' | 'type' | 'message'>>
): string {
	return addToast({ type: 'warning', message, ...options });
}

export function infoToast(
	message: string,
	options?: Partial<Omit<ToastMessage, 'id' | 'type' | 'message'>>
): string {
	return addToast({ type: 'info', message, ...options });
}

export function createToast(
	type: 'success' | 'error' | 'warning' | 'info',
	message: string,
	options?: Partial<Omit<ToastMessage, 'id' | 'type' | 'message'>>
): string {
	return addToast({ type, message, ...options });
}

export const toast = {
	get current() {
		return toasts;
	},
	add: addToast,
	remove: removeToast,
	clear: clearAllToasts,
	success: successToast,
	error: errorToast,
	warning: warningToast,
	info: infoToast
} as const;

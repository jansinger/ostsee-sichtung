import { writable } from 'svelte/store';

export interface ToastMessage {
	id: string;
	type: 'success' | 'error' | 'warning' | 'info';
	title?: string;
	message: string;
	duration?: number;
	dismissible?: boolean;
}

function createToastStore() {
	const { subscribe, update } = writable<ToastMessage[]>([]);

	function addToast(toast: Omit<ToastMessage, 'id'>): string {
		const id = crypto.randomUUID();
		const newToast: ToastMessage = {
			id,
			duration: 5000,
			dismissible: true,
			...toast
		};

		update((toasts) => [...toasts, newToast]);
		return id;
	}

	function removeToast(id: string) {
		update((toasts) => toasts.filter((toast) => toast.id !== id));
	}

	function clearAll() {
		update(() => []);
	}

	// Convenience methods
	function success(
		message: string,
		options?: Partial<Omit<ToastMessage, 'id' | 'type' | 'message'>>
	) {
		return addToast({ type: 'success', message, ...options });
	}

	function error(
		message: string,
		options?: Partial<Omit<ToastMessage, 'id' | 'type' | 'message'>>
	) {
		return addToast({ type: 'error', message, duration: 0, ...options }); // Error toasts don't auto-dismiss
	}

	function warning(
		message: string,
		options?: Partial<Omit<ToastMessage, 'id' | 'type' | 'message'>>
	) {
		return addToast({ type: 'warning', message, ...options });
	}

	function info(message: string, options?: Partial<Omit<ToastMessage, 'id' | 'type' | 'message'>>) {
		return addToast({ type: 'info', message, ...options });
	}

	return {
		subscribe,
		addToast,
		removeToast,
		clearAll,
		success,
		error,
		warning,
		info
	};
}

export const toastStore = createToastStore();

// Export convenience function for creating toasts
export function createToast(
	type: 'success' | 'error' | 'warning' | 'info',
	message: string,
	options?: Partial<Omit<ToastMessage, 'id' | 'type' | 'message'>>
): string {
	return toastStore[type](message, options);
}

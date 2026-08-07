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
	/**
	 * Stabiler Schlüssel für Toasts, die sich gegenseitig ersetzen statt sich zu
	 * stapeln (z. B. wiederholte Validierungsfehler auf demselben Schritt).
	 * `addToast` entfernt einen bestehenden Toast mit demselben `key`, bevor es
	 * den neuen einfügt — der neue trägt eine neue `id`, wodurch `ToastContainer`
	 * (`{#each … (toast.id)}`) die `Toast`-Komponente neu mountet und ihr
	 * `$effect`-Timeout neu startet. Ohne `key` verhalten sich Aufrufer wie bisher.
	 */
	key?: string;
}

export const toasts = $state<ToastMessage[]>([]);

export function getToasts(): ToastMessage[] {
	return toasts;
}

export function addToast(toast: Omit<ToastMessage, 'id'>): string {
	if (toast.key) {
		removeToastByKey(toast.key);
	}
	const id = crypto.randomUUID();
	toasts.push({ id, duration: 5000, dismissible: true, ...toast });
	return id;
}

export function removeToast(id: string): void {
	const idx = toasts.findIndex((t) => t.id === id);
	if (idx !== -1) toasts.splice(idx, 1);
}

/** Entfernt einen aktiven Toast anhand seines `key` — No-Op, wenn keiner existiert. */
export function removeToastByKey(key: string): void {
	const idx = toasts.findIndex((t) => t.key === key);
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
	removeByKey: removeToastByKey,
	clear: clearAllToasts,
	success: successToast,
	error: errorToast,
	warning: warningToast,
	info: infoToast
} as const;

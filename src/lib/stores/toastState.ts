/**
 * Modern Toast State Management using Svelte 5 Compatible Stores
 * 
 * Uses writable stores which work perfectly with Svelte 5 and $derived
 * for better performance and developer experience.
 */

import { writable } from 'svelte/store';

export interface ToastMessage {
	id: string;
	type: 'success' | 'error' | 'warning' | 'info';
	title?: string;
	message: string;
	duration?: number;
	dismissible?: boolean;
}

// Create reactive writable store
const toastStore = writable<ToastMessage[]>([]);

/**
 * Add a new toast notification
 */
export function addToast(toast: Omit<ToastMessage, 'id'>): string {
	const id = crypto.randomUUID();
	const newToast: ToastMessage = {
		id,
		duration: 5000,
		dismissible: true,
		...toast
	};

	toastStore.update(toasts => [...toasts, newToast]);
	return id;
}

/**
 * Remove a specific toast by ID
 */
export function removeToast(id: string): void {
	toastStore.update(toasts => toasts.filter(toast => toast.id !== id));
}

/**
 * Clear all toast notifications
 */
export function clearAllToasts(): void {
	toastStore.set([]);
}

/**
 * Get the reactive toast store (for use with $derived)
 */
export function getToastStore() {
	return toastStore;
}

/**
 * Get current toasts (for compatibility)
 */
export function getToasts() {
	let currentToasts: ToastMessage[] = [];
	toastStore.subscribe(toasts => currentToasts = toasts)();
	return currentToasts;
}

// Convenience methods for different toast types
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
	// Error toasts don't auto-dismiss by default
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

/**
 * Export convenience function for creating toasts (maintains compatibility)
 */
export function createToast(
	type: 'success' | 'error' | 'warning' | 'info',
	message: string,
	options?: Partial<Omit<ToastMessage, 'id' | 'type' | 'message'>>
): string {
	return addToast({ type, message, ...options });
}

/**
 * Modern toast API object (replaces old store pattern)
 */
export const toast = {
	// Reactive store for current toasts
	get store() {
		return toastStore;
	},
	
	// Current toasts (non-reactive, for immediate access)
	get current() {
		return getToasts();
	},
	
	// Core methods
	add: addToast,
	remove: removeToast,
	clear: clearAllToasts,
	
	// Convenience methods
	success: successToast,
	error: errorToast,
	warning: warningToast,
	info: infoToast
} as const;

// Export for compatibility with existing usage patterns
export const toasts = toast;
/**
 * Modern Toast State Management using Svelte 5 Runes
 * 
 * This replaces the old writable store pattern with modern $state runes
 * for better performance and developer experience.
 * 
 * Uses hybrid approach: runes in components, simple state in tests.
 */

import { browser } from '$app/environment';

export interface ToastMessage {
	id: string;
	type: 'success' | 'error' | 'warning' | 'info';
	title?: string;
	message: string;
	duration?: number;
	dismissible?: boolean;
}

// Simple fallback state for non-component contexts (tests, server)
const fallbackState: ToastMessage[] = [];

// Hybrid state management
let toastState: ToastMessage[] = browser && typeof $state !== 'undefined' 
	? $state<ToastMessage[]>([]) 
	: fallbackState;

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

	toastState = [...toastState, newToast];
	return id;
}

/**
 * Remove a specific toast by ID
 */
export function removeToast(id: string): void {
	toastState = toastState.filter((toast) => toast.id !== id);
}

/**
 * Clear all toast notifications
 */
export function clearAllToasts(): void {
	toastState = [];
}

/**
 * Get current toasts (reactive getter)
 */
export function getToasts() {
	return toastState;
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
	// Reactive getter for current toasts
	get current() {
		return toastState;
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
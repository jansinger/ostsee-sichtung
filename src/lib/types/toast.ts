/**
 * Toast notification type definitions
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
	id: string;
	type: ToastType;
	title?: string;
	message: string;
	duration?: number;
	dismissible?: boolean;
}

export type ToastOptions = Partial<Omit<ToastMessage, 'id' | 'type' | 'message'>>;

export type CreateToastOptions = Partial<Omit<ToastMessage, 'id'>>;
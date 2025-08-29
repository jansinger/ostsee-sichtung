import { describe, it, expect, beforeEach } from 'vitest';
import { 
	addToast, 
	removeToast, 
	clearAllToasts, 
	getToasts,
	successToast,
	errorToast,
	warningToast,
	infoToast,
	createToast,
	toast
} from './toastState';

describe('Toast State Management (Svelte 5 Runes)', () => {
	beforeEach(() => {
		// Clear all toasts before each test
		clearAllToasts();
	});

	describe('addToast', () => {
		it('should add a toast with default values', () => {
			const id = addToast({
				type: 'success',
				message: 'Test message'
			});

			const toasts = getToasts();
			expect(toasts).toHaveLength(1);
			
			const toast = toasts[0];
			expect(toast).toBeDefined();
			expect(toast!.id).toBe(id);
			expect(toast!.type).toBe('success');
			expect(toast!.message).toBe('Test message');
			expect(toast!.duration).toBe(5000);
			expect(toast!.dismissible).toBe(true);
		});

		it('should add a toast with custom values', () => {
			const id = addToast({
				type: 'error',
				message: 'Error message',
				title: 'Error Title',
				duration: 10000,
				dismissible: false
			});

			const toasts = getToasts();
			expect(toasts).toHaveLength(1);
			
			const toast = toasts[0];
			expect(toast).toBeDefined();
			expect(toast!.id).toBe(id);
			expect(toast!.title).toBe('Error Title');
			expect(toast!.duration).toBe(10000);
			expect(toast!.dismissible).toBe(false);
		});

		it('should generate unique IDs for multiple toasts', () => {
			const id1 = addToast({ type: 'info', message: 'First' });
			const id2 = addToast({ type: 'info', message: 'Second' });

			expect(id1).not.toBe(id2);
			
			const toasts = getToasts();
			expect(toasts).toHaveLength(2);
		});
	});

	describe('removeToast', () => {
		it('should remove specific toast by ID', () => {
			const id1 = addToast({ type: 'info', message: 'First' });
			const id2 = addToast({ type: 'info', message: 'Second' });

			removeToast(id1);

			const toasts = getToasts();
			expect(toasts).toHaveLength(1);
			expect(toasts[0]!.id).toBe(id2);
			expect(toasts[0]!.message).toBe('Second');
		});

		it('should handle removing non-existent toast gracefully', () => {
			addToast({ type: 'info', message: 'Test' });
			
			removeToast('non-existent-id');
			
			const toasts = getToasts();
			expect(toasts).toHaveLength(1);
		});
	});

	describe('clearAllToasts', () => {
		it('should remove all toasts', () => {
			addToast({ type: 'info', message: 'First' });
			addToast({ type: 'info', message: 'Second' });
			addToast({ type: 'info', message: 'Third' });

			expect(getToasts()).toHaveLength(3);

			clearAllToasts();

			expect(getToasts()).toHaveLength(0);
		});
	});

	describe('convenience methods', () => {
		it('should create success toast', () => {
			successToast('Success message');
			
			const toasts = getToasts();
			expect(toasts).toHaveLength(1);
			expect(toasts[0]!.type).toBe('success');
			expect(toasts[0]!.message).toBe('Success message');
		});

		it('should create error toast with no auto-dismiss', () => {
			errorToast('Error message');
			
			const toasts = getToasts();
			expect(toasts).toHaveLength(1);
			expect(toasts[0]!.type).toBe('error');
			expect(toasts[0]!.message).toBe('Error message');
			expect(toasts[0]!.duration).toBe(0);
		});

		it('should create warning toast', () => {
			warningToast('Warning message');
			
			const toasts = getToasts();
			expect(toasts).toHaveLength(1);
			expect(toasts[0]!.type).toBe('warning');
			expect(toasts[0]!.message).toBe('Warning message');
		});

		it('should create info toast', () => {
			infoToast('Info message');
			
			const toasts = getToasts();
			expect(toasts).toHaveLength(1);
			expect(toasts[0]!.type).toBe('info');
			expect(toasts[0]!.message).toBe('Info message');
		});
	});

	describe('createToast compatibility function', () => {
		it('should work with all toast types', () => {
			createToast('success', 'Success message');
			createToast('error', 'Error message');
			createToast('warning', 'Warning message');
			createToast('info', 'Info message');

			const toasts = getToasts();
			expect(toasts).toHaveLength(4);
			
			const types = toasts.map(t => t.type);
			expect(types).toContain('success');
			expect(types).toContain('error');
			expect(types).toContain('warning');
			expect(types).toContain('info');
		});
	});

	describe('toast API object', () => {
		it('should provide access to current toasts', () => {
			addToast({ type: 'info', message: 'Test' });
			
			expect(toast.current).toHaveLength(1);
			expect(toast.current[0]!.message).toBe('Test');
		});

		it('should provide convenience methods', () => {
			toast.success('Success');
			toast.error('Error');
			toast.warning('Warning');
			toast.info('Info');

			expect(toast.current).toHaveLength(4);
		});

		it('should allow adding and removing toasts', () => {
			const id = toast.add({ type: 'info', message: 'Test' });
			expect(toast.current).toHaveLength(1);

			toast.remove(id);
			expect(toast.current).toHaveLength(0);
		});

		it('should allow clearing all toasts', () => {
			toast.add({ type: 'info', message: 'Test 1' });
			toast.add({ type: 'info', message: 'Test 2' });
			
			expect(toast.current).toHaveLength(2);
			
			toast.clear();
			expect(toast.current).toHaveLength(0);
		});
	});

	describe('reactivity', () => {
		it('should maintain reference equality for reactive updates', () => {
			const initialToasts = getToasts();
			expect(initialToasts).toHaveLength(0);

			addToast({ type: 'info', message: 'Test' });
			
			const updatedToasts = getToasts();
			expect(updatedToasts).toHaveLength(1);
			
			// The array reference should be the same for reactive tracking
			expect(updatedToasts).toBe(toast.current);
		});
	});
});
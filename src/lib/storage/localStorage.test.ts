import type { UserContactData } from '$lib/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	clearStorage,
	loadFromStorage,
	loadUserContactData,
	saveToStorage,
	saveUserContactData,
	STORAGE_KEYS
} from './localStorage';

// Mock localStorage für Node.js Tests
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
		length: Object.keys(store).length,
		key: (index: number) => Object.keys(store)[index] || null
	};
})();

// Mock sessionStorage für Node.js Tests  
const sessionStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
		length: Object.keys(store).length,
		key: (index: number) => Object.keys(store)[index] || null
	};
})();

// Mock $app/environment to simulate browser environment
vi.mock('$app/environment', () => ({
	browser: true
}));

Object.defineProperty(global, 'localStorage', { value: localStorageMock });
Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock });
Object.defineProperty(global, 'window', { value: global });

describe('localStorage utilities', () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
	});

	describe('basic storage operations', () => {
		it('should save and load data correctly', () => {
			const testData = { name: 'test', value: 123 };
			saveToStorage('test-key', testData);

			const loaded = loadFromStorage('test-key', null);
			expect(loaded).toEqual(testData);
		});

		it('should return default value for non-existent key', () => {
			const defaultValue = { default: true };
			const result = loadFromStorage('non-existent', defaultValue);
			expect(result).toEqual(defaultValue);
		});

		it('should handle JSON parse errors gracefully', () => {
			localStorage.setItem('corrupted-key', 'invalid-json');
			const defaultValue = { fallback: true };

			const result = loadFromStorage('corrupted-key', defaultValue);
			expect(result).toEqual(defaultValue);
		});
	});

	describe('clearStorage', () => {
		it('should clear all storage except user contact data', () => {
			saveToStorage(STORAGE_KEYS.FORM_DATA, { test: 'data' });
			saveToStorage(STORAGE_KEYS.CURRENT_STEP, 1);
			saveToStorage(STORAGE_KEYS.USER_CONTACT_DATA, { name: 'Test User' });

			clearStorage();

			// Form data und current step sollten gelöscht sein (sie sind in sessionStorage)
			expect(loadFromStorage(STORAGE_KEYS.FORM_DATA, null)).toBeNull();
			expect(loadFromStorage(STORAGE_KEYS.CURRENT_STEP, null)).toBeNull();
			// User contact data sollte erhalten bleiben (es ist in localStorage)
			expect(loadFromStorage(STORAGE_KEYS.USER_CONTACT_DATA, null)).toEqual({ name: 'Test User' });
		});
	});

	describe('user contact data', () => {
		it('should save and load user contact data', async () => {
			const contactData = {
				firstName: 'John',
				lastName: 'Doe',
				email: 'john@example.com',
				persistentDataConsent: true
			} as UserContactData;

			saveUserContactData(contactData);
			// Kurze Wartezeit simulieren (z.B. für asynchrone Speicherung)
			await new Promise((resolve) => setTimeout(resolve, 10));
			const loaded = loadUserContactData();

			expect(loaded).toEqual(contactData);
		});

		it('should return empty object for no contact data', () => {
			const result = loadUserContactData();
			expect(result).toEqual({});
		});
	});

	describe('STORAGE_KEYS', () => {
		it('should have all required keys', () => {
			expect(STORAGE_KEYS.CURRENT_STEP).toBeDefined();
			expect(STORAGE_KEYS.FORM_DATA).toBeDefined();
			expect(STORAGE_KEYS.USER_CONTACT_DATA).toBeDefined();
		});

		it('should have unique key values', () => {
			const keys = Object.values(STORAGE_KEYS);
			const uniqueKeys = [...new Set(keys)];
			expect(keys.length).toBe(uniqueKeys.length);
		});
	});
});

/**
 * Vitest Client-Side Test Setup
 * Konfiguration für Browser-basierte Tests
 */

// Globale Test-Utilities für Browser-Tests
import { beforeEach } from 'vitest';

// Browser-spezifische Setup-Funktionen
beforeEach(() => {
	// Reset DOM zwischen Tests
	document.body.innerHTML = '';
	
	// Reset localStorage
	localStorage.clear();
	
	// Reset sessionStorage
	sessionStorage.clear();
});

// Globale Test-Helpers
declare global {
	interface Window {
		testHelpers: {
			waitForElement: (selector: string, timeout?: number) => Promise<Element>;
			mockLocalStorage: () => void;
			createMockFile: (name: string, type: string) => File;
		};
	}
}

// Test-Helper-Funktionen
window.testHelpers = {
	waitForElement: (selector: string, timeout = 5000): Promise<Element> => {
		return new Promise((resolve, reject) => {
			const element = document.querySelector(selector);
			if (element) {
				resolve(element);
				return;
			}

			const observer = new MutationObserver(() => {
				const element = document.querySelector(selector);
				if (element) {
					observer.disconnect();
					resolve(element);
				}
			});

			observer.observe(document.body, {
				childList: true,
				subtree: true
			});

			setTimeout(() => {
				observer.disconnect();
				reject(new Error(`Element ${selector} not found within ${timeout}ms`));
			}, timeout);
		});
	},

	mockLocalStorage: () => {
		const store: Record<string, string> = {};
		
		Object.defineProperty(window, 'localStorage', {
			value: {
				getItem: (key: string) => store[key] || null,
				setItem: (key: string, value: string) => { store[key] = value; },
				removeItem: (key: string) => { delete store[key]; },
				clear: () => { Object.keys(store).forEach(key => delete store[key]); },
				length: Object.keys(store).length,
				key: (index: number) => Object.keys(store)[index] || null
			},
			writable: true
		});
	},

	createMockFile: (name: string, type: string): File => {
		return new File(['test content'], name, { type });
	}
};
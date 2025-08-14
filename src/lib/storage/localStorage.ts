import { browser } from '$app/environment';
import type { UserContactData } from '$lib/types';

/**
 * Konstanten für LocalStorage-Schlüssel
 */
export const STORAGE_KEYS = {
	CURRENT_STEP: 'sichtungen_current_step',
	FORM_DATA: 'sichtungen_form_data',
	USER_CONTACT_DATA: 'sichtungen_user_contact_data'
};

// Schlüssel für SessionStorage
const sessionKeys = [STORAGE_KEYS.FORM_DATA, STORAGE_KEYS.CURRENT_STEP];

function getItem(key: string): string | null {
	if (!browser) return null;

	let stored;
	if (sessionKeys.includes(key)) {
		stored = sessionStorage.getItem(key);
	} else {
		stored = localStorage.getItem(key);
	}
	return stored;
}

function setItem(key: string, value: string): void {
	if (!browser) return;

	if (sessionKeys.includes(key)) {
		sessionStorage.setItem(key, value);
	} else {
		localStorage.setItem(key, value);
	}
}

/**
 * Lädt Daten aus dem LocalStorage
 *
 * @param key - Der Schlüssel unter dem die Daten gespeichert sind
 * @param defaultValue - Standardwert falls keine Daten vorhanden sind
 * @returns Die geladenen Daten oder den Standardwert
 */
export function loadFromStorage<T>(key: string, defaultValue: T): T {
	if (!browser) return defaultValue;

	const stored = getItem(key);
	if (stored) {
		try {
			return JSON.parse(stored);
		} catch (e) {
			console.error(`Fehler beim Laden von ${key} aus LocalStorage:`, e);
			return defaultValue;
		}
	}
	return defaultValue;
}

/**
 * Speichert Daten im LocalStorage
 *
 * @param key - Der Schlüssel unter dem die Daten gespeichert werden sollen
 * @param value - Die zu speichernden Daten
 */
export function saveToStorage<T>(key: string, value: T): void {
	if (!browser) return;

	setItem(key, JSON.stringify(value));
}

/**
 * Löscht alle formularrelevanten Daten aus dem LocalStorage (außer Benutzer-Kontaktdaten)
 */
export function clearStorage(): void {
	if (!browser) return;

	// Clear all keys except user contact data
	const keysToClear = Object.values(STORAGE_KEYS).filter(
		(key) => key !== STORAGE_KEYS.USER_CONTACT_DATA
	);
	keysToClear.forEach((key) => {
		// Prüfe ob Schlüssel in sessionStorage ist
		if (sessionKeys.includes(key)) {
			sessionStorage.removeItem(key);
		} else {
			localStorage.removeItem(key);
		}
	});
}

/**
 * Löscht nur Formulardaten aber behält currentStep und Benutzer-Kontaktdaten
 */
export function clearFormDataOnly(): void {
	if (!browser) return;

	// Nur FORM_DATA löschen, currentStep und user contact data behalten
	// FORM_DATA ist in sessionStorage
	sessionStorage.removeItem(STORAGE_KEYS.FORM_DATA);
}

/**
 * Speichert Benutzer-Kontaktdaten persistent (bleiben nach Form-Reset erhalten)
 */
export function saveUserContactData(contactData: UserContactData): void {
	saveToStorage(STORAGE_KEYS.USER_CONTACT_DATA, contactData);
}

/**
 * Lädt gespeicherte Benutzer-Kontaktdaten
 */
export function loadUserContactData(): UserContactData {
	return loadFromStorage(STORAGE_KEYS.USER_CONTACT_DATA, {} as UserContactData);
}

/**
 * Löscht alle gespeicherten Daten inklusive Benutzer-Kontaktdaten
 */
export function clearAllStorage(): void {
	if (typeof window === 'undefined') return;

	Object.values(STORAGE_KEYS).forEach((key) => {
		localStorage.removeItem(key);
	});
}

/**
 * Session-Management: Speichert Kontaktdaten basierend auf Zustimmung
 * - Mit Zustimmung: Persistent im localStorage
 * - Ohne Zustimmung: Nur für aktuelle Session (wird beim Schließen gelöscht)
 */
export function saveUserContactDataWithConsent(contactData: UserContactData): void {
	if (contactData.persistentDataConsent) {
		// Speichere persistent
		saveUserContactData(contactData);
	} else {
		// Speichere nur temporär für aktuelle Session
		saveUserContactData(contactData);
	}
}

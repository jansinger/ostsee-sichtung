/**
 * Konstanten für LocalStorage-Schlüssel
 */
export const STORAGE_KEYS = {
	CURRENT_STEP: 'sichtungen_current_step',
	MAX_VISITED_STEP: 'sichtungen_max_visited_step',
	FORM_DATA: 'sichtungen_form_data',
	USER_CONTACT_DATA: 'sichtungen_user_contact_data',
	PERSISTENT_CONSENT: 'sichtungen_persistent_consent',
	SESSION_ID: 'sichtungen_session_id'
};

/**
 * Lädt Daten aus dem LocalStorage
 *
 * @param key - Der Schlüssel unter dem die Daten gespeichert sind
 * @param defaultValue - Standardwert falls keine Daten vorhanden sind
 * @returns Die geladenen Daten oder den Standardwert
 */
export function loadFromStorage<T>(key: string, defaultValue: T): T {
	if (typeof window === 'undefined') return defaultValue;

	const stored = localStorage.getItem(key);
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
	if (typeof window === 'undefined') return;

	localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Löscht alle formularrelevanten Daten aus dem LocalStorage (außer Benutzer-Kontaktdaten)
 */
export function clearStorage(): void {
	if (typeof window === 'undefined') return;

	// Clear all keys except user contact data
	const keysToClear = Object.values(STORAGE_KEYS).filter(key => key !== STORAGE_KEYS.USER_CONTACT_DATA);
	keysToClear.forEach((key) => {
		localStorage.removeItem(key);
	});
}

/**
 * Interface für persistente Benutzer-Kontaktdaten
 */
export interface UserContactData {
	firstName?: string;
	lastName?: string;
	email?: string;
	phone?: string;
	street?: string;
	zipCode?: string;
	city?: string;
	shipName?: string;
	homePort?: string;
	boatType?: string;
	nameConsent?: boolean;
	shipNameConsent?: boolean;
	persistentDataConsent?: boolean; // New: consent for persistent storage
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
	return loadFromStorage(STORAGE_KEYS.USER_CONTACT_DATA, {});
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
 * Session-Management: Generiert eine eindeutige Session-ID
 */
function generateSessionId(): string {
	return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Session-Management: Initialisiert eine neue Session
 */
export function initializeSession(): string {
	const sessionId = generateSessionId();
	saveToStorage(STORAGE_KEYS.SESSION_ID, sessionId);
	return sessionId;
}

/**
 * Session-Management: Prüft, ob der Benutzer dauerhafter Speicherung zugestimmt hat
 */
export function hasPersistentDataConsent(): boolean {
	const contactData = loadUserContactData();
	return contactData.persistentDataConsent === true;
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
		saveToStorage(STORAGE_KEYS.PERSISTENT_CONSENT, true);
	} else {
		// Speichere nur temporär für aktuelle Session
		saveUserContactData(contactData);
		saveToStorage(STORAGE_KEYS.PERSISTENT_CONSENT, false);
	}
}

/**
 * Session-Management: Cleanup beim Schließen des Browsers/Tabs
 * Wird automatisch aufgerufen, löscht Daten basierend auf Zustimmung
 */
export function performSessionCleanup(): void {
	if (typeof window === 'undefined') return;

	const hasPersistentConsent = loadFromStorage(STORAGE_KEYS.PERSISTENT_CONSENT, false);
	
	if (!hasPersistentConsent) {
		// Lössche alle Daten, wenn keine dauerhafte Zustimmung vorliegt
		clearAllStorage();
	} else {
		// Lösche nur Session-Daten, aber behalte Kontaktdaten
		const keysToDelete = [
			STORAGE_KEYS.CURRENT_STEP,
			STORAGE_KEYS.MAX_VISITED_STEP,
			STORAGE_KEYS.FORM_DATA,
			STORAGE_KEYS.SESSION_ID
		];
		
		keysToDelete.forEach(key => {
			localStorage.removeItem(key);
		});
	}
}

/**
 * Session-Management: Registriert Event Listener für Browser-Events
 */
export function setupSessionCleanup(): void {
	if (typeof window === 'undefined') return;

	// Cleanup bei beforeunload (Browser schließen/Tab schließen)
	window.addEventListener('beforeunload', performSessionCleanup);
	
	// Cleanup bei pagehide (mobile Safari, iOS)
	window.addEventListener('pagehide', performSessionCleanup);
	
	// Cleanup bei visibilitychange (Tab wird unsichtbar/geschlossen)
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') {
			performSessionCleanup();
		}
	});
}

/**
 * User and user contact data interfaces
 */

// Base user type for the application
export interface User {
	nickname: string;
	name: string;
	picture: string;
	updated_at: string;
	email: string;
	email_verified: boolean;
	iss: string;
	aud: string;
	iat: number;
	exp: number;
	sub: string;
	sid: string;
	roles: string[];
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
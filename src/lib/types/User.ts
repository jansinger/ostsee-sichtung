/**
 * User and user contact data interfaces
 */

import type { SightingFormData } from './Form';

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
export type UserContactData = Pick<
	SightingFormData,
	| 'firstName'
	| 'lastName'
	| 'email'
	| 'phone'
	| 'street'
	| 'zipCode'
	| 'city'
	| 'shipName'
	| 'homePort'
	| 'boatType'
	| 'nameConsent'
	| 'shipNameConsent'
	| 'persistentDataConsent'
>;

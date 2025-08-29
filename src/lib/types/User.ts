/**
 * User and user contact data interfaces
 */

import type { SightingFormData } from './Form';

// Base user type for the application (server-side only)
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

// Public user type for frontend (security-filtered)
export interface PublicUser {
	sub: string;
	email: string;
	name: string;
	picture: string;
	nickname?: string;
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

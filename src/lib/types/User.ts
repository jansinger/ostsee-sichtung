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
 *
 * Straße, PLZ und Ort gehören bewusst NICHT mehr dazu: Seit die Adresse nicht
 * mehr abgefragt wird (Wunsch des Deutschen Meeresmuseums), gibt es keinen Weg
 * mehr, sie zu sehen oder zu ändern. Blieben sie hier, würde ein früher
 * gespeicherter Wert weiterhin ins Formular zurückgespielt und bei jeder
 * Meldung unsichtbar mitgesendet. Schema-Einträge und DB-Spalten bleiben
 * erhalten — die Legacy-API führt `strasse`/`plz`/`ort` weiter.
 */
export type UserContactData = Pick<
	SightingFormData,
	| 'firstName'
	| 'lastName'
	| 'email'
	| 'phone'
	| 'shipName'
	| 'homePort'
	| 'boatType'
	| 'nameConsent'
	| 'shipNameConsent'
	| 'persistentDataConsent'
>;

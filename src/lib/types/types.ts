// src/lib/types.ts

import type { AnimalBehavior } from '$lib/report/formOptions/animalBehavior';
import type { SeaState } from '$lib/report/formOptions/seaState';
import type { Visibility } from '$lib/report/formOptions/visibility';
import type { Snippet } from 'svelte';
import type { HTMLInputAttributes, HTMLLabelAttributes } from 'svelte/elements';
import type { BoatDrive } from '../report/formOptions/boatDrive';
import type { Distance } from '../report/formOptions/distance';
import type { Distribution } from '../report/formOptions/distribution';
import type { SightingFrom } from '../report/formOptions/sightingFrom';
import type { Species } from '../report/formOptions/species';
import { type SightingModel } from './sighting';

// EXIF data interface (shared between client and server)
export interface ExifData {
	// GPS Daten
	latitude: number | null;
	longitude: number | null;
	altitude: number | null;
	// Kamera Daten
	make?: string;
	model?: string;
	dateTimeOriginal?: string | undefined; // ISO string for JSON serialization
	exposureTime?: string;
	fNumber?: number;
	iso?: number;
	focalLength?: number;
	flash?: boolean;
	// Bild Daten
	width?: number;
	height?: number;
	orientation?: string | number; // orientation can be string or number
}

// Server-side EXIF data interface (before serialization)
export interface ExifDataRaw {
	// GPS Daten
	latitude: number | null;
	longitude: number | null;
	altitude: number | null;
	// Kamera Daten
	make?: string;
	model?: string;
	dateTimeOriginal?: Date; // Date object on server
	exposureTime?: string;
	fNumber?: number;
	iso?: number;
	focalLength?: number;
	flash?: boolean;
	// Bild Daten
	width?: number;
	height?: number;
	orientation?: string | number; // orientation can be string or number
}

// File upload interfaces
export interface UploadedFileInfo {
	id: string;
	originalName: string;
	fileName: string;
	filePath: string;
	url: string; // Full URL to access the file (provider-specific)
	size: number;
	mimeType: string;
	uploadedAt: string;
	exifData?: ExifData | null;
}

/**
 * Frontend-Repräsentation einer Sichtung.
 * Erweitert die Datenbank-Sichtung um typsichere Konstanten und gruppiert die Felder logisch.
 */
export interface Sighting extends Omit<SightingModel, 'location'> {
	// Hier können zusätzliche Frontend-spezifische Eigenschaften definiert werden

	// Typisierte Versionen der numerischen DB-Felder
	species: Species;
	distribution: Distribution;
	distance: Distance;
	sightingFrom: SightingFrom;
	boatDrive: BoatDrive;
	seaState: SeaState;
	visibility?: Visibility;
	behavior?: AnimalBehavior;

	// Datei-Referenzen für Admin-Bearbeitung
	files?: UploadedFileInfo[];
}

export interface Pagination {
	page: number;
	perPage: number;
	totalPages: number;
	total: number;
}

export interface PageData {
	sightings: Sighting[];
	pagination: Pagination;
}

// dropzone
export interface DropzoneProps extends HTMLInputAttributes {
	children: Snippet;
	files?: FileList | null;
	onDrop?: HTMLLabelAttributes['ondrop'];
	onDragOver?: HTMLLabelAttributes['ondragover'];
	onChange?: HTMLInputAttributes['onchange'];
}

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

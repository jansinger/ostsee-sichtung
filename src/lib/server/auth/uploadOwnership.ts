import { createId } from '@paralleldrive/cuid2';
import type { Cookies } from '@sveltejs/kit';

/**
 * Name des langlebigen Cookies, das anonyme Uploads an den hochladenden Client bindet.
 * Ziel: Nur DER Client, der eine (noch nicht zugeordnete) Datei hochgeladen hat, darf
 * sie wieder löschen — nicht jeder, der den Datei-Pfad kennt.
 */
export const UPLOAD_UID_COOKIE = 'upload-uid';

/** Lebensdauer des Upload-Owner-Cookies: 1 Jahr (in Sekunden). */
const UPLOAD_UID_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * Liest den vorhandenen Upload-Owner-UID aus dem Cookie oder erzeugt einen neuen,
 * serverseitig generierten, nicht-erratbaren Wert (cuid2) und setzt ihn als Cookie.
 *
 * Der zurückgegebene Wert wird mit der Datei in der DB gespeichert und dient beim
 * Löschen als Ownership-Nachweis.
 *
 * Cookie-Attribute:
 * - httpOnly: kein JS-Zugriff (XSS-Schutz)
 * - secure: nur über HTTPS (Prod und Dev laufen über HTTPS)
 * - sameSite 'lax': ausreichend, da Upload/Delete same-site erfolgen
 */
export function getOrCreateUploadUid(cookies: Cookies): string {
	const existing = cookies.get(UPLOAD_UID_COOKIE);
	if (existing) {
		return existing;
	}

	const uid = createId();
	cookies.set(UPLOAD_UID_COOKIE, uid, {
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		path: '/',
		maxAge: UPLOAD_UID_MAX_AGE_SECONDS
	});
	return uid;
}

/**
 * Liest den Upload-Owner-UID aus dem Cookie (ohne ihn zu erzeugen).
 * Gibt `undefined` zurück, wenn kein Cookie vorhanden ist.
 */
export function getUploadUid(cookies: Cookies): string | undefined {
	return cookies.get(UPLOAD_UID_COOKIE);
}

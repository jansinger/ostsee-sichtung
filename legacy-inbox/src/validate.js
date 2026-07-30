// @ts-nocheck — reines JavaScript ohne Typdeklarationen (siehe CLAUDE.md, Legacy REST API);
// erst seit Aufgabe 9 von src/tests/contract importiert und damit von tsc erreichbar.
import * as yup from 'yup';

// Bewusst auf jedes Zahlenfeld angewendet, nicht nur auf die drei Felder wie
// in src/lib/legacy-api/yup-validation.ts. Dieser Dienst nimmt
// application/x-www-form-urlencoded entgegen: ein leer gelassenes optionales
// Feld kommt dabei als leerer String an, nicht als fehlender Key. Ohne diese
// Transformation würde ein leeres Dropdown zu einem 400 führen.
const zahl = () => yup.number().transform((wert) => (isNaN(wert) ? undefined : wert));
const text = () => yup.string().nullable().optional();

/**
 * Portiert aus src/lib/legacy-api/yup-validation.ts. Die deutschen Meldungen
 * sind Teil des Vertrags und wortgleich übernommen.
 *
 * Nicht abweichend pflegen: `src/tests/contract/legacy-inbox.sync.contract.test.ts`
 * in der Hauptanwendung liest die Meldungen aus beiden Schemata aus und schlägt
 * fehl, sobald eine davon hier anders lautet als dort.
 */
export const legacySchema = yup.object().shape({
	sichtungsdatum: yup
		.string()
		.required('Bitte geben Sie ein gültiges Datum an.')
		.matches(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, 'Bitte geben Sie ein gültiges Datum an.'),
	// Fehlt das Feld, lautet die Meldung "Dieses Feld kann nicht leer gelassen
	// werden." — nicht die Längenmeldung. Ist es zu lang, umgekehrt.
	vorname: yup
		.string()
		.required('Dieses Feld kann nicht leer gelassen werden.')
		.max(64, 'Der Vorname darf nicht länger als 64 Zeichen sein.'),
	name: yup
		.string()
		.required('Dieses Feld kann nicht leer gelassen werden.')
		.max(64, 'Der Name darf nicht länger als 64 Zeichen sein.'),
	email: yup
		.string()
		.required('Bitte geben Sie eine gültige E-Mail-Adresse ein.')
		.email('Bitte geben Sie eine gültige E-Mail-Adresse ein.')
		.max(64, 'Bitte geben Sie eine gültige E-Mail-Adresse ein.'),
	anzahl_gesamt: zahl()
		.required('Dieses Feld kann nicht leer gelassen werden.')
		.min(0, 'Dieses Feld kann nicht leer gelassen werden.')
		.integer('Dieses Feld kann nicht leer gelassen werden.'),

	gps_breite: zahl()
		.min(-90, 'Der Breitengrad muss zwischen -90 und 90 liegen.')
		.max(90, 'Der Breitengrad muss zwischen -90 und 90 liegen.')
		.nullable()
		.optional(),
	gps_laenge: zahl()
		.min(-180, 'Der Längengrad muss zwischen -180 und 180 liegen.')
		.max(180, 'Der Längengrad muss zwischen -180 und 180 liegen.')
		.nullable()
		.optional(),

	anzahl_jung: zahl().nullable().optional(),
	fahrwasser: text(),
	seezeichen: text(),
	vonwo: zahl().nullable().optional(),
	vonwo_text: text(),
	entfernung: zahl().nullable().optional(),
	anzahl_schiffe: zahl().nullable().optional(),
	verteilung: zahl().nullable().optional(),
	verteilung_text: text(),
	aufnahme: text(),
	aufnahmeHochladen: zahl().nullable().optional(),
	verhalten: zahl().nullable().optional(),
	verhalten_text: text(),
	reaktion: text(),

	// Beide Schreibweisen: Der Vertrag schreibt "ae", die Hauptanwendung
	// benutzt den Umlaut (Entwurf, Abschnitt 2.2). Wer sich an eine von beiden
	// hält, soll nicht abgewiesen werden.
	sonstige_auffaelligkeiten: text(),
	sonstige_auffälligkeiten: text(),

	seegang: zahl().nullable().optional(),
	windrichtung: text(),
	windstaerke: text(),
	sichtweite: zahl().nullable().optional(),
	schiffsname: text(),
	heimathafen: text(),
	bootstyp: text(),
	bootsantrieb: zahl().nullable().optional(),
	bootsantrieb_text: text(),
	strasse: text(),
	plz: text(),
	ort: text(),
	telefon: text(),
	fax: text(),
	namensnennung: zahl().nullable().optional(),
	schiffnamensnennung: zahl().nullable().optional(),
	bemerkungen: text(),
	eingangskanal: zahl().nullable().optional(),
	tierart: zahl().nullable().optional(),
	totfund: zahl().nullable().optional(),
	totfund_zustand: zahl().nullable().optional(),
	totfund_geschlecht: zahl().nullable().optional(),
	totfund_groesse: zahl().nullable().optional(),
	totfund_telefon: zahl().nullable().optional()
});

export async function validiere(payload) {
	try {
		// stripUnknown bleibt aus: Unbekannte Felder werden weder bemängelt
		// noch entfernt — gespeichert wird ohnehin der rohe Payload.
		await legacySchema.validate(payload ?? {}, { abortEarly: false });
		return { gueltig: true, fehler: {} };
	} catch (fehler) {
		if (fehler instanceof yup.ValidationError) {
			const gesammelt = {};
			for (const einzeln of fehler.inner) {
				if (!einzeln.path) continue;
				gesammelt[einzeln.path] ??= [];
				gesammelt[einzeln.path].push(einzeln.message);
			}
			return { gueltig: false, fehler: gesammelt };
		}
		return {
			gueltig: false,
			fehler: { _general: ['Ein unbekannter Validierungsfehler ist aufgetreten.'] }
		};
	}
}

/**
 * Die flache Fehlerform aus dem Original-PDF. NICHT die geschachtelte Form
 * aus src/lib/legacy-api/error-messages.ts — siehe Entwurf, Abschnitt 2.1.
 */
export function fehlerAntwort(fehler) {
	return { message: 'Validation failed.', errors: fehler };
}

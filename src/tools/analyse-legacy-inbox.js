#!/usr/bin/env node

/**
 * Analysiert den Legacy-Posteingang (siehe legacy-inbox/), um sichtbar zu machen,
 * was ein Client tatsächlich an POST /rest_sichtungen sendet, verglichen mit dem
 * dokumentierten Vertrag.
 *
 * Hintergrund: legacy-inbox/ legt jede Übertragung als Umschlag-Datei unter
 * posteingang/, abgewiesen/ oder importiert/ ab (siehe legacy-inbox/src/store.js).
 * Nach jeder Testrunde eines neu gebauten Clients muss von Hand beantwortet
 * werden, welche Felder gesendet wurden, mit welchen Werten, welche davon gegen
 * den Vertrag verstoßen und welche Vertragsfelder nie auftauchen. Dieses Skript
 * automatisiert genau das.
 *
 * Aufruf: node src/tools/analyse-legacy-inbox.js <datenverzeichnis>
 *
 * Bewusst reines Node ohne Import aus $lib: Das Skript braucht deshalb kein
 * vite-node (kein SvelteKit-Modulgraph, keine TEST=true-Umgehung nötig).
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const SUBDIRS = ['posteingang', 'abgewiesen', 'importiert'];

// ---------------------------------------------------------------------------
// VERTRAGSWISSEN — Referenz: docs/LEGACY_API_SPECIFICATION.md, Abschnitt
// "1. Creating Sightings" (Feldtabelle für POST /rest_sichtungen).
//
// Bei einer Vertragsänderung (Feld hinzugefügt/entfernt, Wertebereich
// geändert, Pflichtstatus geändert) HIER und in der Spezifikation aktualisieren
// — beide Stellen müssen übereinstimmen, sonst meldet dieses Tool Verstöße
// gegen einen Vertrag, der so nicht mehr gilt (oder übersieht echte).
//
// Stand 2026-07-30: windstaerke ist 0-12 (Beaufort 0 = Windstille, nicht 1-12
// wie eine ältere Fassung dieses Dokuments behauptete). windrichtung
// akzeptiert sowohl die deutschen als auch die englischen Abkürzungen des
// neuen iOS-Clients — NO/NE, O/E, SO/SE unterscheiden sich, N/S/W/NW/SW sind
// in beiden Sprachen identisch.
// ---------------------------------------------------------------------------

/** Windrichtungen, die serverseitig akzeptiert werden (deutsch + englisch). */
export const ACCEPTED_WIND_DIRECTIONS = [
	'N',
	'NW',
	'W',
	'SW',
	'S',
	'SO',
	'O',
	'NO',
	'NE',
	'E',
	'SE'
];

/**
 * Ein Eintrag pro Vertragsfeld aus der Feldtabelle. `range` gilt nur für
 * Felder, die die Spezifikation ausdrücklich als "Integer-Range" bzw. mit
 * Dezimalgrenzen dokumentiert — Felder, die nur als "Integer" ohne
 * Wertebereich geführt sind (z. B. anzahl_gesamt, anzahl_schiffe,
 * anzahl_jung, totfund_groesse), bekommen bewusst kein `range`, sonst würde
 * dieses Tool einen Vertrag prüfen, der so nicht dokumentiert ist.
 */
export const CONTRACT_FIELDS = {
	sichtungsdatum: { required: true },
	anzahl_gesamt: { required: true },
	vorname: { required: true, personal: true, maxLength: 64 },
	name: { required: true, personal: true, maxLength: 64 },
	email: { required: true, personal: true, maxLength: 64 },
	gps_breite: { range: [-90, 90] },
	gps_laenge: { range: [-180, 180] },
	fahrwasser: {},
	seezeichen: {},
	vonwo: { range: [0, 5] },
	vonwo_text: {},
	entfernung: { range: [1, 5] },
	anzahl_schiffe: {},
	anzahl_jung: {},
	verteilung: { range: [0, 4] },
	verteilung_text: {},
	aufnahme: { maxLength: 255 },
	aufnahmeHochladen: { boolean: true },
	verhalten: { range: [0, 4] },
	verhalten_text: {},
	reaktion: {},
	sonstige_auffaelligkeiten: {},
	seegang: { range: [0, 5] },
	windrichtung: { wind: true },
	windstaerke: { range: [0, 12] },
	sichtweite: { range: [1, 4] },
	schiffsname: { maxLength: 64 },
	heimathafen: { maxLength: 64 },
	bootstyp: { maxLength: 64 },
	bootsantrieb: { range: [0, 5] },
	bootsantrieb_text: {},
	strasse: { personal: true, maxLength: 64 },
	plz: { personal: true, maxLength: 5 },
	ort: { personal: true, maxLength: 64 },
	telefon: { personal: true, maxLength: 64 },
	fax: { personal: true, maxLength: 64 },
	namensnennung: { boolean: true },
	schiffnamensnennung: { boolean: true },
	bemerkungen: {},
	eingangskanal: { range: [0, 5] },
	tierart: { range: [0, 10] },
	totfund: { boolean: true },
	totfund_zustand: { range: [0, 5] },
	totfund_geschlecht: { range: [0, 2] },
	totfund_groesse: {},
	totfund_telefon: { boolean: true }
};

const REDACTED = '[REDACTED]';

function feldIstLeer(wert) {
	return wert === undefined || wert === null || wert === '';
}

function typName(wert) {
	if (wert === null) return 'null';
	if (Array.isArray(wert)) return 'array';
	return typeof wert;
}

/**
 * Prüft die vier in der Aufgabe benannten Verstoß-Kategorien:
 * Wertebereich, Nicht-0/1-Boolean, unbekannte Windrichtung, zu langer String.
 * Gibt bei einem Verstoß eine Begründung zurück, sonst `null`.
 */
function pruefeVerstoss(regel, wert) {
	if (feldIstLeer(wert)) return null;

	if (regel.range) {
		const [min, max] = regel.range;
		const zahl = Number(wert);
		if (Number.isNaN(zahl) || zahl < min || zahl > max) {
			return `außerhalb des dokumentierten Bereichs ${min}-${max}`;
		}
		return null;
	}

	if (regel.boolean) {
		if (wert !== 0 && wert !== 1 && wert !== '0' && wert !== '1') {
			return 'kein 0/1-Boolean';
		}
		return null;
	}

	if (regel.wind) {
		if (typeof wert === 'string' && !ACCEPTED_WIND_DIRECTIONS.includes(wert)) {
			return `nicht in der akzeptierten Windrichtungsliste (${ACCEPTED_WIND_DIRECTIONS.join(', ')})`;
		}
		return null;
	}

	if (regel.maxLength !== undefined && typeof wert === 'string' && wert.length > regel.maxLength) {
		return `String länger als ${regel.maxLength} Zeichen (Länge: ${wert.length})`;
	}

	return null;
}

async function leseUmschlaege(datenVerzeichnis, unterordner) {
	let dateinamen;
	try {
		dateinamen = (await readdir(path.join(datenVerzeichnis, unterordner)))
			.filter((d) => d.endsWith('.json'))
			.sort();
	} catch {
		return [];
	}

	const umschlaege = [];
	for (const datei of dateinamen) {
		try {
			const inhalt = await readFile(path.join(datenVerzeichnis, unterordner, datei), 'utf8');
			umschlaege.push({ datei, unterordner, umschlag: JSON.parse(inhalt) });
		} catch (fehler) {
			console.error(`${unterordner}/${datei}: konnte nicht gelesen werden (${fehler.message})`);
		}
	}
	return umschlaege;
}

/**
 * Berechnet die Differenz in Minuten zwischen der gemeldeten Sichtungszeit
 * (deutsche Ortszeit laut Vertrag) und dem Empfangszeitpunkt (UTC).
 *
 * Bewusst ohne Zeitzonen-Umrechnung: `sichtungsdatum` wird für diesen
 * Vergleich als UTC interpretiert (Suffix "Z" angehängt), nicht nach
 * Europe/Berlin aufgelöst. Der Zweck ist Diagnose, nicht Korrektheit — eine
 * Abweichung um ~60-120 Minuten zeigt die MEZ/MESZ-Verschiebung, eine
 * Abweichung nahe 0 zeigt einen Client, der "jetzt" statt der eingegebenen
 * Zeit sendet. Beides soll auffallen, nicht verschwinden.
 */
function berechneDiffMinuten(sichtungsdatum, empfangenAm) {
	const passtFormat = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(sichtungsdatum);
	if (!passtFormat) return null;

	const sichtungAlsUtc = new Date(`${sichtungsdatum.replace(' ', 'T')}:00Z`);
	const empfangenAmDatum = new Date(empfangenAm);
	if (Number.isNaN(sichtungAlsUtc.getTime()) || Number.isNaN(empfangenAmDatum.getTime())) {
		return null;
	}

	return Math.round((sichtungAlsUtc.getTime() - empfangenAmDatum.getTime()) / 60_000);
}

/**
 * Analysiert alle Umschläge unter `datenVerzeichnis` und liefert die
 * berechneten Kennzahlen als reines Datenobjekt zurück — ohne jede Ausgabe.
 * Die Formatierung übernimmt `formatiere()` weiter unten.
 */
export async function analysiere(datenVerzeichnis) {
	const nachOrdner = {};
	for (const unterordner of SUBDIRS) {
		nachOrdner[unterordner] = await leseUmschlaege(datenVerzeichnis, unterordner);
	}

	const counts = {
		posteingang: nachOrdner.posteingang.length,
		abgewiesen: nachOrdner.abgewiesen.length,
		importiert: nachOrdner.importiert.length
	};

	const rejected = nachOrdner.abgewiesen.map(({ datei, umschlag }) => ({
		file: datei,
		errors: umschlag.validierung?.fehler ?? {}
	}));

	const alleUmschlaege = [
		...nachOrdner.posteingang,
		...nachOrdner.abgewiesen,
		...nachOrdner.importiert
	];

	// name -> { count, types: Set, values: Map<serialisiert, wert> }
	const feldStatistik = new Map();
	const violations = [];
	const missingRequiredByField = new Map();
	const times = [];

	for (const { datei, umschlag } of alleUmschlaege) {
		const payload = umschlag.payload;
		const istObjekt = payload !== null && typeof payload === 'object' && !Array.isArray(payload);

		if (istObjekt) {
			for (const [feldname, wert] of Object.entries(payload)) {
				const regel = CONTRACT_FIELDS[feldname];
				const persoenlich = regel?.personal === true;

				if (!feldStatistik.has(feldname)) {
					feldStatistik.set(feldname, {
						name: feldname,
						count: 0,
						types: new Set(),
						inContract: feldname in CONTRACT_FIELDS,
						personal: persoenlich,
						values: new Map()
					});
				}
				const eintrag = feldStatistik.get(feldname);
				eintrag.count++;
				eintrag.types.add(typName(wert));
				if (persoenlich) {
					eintrag.values.set(REDACTED, REDACTED);
				} else {
					eintrag.values.set(JSON.stringify(wert), wert);
				}

				if (regel) {
					const grund = pruefeVerstoss(regel, wert);
					if (grund) {
						violations.push({
							datei,
							feldname,
							wert: persoenlich ? REDACTED : wert,
							grund
						});
					}
				}
			}

			for (const [feldname, regel] of Object.entries(CONTRACT_FIELDS)) {
				if (!regel.required) continue;
				if (feldIstLeer(payload[feldname])) {
					if (!missingRequiredByField.has(feldname)) {
						missingRequiredByField.set(feldname, []);
					}
					missingRequiredByField.get(feldname).push(datei);
				}
			}

			if (typeof payload.sichtungsdatum === 'string') {
				times.push({
					datei,
					sichtungsdatum: payload.sichtungsdatum,
					empfangenAm: umschlag.empfangen_am,
					diffMinuten: berechneDiffMinuten(payload.sichtungsdatum, umschlag.empfangen_am)
				});
			}
		}
	}

	const fields = [...feldStatistik.values()]
		.map((eintrag) => ({
			name: eintrag.name,
			count: eintrag.count,
			types: [...eintrag.types].sort(),
			inContract: eintrag.inContract,
			personal: eintrag.personal,
			values: [...eintrag.values.values()]
		}))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

	const neverSent = Object.keys(CONTRACT_FIELDS)
		.filter((feldname) => !feldStatistik.has(feldname))
		.sort();

	const missingRequired = [...missingRequiredByField.entries()]
		.map(([field, files]) => ({ field, count: files.length, files: [...files].sort() }))
		.sort((a, b) => b.count - a.count || a.field.localeCompare(b.field));

	return {
		counts,
		rejected,
		fields,
		neverSent,
		violations: violations.map(({ datei, feldname, wert, grund }) => ({
			file: datei,
			field: feldname,
			value: wert,
			reason: grund
		})),
		missingRequired,
		times: times.map(({ datei, sichtungsdatum, empfangenAm, diffMinuten }) => ({
			file: datei,
			sichtungsdatum,
			empfangenAm,
			diffMinutes: diffMinuten
		}))
	};
}

// ---------------------------------------------------------------------------
// Ausgabe — bewusst von analysiere() getrennt, damit die Berechnung ohne
// Konsole testbar bleibt (siehe analyse-legacy-inbox.test.ts).
// ---------------------------------------------------------------------------

const MAX_ANGEZEIGTE_WERTE = 20;

function formatiereWert(wert) {
	if (wert === undefined) return 'undefined';
	return JSON.stringify(wert);
}

export function formatiere(ergebnis) {
	const zeilen = [];

	zeilen.push('## 1. Umschläge je Verzeichnis');
	zeilen.push(
		`posteingang: ${ergebnis.counts.posteingang}, abgewiesen: ${ergebnis.counts.abgewiesen}, importiert: ${ergebnis.counts.importiert}`
	);
	zeilen.push('');

	if (ergebnis.rejected.length > 0) {
		zeilen.push('## 2. Abgewiesene Umschläge');
		for (const { file, errors } of ergebnis.rejected) {
			zeilen.push(`${file}: ${JSON.stringify(errors)}`);
		}
		zeilen.push('');
	}

	zeilen.push('## 3. Gesendete Felder (nach Häufigkeit)');
	if (ergebnis.fields.length === 0) {
		zeilen.push('(keine Umschläge mit lesbarem Payload gefunden)');
	}
	for (const feld of ergebnis.fields) {
		const markierung = feld.inContract ? '' : ' [NICHT IM VERTRAG]';
		const werte = feld.personal
			? REDACTED
			: feld.values.slice(0, MAX_ANGEZEIGTE_WERTE).map(formatiereWert).join(', ') +
				(feld.values.length > MAX_ANGEZEIGTE_WERTE ? ', …' : '');
		zeilen.push(
			`${feld.name}${markierung} — ${feld.count}×, Typen: ${feld.types.join('/')}, Werte: ${werte}`
		);
	}
	zeilen.push('');

	zeilen.push('## 4. Vertragsfelder, die nie gesendet wurden');
	zeilen.push(ergebnis.neverSent.length > 0 ? ergebnis.neverSent.join(', ') : '(keine)');
	zeilen.push('');

	zeilen.push('## 5. Vertragsverstöße');
	if (ergebnis.violations.length === 0) {
		zeilen.push('(keine gefunden)');
	}
	for (const verstoss of ergebnis.violations) {
		zeilen.push(
			`${verstoss.file}: ${verstoss.field} = ${formatiereWert(verstoss.value)} — ${verstoss.reason}`
		);
	}
	zeilen.push('');

	zeilen.push('## 6. Fehlende Pflichtfelder');
	if (ergebnis.missingRequired.length === 0) {
		zeilen.push('(keine)');
	}
	for (const eintrag of ergebnis.missingRequired) {
		zeilen.push(`${eintrag.field}: fehlt in ${eintrag.count}× (${eintrag.files.join(', ')})`);
	}
	zeilen.push('');

	zeilen.push('## 7. Sichtungszeit vs. Empfangszeit');
	if (ergebnis.times.length === 0) {
		zeilen.push('(keine sichtungsdatum-Werte gefunden)');
	}
	for (const zeit of ergebnis.times) {
		const diffText =
			zeit.diffMinutes === null
				? 'nicht auswertbar (Format passt nicht)'
				: `${zeit.diffMinutes} min`;
		zeilen.push(
			`${zeit.file}: sichtungsdatum=${zeit.sichtungsdatum} empfangen_am=${zeit.empfangenAm} Differenz=${diffText}`
		);
	}

	return zeilen.join('\n');
}

const istHauptmodul = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;

if (istHauptmodul) {
	const [datenVerzeichnis] = process.argv.slice(2);

	if (!datenVerzeichnis) {
		console.error('Aufruf: node src/tools/analyse-legacy-inbox.js <datenverzeichnis>');
		process.exit(1);
	}

	try {
		const ergebnis = await analysiere(datenVerzeichnis);
		console.log(formatiere(ergebnis));
	} catch (fehler) {
		console.error(
			`Das Datenverzeichnis ${datenVerzeichnis} konnte nicht analysiert werden: ${fehler.message}`
		);
		process.exit(1);
	}
}

/**
 * Testdaten für die E2E-Läufe gegen eine frische Datenbank.
 *
 * **Warum es das braucht.** Der DOM-Scan in `e2e/design-tokens.spec.ts` fährt
 * `/admin` und `/admin/statistics` mit. Beide Seiten rendern ausschließlich, was
 * die Datenbank hergibt — eine leere Tabelle liefert ein DOM ohne eine einzige
 * verbotene Kombination. Der Scan wäre dann grün, ohne die Muster je gesehen zu
 * haben, um die es geht: Datentabelle, Zebra-Streifen, Statusbadges,
 * `stat-value`, Paginierung. „Vakuum-grün" ist schlechter als rot, weil es
 * niemandem auffällt.
 *
 * Ein Datensatz genügt dafür nicht. Die Menge hier ist auf drei Schwellen
 * ausgelegt, die alle drei überschritten werden müssen:
 *
 * 1. **Mehr als eine Seite** — die Paginierung rendert immer, aber bei einer
 *    Seite ist jede Navigations-Schaltfläche deaktiviert. `defaultPageSize` ist
 *    50 (`configService.ts`), also braucht es > 50 Zeilen.
 * 2. **Mehr als eine Zeile** — sonst gibt es kein Zebra-Streifen-Paar.
 * 3. **Mehrere Jahre** — die Spalte „Entwicklung" der Jahrestrend-Tabelle
 *    rechnet gegen das Vorjahr und bleibt bei einem einzigen Jahr leer.
 *
 * **Idempotent über einen Marker.** Alle Zeilen tragen
 * `kommentar_intern = 'e2e-seed'` und werden vor dem Einfügen darüber gelöscht.
 * Das macht den Lauf wiederholbar und die Zeilen in einer Entwickler-Datenbank
 * jederzeit wieder entfernbar (`--purge`) — die lokale DB ist laut
 * `docs/WORKTREES.md` über alle Worktrees geteilt, ein Seed ohne Rückweg wäre
 * dort keine gute Idee.
 *
 * Ausführung: `npm run db:seed:e2e` (Node ≥ 22.18, natives Type Stripping —
 * dasselbe Verfahren wie `scripts/docker-migrate.ts`).
 */
import postgres from 'postgres';

/** Erkennungsmerkmal der Seed-Zeilen. Nicht ändern — `--purge` hängt daran. */
const SEED_MARKER = 'e2e-seed';

/**
 * Zeilenzahl. 60 > 50 (`defaultPageSize`) ergibt genau zwei Seiten — die
 * kleinste Menge, die eine bedienbare Paginierung belegt.
 */
const ROW_COUNT = 60;

/** Kalenderjahre der Sichtungsdaten (Jahrestrends brauchen mindestens zwei). */
const YEARS = [2024, 2025, 2026];

/**
 * `tierart`-Werte aus `SpeciesEnum` (`src/lib/report/formOptions/species.ts`):
 * Schweinswal, Kegelrobbe, Seehund, Delphin, Zwergwal. Bewusst echte Codes —
 * ein unbekannter Wert würde in der Artenverteilung als „Nicht angegeben"
 * erscheinen und die Tabelle wertlos machen.
 */
const SPECIES = [0, 1, 2, 3, 5];

/**
 * Melder-Adressen. Sechs Adressen auf 60 Zeilen heißt zehn Meldungen je
 * Adresse — `repeatUsers` und `topObservers` filtern auf `COUNT(*) > 1`, und
 * `topObservers` schließt `%@meeresmuseum.de` ausdrücklich aus.
 */
const REPORTER_EMAILS = [
	'anke.b@example.invalid',
	'bengt.c@example.invalid',
	'clara.d@example.invalid',
	'dorte.e@example.invalid',
	'eike.f@example.invalid',
	'frida.g@example.invalid'
];

const SHIP_NAMES = ['MS Seeadler', 'MS Kranich', 'MS Möwe'];

/** Positionen in der westlichen Ostsee — plausibel, damit /map etwas zeigt. */
const POSITIONS = [
	{ lat: 54.31, lon: 12.09 },
	{ lat: 54.52, lon: 13.64 },
	{ lat: 54.09, lon: 11.31 },
	{ lat: 54.78, lon: 14.02 },
	{ lat: 54.44, lon: 12.71 }
];

interface SeedRow {
	sichtungsdatum: Date;
	created: Date;
	tierart: number;
	anzahl_gesamt: number;
	anzahl_jung: number;
	entfernung: number;
	verteilung: number;
	verhalten: number;
	seegang: number;
	sichtweite: number;
	gps_breite: string;
	gps_laenge: string;
	geprueft: number;
	freigegeben_am: Date | null;
	totfund: number;
	aufnahmeHochladen: number;
	ostsee_geo: number;
	email: string;
	schiffsname: string | null;
	windrichtung: string;
	windstaerke: string;
	referenz_id: string;
	eingangskanal: number;
	kommentar_intern: string;
}

/**
 * Baut die Zeilen deterministisch.
 *
 * Bewusst ohne Zufall: Ein Seed, der bei jedem Lauf andere Zahlen erzeugt, macht
 * einen fehlgeschlagenen CI-Lauf nicht reproduzierbar — und die Streuung, auf die
 * es hier ankommt, ist keine statistische, sondern eine über die Zustände der
 * Oberfläche (geprüft/ungeprüft, freigegeben/offen, Totfund, mit Aufnahme).
 *
 * @param now - Bezugszeitpunkt für die „letzte 30 Tage"-Werte (Heatmap)
 */
function buildRows(now: Date): SeedRow[] {
	return Array.from({ length: ROW_COUNT }, (_, i) => {
		const year = YEARS[i % YEARS.length];
		/* 10:30 UTC liegt in beiden Zeitzonen-Auslegungen im selben Kalendertag —
		   `sichtungsdatum` hält UTC, gruppiert wird in Berliner Ortszeit
		   (`sqlTimeZone.ts`). Eine Sichtung um 00:30 Ortszeit würde je nach
		   Auslegung ins Vorjahr rutschen und die Jahreszählung unscharf machen. */
		const sichtungsdatum = new Date(Date.UTC(year, i % 12, (i % 27) + 1, 10, 30));

		/* Das letzte Drittel meldet „gerade eben": Die Aktivitäts-Heatmap auf
		   /admin/statistics wertet `created` der letzten 30 Tage aus und wäre
		   sonst durchgehend auf Intensität 0 — also ohne einen einzigen
		   Vollton-Zustand im DOM. */
		const isRecent = i >= ROW_COUNT - 20;
		const created = isRecent
			? new Date(now.getTime() - ((i % 20) + 1) * 24 * 60 * 60 * 1000)
			: sichtungsdatum;

		/* 48 geprüft, 12 ungeprüft. Alles, was die Statistik auswertet, filtert auf
		   `geprueft = 1`; die ungeprüften halten den „Prüfen"-Zustand der Badges
		   und Aktionsknöpfe in der Liste am Leben. */
		const verified = i % 5 === 0 ? 0 : 1;

		/* Freigegeben und offen müssen BEIDE vorkommen: basicStats läuft zweimal,
		   einmal über `freigegeben_am IS NOT NULL` und einmal über IS NULL, und
		   zeigt beide Blöcke getrennt an (approvalFilter.ts). Wäre eine der beiden
		   Mengen leer, stünden dort Nullen — und Nullen sind kein Inhalt. */
		const approved = verified === 1 && i % 2 === 0;

		const position = POSITIONS[i % POSITIONS.length];

		return {
			sichtungsdatum,
			created,
			tierart: SPECIES[i % SPECIES.length],
			anzahl_gesamt: 1 + (i % 7),
			anzahl_jung: i % 3,
			entfernung: 1 + (i % 4),
			verteilung: 1 + (i % 3),
			/* != 0, weil die Datenqualitäts-Kennzahl „mit Verhaltensangabe" genau
			   darauf zählt (`ne(sightings.behavior, 0)`). */
			verhalten: 1 + (i % 5),
			seegang: i % 6,
			sichtweite: 1 + (i % 3),
			gps_breite: position.lat.toFixed(6),
			gps_laenge: position.lon.toFixed(6),
			geprueft: verified,
			freigegeben_am: approved ? created : null,
			totfund: i % 11 === 0 ? 1 : 0,
			aufnahmeHochladen: i % 4 === 0 ? 1 : 0,
			ostsee_geo: i % 9 === 0 ? 0 : 1,
			email: REPORTER_EMAILS[i % REPORTER_EMAILS.length],
			schiffsname: i % 3 === 0 ? SHIP_NAMES[i % SHIP_NAMES.length] : null,
			windrichtung: ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'][i % 8],
			windstaerke: String(1 + (i % 8)),
			referenz_id: `E2E-${String(i + 1).padStart(3, '0')}`,
			eingangskanal: i % 3,
			kommentar_intern: SEED_MARKER
		};
	});
}

const COLUMNS = [
	'sichtungsdatum',
	'created',
	'tierart',
	'anzahl_gesamt',
	'anzahl_jung',
	'entfernung',
	'verteilung',
	'verhalten',
	'seegang',
	'sichtweite',
	'gps_breite',
	'gps_laenge',
	'geprueft',
	'freigegeben_am',
	'totfund',
	'aufnahmeHochladen',
	'ostsee_geo',
	'email',
	'schiffsname',
	'windrichtung',
	'windstaerke',
	'referenz_id',
	'eingangskanal',
	'kommentar_intern'
] as const satisfies readonly (keyof SeedRow)[];

/**
 * Prüft, dass `COLUMNS` und die Felder von `SeedRow` sich vollständig decken.
 *
 * **Warum zur Laufzeit und nicht über den Typ.** Das `satisfies` oben deckt nur
 * eine Richtung ab (jeder Eintrag ist ein gültiger Schlüssel) — und selbst das
 * nur, wenn jemand die Datei typprüft. `npm run type-check` tut das **nicht**:
 * `tsconfig.json` erbt sein `include` von `.svelte-kit/tsconfig.json`, und
 * `scripts/` steht dort nicht drin. Nachgemessen mit `tsc --listFiles` — aus
 * `scripts/` ist nur `docker-migrate.ts` im Programm, und das nur, weil ein Test
 * unter `src/` es importiert. ESLint sieht die Datei (verifiziert), ist hier aber
 * nicht typbewusst.
 *
 * Eine Zusicherung, die nicht ausgeführt wird, ist keine Zusicherung. Diese hier
 * läuft bei jedem Seed-Lauf, also auch in CI.
 *
 * Der Fehlerfall ohne sie: Ein neues Feld in `SeedRow`, das in `COLUMNS` fehlt,
 * wird stillschweigend nicht eingefügt. Die Spalte behält ihren Default, und
 * auffallen würde es erst als „Seite rendert nichts" im E2E-Report — zwei
 * Schritte von der Ursache entfernt.
 */
function assertColumnsMatch(row: SeedRow): void {
	const fields = Object.keys(row);
	const missing = fields.filter((field) => !COLUMNS.includes(field as (typeof COLUMNS)[number]));
	const extra = COLUMNS.filter((column) => !fields.includes(column));

	if (missing.length > 0 || extra.length > 0) {
		throw new Error(
			'COLUMNS und SeedRow sind nicht deckungsgleich — der Insert würde Felder stillschweigend verlieren. ' +
				`In SeedRow, aber nicht in COLUMNS: [${missing.join(', ')}]. ` +
				`In COLUMNS, aber nicht in SeedRow: [${extra.join(', ')}].`
		);
	}
}

async function main(): Promise<void> {
	const url = process.env.DATABASE_POSTGRES_URL;
	if (!url) {
		throw new Error(
			'DATABASE_POSTGRES_URL fehlt. Lokal steht die URL in .env, in CI setzt sie der e2e-Job (ci.yml).'
		);
	}

	const purgeOnly = process.argv.includes('--purge');
	const sql = postgres(url, { max: 1 });

	try {
		const deleted = await sql`
			DELETE FROM sichtungen WHERE kommentar_intern = ${SEED_MARKER} RETURNING id
		`;
		console.log(`🧹 ${deleted.length} vorhandene Seed-Zeilen entfernt`);

		if (purgeOnly) {
			console.log('✅ --purge: nichts neu angelegt');
			return;
		}

		const rows = buildRows(new Date());
		const [firstRow] = rows;
		if (!firstRow) throw new Error(`buildRows lieferte keine Zeile (ROW_COUNT = ${ROW_COUNT})`);
		assertColumnsMatch(firstRow);
		await sql`INSERT INTO sichtungen ${sql(rows, ...COLUMNS)}`;

		/* `location` getrennt, weil der Wert aus einer PostGIS-Funktion kommt und
		   nicht als Parameter im Bulk-Insert stehen kann. Ohne Geometrie liefert
		   /api/map/sightings — die Datenbank-Sonde des DOM-Scans — keine Features,
		   und /map bliebe leer. */
		await sql`
			UPDATE sichtungen
			SET location = ST_SetSRID(ST_MakePoint(gps_laenge::float8, gps_breite::float8), 4326)
			WHERE kommentar_intern = ${SEED_MARKER}
		`;

		/* Gegenprobe im Seed selbst: Ohne sie würde ein stillschweigend
		   fehlgeschlagener Insert erst im E2E-Report als „Seite rendert keine
		   Tabellenzeilen" auftauchen — zwei Schritte entfernt von der Ursache. */
		const [summary] = await sql<
			[{ total: number; verified: number; approved: number; years: number }]
		>`
			SELECT
				COUNT(*)::int AS total,
				COUNT(*) FILTER (WHERE geprueft = 1)::int AS verified,
				COUNT(*) FILTER (WHERE freigegeben_am IS NOT NULL)::int AS approved,
				COUNT(DISTINCT EXTRACT(year FROM sichtungsdatum AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin'))::int AS years
			FROM sichtungen
			WHERE kommentar_intern = ${SEED_MARKER}
		`;

		if (summary.total !== ROW_COUNT) {
			throw new Error(`Seed hat ${summary.total} statt ${ROW_COUNT} Zeilen angelegt`);
		}
		if (summary.years < 2) {
			throw new Error(
				`Seed deckt nur ${summary.years} Jahr(e) ab — die Jahrestrend-Tabelle braucht mindestens zwei`
			);
		}
		if (summary.approved === 0 || summary.approved === summary.verified) {
			throw new Error(
				'Seed enthält nicht beide Freigabezustände — die Statistik zeigt sonst einen leeren Block'
			);
		}

		console.log(
			`✅ ${summary.total} Sichtungen angelegt: ${summary.verified} geprüft, ${summary.approved} freigegeben, ${summary.years} Jahre`
		);
	} finally {
		await sql.end();
	}
}

try {
	await main();
} catch (error: unknown) {
	console.error('[seed-e2e] FEHLER:', error instanceof Error ? error.message : error);
	process.exit(1);
}

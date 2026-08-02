import { expect, test } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';
import { DistanceEnum } from '../src/lib/report/formOptions/distance';
import { SightingFromEnum } from '../src/lib/report/formOptions/sightingFrom';
import { seedAdminSession } from './helpers/adminSession';

/**
 * admin-edit-preserves-record.spec.ts — was eine Admin-Bearbeitung am Bestand
 * **nicht** anfassen darf.
 *
 * Das Bearbeitungsformular zeigt weder Adresse noch Kontaktdaten an. Beide
 * überstehen eine Bearbeitung trotzdem, aber nur über eine unsichtbare Kette:
 * Der Loader holt die vollständige Zeile, `buildAdminEditInitialValues` legt sie
 * in den Formularzustand, `handleSubmit` schickt ihn komplett an
 * `PUT /api/sightings/[id]`, und `mapFormToSighting` schreibt jedes Feld zurück.
 * Reißt irgendein Glied — ein Loader, der weniger Spalten liefert, ein Formular,
 * das nur noch geänderte Felder sendet —, verschwindet die Adresse von 6.689
 * Meldungen still. Die Unit-Tests sichern die Glieder einzeln; hier läuft die
 * Kette einmal echt durch.
 *
 * **Warum die Koordinaten mitgeprüft werden:** Genau an dieser Kette hing bis
 * 2026-08-02 ein Datenverlust, den kein Test bemerkte. Das Formular baute seine
 * Startwerte mit `Number(sighting.latitude)?.toFixed(4)` und kürzte damit bei
 * jeder Speicherung `numeric(8,6)` auf vier Nachkommastellen — auch dann, wenn
 * niemand die Position angefasst hatte.
 *
 * Der Fall „ohne Position" ist der Gegenpart dazu und war **kein** Datenverlust:
 * Der Startwert `'0.0000'` erreichte die Datenbank nie, weil Yup ihn vorher zur
 * Zahl `0` castet und die im Null-Zweig landet. Der Test hält die Kombination
 * fest, nicht einen behobenen Fehler — er war schon vor dem Fix grün.
 *
 * **Eigene Datensätze statt Bestandsdaten.** Die lokale Datenbank ist laut
 * `docs/WORKTREES.md` über alle Worktrees geteilt; ein Test, der eine echte
 * Meldung speichert, änderte echte Daten. Jeder Testfall legt deshalb seine
 * eigene Zeile an und räumt sie wieder weg. Sie trägt denselben Marker wie
 * `scripts/seed-e2e.ts` (`kommentar_intern = 'e2e-seed'`), damit ein Abbruch
 * mitten im Lauf nichts hinterlässt, was `npm run db:seed:e2e -- --purge` nicht
 * findet.
 */

/* Playwright lädt .env nicht von sich aus — dieselbe Begründung wie in
   e2e/helpers/adminSession.ts. */
loadEnv();

const SEED_MARKER = 'e2e-seed';

/** Melderdaten, die keine der beiden Bearbeitungen anfassen darf. */
const REPORTER = {
	firstName: 'Erika',
	lastName: 'Mustermann',
	email: 'erika.e2e@example.invalid',
	street: 'Hafenstraße 12',
	zipCode: '18439',
	city: 'Stralsund'
};

/**
 * Sechs Nachkommastellen — die volle Auflösung der Spalte. Vier davon zu
 * behalten wäre der alte Fehler, deshalb steht hier bewusst kein runder Wert.
 */
const POSITION = { latitude: '54.123456', longitude: '13.654321' };

/**
 * Zeitpunkt der Sichtung, als ISO-UTC **mit `Z`** — im Formular erscheint er als
 * 10:30 MESZ.
 *
 * Die Schreibweise ist nicht Geschmackssache: `postgres.js` serialisiert einen
 * String-Parameter über `new Date(x).toISOString()`. Ohne `Z` legt Node den Wert
 * als **Ortszeit** aus, und die Testzeile läge auf einem Rechner in Europe/Berlin
 * zwei Stunden neben der Absicht — der Test misst dann seine eigene Zeitzone
 * statt der Anwendung. Genau so ist der erste Anlauf dieses Tests gescheitert.
 * Drizzle schreibt aus demselben Grund `toISOString()`.
 */
const SIGHTING_DATE_UTC = '2024-06-01T08:30:00.000Z';

/** Derselbe Zeitpunkt, wie ihn `to_char` aus der Spalte liest. */
const SIGHTING_DATE_STORED = '2024-06-01 08:30:00';

function connect() {
	const databaseUrl = process.env.DATABASE_POSTGRES_URL;
	if (!databaseUrl) {
		throw new Error(
			'DATABASE_POSTGRES_URL fehlt — ohne Datenbank lässt sich keine Testsichtung anlegen. ' +
				'Lokal steht sie in .env, in CI entsteht sie aus .env.example (ci.yml).'
		);
	}
	return postgres(databaseUrl, { max: 1 });
}

/**
 * Legt eine Sichtung an und liefert ihre ID.
 *
 * `gps_breite`/`gps_laenge` kommen als Text herein und werden von Postgres
 * gecastet — so steht die erwartete Genauigkeit im Test als Literal und nicht
 * als Fließkommazahl, die schon beim Schreiben wackeln könnte.
 *
 * `referenz_id` ist gesetzt, weil `sightingSchema` sie verlangt; im Bestand
 * trägt sie jede Zeile. `vonwo` und `entfernung` sind überschreibbar — der
 * dritte Testfall braucht dort genau die Werte, an denen das Speichern bis
 * 2026-08-02 scheiterte.
 */
async function createSighting(options: {
	latitude: string | null;
	longitude: string | null;
	waterway: string | null;
	referenceId: string;
	sightingFrom?: number;
	distance?: number;
}): Promise<number> {
	const sql = connect();
	try {
		const [row] = await sql<{ id: number }[]>`
			INSERT INTO sichtungen (
				sichtungsdatum, created, tierart, anzahl_gesamt,
				vonwo, entfernung, referenz_id,
				gps_breite, gps_laenge, fahrwasser,
				vorname, name, email, strasse, plz, ort,
				datenschutz_einverstaendnis, kommentar_intern
			) VALUES (
				${SIGHTING_DATE_UTC}, NOW(), 1, 2,
				${options.sightingFrom ?? SightingFromEnum.LAND},
				${options.distance ?? DistanceEnum.FROM_10_TO_50M},
				${options.referenceId},
				${options.latitude}, ${options.longitude}, ${options.waterway},
				${REPORTER.firstName}, ${REPORTER.lastName}, ${REPORTER.email},
				${REPORTER.street}, ${REPORTER.zipCode}, ${REPORTER.city},
				1, ${SEED_MARKER}
			)
			RETURNING id
		`;
		return Number(row.id);
	} finally {
		await sql.end({ timeout: 5 });
	}
}

interface StoredSighting {
	lat: string | null;
	lon: string | null;
	punkt: string | null;
	vorname: string | null;
	name: string | null;
	email: string | null;
	strasse: string | null;
	plz: string | null;
	ort: string | null;
	sichtungsdatum: string;
	sonstige_auffaelligkeiten: string | null;
	kommentar_intern: string | null;
	vonwo: number;
	entfernung: number;
}

/**
 * Liest die gespeicherte Zeile.
 *
 * Koordinaten und Zeitstempel kommen als Text heraus: So vergleicht der Test den
 * gespeicherten Wert und nicht das Rundungs- oder Zeitzonenverhalten eines
 * Treibers — und misst damit nicht dieselbe Annahme, die er prüfen soll.
 */
async function readSighting(id: number): Promise<StoredSighting> {
	const sql = connect();
	try {
		const [row] = await sql<StoredSighting[]>`
			SELECT
				gps_breite::text AS lat,
				gps_laenge::text AS lon,
				ST_AsText(location) AS punkt,
				vorname, name, email, strasse, plz, ort,
				to_char(sichtungsdatum, 'YYYY-MM-DD HH24:MI:SS') AS sichtungsdatum,
				sonstige_auffaelligkeiten, kommentar_intern, vonwo, entfernung
			FROM sichtungen WHERE id = ${id}
		`;
		return row;
	} finally {
		await sql.end({ timeout: 5 });
	}
}

async function deleteSighting(id: number): Promise<void> {
	const sql = connect();
	try {
		await sql`DELETE FROM sichtungen WHERE id = ${id}`;
	} finally {
		await sql.end({ timeout: 5 });
	}
}

/**
 * Ändert ein einzelnes sichtbares Feld und speichert.
 *
 * Bewusst „Weitere Beobachtungen" und **nicht** der interne Kommentar: Der trägt
 * den Aufräum-Marker. Bearbeitet wird überhaupt etwas, weil der Nachweis sonst
 * wertlos wäre — die Frage ist ja gerade, was eine *echte* Bearbeitung mit den
 * übrigen Feldern macht.
 */
async function editAndSave(
	page: import('@playwright/test').Page,
	id: number,
	text: string
): Promise<void> {
	await page.goto(`/admin/${id}/edit`);

	const observations = page.locator('[data-testid="field-otherObservations"]');
	await expect(observations).toBeVisible();
	await observations.fill(text);

	const [response] = await Promise.all([
		page.waitForResponse(
			(res) => res.url().includes(`/api/sightings/${id}`) && res.request().method() === 'PUT'
		),
		page.getByRole('button', { name: 'Speichern' }).click()
	]);

	expect(response.status()).toBe(200);
	await expect(page).toHaveURL(new RegExp(`/admin/${id}$`));
}

test.describe('Admin-Bearbeitung erhält den Bestand', () => {
	const createdIds: number[] = [];

	test.beforeEach(async ({ context, baseURL }) => {
		await seedAdminSession(context, baseURL!);
	});

	test.afterEach(async () => {
		while (createdIds.length > 0) {
			await deleteSighting(createdIds.pop()!);
		}
	});

	test('Adresse, Kontaktdaten und Koordinaten überstehen eine Bearbeitung', async ({ page }) => {
		const id = await createSighting({
			...POSITION,
			waterway: null,
			referenceId: 'e2e-mit-position'
		});
		createdIds.push(id);

		await editAndSave(page, id, 'E2E: Nachtrag zur Beobachtung');

		const stored = await readSighting(id);

		// Der Grund für diesen Test: die Melderdaten, die das Formular nie zeigt.
		expect(stored.vorname).toBe(REPORTER.firstName);
		expect(stored.name).toBe(REPORTER.lastName);
		expect(stored.email).toBe(REPORTER.email);
		expect(stored.strasse).toBe(REPORTER.street);
		expect(stored.plz).toBe(REPORTER.zipCode);
		expect(stored.ort).toBe(REPORTER.city);

		// Volle Auflösung — in der Spalte und im daraus gebauten PostGIS-Punkt.
		expect(stored.lat).toBe(POSITION.latitude);
		expect(stored.lon).toBe(POSITION.longitude);
		expect(stored.punkt).toBe(`POINT(${POSITION.longitude} ${POSITION.latitude})`);

		/* Der Zeitpunkt geht als deutsche Wanduhrzeit durch das Formular und muss
		   als derselbe UTC-Zeitpunkt zurückkommen — bei einer Bearbeitung, die ihn
		   gar nicht anfasst, erst recht. Die Zusicherung deckt beide Richtungen ab:
		   Lesen (`postgresTypes.ts`), Anzeige in Europe/Berlin und das Zurückrechnen
		   in `berlinWallClockToUtc`. */
		expect(stored.sichtungsdatum).toBe(SIGHTING_DATE_STORED);

		// Gegenprobe: Die eine beabsichtigte Änderung ist auch angekommen.
		expect(stored.sonstige_auffaelligkeiten).toBe('E2E: Nachtrag zur Beobachtung');
	});

	test('Sichtung ohne Position bekommt keine erfundenen Koordinaten', async ({ page }) => {
		const id = await createSighting({
			latitude: null,
			longitude: null,
			waterway: 'Strelasund',
			referenceId: 'e2e-ohne-position'
		});
		createdIds.push(id);

		await editAndSave(page, id, 'E2E: Bearbeitung ohne Position');

		const stored = await readSighting(id);

		// 462 Bestandszeilen haben keine Position. Eine Bearbeitung darf ihnen
		// keine andichten — heute verhindern das zwei Schichten unabhängig
		// voneinander (Yup-Cast und Null-Zweig in `mapFormToSighting`), und genau
		// deshalb steht hier eine Zusicherung: Fällt eine davon, fällt es auf.
		expect(stored.lat).toBeNull();
		expect(stored.lon).toBeNull();
		expect(stored.punkt).toBeNull();
		expect(stored.strasse).toBe(REPORTER.street);
		expect(stored.sonstige_auffaelligkeiten).toBe('E2E: Bearbeitung ohne Position');
	});

	/**
	 * Der Bestandsfall, an dem das Speichern schlicht scheiterte: `entfernung = 0`
	 * (282 Zeilen) und `vonwo = 0` ohne Freitext (1.120 Zeilen) sind keine
	 * gültigen Eingaben am Meldeformular. Das Formular sendete deshalb gar nicht
	 * erst — der Admin sah eine Fehlerliste zu Feldern, die er nie ausgefüllt hat.
	 *
	 * Dieser Fall bearbeitet den **internen Kommentar**, weil der bis 2026-08-02
	 * nirgends ankam: `mapFormToSighting` bildete das Feld nicht ab. Die Zeile
	 * verliert damit den Aufräum-Marker; auffindbar bleibt sie über die
	 * `e2e-`-Referenz-ID.
	 */
	test('lässt eine Bestandssichtung mit unvollständigen Angaben speichern', async ({ page }) => {
		const id = await createSighting({
			...POSITION,
			waterway: null,
			referenceId: 'e2e-bestand',
			sightingFrom: SightingFromEnum.OTHER,
			distance: 0
		});
		createdIds.push(id);

		await page.goto(`/admin/${id}/edit`);
		const internalComment = page.locator('[data-testid="field-internalComment"]');
		await expect(internalComment).toBeVisible();
		await internalComment.fill('E2E: intern geprüft');

		const [response] = await Promise.all([
			page.waitForResponse(
				(res) => res.url().includes(`/api/sightings/${id}`) && res.request().method() === 'PUT'
			),
			page.getByRole('button', { name: 'Speichern' }).click()
		]);
		expect(response.status()).toBe(200);

		const stored = await readSighting(id);

		// Der interne Kommentar kommt jetzt an …
		expect(stored.kommentar_intern).toBe('E2E: intern geprüft');
		// … und die unvollständigen Angaben stehen unverändert da, statt vom
		// Formular durch erfundene Kategorien ersetzt zu werden.
		expect(stored.vonwo).toBe(SightingFromEnum.OTHER);
		expect(stored.entfernung).toBe(0);
		expect(stored.strasse).toBe(REPORTER.street);
		expect(stored.lat).toBe(POSITION.latitude);
	});
});

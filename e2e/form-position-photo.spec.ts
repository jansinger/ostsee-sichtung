import { expect, test, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { mockFileUploadSuccess } from './fixtures/mockApi';
import { FormPage } from './pages/FormPage';

// ── Phase 4A → Task 10: Foto-Upload in Schritt 1, über echten `setInputFiles` ──
//
// Der Foto-Weg ist der Kern des neuen Positions-Panels: Ein Bild mit GPS-EXIF
// füllt Position, Datum und Uhrzeit von allein. Bis hierher lief kein einziger
// E2E-Test über einen echten Datei-Upload — diese Datei schließt die Lücke.
//
// Getestet werden die drei Ausgänge der EXIF-Auswertung:
//   B  Foto mit GPS in der Ostsee → Position/Zeit werden übernommen
//   C  Foto ohne GPS              → Hinweis mit zwei Auswegen
//   —  Foto mit GPS außerhalb     → Bereichsprüfung schlägt an
//
// Kein Prosa-Matching: Die Copy in diesem Bereich hat sich während des Umbaus
// zweimal geändert, geprüft wird ausschließlich über `data-testid`.

// ── Zeitzone: bewusst NICHT Europe/Berlin ────────────────────────────────────
//
// EXIF trägt keinen UTC-Offset. `exifr` belebt "2025:08:15 10:30:00" deshalb in
// der Zeitzone des ausführenden Prozesses — auf einem Entwickler-Mac anders als
// im Produktions-Container (`TZ=UTC`, Dockerfile:122). Eine Assertion auf einen
// festen UTC-Instant wäre damit maschinenabhängig.
//
// Die App kennt das Problem und normalisiert: `exifWallClockToInstant`
// (`src/lib/utils/client/fileAnalysis.ts`) liest die **lokalen** Felder des
// belebten Datums — die tragen die Wanduhrzeit der Kamera verbatim — und
// verankert sie als deutsche Zeit; `splitDateTime` formatiert anschließend
// wieder in `Europe/Berlin`. Aus 10:30 Kamerazeit wird in JEDER Browser-Zone
// wieder 10:30 im Formularfeld. Genau das ist auch in
// `src/lib/utils/client/fileAnalysis.test.ts` festgehalten.
//
// `timezoneId` nagelt die Zone des Browser-Kontexts fest — das Ergebnis hängt
// damit nicht mehr an der Maschine. Und weil hier absichtlich eine FREMDE Zone
// steht, kann die Erwartung "10:30" nur grün werden, wenn die Normalisierung
// wirklich greift: Eine naive Implementierung läse unter America/New_York
// 14:30 (UTC-Felder) und fiele auf.
test.use({ timezoneId: 'America/New_York' });

/** Die Wanduhrzeit, die alle drei Testfotos im EXIF tragen (s. `fixtures/README.md`). */
const EXIF_DATE = '2025-08-15';
const EXIF_TIME = '10:30';

const fixture = (name: string): string =>
	fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

/**
 * Legt eine Datei in die Dropzone des Positions-Schritts.
 *
 * Das `<input type="file">` ist per `class="hidden"` unsichtbar
 * (`UnifiedDropzone.svelte`) — `setInputFiles` braucht keine Sichtbarkeit, ein
 * `click()` auf die Dropzone würde dagegen den nativen Dateidialog öffnen.
 * Eingegrenzt auf `photo-position-card`, damit der Selektor nicht versehentlich
 * die Medien-Dropzone aus Schritt 3 trifft.
 *
 * Seit PR 3 liegt die Dropzone in einer zugeklappten Disclosure. Das stört
 * `setInputFiles` nicht — der Input ist im DOM, nur nicht sichtbar, und
 * Sichtbarkeit braucht die Methode ohnehin nicht. Dass der Weg auch nach
 * echtem Aufklappen funktioniert, prüft ein eigener Test weiter unten.
 */
async function uploadPositionPhoto(page: Page, fileName: string): Promise<void> {
	const input = page.locator('[data-testid="photo-position-card"] input[type="file"]');
	// Die Dropzone erscheint erst, wenn `getUploadConfig()` beantwortet ist.
	await input.waitFor({ state: 'attached' });
	await input.setInputFiles(fixture(fileName));
}

/**
 * Klappt die Foto-Disclosure auf, falls sie noch zu ist.
 *
 * Nötig für jede Assertion auf `toBeVisible()` innerhalb der Disclosure: Der
 * Inhalt eines geschlossenen `<details>` hat keine Layout-Box und gilt damit
 * als unsichtbar. Idempotent, damit Tests den Helfer auch dann aufrufen können,
 * wenn sie vorher schon selbst aufgeklappt haben — ein zweiter Klick auf das
 * `<summary>` würde sonst wieder zuklappen.
 */
async function oeffnePhotoDisclosure(page: Page): Promise<void> {
	const disclosure = page.locator('[data-testid="photo-position-disclosure"]');
	if ((await disclosure.getAttribute('open')) === null) {
		await disclosure.locator('summary').click();
	}
	await expect(disclosure).toHaveAttribute('open', '');
}

/** Liest den Wert eines Koordinatenfeldes als Zahl (leer → NaN). */
async function coordinateValue(page: Page, id: 'latitude' | 'longitude'): Promise<number> {
	return Number(await page.locator(`#${id}`).inputValue());
}

/**
 * Wartet darauf, dass die Koordinatenfelder benutzbar sind.
 *
 * Seit dem 2026-07-31 stehen sie offen unter der Karte
 * (`collapsibleCoordinates={false}`, Wunsch des Deutschen Meeresmuseums) — es
 * gibt also nichts mehr aufzuklappen. Seit PR 3 gilt das auch für die Karte
 * selbst: Sie ist dauerhaft gemountet, die frühere Karten-Disclosure gibt es
 * nicht mehr.
 */
async function awaitCoordinateFields(page: Page): Promise<void> {
	await expect(page.locator('#latitude')).toBeVisible();
	await expect(page.locator('#longitude')).toBeVisible();
}

test.describe('PositionPanel — Foto-Upload mit EXIF', () => {
	test.beforeEach(async ({ page }) => {
		// Der echte Endpunkt schreibt in Storage UND Datenbank und unterliegt
		// einem Rate-Limit pro IP — bei parallelen Workern wäre das eine
		// Fehlerquelle ohne Aussagewert. Gemockt wird deshalb nur der Upload;
		// die EXIF-Auswertung, um die es hier geht, läuft vollständig im Browser
		// (`analyzeClientFile`) und bleibt unangetastet. Gleiches Vorgehen wie
		// bei `/api/sightings` in `form-submit.spec.ts`.
		await mockFileUploadSuccess(page);

		const formPage = new FormPage(page);
		await formPage.goto();
	});

	test('Zustand B: Foto mit GPS übernimmt Position, Datum und Uhrzeit', async ({ page }) => {
		await uploadPositionPhoto(page, 'photo-with-gps.jpg');

		// Der Marker erscheint, sobald `hasPosition` steht — erstes beobachtbares
		// Zeichen, dass Koordinaten im Formular angekommen sind. Vor PR 3 war es
		// das Aufklappen der Karten-Disclosure; die gibt es nicht mehr.
		await expect(page.locator('.ol-map-container')).toHaveAttribute('data-position', 'set', {
			timeout: 15000
		});

		await awaitCoordinateFields(page);

		// 54,31 N / 12,09 E laut EXIF. Toleranz, weil die GPS-Rationals des
		// Fixtures als 54.309999999999995 aufgelöst werden und die App auf vier
		// Nachkommastellen rundet (`applyExifPosition`).
		expect(await coordinateValue(page, 'latitude')).toBeCloseTo(54.31, 3);
		expect(await coordinateValue(page, 'longitude')).toBeCloseTo(12.09, 3);

		// Die Ostsee-Prüfung akzeptiert die Position.
		await expect(page.locator('[data-testid="verify-location-inside"]')).toBeVisible();

		// Datum und Uhrzeit aus demselben EXIF-Block. Siehe Zeitzonen-Notiz oben:
		// Der Wert ist die Kamera-Wanduhrzeit und in jeder Browser-Zone gleich.
		await expect(page.locator('[data-testid="field-sightingDate"]')).toHaveValue(EXIF_DATE);
		await expect(page.locator('[data-testid="field-sightingTime"]')).toHaveValue(EXIF_TIME);

		// `hasPosition` wurde mitgesetzt — sichtbar daran, dass das Fahrwasser
		// seine Pflicht verliert (`waterway.when('hasPosition', …)`).
		//
		// `BaseInput.svelte:65` setzt `'aria-required': required || undefined`,
		// das Attribut verschwindet also ganz statt auf "false" zu wechseln.
		// Gegenprobe im Startzustand: `form-position.spec.ts` erwartet dort
		// `aria-required="true"` — beide Tests zusammen decken beide Flanken ab.
		await expect
			.poll(() => page.locator('[data-testid="field-waterway"]').getAttribute('aria-required'))
			.toBeNull();

		// Ein Foto MIT GPS darf nie in Zustand C landen.
		await expect(page.locator('[data-testid="photo-no-gps"]')).toHaveCount(0);
	});

	test('Zustand C: Foto ohne GPS zeigt den Hinweis mit dem Ausweg', async ({ page }) => {
		await oeffnePhotoDisclosure(page);
		await uploadPositionPhoto(page, 'photo-without-gps.jpg');

		// Der Hinweis entsteht ausschließlich dadurch, dass `DropzoneEnhanced`
		// den Media-Store nach Abschluss der Auswertung BEDINGUNGSLOS neu
		// zuweist (`updateMediaFiles([...mediaStore.mediaFiles])`). Fällt diese
		// eine Zeile weg, bleibt `photoStatus` auf `'analyzing'` stehen und
		// dieser Block erscheint nie — die Unit-Tests merken davon nichts.
		const noGps = page.locator('[data-testid="photo-no-gps"]');
		await expect(noGps).toBeVisible({ timeout: 15000 });

		// Nur noch ein Ausweg: „Auf Karte wählen" ist mit PR 3 entfallen, weil die
		// Karte sichtbar darüber steht und der Button nichts mehr bewirkt hätte.
		await expect(page.locator('[data-testid="exit-to-map"]')).toHaveCount(0);
		await expect(page.locator('[data-testid="exit-to-description"]')).toBeVisible();

		// Ohne GPS ist die Aufnahmezeit das Einzige, was EXIF noch beisteuern
		// kann — sie MUSS übernommen werden. Vorher wurde sie in der Foto-Karte
		// angezeigt („Aufnahmezeit: 15.8.2025, 10:30:00"), aber nie ins Formular
		// geschrieben: Der Zweig dafür hing an `mediaFile.hasPosition()`. Der
		// Nutzer sah das richtige Datum und prüfte das Feld deshalb nicht mehr,
		// während dort weiter das heutige stand.
		await expect(page.locator('[data-testid="field-sightingDate"]')).toHaveValue(EXIF_DATE);
		await expect(page.locator('[data-testid="field-sightingTime"]')).toHaveValue(EXIF_TIME);
		await expect(page.locator('[data-testid="photo-datetime-applied"]')).toBeVisible();

		// Ohne GPS bleibt die Position leer: Die Karte zeigt keinen Marker, und
		// das Fahrwasser bleibt Pflichtfeld.
		await expect(page.locator('.ol-map-container')).toHaveAttribute('data-position', 'unset');
		await expect(page.locator('[data-testid="field-waterway"]')).toHaveAttribute(
			'aria-required',
			'true'
		);
	});

	test('Zustand C: die Karte steht bereits sichtbar über dem Hinweis', async ({ page }) => {
		await oeffnePhotoDisclosure(page);
		await uploadPositionPhoto(page, 'photo-without-gps.jpg');
		await expect(page.locator('[data-testid="photo-no-gps"]')).toBeVisible({ timeout: 15000 });

		// Der frühere Ausweg „Auf Karte wählen" führte in eine Disclosure, die es
		// nicht mehr gibt. Die Karte und die Koordinatenfelder liegen offen über
		// dem Hinweis — es gibt nichts mehr zu öffnen.
		await expect(page.locator('.ol-map-container')).toBeVisible();
		await expect(page.locator('#latitude')).toBeVisible();
	});

	test('Zustand C: „Seegebiet beschreiben" fokussiert das Fahrwasser-Feld', async ({ page }) => {
		await oeffnePhotoDisclosure(page);
		await uploadPositionPhoto(page, 'photo-without-gps.jpg');
		await expect(page.locator('[data-testid="photo-no-gps"]')).toBeVisible({ timeout: 15000 });

		await page.locator('[data-testid="exit-to-description"]').click();

		// `data-testid` sitzt am Input selbst (FieldRenderer.svelte:188), der
		// Fokus muss also dort landen und nicht auf dem Wrapper.
		await expect(page.locator('[data-testid="field-waterway"]')).toBeFocused();
		await expect(page.locator('[data-testid="location-description"]')).toBeVisible();
	});

	// ── PR 3: Der Foto-Weg liegt jetzt in einer zugeklappten Disclosure ───────
	//
	// Der Umbau verschiebt Dropzone, „kein GPS"-Zustand und UploadNotice in ein
	// <details>. Das ist die einzige Zusicherung, die dabei wirklich neu ist:
	// hinter der Disclosure funktioniert der EXIF-Pfad unverändert weiter.
	test('nach dem Aufklappen setzt ein Foto mit GPS weiterhin Koordinaten und hasPosition', async ({
		page
	}) => {
		await oeffnePhotoDisclosure(page);

		await uploadPositionPhoto(page, 'photo-with-gps.jpg');

		// `data-position` hängt an `hasPosition` — erstes beobachtbares Zeichen,
		// dass die EXIF-Auswertung durch ist und beide Werte im Formular stehen.
		await expect(page.locator('.ol-map-container')).toHaveAttribute('data-position', 'set', {
			timeout: 15000
		});

		expect(await coordinateValue(page, 'latitude')).toBeCloseTo(54.31, 3);
		expect(await coordinateValue(page, 'longitude')).toBeCloseTo(12.09, 3);

		// Gegenprobe auf `hasPosition` im Formular statt nur auf der Karte: Das
		// Fahrwasser verliert seine Pflicht (`waterway.when('hasPosition', …)`),
		// und `BaseInput.svelte:65` entfernt das Attribut dabei ganz.
		await expect
			.poll(() => page.locator('[data-testid="field-waterway"]').getAttribute('aria-required'))
			.toBeNull();
	});

	test('Foto mit GPS außerhalb der Ostsee löst die Bereichsprüfung aus', async ({ page }) => {
		await uploadPositionPhoto(page, 'photo-gps-outside-baltic.jpg');

		await expect(page.locator('.ol-map-container')).toHaveAttribute('data-position', 'set', {
			timeout: 15000
		});
		await awaitCoordinateFields(page);

		// 41,39 N / 2,17 E (Mittelmeer) — die Position wird übernommen, das ist
		// Absicht: Der Nutzer soll sehen, was im Foto stand, und korrigieren
		// können.
		expect(await coordinateValue(page, 'latitude')).toBeCloseTo(41.39, 3);
		expect(await coordinateValue(page, 'longitude')).toBeCloseTo(2.17, 3);

		// Barcelona liegt außerhalb der `BALTIC_SEA_BBOX` (9,4–30,2 E / 53–66 N)
		// und damit auch außerhalb des Kartenbereichs — `/api/geo/inBaltic`
		// liefert `inBaltic: false, inChartArea: false`.
		await expect(page.locator('[data-testid="verify-location-invalid"]')).toBeVisible();
		await expect(page.locator('[data-testid="verify-location-inside"]')).toHaveCount(0);
	});
});

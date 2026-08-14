# Einstiegsseite Meldeformular — Implementierungsplan

> **Überholt am 2026-08-07 (Auswahlmechanik):** Die Einstiegsseite ist keine
> Radiogruppe mit „Weiter" mehr, sondern zwei Link-Karten — jede Antwort ist
> eine Navigation mit eigener URL, keine Auswahl, die noch bestätigt werden
> müsste. Alles zur Radiogruppe, zum „Weiter"-Knopf und zum Fehlerzustand
> „nichts gewählt" in diesem Dokument beschreibt den damaligen, nicht den
> heutigen Stand. Zweig-Semantik, Query-Parameter-Vertrag und Fokus-Verhalten
> gelten unverändert. Begründung: `ReportKindChoice.svelte` und der
> `aria-disabled`-Abschnitt in `.claude/rules/design-system.md`.

> **Für agentische Ausführung:** ERFORDERLICHE SUB-SKILL:
> `superpowers:subagent-driven-development` (empfohlen) oder
> `superpowers:executing-plans`. Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** Vor dem vierstufigen Meldeformular eine Auswahlseite („Beobachtung eines
lebenden Tieres" / „Fund eines toten Tieres") einziehen, die Schritt-1-Texte an die
Auswahl hängen und Felder ausblenden, die zum gewählten Zweig nicht passen.

**Architektur:** Eine Route (`/`), ein Formular, zwei Zweige. Ein nullbarer `reportKind`
im `localStorage` unterscheidet „noch nicht gefragt" von „lebend" — was `isDead` als
Boolean mit Default `false` nicht kann. Die Feldsichtbarkeit läuft über **einen** Seam,
`getFormSteps(data)`, aus dem auch die Schritt-Validierung liest; ein `{#if}` im Markup
würde ein unsichtbares Feld weiter validieren lassen.

**Tech-Stack:** SvelteKit 5 (Runes), TypeScript, Yup, Vitest, Playwright, DaisyUI v5.

**Grundlage:** [docs/archive/PLAN_EINSTIEGSSEITE_MELDEFORMULAR_2026-08-05.md](PLAN_EINSTIEGSSEITE_MELDEFORMULAR_2026-08-05.md)
(Spezifikation, Fassung 2). Bei Widerspruch gilt die Spezifikation.

---

## Globale Rahmenbedingungen

- **Test-First ist Pflicht** (`.claude/rules/testing.md`). Jeder Task beginnt mit einem
  fehlschlagenden Test. Keine Ausnahme in diesem Plan.
- **Svelte 5 Runes**: `$state`, `$derived`, `$props`, `onclick` — kein `on:click`, kein
  `$app/stores`.
- **Kein globaler `$state` in `.ts`-Modulen** — leckt serverseitig zwischen Requests
  (`.claude/rules/architecture.md`).
- **Nutzertexte auf Deutsch, Sie-Anrede.**
- **Design-System**: Theme-Tokens statt Farben, `*-content` nur auf Vollton-Flächen,
  44 px Trefferfläche kommt zentral aus `app.css` — kein `min-h-11` an Aufrufstellen.
- **Felder werden nie aus Schema, Admin-Maske oder Legacy-API entfernt** — nur aus der
  Sichtbarkeit des Meldeformulars.
- **Der Legacy-Schreibpfad (`POST /rest_sichtungen`) wird nicht angefasst.**
- **Dateisuffix entscheidet die Testumgebung**: `*.test.ts` → Node, `*.svelte.test.ts` →
  Browser via Playwright.
- Commit-Format: `<type>(<scope>): <beschreibung>`, englisch, Subject lowercase.

---

## Feld-Sichtbarkeitsmatrix — zur Abnahme durch das Museum

Vier Kombinationen aus zwei Fragen: **lebend/tot** (Einstiegsseite) und **von Bord/von
Land** (`sightingFrom`, Schritt 2).

Legende: **✓** sichtbar · **—** ausgeblendet · **(b)** nur unter bestehender Bedingung ·
**P1/P2** in welchem PR die Ausblendung entsteht

### Schritt 1 — Position & Zeitpunkt

**Keine Feldänderung in irgendeiner Kombination.** Nur Texte ändern sich beim Totfund.

| Feld                           | lebend/Bord | lebend/Land | tot/Bord | tot/Land |
| ------------------------------ | :---------: | :---------: | :------: | :------: |
| `latitude`, `longitude`        |      ✓      |      ✓      |    ✓     |    ✓     |
| `waterway` (Ortsbeschreibung)  |      ✓      |      ✓      |    ✓     |    ✓     |
| `sightingDate`, `sightingTime` |      ✓      |      ✓      |    ✓     |    ✓     |

`hasPosition` ist im Meldeformular kein Bedienelement, sondern wird aus den Koordinaten
abgeleitet (`syncHasPosition` in `PositionPanel.svelte`).

**Textänderungen beim Totfund:** Kartentitel „Zeitpunkt der Sichtung" → „Funddatum";
Ostsee-Hinweis; „Wo haben Sie das Tier gesehen?" → „gefunden?"; Marker-Erklärung
„gesehen" → „gefunden".

### Schritt 2 — Angaben zum Tier

| Feld                                        | lebend/Bord | lebend/Land | tot/Bord | tot/Land |
| ------------------------------------------- | :---------: | :---------: | :------: | :------: |
| `mediaFile`, `mediaUpload`                  |      ✓      |      ✓      |    ✓     |    ✓     |
| ~~`mediaConsent`~~ — wandert nach Schritt 4 |  **— P3**   |  **— P3**   | **— P3** | **— P3** |
| `species` (Tierart)                         |      ✓      |      ✓      |    ✓     |    ✓     |
| `totalCount` (Anzahl Tiere)                 |      ✓      |      ✓      |    ✓     |    ✓     |
| `juvenileCount` (Jungtiere)                 |      ✓      |      ✓      |    ✓     |    ✓     |
| `distance` (Entfernung zum Tier)            |      ✓      |      ✓      |    ✓     |    ✓     |
| `sightingFrom` (Von wo beobachtet)          |      ✓      |      ✓      |    ✓     |    ✓     |
| `sightingFromText` (Sonstiger Ort)          |     (b)     |     (b)     |   (b)    |   (b)    |
| `boatDrive` (Bootsantrieb)                  |      ✓      |  **— P2**   |    ✓     | **— P2** |
| `isDead` (Schalter)                         |  **— P1**   |  **— P1**   | **— P1** | **— P1** |
| `deadCondition` (Zustand)                   |      —      |      —      |    ✓     |    ✓     |
| `deadSize` (Größe)                          |      —      |      —      |    ✓     |    ✓     |
| `deadPhoneContact` (DMM informiert)         |      —      |      —      |    ✓     |    ✓     |

`isDead` verschwindet als Bedienelement und wird durch die Rückmeldung „Sie melden: … ·
[Ändern]" ersetzt. In der **Admin-Maske bleibt der Schalter**.

### Schritt 3 — Weitere Informationen (optional)

| Feld                                     | lebend/Bord | lebend/Land | tot/Bord |  tot/Land   |
| ---------------------------------------- | :---------: | :---------: | :------: | :---------: |
| `behavior` (Verhalten)                   |      ✓      |      ✓      | **— P1** |  **— P1**   |
| `behaviorText` (Sonstiges Verhalten)     |     (b)     |     (b)     |    —     |      —      |
| `reaction` (Reaktion auf Ihr Boot)       |      ✓      |  **— P2**   | **— P1** | **— beide** |
| `shipCount` (Anzahl **anderer** Schiffe) |      ✓      |      ✓      |    ✓     |      ✓      |
| `seaState` (Seegang)                     |      ✓      |      ✓      |    ✓     |      ✓      |
| `visibility` (Sichtweite)                |      ✓      |      ✓      |    ✓     |      ✓      |
| `windForce` (Windstärke)                 |      ✓      |      ✓      |    ✓     |      ✓      |
| `shipName` (Schiffsname)                 |      ✓      |  **— P2**   |    ✓     |  **— P2**   |
| `homePort` (Heimathafen)                 |      ✓      |  **— P2**   |    ✓     |  **— P2**   |
| `boatType` (Art Ihres Wasserfahrzeugs)   |      ✓      |  **— P2**   |    ✓     |  **— P2**   |

**Kein Schritt wird in irgendeiner Kombination leer** — im knappsten Fall (tot/Land)
bleiben vier Felder: Anzahl anderer Schiffe, Seegang, Sichtweite, Windstärke. Der
Totfund-Weg behält damit **vier Schritte**.

Die Karte „Umweltbedingungen" enthält zusätzlich einen **automatischen Wetter-Abruf**, der
in allen vier Kombinationen anspringt und Daten liefert, die den Melder keinen Klick
kosten.

### Schritt 4 — Kontaktdaten

| Feld                                            | lebend/Bord | lebend/Land |  tot/Bord  |  tot/Land  |
| ----------------------------------------------- | :---------: | :---------: | :--------: | :--------: |
| `firstName`, `lastName`, `email`, `phone`       |      ✓      |      ✓      |     ✓      |     ✓      |
| `nameConsent` (Name veröffentlichen)            |      ✓      |      ✓      |     ✓      |     ✓      |
| `shipNameConsent` (Schiffsname veröffentlichen) |      ✓      |  **— P2**   |     ✓      |  **— P2**  |
| **`mediaConsent`** (Aufnahmen veröffentlichen)  | **P3 (b)**  | **P3 (b)**  | **P3 (b)** | **P3 (b)** |
| `notes` (Anmerkungen)                           |      ✓      |      ✓      |     ✓      |     ✓      |
| `privacyConsent`, `persistentDataConsent`       |      ✓      |      ✓      |     ✓      |     ✓      |

**Alle vier Einwilligungen mit Nachweisspalten stehen damit auf Schritt 4** —
`nameConsent`, `shipNameConsent`, `mediaConsent`, `privacyConsent` tragen jeweils
`…_am` und `…_version` in der Datenbank (`schema.ts:76–107`). `persistentDataConsent`
steht dort ohnehin.

**(b) bei `mediaConsent` ist neu und nicht verhandelbar:** Das Feld erscheint nur, wenn
tatsächlich eine Aufnahme hochgeladen wurde — siehe D3.

### Drei Punkte zur Diskussion — beim Review aufgefallen

**D1 — `shipNameConsent` hängt heute an nichts.** Die Frage „Darf der Schiffsname
veröffentlicht werden?" steht auf Schritt 4 **unbedingt** im Formular. Wird `shipName` für
Land-Melder ausgeblendet (P2), fragt Schritt 4 weiterhin nach der Freigabe für einen
Schiffsnamen, den nie jemand erhoben hat. Das ist eine Einwilligung ohne Bezugsgegenstand.
**Der Plan blendet sie mit aus** (Task 11). Falls das Museum das anders will, ist Task 11
die einzige betroffene Stelle.

**D2 — Die Karte „Boot-/Schiffsinformationen" bleibt für Land-Melder mit einem einzigen
Feld zurück.** Übrig bliebe „Anzahl anderer Schiffe in näherer Umgebung" — eine Karte mit
Bootstitel, die nach _fremden_ Booten fragt. Drei Auswege:

1. `shipCount` wandert für alle in die Karte „Umweltbedingungen" (es ist fachlich ein
   Störungskontext, kein Angabe zum eigenen Boot). **Empfehlung.**
2. Der Kartentitel wird für Land-Melder umgeschrieben.
3. Alles bleibt, die Karte trägt bei Land eben nur ein Feld.

**Der Plan setzt Variante 1 um (Task 12).** Sie ist die einzige, die das Feld dort
einordnet, wo es fachlich hingehört, und sie verbessert die Karte auch für Bord-Melder.
Falls das Museum widerspricht, ist Task 12 ersatzlos streichbar — die übrigen Tasks hängen
nicht daran.

**D3 — `mediaConsent` zieht nach Schritt 4, und das erzeugt D1 ein zweites Mal.** Alle
Einwilligungen an einer Stelle zu bündeln ist stimmig: `mediaConsent` gehört zur
Vierergruppe mit Nachweisspalten (`medien_einwilligung_am`/`_version`), und es gatet den
Upload nicht (`.default(false)`, keine Pflicht). Der Umzug ist technisch unkritisch — aber
er bringt zwei Folgen mit, die mitgelöst werden müssen:

1. **Eine Einwilligung ohne Gegenstand.** Wer keine Aufnahme hochlädt, bekäme auf
   Schritt 4 die Frage „Dürfen wir Ihre Aufnahmen veröffentlichen?" für Aufnahmen, die es
   nicht gibt — dieselbe Fehlerklasse wie `shipNameConsent` in D1. **Der Plan macht das
   Feld deshalb abhängig davon, dass eine Aufnahme vorliegt** (Task 14).
2. **Ein Nachweis für nichts.** `mapFormToSighting` stempelt `mediaConsentAt` und
   `mediaConsentVersion`, sobald `formData.mediaConsent` wahr ist
   ([mapFormToSighting.ts:342–344](../../src/lib/server/db/mapFormToSighting.ts)). Wer
   zustimmt und die Datei danach wieder entfernt, erzeugt einen datierten,
   versionierten Einwilligungsnachweis ohne Bezugsgegenstand. **Der Plan leert
   `mediaConsent` beim Entfernen der letzten Aufnahme** (Task 15).

**Der Preis, den Sie kennen sollten:** Eine Einwilligung ist am aussagekräftigsten dort,
wo die Daten erhoben werden. „Dürfen wir das veröffentlichen?" direkt unter dem
Upload-Feld ist informierter als dieselbe Frage zwei Schritte später. Die
Fassungskennung bleibt gültig (der Wortlaut ändert sich nicht, nur der Ort), und
`persistentDataConsent` steht bereits heute weit weg von dem, worauf es sich bezieht —
der Umzug ist also kein Sonderfall. Ich halte den Gewinn an Übersicht für größer als den
Verlust an Nähe, wollte den Tausch aber benannt haben.

---

## Dateien

### Neu

| Datei                                                       | Verantwortung                                                                                               |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/lib/report/reportKind.ts`                              | Reine Zustandslogik: lesen, schreiben, Migration, Query-Parameter auflösen. Kein `$state`, in Node testbar. |
| `src/lib/report/reportKind.test.ts`                         | Tests dazu                                                                                                  |
| `src/lib/report/components/ReportKindChoice.svelte`         | Die Auswahlseite (Radiogruppe + „Weiter")                                                                   |
| `src/lib/report/components/ReportKindChoice.svelte.test.ts` | Browser-Test dazu                                                                                           |
| `e2e/report-kind-choice.spec.ts`                            | E2E für Auswahl, Direktlink, Browser-Zurück                                                                 |

### Geändert

| Datei                                                          | Was                                          |
| -------------------------------------------------------------- | -------------------------------------------- |
| `src/lib/storage/localStorage.ts`                              | `REPORT_KIND` zu `STORAGE_KEYS`              |
| `src/lib/report/formConfig.ts`                                 | `formStepsConfig` → `getFormSteps(data)`     |
| `src/lib/form/validation/stepValidation.ts`                    | liest aus `getFormSteps(data)`               |
| `src/lib/report/components/ModernReportForm.svelte`            | vier Aufrufstellen, Wechsel-Logik            |
| `src/lib/report/components/form/StepNavigation.svelte`         | fünf Aufrufstellen                           |
| `src/lib/report/components/form/RequiredConsent.svelte`        | zwei Aufrufstellen                           |
| `src/routes/+page.svelte`                                      | Verzweigung Auswahlseite/Formular, History   |
| `src/lib/report/wording.ts`                                    | vier neue Textfunktionen                     |
| `src/lib/report/components/sections/DateTime.svelte`           | Titel + Einleitung aus `wording`             |
| `src/lib/report/components/form/position/PositionPanel.svelte` | Frage aus `wording`, `mapHint` an `OLMap`    |
| `src/lib/report/components/form/VerifyLocation.svelte`         | Ostsee-Hinweis aus `wording`, Alert-Variante |
| `src/lib/components/map/OLMap.svelte`                          | `mapHint` als optionales Prop                |
| `src/lib/report/components/sections/AnimalInfo.svelte`         | Schalter → Rückmeldung, `adminMode`-Fall     |
| `src/lib/report/components/sections/Environment.svelte`        | `shipCount` aufnehmen (Task 12)              |
| `src/lib/report/components/sections/BoatInfo.svelte`           | `shipCount` abgeben (Task 12)                |
| `src/lib/report/components/sections/Media.svelte`              | `mediaConsent` abgeben (Task 14)             |
| `src/lib/report/components/steps/Step4Contact.svelte`          | `mediaConsent` aufnehmen (Task 14)           |
| `e2e/pages/FormPage.ts`                                        | `goto()` mit Zweig-Parameter                 |
| 6 E2E-Specs mit direktem `page.goto('/')`                      | Parameter anhängen                           |

---

# PR 1 — Einstiegsseite

## Task 1: Zustandslogik `reportKind`

**Dateien:**

- Erstellen: `src/lib/report/reportKind.ts`
- Erstellen: `src/lib/report/reportKind.test.ts`
- Ändern: `src/lib/storage/localStorage.ts:41-49`

**Schnittstellen:**

- Konsumiert: `STORAGE_KEYS`, `loadFromStorage`, `saveToStorage` aus `$lib/storage/localStorage`
- Produziert:
  - `type ReportKind = 'alive' | 'dead'`
  - `resolveReportKind(param: string | null, stored: ReportKind | null, savedIsDead: boolean | null): ReportKind | null`
  - `readReportKind(): ReportKind | null`
  - `writeReportKind(kind: ReportKind): void`
  - `clearReportKind(): void`
  - `reportKindToIsDead(kind: ReportKind): boolean`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

`src/lib/report/reportKind.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveReportKind, reportKindToIsDead } from './reportKind';

describe('resolveReportKind', () => {
	it('liefert null, wenn nichts bekannt ist — die Auswahlseite muss erscheinen', () => {
		expect(resolveReportKind(null, null, null)).toBeNull();
	});

	it('nimmt den gespeicherten Zweig, wenn kein Parameter gesetzt ist', () => {
		expect(resolveReportKind(null, 'dead', null)).toBe('dead');
	});

	it('leitet den Zweig aus gespeichertem isDead ab, wenn reportKind fehlt (Migration)', () => {
		// Beim Deploy sitzen Nutzer mitten im Formular. Ohne diese Ableitung
		// würden sie auf die Auswahlseite zurückgeworfen.
		expect(resolveReportKind(null, null, false)).toBe('alive');
		expect(resolveReportKind(null, null, true)).toBe('dead');
	});

	it('lässt den Query-Parameter gegen den gespeicherten Zweig gewinnen', () => {
		expect(resolveReportKind('totfund', 'alive', null)).toBe('dead');
		expect(resolveReportKind('lebend', 'dead', null)).toBe('alive');
	});

	it('ignoriert einen unbekannten Parameterwert', () => {
		expect(resolveReportKind('bloedsinn', 'alive', null)).toBe('alive');
		expect(resolveReportKind('bloedsinn', null, null)).toBeNull();
	});
});

describe('reportKindToIsDead', () => {
	it('bildet die zwei Zweige auf isDead ab', () => {
		expect(reportKindToIsDead('alive')).toBe(false);
		expect(reportKindToIsDead('dead')).toBe(true);
	});
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag prüfen**

Befehl: `npx vitest run src/lib/report/reportKind.test.ts`
Erwartet: FAIL — `Failed to resolve import "./reportKind"`

- [ ] **Schritt 3: `STORAGE_KEYS` erweitern**

`src/lib/storage/localStorage.ts`, im `STORAGE_KEYS`-Objekt hinter `FORM_DATA` ergänzen:

```ts
	// 'alive' | 'dead'. Fehlt der Schlüssel, wurde die Frage noch nie gestellt —
	// `isDead` kann das nicht ausdrücken, weil es als Boolean auf `false` steht.
	REPORT_KIND: 'sichtungen_report_kind',
```

- [ ] **Schritt 4: Minimale Implementierung**

`src/lib/report/reportKind.ts`:

```ts
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '$lib/storage/localStorage';

/** Die zwei Zweige des Meldeformulars. */
export type ReportKind = 'alive' | 'dead';

/**
 * Der Query-Parameter ist bewusst deutsch: Er steht in Links, die das Museum
 * selbst setzt und liest.
 */
const PARAM_TO_KIND: Record<string, ReportKind> = {
	lebend: 'alive',
	totfund: 'dead'
};

export function reportKindToIsDead(kind: ReportKind): boolean {
	return kind === 'dead';
}

/**
 * Entscheidet, welcher Zweig gilt — und ob die Auswahlseite überhaupt erscheint.
 *
 * Rein und ohne Browser-Zugriff, damit die Zustandsmaschine inklusive
 * Migrationspfad in Node testbar bleibt.
 *
 * @param param     Wert von `?meldung=` oder null
 * @param stored    Zuvor gespeicherter Zweig oder null
 * @param savedIsDead `isDead` aus gespeicherten Formulardaten oder null.
 *                  Nur für den Altbestand relevant: Wer beim Deploy mitten im
 *                  Formular sitzt, hat noch kein `reportKind` — sein Zweig wird
 *                  aus `isDead` abgeleitet, statt ihn zurückzuwerfen.
 * @returns Der geltende Zweig, oder null wenn die Auswahlseite erscheinen muss.
 */
export function resolveReportKind(
	param: string | null,
	stored: ReportKind | null,
	savedIsDead: boolean | null
): ReportKind | null {
	const fromParam = param ? PARAM_TO_KIND[param] : undefined;
	if (fromParam) {
		return fromParam;
	}
	if (stored) {
		return stored;
	}
	if (savedIsDead !== null) {
		return savedIsDead ? 'dead' : 'alive';
	}
	return null;
}

export function readReportKind(): ReportKind | null {
	return loadFromStorage<ReportKind | null>(STORAGE_KEYS.REPORT_KIND, null);
}

export function writeReportKind(kind: ReportKind): void {
	saveToStorage(STORAGE_KEYS.REPORT_KIND, kind);
}

export function clearReportKind(): void {
	saveToStorage(STORAGE_KEYS.REPORT_KIND, null);
}
```

- [ ] **Schritt 5: Test laufen lassen, Erfolg prüfen**

Befehl: `npx vitest run src/lib/report/reportKind.test.ts`
Erwartet: PASS, 6 Tests

- [ ] **Schritt 6: Commit**

```bash
git add src/lib/report/reportKind.ts src/lib/report/reportKind.test.ts src/lib/storage/localStorage.ts
git commit -m "feat(report): add report-kind state with migration from stored isDead"
```

---

## Task 2: Der Seam — `getFormSteps()`

**Dateien:**

- Ändern: `src/lib/report/formConfig.ts:49`
- Ändern: `src/lib/report/formConfig.test.ts`

**Schnittstellen:**

- Konsumiert: `FormStep` aus `$lib/types`, `SightingFormData`
- Produziert: `getFormSteps(data: FormStepsInput): FormStep[]` mit
  `type FormStepsInput = { isDead?: boolean | number | string | null; sightingFrom?: number | null }`

> `formStepsConfig` bleibt als Export bestehen und entspricht
> `getFormSteps({ isDead: false })`. Grund: Die Admin-Maske und Tests, die den
> Vollbestand erwarten, sollen sich nicht ändern.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

An `src/lib/report/formConfig.test.ts` anhängen:

```ts
import { getFormSteps } from './formConfig';

describe('getFormSteps', () => {
	const fieldsOf = (steps: ReturnType<typeof getFormSteps>) => steps.flatMap((s) => s.fields);

	it('behält für den Lebend-Zweig alle bisherigen Felder', () => {
		const fields = fieldsOf(getFormSteps({ isDead: false }));
		expect(fields).toContain('behavior');
		expect(fields).toContain('behaviorText');
		expect(fields).toContain('reaction');
	});

	it('entfernt beim Totfund genau die drei Verhaltensfelder', () => {
		const fields = fieldsOf(getFormSteps({ isDead: true }));
		expect(fields).not.toContain('behavior');
		expect(fields).not.toContain('behaviorText');
		expect(fields).not.toContain('reaction');
	});

	it('lässt beim Totfund Wetter, Anzahl anderer Schiffe und Entfernung stehen', () => {
		// Achse C der Spezifikation: Diese Felder hängen nicht am Zustand des
		// Tieres. `shipCount` fragt nach ANDEREN Schiffen, `distance` ist auch
		// vom Strand aus sinnvoll.
		const fields = fieldsOf(getFormSteps({ isDead: true }));
		expect(fields).toEqual(
			expect.arrayContaining(['seaState', 'visibility', 'windForce', 'shipCount', 'distance'])
		);
	});

	it('behält in beiden Zweigen vier Schritte — kein Schritt wird leer', () => {
		for (const isDead of [false, true]) {
			const steps = getFormSteps({ isDead });
			expect(steps).toHaveLength(4);
			for (const step of steps) {
				expect(step.fields.length).toBeGreaterThan(0);
			}
		}
	});

	it('nimmt isDead auch als Zahl oder String entgegen', () => {
		// Aus dem localStorage und der Legacy-API kommt `isDead` nicht immer als
		// Boolean zurück.
		expect(fieldsOf(getFormSteps({ isDead: 1 }))).not.toContain('behavior');
		expect(fieldsOf(getFormSteps({ isDead: '1' }))).not.toContain('behavior');
		expect(fieldsOf(getFormSteps({ isDead: 0 }))).toContain('behavior');
	});
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag prüfen**

Befehl: `npx vitest run src/lib/report/formConfig.test.ts`
Erwartet: FAIL — `getFormSteps is not a function`

- [ ] **Schritt 3: Implementierung**

In `src/lib/report/formConfig.ts`, **nach** der `formStepsConfig`-Definition ergänzen:

```ts
/**
 * Eingabe für `getFormSteps`. Bewusst das Formularobjekt statt einzelner Flags:
 * Kommt eine dritte Bedingung dazu, ändert sich die Signatur nicht mehr.
 */
export type FormStepsInput = {
	isDead?: boolean | number | string | null;
	sightingFrom?: number | string | null;
};

/**
 * Normalisiert `isDead` aus allen Quellen, in denen es auftaucht: Boolean aus dem
 * Formular, `0`/`1` aus der Datenbank, String aus dem localStorage.
 * Gleiche Regel wie `isDeadFinding` in `wording.ts`.
 */
function isDeadFinding(value: FormStepsInput['isDead']): boolean {
	return value === true || value === 1 || value === '1' || value === 'true';
}

/**
 * Felder, die beim Totfund entfallen. Ein totes Tier zeigt kein Verhalten und
 * reagiert nicht — die Angaben wären für den Melder unbeantwortbar.
 *
 * WICHTIG: Die Ausblendung gehört hierher und NICHT in ein `{#if}` im Markup.
 * `stepValidation` liest seine Feldliste aus dieser Funktion; ein nur optisch
 * verstecktes Feld würde weiter validiert, und der Melder säße in einer
 * Sackgasse ohne sichtbare Fehlermeldung.
 */
const HIDDEN_WHEN_DEAD = ['behavior', 'behaviorText', 'reaction'] as const;

export function getFormSteps(data: FormStepsInput): FormStep[] {
	const hidden = new Set<string>();
	if (isDeadFinding(data.isDead)) {
		HIDDEN_WHEN_DEAD.forEach((field) => hidden.add(field));
	}

	if (hidden.size === 0) {
		return formStepsConfig;
	}

	return formStepsConfig.map((step) => ({
		...step,
		fields: step.fields.filter((field) => !hidden.has(field))
	}));
}
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg prüfen**

Befehl: `npx vitest run src/lib/report/formConfig.test.ts`
Erwartet: PASS, alle bisherigen Tests weiterhin grün

- [ ] **Schritt 5: Commit**

```bash
git add src/lib/report/formConfig.ts src/lib/report/formConfig.test.ts
git commit -m "feat(report): derive form steps from the report branch"
```

---

## Task 3: Schritt-Validierung an den Seam hängen

**Dateien:**

- Ändern: `src/lib/form/validation/stepValidation.ts:2,21,52`
- Ändern: `src/lib/form/validation/stepValidation.test.ts`

**Schnittstellen:**

- Konsumiert: `getFormSteps` aus Task 2
- Produziert: unveränderte Signaturen `validateStep(step, data)` und `isStepValid(step, data)`
  — `isDead` kommt aus dem bereits übergebenen `data`, kein drittes Argument.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

An `src/lib/form/validation/stepValidation.test.ts` anhängen:

```ts
describe('stepValidation im Totfund-Zweig', () => {
	it('validiert ausgeblendete Felder nicht mehr', async () => {
		// Der wichtigste Test des Vorhabens: Würde `behavior` weiter validiert,
		// säße der Melder in einer Sackgasse — das Feld ist nicht sichtbar, der
		// Fehler nicht behebbar.
		const schrittMitVerhalten = 2; // 0-basiert: „Weitere Informationen"
		const daten = { isDead: true, behavior: undefined, behaviorText: undefined };

		const ergebnis = await validateStep(schrittMitVerhalten, daten);

		expect(Object.keys(ergebnis.errors ?? {})).not.toContain('behavior');
		expect(Object.keys(ergebnis.errors ?? {})).not.toContain('reaction');
	});
});
```

> **Hinweis für die Umsetzung:** Die genaue Form von `ergebnis` (`{ errors }` vs.
> `Record<string,string>`) aus der bestehenden Datei übernehmen — die vorhandenen Tests in
> derselben Datei zeigen sie. Den Test daran anpassen, **nicht** die Produktionssignatur.

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag prüfen**

Befehl: `npx vitest run src/lib/form/validation/stepValidation.test.ts`
Erwartet: FAIL, solange `stepValidation` noch die statische Konstante liest

- [ ] **Schritt 3: Implementierung**

In `src/lib/form/validation/stepValidation.ts` den Import umstellen und jede Verwendung von
`formStepsConfig[step].fields` ersetzen durch `getFormSteps(data)[step].fields`:

```ts
import { getFormSteps } from '$lib/report/formConfig';
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg prüfen**

Befehl: `npx vitest run src/lib/form/validation/stepValidation.test.ts`
Erwartet: PASS

- [ ] **Schritt 5: Volle Unit-Suite gegen Regressionen**

Befehl: `npm run test:unit`
Erwartet: PASS

- [ ] **Schritt 6: Commit**

```bash
git add src/lib/form/validation/stepValidation.ts src/lib/form/validation/stepValidation.test.ts
git commit -m "fix(report): stop validating fields the branch hides"
```

---

## Task 4: Die Auswahlseite

**Dateien:**

- Erstellen: `src/lib/report/components/ReportKindChoice.svelte`
- Erstellen: `src/lib/report/components/ReportKindChoice.svelte.test.ts`

**Schnittstellen:**

- Konsumiert: `ReportKind` aus Task 1
- Produziert: Komponente mit `{ onchoose: (kind: ReportKind) => void }`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

`src/lib/report/components/ReportKindChoice.svelte.test.ts`:

```ts
import { render } from 'vitest-browser-svelte';
import { describe, expect, it, vi } from 'vitest';
import ReportKindChoice from './ReportKindChoice.svelte';

describe('ReportKindChoice', () => {
	it('stellt die Frage als Radiogruppe, nicht als zwei lose Buttons', async () => {
		const screen = render(ReportKindChoice, { onchoose: vi.fn() });
		const gruppe = screen.getByRole('radiogroup', { name: /Was möchten Sie melden/i });
		await expect.element(gruppe).toBeInTheDocument();
	});

	it('bietet beide Zweige an, lebendes Tier zuerst', async () => {
		const screen = render(ReportKindChoice, { onchoose: vi.fn() });
		await expect
			.element(screen.getByRole('radio', { name: /lebenden Tieres/i }))
			.toBeInTheDocument();
		await expect.element(screen.getByRole('radio', { name: /toten Tieres/i })).toBeInTheDocument();
	});

	it('meldet erst beim Bestätigen, nicht schon beim Auswählen', async () => {
		// Kein Auto-Advance: Wer per Pfeiltaste durch eine Radiogruppe geht,
		// wählt zwangsläufig die erste Option aus und würde sonst ungewollt
		// weitergeschickt (WCAG 3.2.2).
		const onchoose = vi.fn();
		const screen = render(ReportKindChoice, { onchoose });

		await screen.getByRole('radio', { name: /toten Tieres/i }).click();
		expect(onchoose).not.toHaveBeenCalled();

		await screen.getByRole('button', { name: /Weiter/i }).click();
		expect(onchoose).toHaveBeenCalledWith('dead');
	});

	it('lässt sich nicht ohne Auswahl bestätigen', async () => {
		const onchoose = vi.fn();
		const screen = render(ReportKindChoice, { onchoose });
		await screen.getByRole('button', { name: /Weiter/i }).click({ force: true });
		expect(onchoose).not.toHaveBeenCalled();
	});
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag prüfen**

Befehl: `npx vitest run --project client src/lib/report/components/ReportKindChoice.svelte.test.ts`
Erwartet: FAIL — Komponente existiert nicht

- [ ] **Schritt 3: Implementierung**

`src/lib/report/components/ReportKindChoice.svelte`:

```svelte
<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { ReportKind } from '$lib/report/reportKind';

	let { onchoose }: { onchoose: (kind: ReportKind) => void } = $props();

	let selected = $state<ReportKind | null>(null);

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!selected) return;
		onchoose(selected);
	}

	const OPTIONS: Array<{ value: ReportKind; label: string; hint: string; icon: string }> = [
		{
			value: 'alive',
			label: 'Beobachtung eines lebenden Tieres',
			hint: 'Sie haben ein Tier im Wasser oder an Land gesehen.',
			icon: 'custom:porpoise'
		},
		{
			value: 'dead',
			label: 'Fund eines toten Tieres',
			hint: 'Sie haben ein totes Tier gefunden, meist an einem Strand oder Küstenabschnitt.',
			icon: 'lucide:triangle-alert'
		}
	];
</script>

<form class="mx-auto max-w-2xl px-4 py-8" onsubmit={submit} data-testid="report-kind-choice">
	<h1 class="text-title mb-2">Meerestier melden</h1>
	<!-- Beantwortet die naheliegende Frage „warum werde ich das gefragt?" genau
	     dort, wo sie anfällt — das ist die Begründung für den zusätzlichen Klick. -->
	<p class="text-base-content/70 mb-6">Damit wir Ihnen die passenden Fragen stellen können.</p>

	<!-- role="radiogroup" überschreibt die implizite Rolle `group` des fieldset:
	     nur so sagt ein Screenreader „1 von 2" an und verknüpft die Legend mit
	     den Optionen. Gleiche Mechanik wie in FieldRenderer.svelte. -->
	<fieldset role="radiogroup" aria-labelledby="report-kind-legend" aria-required="true">
		<legend id="report-kind-legend" class="text-section mb-3">Was möchten Sie melden?</legend>

		<div class="flex flex-col gap-3">
			{#each OPTIONS as option (option.value)}
				<label
					class="border-base-300 hover:bg-base-200 rounded-box flex cursor-pointer items-start gap-3 border p-4"
				>
					<input
						type="radio"
						name="reportKind"
						class="radio radio-primary mt-1"
						value={option.value}
						checked={selected === option.value}
						onchange={() => (selected = option.value)}
					/>
					<span class="flex flex-col gap-1">
						<span class="flex items-center gap-2 font-medium">
							<Icon icon={option.icon} width="20" aria-hidden="true" />
							{option.label}
						</span>
						<span class="text-base-content/70 text-support">{option.hint}</span>
					</span>
				</label>
			{/each}
		</div>
	</fieldset>

	<!-- aria-disabled statt disabled: Die Schaltfläche bleibt fokussierbar, der
	     Tastaturfokus geht beim Sperren nicht verloren. Die Sperre trägt der
	     Wächter in `submit`. -->
	<button
		type="submit"
		class="btn btn-primary mt-6 w-full"
		aria-disabled={selected === null}
		data-testid="report-kind-submit"
	>
		Weiter
	</button>
</form>
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg prüfen**

Befehl: `npx vitest run --project client src/lib/report/components/ReportKindChoice.svelte.test.ts`
Erwartet: PASS, 4 Tests

- [ ] **Schritt 5: Svelte-Check**

Befehl: `npm run check`
Erwartet: keine neuen Fehler oder a11y-Warnungen

- [ ] **Schritt 6: Commit**

```bash
git add src/lib/report/components/ReportKindChoice.svelte src/lib/report/components/ReportKindChoice.svelte.test.ts
git commit -m "feat(report): add the report-kind choice screen"
```

---

## Task 5: Verzweigung auf `/` samt Browser-Zurück

**Dateien:**

- Ändern: `src/routes/+page.svelte`

**Schnittstellen:**

- Konsumiert: `ReportKindChoice` (Task 4), `resolveReportKind`/`writeReportKind`/
  `reportKindToIsDead` (Task 1)
- Produziert: nichts für spätere Tasks

- [ ] **Schritt 1: Fehlschlagenden E2E-Test schreiben**

`e2e/report-kind-choice.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test.describe('Einstiegsseite des Meldeformulars', () => {
	test('Erstbesucher sieht die Auswahl und kommt ohne sie nicht weiter', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByTestId('report-kind-choice')).toBeVisible();
		await expect(page.getByTestId('report-kind-submit')).toHaveAttribute('aria-disabled', 'true');
	});

	test('nach der Auswahl erscheint Schritt 1', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('radio', { name: /toten Tieres/i }).check();
		await page.getByTestId('report-kind-submit').click();
		await expect(page.getByTestId('report-kind-choice')).toBeHidden();
	});

	test('der Direktlink überspringt die Auswahl', async ({ page }) => {
		await page.goto('/?meldung=totfund');
		await expect(page.getByTestId('report-kind-choice')).toBeHidden();
	});

	test('Browser-Zurück führt auf die Auswahl, nicht aus der App', async ({ page }) => {
		// Ohne History-Eintrag verließe „Zurück" die Anwendung — im iframe
		// navigiert das die Museumsseite weg.
		await page.goto('/');
		await page.getByRole('radio', { name: /lebenden Tieres/i }).check();
		await page.getByTestId('report-kind-submit').click();
		await expect(page.getByTestId('report-kind-choice')).toBeHidden();

		await page.goBack();
		await expect(page.getByTestId('report-kind-choice')).toBeVisible();
	});

	test('Wiederkehrer mit gespeichertem Stand wird nicht erneut gefragt', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('radio', { name: /lebenden Tieres/i }).check();
		await page.getByTestId('report-kind-submit').click();
		await page.reload();
		await expect(page.getByTestId('report-kind-choice')).toBeHidden();
	});
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag prüfen**

Befehl: `npx playwright test e2e/report-kind-choice.spec.ts`
Erwartet: FAIL — `report-kind-choice` nicht gefunden

> **Achtung:** E2E-Läufe nicht parallel zu einer zweiten Suite in einem anderen Worktree
> fahren; das erzeugt bis zu 138 Fehlschläge als reine Lastartefakte.

- [ ] **Schritt 3: Implementierung**

In `src/routes/+page.svelte`:

```svelte
<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { pushState } from '$app/navigation';
	import ModernReportForm from '$lib/report/components/ModernReportForm.svelte';
	import ReportKindChoice from '$lib/report/components/ReportKindChoice.svelte';
	import {
		readReportKind,
		reportKindToIsDead,
		resolveReportKind,
		writeReportKind,
		type ReportKind
	} from '$lib/report/reportKind';
	import { loadFromStorage, STORAGE_KEYS } from '$lib/storage/localStorage';

	// Komponenten-lokal, NICHT als globaler $state in einem .ts-Modul: dort
	// leckt er auf dem Server zwischen Requests.
	let reportKind = $state<ReportKind | null>(
		browser
			? resolveReportKind(
					page.url.searchParams.get('meldung'),
					readReportKind(),
					(loadFromStorage(STORAGE_KEYS.FORM_DATA, null) as { isDead?: boolean } | null)?.isDead ??
						null
				)
			: null
	);

	function choose(kind: ReportKind) {
		reportKind = kind;
		writeReportKind(kind);
		// History-Eintrag, damit „Zurück" auf die Auswahl führt statt aus der App.
		pushState(`/?meldung=${kind === 'dead' ? 'totfund' : 'lebend'}`, {});
	}

	// Der Nutzer navigiert mit „Zurück" auf einen Stand ohne Parameter — dann
	// gehört die Auswahl wieder gezeigt.
	$effect(() => {
		if (!browser) return;
		if (!page.url.searchParams.get('meldung') && page.state && reportKind !== null) {
			reportKind = null;
		}
	});
</script>

{#if reportKind === null}
	<ReportKindChoice onchoose={choose} />
{:else}
	<ModernReportForm initialIsDead={reportKindToIsDead(reportKind)} />
{/if}
```

> **Umsetzungshinweis:** Der `$effect` für den Zurück-Fall ist der fragilste Teil dieses
> Tasks. Wenn er sich mit SvelteKits `pushState`-Semantik beißt, ist die Alternative, den
> Zurück-Fall über `page.url.searchParams` allein zu fahren (Auswahl gilt genau dann als
> getroffen, wenn der Parameter gesetzt ist) und `writeReportKind` nur fürs
> Wiederkehrer-Verhalten zu nutzen. Der E2E-Test aus Schritt 1 ist in beiden Fällen die
> Abnahme.

- [ ] **Schritt 4: `ModernReportForm` um `initialIsDead` erweitern**

In `src/lib/report/components/ModernReportForm.svelte` das Prop entgegennehmen und beim
Initialisieren der Formulardaten anwenden — es überschreibt `isDead` nur, wenn keine
gespeicherten Formulardaten vorliegen oder der Zweig sich geändert hat.

- [ ] **Schritt 5: Test laufen lassen, Erfolg prüfen**

Befehl: `npx playwright test e2e/report-kind-choice.spec.ts`
Erwartet: PASS, 5 Tests

- [ ] **Schritt 6: Commit**

```bash
git add src/routes/+page.svelte src/lib/report/components/ModernReportForm.svelte e2e/report-kind-choice.spec.ts
git commit -m "feat(report): show the kind choice before the form"
```

---

## Task 6: Texte an den Zweig hängen

**Dateien:**

- Ändern: `src/lib/report/wording.ts`, `src/lib/report/wording.test.ts`
- Ändern: `src/lib/report/components/sections/DateTime.svelte`
- Ändern: `src/lib/report/components/form/position/PositionPanel.svelte`
- Ändern: `src/lib/report/components/form/VerifyLocation.svelte`
- Ändern: `src/lib/components/map/OLMap.svelte`

**Schnittstellen:**

- Produziert: `dateSectionTitle(isDead)`, `dateSectionIntro(isDead)`,
  `positionQuestion(isDead)`, `mapHint(isDead, hasPosition, enableGPS)`,
  `outsideBalticNotice(isDead)`, `outsideBalticSeverity(isDead): 'warning' | 'info'`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

An `src/lib/report/wording.test.ts` anhängen:

```ts
import {
	dateSectionTitle,
	dateSectionIntro,
	positionQuestion,
	mapHint,
	outsideBalticNotice,
	outsideBalticSeverity
} from './wording';

describe('Schritt-1-Texte am Zweig', () => {
	it('benennt die Datumskarte je nach Zweig', () => {
		expect(dateSectionTitle(false)).toBe('Zeitpunkt der Sichtung');
		expect(dateSectionTitle(true)).toBe('Funddatum');
	});

	it('ergänzt die Einleitung nur beim Totfund', () => {
		// Die Karte hat heute gar keine Einleitungszeile — beim Lebend-Zweig
		// darf deshalb keine entstehen (null = nichts rendern).
		expect(dateSectionIntro(false)).toBeNull();
		expect(dateSectionIntro(true)).toBe('An welchem Tag war der Fund?');
	});

	it('fragt beim Totfund nach „gefunden", sonst nach „gesehen"', () => {
		expect(positionQuestion(false)).toContain('gesehen');
		expect(positionQuestion(true)).toContain('gefunden');
	});

	it('dreht auch die Marker-Erklärung um', () => {
		expect(mapHint(true, true, false)).toContain('gefunden haben');
		expect(mapHint(true, false, false)).toContain('gefunden haben');
		expect(mapHint(false, true, false)).toContain('gesehen haben');
	});

	it('behält den GPS-Zusatz in beiden Zweigen', () => {
		expect(mapHint(true, true, true)).toContain('GPS-Button');
	});

	it('senkt beim Totfund die Dringlichkeit des Ostsee-Hinweises', () => {
		// Am Strand ist eine Position außerhalb des Polygons der Normalfall.
		// Eine Warnung, die immer kommt, wird weggeklickt.
		expect(outsideBalticSeverity(false)).toBe('warning');
		expect(outsideBalticSeverity(true)).toBe('info');
		expect(outsideBalticNotice(true)).toContain('Stränden oder Küstenabschnitten');
	});

	it('behandelt isDead aus allen Quellen gleich', () => {
		expect(dateSectionTitle(1)).toBe('Funddatum');
		expect(dateSectionTitle('1')).toBe('Funddatum');
		expect(dateSectionTitle(undefined)).toBe('Zeitpunkt der Sichtung');
	});
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag prüfen**

Befehl: `npx vitest run src/lib/report/wording.test.ts`
Erwartet: FAIL — Funktionen existieren nicht

- [ ] **Schritt 3: `wording.ts` erweitern**

Die vorhandene `isDeadFinding`-Normalisierung aus der Datei wiederverwenden, nicht
duplizieren:

```ts
export function dateSectionTitle(isDead: unknown): string {
	return isDeadFinding(isDead) ? 'Funddatum' : 'Zeitpunkt der Sichtung';
}

export function dateSectionIntro(isDead: unknown): string | null {
	return isDeadFinding(isDead) ? 'An welchem Tag war der Fund?' : null;
}

export function positionQuestion(isDead: unknown): string {
	return isDeadFinding(isDead)
		? 'Wo haben Sie das Tier gefunden?'
		: 'Wo haben Sie das Tier gesehen?';
}

export function mapHint(isDead: unknown, hasPosition: boolean, enableGPS: boolean): string {
	const verb = isDeadFinding(isDead) ? 'gefunden haben' : 'gesehen haben';
	if (!hasPosition) {
		return `Noch keine Position gewählt. Tippen Sie auf die Karte, um die Stelle zu markieren, an der Sie das Tier ${verb}.`;
	}
	const base = `Tippen Sie auf die Karte oder ziehen Sie den Marker an die Stelle, an der Sie das Tier ${verb}.`;
	return enableGPS ? `${base} Der GPS-Button übernimmt Ihre aktuelle Position.` : base;
}

export function outsideBalticNotice(isDead: unknown): string {
	return isDeadFinding(isDead)
		? 'Bitte prüfen Sie die Position. Totfunde werden meist an Stränden oder Küstenabschnitten gefunden.'
		: 'Die Koordinaten liegen scheinbar außerhalb der Ostsee. Bitte prüfen Sie die Position. Bei Sichtungen von Land und küstennahen Sichtungen kann dieser Hinweis erscheinen, die Daten werden trotzdem gespeichert.';
}

export function outsideBalticSeverity(isDead: unknown): 'warning' | 'info' {
	return isDeadFinding(isDead) ? 'info' : 'warning';
}
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg prüfen**

Befehl: `npx vitest run src/lib/report/wording.test.ts`
Erwartet: PASS

- [ ] **Schritt 5: `OLMap.svelte` — Hinweis als Prop**

Das Prop ergänzen und den `$derived.by`-Block als **Default** behalten. `OLMap` wird auch
von der Admin-Ansicht und der Foto-EXIF-Karte benutzt — **nicht** dort verzweigen:

```ts
	/**
	 * Überschreibt die Marker-Erklärung. Ohne Wert bleibt der bisherige Wortlaut —
	 * Admin-Ansicht und Foto-EXIF-Karte ändern sich dadurch nicht.
	 */
	hintOverride?: string;
```

```ts
let mapHint = $derived.by(() => {
	if (hintOverride) return hintOverride;
	// … bisheriger Block unverändert
});
```

- [ ] **Schritt 6: Aufrufstellen anschließen**

`DateTime.svelte` (Titel + Einleitung), `PositionPanel.svelte` (Frage + `hintOverride` an
`OLMap`), `VerifyLocation.svelte` (Text + `alert-info`/`alert-warning`). `isDead` kommt
über `getFormContext()` aus `$form`. Jedes `alert-*` braucht ein Icon — die Textfarbe ist
im Theme `base-content`, die Bedeutung trägt das Icon.

- [ ] **Schritt 7: Prüfen**

Befehl: `npm run test:quick`
Erwartet: PASS

- [ ] **Schritt 8: Commit**

```bash
git add src/lib/report/wording.ts src/lib/report/wording.test.ts src/lib/report/components src/lib/components/map/OLMap.svelte
git commit -m "feat(report): word step 1 for dead-animal findings"
```

---

## Task 7: Schalter → Rückmeldung auf Schritt 2

**Dateien:**

- Ändern: `src/lib/report/components/sections/AnimalInfo.svelte`
- Ändern: `src/lib/report/components/sections/AnimalInfo.svelte.test.ts`

**Schnittstellen:**

- Konsumiert: `adminMode` (vorhandenes Prop)
- Produziert: Callback-Prop `onchangekind?: () => void`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

An `src/lib/report/components/sections/AnimalInfo.svelte.test.ts` anhängen. Die Datei hat
**bereits** die beiden lokalen Wrapper `renderAnimalInfo(overrides)` und
`renderWithAdminMode(adminMode)` (Z. 22 und 115) — diese nutzen, keine neuen bauen:

```ts
describe('AnimalInfo — Totfund-Schalter', () => {
	it('zeigt im Meldeformular keinen Schalter mehr, sondern die Rückmeldung', async () => {
		renderWithAdminMode(false);
		await expect.element(page.getByText(/Sie melden/i)).toBeInTheDocument();
		await expect.element(page.getByTestId('field-isDead')).not.toBeInTheDocument();
	});

	it('behält den Schalter in der Admin-Maske', async () => {
		// Dort kommt isDead aus dem Datensatz, es gibt keine Einstiegsseite —
		// ohne Schalter könnten Admins den Status nicht mehr korrigieren.
		renderWithAdminMode(true);
		await expect.element(page.getByTestId('field-isDead')).toBeInTheDocument();
	});
});
```

> **Umsetzungshinweis:** Ob die Abfrage über ein `page`-Objekt aus
> `@vitest/browser/context` oder über den Rückgabewert von `render` läuft, aus den
> vorhandenen Tests derselben Datei übernehmen. Der zugrundeliegende Helfer ist
> `renderWithFormContext` aus
> `$lib/report/components/testing/renderWithFormContext.testutil`.

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag prüfen**

Befehl: `npx vitest run --project client src/lib/report/components/sections/AnimalInfo.svelte.test.ts`
Erwartet: FAIL

- [ ] **Schritt 3: Implementierung**

`<FormField name="isDead" />` in `{#if adminMode}` einschließen und im `{:else}`-Zweig die
Rückmeldung rendern:

```svelte
{#if adminMode}
	<FormField name="isDead" />
{:else}
	<p class="text-base-content/70 text-support mb-4">
		Sie melden:
		<strong class="text-base-content">
			{$form.isDead ? 'Fund eines toten Tieres' : 'Beobachtung eines lebenden Tieres'}
		</strong>
		<button type="button" class="btn btn-ghost btn-sm" onclick={onchangekind}>Ändern</button>
	</p>
{/if}
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg prüfen**

Befehl: `npx vitest run --project client src/lib/report/components/sections/AnimalInfo.svelte.test.ts`
Erwartet: PASS

- [ ] **Schritt 5: `isDead` aus `formStepsConfig` nehmen**

In `src/lib/report/formConfig.ts` `'isDead'` aus der Feldliste von `sighting-details`
entfernen und mit einem Kommentar begründen (Muster: die vorhandenen Begründungen für
`deadSex` und `boatDriveText` in derselben Datei).

- [ ] **Schritt 6: Commit**

```bash
git add src/lib/report/components/sections/AnimalInfo.svelte src/lib/report/components/sections/AnimalInfo.svelte.test.ts src/lib/report/formConfig.ts
git commit -m "feat(report): replace the dead-animal toggle with a read-back"
```

---

## Task 8: Zweigwechsel — Felder leeren

**Dateien:**

- Ändern: `src/lib/report/components/ModernReportForm.svelte`
- Erstellen: `src/lib/report/switchReportKind.ts`, `src/lib/report/switchReportKind.test.ts`

**Schnittstellen:**

- Produziert: `fieldsToClearOnSwitch(next: ReportKind): string[]`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```ts
import { fieldsToClearOnSwitch } from './switchReportKind';

describe('fieldsToClearOnSwitch', () => {
	it('leert beim Wechsel auf lebend die Totfund-Felder', () => {
		expect(fieldsToClearOnSwitch('alive')).toEqual(
			expect.arrayContaining(['deadCondition', 'deadSize', 'deadPhoneContact'])
		);
	});

	it('leert beim Wechsel auf Totfund die Verhaltensfelder', () => {
		expect(fieldsToClearOnSwitch('dead')).toEqual(
			expect.arrayContaining(['behavior', 'behaviorText', 'reaction'])
		);
	});

	it('rührt die teuren gemeinsamen Felder in keiner Richtung an', () => {
		// Position, Datum und Medien sind der aufwendigste Teil der Eingabe.
		const alle = [...fieldsToClearOnSwitch('alive'), ...fieldsToClearOnSwitch('dead')];
		for (const feld of ['latitude', 'longitude', 'sightingDate', 'species', 'mediaFile', 'email']) {
			expect(alle).not.toContain(feld);
		}
	});
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag prüfen**

Befehl: `npx vitest run src/lib/report/switchReportKind.test.ts`
Erwartet: FAIL

- [ ] **Schritt 3: Implementierung**

```ts
import type { ReportKind } from './reportKind';

/**
 * Felder, die beim Zweigwechsel geleert werden müssen.
 *
 * Nicht optional: Ein `behavior`, das bei `isDead = true` stehen bliebe, ginge
 * mit ans Backend — und die Schritt-Validierung würde es nicht mehr prüfen,
 * weil es aus `getFormSteps()` verschwunden ist.
 */
export function fieldsToClearOnSwitch(next: ReportKind): string[] {
	return next === 'alive'
		? ['deadCondition', 'deadSize', 'deadPhoneContact']
		: ['behavior', 'behaviorText', 'reaction'];
}
```

- [ ] **Schritt 4: In `ModernReportForm` anwenden**

Beim Wechsel die Felder über `updateField` leeren und `currentStep` klemmen:

```ts
currentStep = Math.min(currentStep, getFormSteps($form).length - 1);
```

- [ ] **Schritt 5: Test laufen lassen, Erfolg prüfen**

Befehl: `npx vitest run src/lib/report/switchReportKind.test.ts && npm run test:unit`
Erwartet: PASS

- [ ] **Schritt 6: Commit**

```bash
git add src/lib/report/switchReportKind.ts src/lib/report/switchReportKind.test.ts src/lib/report/components/ModernReportForm.svelte
git commit -m "feat(report): clear branch-only fields when the kind changes"
```

---

## Task 9: E2E-Bestand anpassen

**Dateien:**

- Ändern: `e2e/pages/FormPage.ts:29-30`
- Ändern: `e2e/auth.spec.ts`, `e2e/bestimmungshilfe.spec.ts`, `e2e/footer-layout.spec.ts`,
  `e2e/form-field-mode.spec.ts`, `e2e/navbar-structure.spec.ts`, `e2e/videoUpload.spec.ts`

- [ ] **Schritt 1: `FormPage.goto()` umstellen**

```ts
	/**
	 * Der Zweig-Parameter überspringt die Einstiegsseite. Ohne ihn müsste jeder
	 * Spec sie durchklicken; abgedeckt wird sie eigens in
	 * `e2e/report-kind-choice.spec.ts`.
	 */
	async goto(kind: 'lebend' | 'totfund' = 'lebend') {
		await this.page.goto(`/?meldung=${kind}`);
	}
```

- [ ] **Schritt 2: Die sechs direkten Aufrufe anpassen**

In den sechs Dateien `page.goto('/')` durch `page.goto('/?meldung=lebend')` ersetzen.

Befehl zur Kontrolle, dass keiner übersehen wurde:

```bash
grep -rn "goto('/')" e2e/ --include="*.spec.ts"
```

Erwartet: keine Ausgabe

- [ ] **Schritt 3: Volle E2E-Suite**

Befehl: `npm run test:e2e`
Erwartet: PASS

- [ ] **Schritt 4: Commit**

```bash
git add e2e/
git commit -m "test(e2e): enter the form past the kind choice"
```

---

## Task 10: PR 1 abschließen

- [ ] **Schritt 1: Volle Prüfung**

Befehl: `npm run test:quick && npm run test:e2e`
Erwartet: PASS

- [ ] **Schritt 2: Definition of Done gegenlesen**

Punkte 1–10 aus Abschnitt 12 der Spezifikation einzeln abhaken. Punkt 10 (automatischer
Wetter-Abruf im Totfund-Zweig) explizit im Browser nachsehen — kein Test deckt ihn ab.

- [ ] **Schritt 3: PR öffnen**

```bash
git push -u origin HEAD
gh pr create --title "feat(report): add the entry choice before the report form" --body "Setzt Punkt C1 des Museumsdokuments um. Spezifikation: docs/archive/PLAN_EINSTIEGSSEITE_MELDEFORMULAR_2026-08-05.md"
```

---

# PR 2 — Bootsfelder an den Beobachtungsort (R6)

> Erst starten, wenn PR 1 gemergt ist — PR 2 nutzt den Seam aus Task 2.

## Task 11: `sightingFrom` in den Seam aufnehmen

**Dateien:**

- Ändern: `src/lib/report/formConfig.ts`, `src/lib/report/formConfig.test.ts`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```ts
import { SightingFromEnum } from './formOptions/sightingFrom';

describe('getFormSteps mit Beobachtungsort', () => {
	const fieldsOf = (steps: ReturnType<typeof getFormSteps>) => steps.flatMap((s) => s.fields);

	it('blendet die Felder zum eigenen Boot aus, wenn von Land gemeldet wird', () => {
		const fields = fieldsOf(getFormSteps({ isDead: false, sightingFrom: SightingFromEnum.LAND }));
		for (const feld of ['boatDrive', 'boatType', 'shipName', 'homePort', 'reaction']) {
			expect(fields).not.toContain(feld);
		}
	});

	it('blendet die Einwilligung zum Schiffsnamen mit aus', () => {
		// Sonst fragt Schritt 4 nach der Freigabe für einen Schiffsnamen, den
		// nie jemand erhoben hat.
		const fields = fieldsOf(getFormSteps({ isDead: false, sightingFrom: SightingFromEnum.LAND }));
		expect(fields).not.toContain('shipNameConsent');
	});

	it('lässt Anzahl anderer Schiffe und Entfernung auch bei Land stehen', () => {
		// `shipCount` fragt nach ANDEREN Schiffen — Störungskontext, von Land
		// aus genauso beobachtbar. `distance` ist auch vom Strand sinnvoll.
		const fields = fieldsOf(getFormSteps({ isDead: false, sightingFrom: SightingFromEnum.LAND }));
		expect(fields).toContain('shipCount');
		expect(fields).toContain('distance');
	});

	it('zeigt die Bootsfelder bei „Sonstiges" — und vor der Beantwortung', () => {
		// `sightingFrom` ist `default(0)`, und 0 heißt gleichzeitig „noch nicht
		// beantwortet" UND „Sonstiges" (Kajak, SUP, Seebrücke — 1.893 Zeilen im
		// Bestand). Nur LAND ist eine eindeutige Aussage.
		for (const von of [SightingFromEnum.OTHER, undefined, null]) {
			const fields = fieldsOf(getFormSteps({ isDead: false, sightingFrom: von }));
			expect(fields).toContain('boatDrive');
			expect(fields).toContain('shipName');
		}
	});

	it('verknüpft beide Achsen, statt sie gegeneinander zu setzen', () => {
		// `reaction` entfällt beim Totfund UND bei Land — eine Bedingung darf
		// die andere nicht überschreiben.
		const totUndLand = fieldsOf(
			getFormSteps({ isDead: true, sightingFrom: SightingFromEnum.LAND })
		);
		expect(totUndLand).not.toContain('reaction');
		expect(totUndLand).not.toContain('behavior');
		expect(totUndLand).not.toContain('shipName');
		// und die vier Felder, die bleiben müssen:
		expect(totUndLand).toEqual(
			expect.arrayContaining(['shipCount', 'seaState', 'visibility', 'windForce'])
		);
	});

	it('behält auch in der knappsten Kombination vier nicht-leere Schritte', () => {
		const steps = getFormSteps({ isDead: true, sightingFrom: SightingFromEnum.LAND });
		expect(steps).toHaveLength(4);
		for (const step of steps) {
			expect(step.fields.length).toBeGreaterThan(0);
		}
	});
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag prüfen**

Befehl: `npx vitest run src/lib/report/formConfig.test.ts`
Erwartet: FAIL

- [ ] **Schritt 3: Implementierung**

In `src/lib/report/formConfig.ts`:

```ts
import { SightingFromEnum } from './formOptions/sightingFrom';

/**
 * Felder, die das EIGENE Wasserfahrzeug betreffen. Sie entfallen, wenn von Land
 * gemeldet wurde.
 *
 * `shipNameConsent` steht bewusst mit in der Liste: Eine Einwilligung zur
 * Veröffentlichung des Schiffsnamens ohne erhobenen Schiffsnamen ist eine Frage
 * ohne Bezugsgegenstand.
 *
 * NICHT enthalten: `shipCount` („Anzahl ANDERER Schiffe in näherer Umgebung" —
 * Störungskontext, von Land aus genauso beobachtbar) und `distance`
 * („Entfernung zum Tier" — auch vom Strand aus sinnvoll).
 */
const HIDDEN_WHEN_FROM_LAND = [
	'boatDrive',
	'boatType',
	'shipName',
	'homePort',
	'shipNameConsent',
	'reaction'
] as const;

/**
 * Nur ein ausdrückliches „Land" blendet aus.
 *
 * `sightingFrom` ist `integer default(0) notNull`, und `0` bedeutet
 * GLEICHZEITIG „noch nicht beantwortet" und „Sonstiges" (Kajak, SUP, Seebrücke).
 * Eine Regel „zeige nur bei Segelschiff/Motorboot/Fähre" würde die Felder
 * deshalb vor der Beantwortung ausblenden und für alle Sonstiges-Melder
 * dauerhaft.
 */
function isFromLand(value: FormStepsInput['sightingFrom']): boolean {
	return Number(value) === SightingFromEnum.LAND;
}
```

In `getFormSteps` ergänzen:

```ts
if (isFromLand(data.sightingFrom)) {
	HIDDEN_WHEN_FROM_LAND.forEach((field) => hidden.add(field));
}
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg prüfen**

Befehl: `npx vitest run src/lib/report/formConfig.test.ts && npm run test:unit`
Erwartet: PASS

- [ ] **Schritt 5: Commit**

```bash
git add src/lib/report/formConfig.ts src/lib/report/formConfig.test.ts
git commit -m "feat(report): hide own-vessel fields when reporting from land"
```

---

## Task 12: `shipCount` fachlich richtig einordnen

> **Vorher mit dem Museum klären (Punkt D2 der Matrix).** Bei Widerspruch ist dieser Task
> ersatzlos streichbar; die übrigen hängen nicht daran.

**Dateien:**

- Ändern: `src/lib/report/components/sections/BoatInfo.svelte:36`
- Ändern: `src/lib/report/components/sections/Environment.svelte`
- Ändern: `src/lib/report/formConfig.ts` (Feldreihenfolge in `observations`)

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```ts
import { renderWithFormContext } from '$lib/report/components/testing/renderWithFormContext.testutil';

it('zeigt die Anzahl anderer Schiffe bei den Umweltbedingungen', async () => {
	// Sonst bliebe für Land-Melder eine Karte „Boot-/Schiffsinformationen"
	// zurück, die nur nach FREMDEN Booten fragt.
	renderWithFormContext(Environment, {});
	await expect.element(page.getByTestId('field-shipCount')).toBeInTheDocument();
});
```

> Signatur von `renderWithFormContext` aus einem bestehenden Section-Test übernehmen
> (z. B. `Behavior.svelte.test.ts`) — sie ist im Bestand einheitlich.

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag prüfen**

Befehl: `npx vitest run --project client src/lib/report/components/sections/Environment.svelte.test.ts`
Erwartet: FAIL

- [ ] **Schritt 3: `<FormField name="shipCount" />` verschieben**

Aus `BoatInfo.svelte` entfernen, in `Environment.svelte` vor `seaState` einfügen. In
`formConfig.ts` die Position in der `observations`-Feldliste entsprechend nachziehen — die
Reihenfolge dort steuert `findStepForErrors`.

- [ ] **Schritt 4: Test laufen lassen, Erfolg prüfen**

Befehl: `npm run test:quick`
Erwartet: PASS

- [ ] **Schritt 5: Commit**

```bash
git add src/lib/report/components/sections/BoatInfo.svelte src/lib/report/components/sections/Environment.svelte src/lib/report/formConfig.ts
git commit -m "refactor(report): move other-ship count to the environment card"
```

---

## Task 13: E2E für den Land-Zweig

**Dateien:**

- Erstellen: `e2e/form-from-land.spec.ts`

- [ ] **Schritt 1: Test schreiben**

```ts
import { expect, test } from '@playwright/test';
import { FormPage } from './pages/FormPage';
import { fillStep1 } from './helpers/form-helpers';

test('Meldung von Land zeigt keine Angaben zum eigenen Boot', async ({ page }) => {
	const formPage = new FormPage(page);
	await formPage.goto();
	await fillStep1(formPage);

	// „Von wo" auf Land setzen — die Bootsfelder müssen im selben Schritt
	// verschwinden, ohne ihn ungültig zu machen.
	await page.getByTestId('field-sightingFrom').selectOption({ label: 'Land' });
	await expect(page.getByTestId('field-boatDrive')).toBeHidden();
	await expect(page.getByTestId('field-distance')).toBeVisible();
});
```

- [ ] **Schritt 2: Test laufen lassen**

Befehl: `npx playwright test e2e/form-from-land.spec.ts`
Erwartet: PASS (der Seam aus Task 11 trägt bereits)

- [ ] **Schritt 3: Definition of Done, Punkte 11–14**

Aus Abschnitt 12 der Spezifikation einzeln abhaken.

- [ ] **Schritt 4: Commit und PR**

```bash
git add e2e/form-from-land.spec.ts
git commit -m "test(e2e): cover the from-land branch"
git push -u origin HEAD
gh pr create --title "feat(report): show own-vessel fields only when reporting from a boat" --body "Umsetzung von R6 aus docs/archive/PLAN_EINSTIEGSSEITE_MELDEFORMULAR_2026-08-05.md"
```

---

# PR 3 — Einwilligungen an einer Stelle bündeln

> Unabhängig von PR 1 und PR 2 — berührt nur `formConfig.ts` und die Media-Sektion.
> Kann vor, zwischen oder nach den anderen laufen. Reihenfolge hier: nach PR 2, damit die
> drei PRs nicht dieselbe Datei gleichzeitig anfassen.

## Task 14: `mediaConsent` nach Schritt 4 verschieben

**Dateien:**

- Ändern: `src/lib/report/formConfig.ts` (Feldlisten `sighting-details` und `contact`)
- Ändern: `src/lib/report/components/sections/Media.svelte:135`
- Ändern: `src/lib/report/components/steps/Step4Contact.svelte`
- Ändern: `src/lib/report/formConfig.test.ts`

**Schnittstellen:**

- Konsumiert: `getFormSteps` aus Task 2, `HIDDEN_WHEN_FROM_LAND` aus Task 11
- Produziert: `mediaConsent` in der `contact`-Feldliste, bedingt über `hasMedia`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```ts
describe('Einwilligungen stehen zusammen auf Schritt 4', () => {
	it('führt mediaConsent nicht mehr bei den Tierangaben', () => {
		const steps = getFormSteps({ isDead: false });
		const schrittZwei = steps.find((s) => s.id === 'sighting-details');
		expect(schrittZwei?.fields).not.toContain('mediaConsent');
	});

	it('führt mediaConsent bei den Kontaktdaten', () => {
		const steps = getFormSteps({ isDead: false });
		const schrittVier = steps.find((s) => s.id === 'contact');
		expect(schrittVier?.fields).toContain('mediaConsent');
	});

	it('lässt die Datei-Felder auf Schritt 2 stehen', () => {
		// Nur die Einwilligung zieht um. Der Upload bleibt, wo das Museum ihn
		// am 2026-08-04 haben wollte — vor den Tierangaben.
		const schrittZwei = getFormSteps({ isDead: false }).find((s) => s.id === 'sighting-details');
		expect(schrittZwei?.fields).toEqual(expect.arrayContaining(['mediaFile', 'mediaUpload']));
	});

	it('hält alle vier Nachweis-Einwilligungen auf demselben Schritt', () => {
		const schrittVier = getFormSteps({ isDead: false }).find((s) => s.id === 'contact');
		expect(schrittVier?.fields).toEqual(
			expect.arrayContaining(['nameConsent', 'shipNameConsent', 'mediaConsent', 'privacyConsent'])
		);
	});
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag prüfen**

Befehl: `npx vitest run src/lib/report/formConfig.test.ts`
Erwartet: FAIL bei den ersten beiden Tests

- [ ] **Schritt 3: Feldlisten umhängen**

In `src/lib/report/formConfig.ts`: `'mediaConsent'` aus `sighting-details` entfernen und in
`contact` **hinter** `shipNameConsent` einfügen. Die Reihenfolge in der Liste steuert
`findStepForErrors` — die Einwilligungen sollen in der Reihenfolge stehen, in der sie im
Markup erscheinen.

Den Grund als Kommentar hinterlegen, Muster wie bei `deadSex` und `boatDriveText`:

```ts
// `mediaConsent` steht seit dem 2026-08-05 auf Schritt 4 bei den übrigen
// Einwilligungen. Alle vier Felder mit Nachweisspalten (`…_am`,
// `…_version` in `schema.ts`) stehen damit an einer Stelle. Die
// DATEI-Felder bleiben hier — der Upload gehört weiterhin vor die
// Tierangaben (Wunsch des Museums, 2026-08-04).
```

- [ ] **Schritt 4: Markup verschieben**

`<FormField name="mediaConsent" disabled={adminMode} />` aus `Media.svelte:135` entfernen
und in `Step4Contact.svelte` zu den übrigen Einwilligungen setzen. Das `disabled`-Verhalten
für `adminMode` mitnehmen — die Admin-Maske zeigt Einwilligungen gesperrt an
(`sightingRepository.ts:157`).

- [ ] **Schritt 5: Test laufen lassen, Erfolg prüfen**

Befehl: `npx vitest run src/lib/report/formConfig.test.ts && npm run test:unit`
Erwartet: PASS

- [ ] **Schritt 6: Commit**

```bash
git add src/lib/report/formConfig.ts src/lib/report/components/sections/Media.svelte src/lib/report/components/steps/Step4Contact.svelte src/lib/report/formConfig.test.ts
git commit -m "refactor(report): group all consents on the contact step"
```

---

## Task 15: Keine Einwilligung ohne Gegenstand

> Ohne diesen Task erzeugt Task 14 genau den Fehler, den D1 behebt.

**Dateien:**

- Ändern: `src/lib/report/formConfig.ts`, `src/lib/report/formConfig.test.ts`
- Ändern: `src/lib/report/components/ModernReportForm.svelte`
- Erstellen: `e2e/media-consent-placement.spec.ts`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```ts
describe('mediaConsent ohne Aufnahme', () => {
	it('erscheint nicht, solange keine Aufnahme vorliegt', () => {
		// Sonst fragt Schritt 4 nach der Freigabe für Aufnahmen, die es nicht
		// gibt — dieselbe Fehlerklasse wie shipNameConsent bei Land-Meldungen.
		const fields = getFormSteps({ isDead: false, hasMedia: false }).flatMap((s) => s.fields);
		expect(fields).not.toContain('mediaConsent');
	});

	it('erscheint, sobald eine Aufnahme vorliegt', () => {
		const fields = getFormSteps({ isDead: false, hasMedia: true }).flatMap((s) => s.fields);
		expect(fields).toContain('mediaConsent');
	});

	it('blendet ohne Aufnahme keinen anderen Consent mit aus', () => {
		const fields = getFormSteps({ isDead: false, hasMedia: false }).flatMap((s) => s.fields);
		expect(fields).toEqual(
			expect.arrayContaining(['nameConsent', 'privacyConsent', 'persistentDataConsent'])
		);
	});
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag prüfen**

Befehl: `npx vitest run src/lib/report/formConfig.test.ts`
Erwartet: FAIL — `hasMedia` ist in `FormStepsInput` nicht vorgesehen

- [ ] **Schritt 3: `FormStepsInput` erweitern**

```ts
export type FormStepsInput = {
	isDead?: boolean | number | string | null;
	sightingFrom?: number | string | null;
	/**
	 * Ob mindestens eine Aufnahme vorliegt. Steuert `mediaConsent`: Eine
	 * Einwilligung zur Veröffentlichung von Aufnahmen ohne Aufnahmen ist eine
	 * Frage ohne Bezugsgegenstand — und `mapFormToSighting` würde dafür einen
	 * datierten, versionierten Nachweis stempeln.
	 *
	 * `undefined` bedeutet „unbekannt" und zeigt das Feld: Aufrufer, die den
	 * Medienstand nicht kennen (Admin-Maske), sollen nichts verlieren.
	 */
	hasMedia?: boolean;
};
```

In `getFormSteps` ergänzen:

```ts
if (data.hasMedia === false) {
	hidden.add('mediaConsent');
}
```

- [ ] **Schritt 4: Aufrufstellen mit `hasMedia` versorgen**

In `ModernReportForm.svelte` den Medienstand aus dem `mediaStore` ableiten und in die
`getFormSteps`-Aufrufe geben. Beim Entfernen der letzten Aufnahme `mediaConsent` über
`updateField` auf `false` zurücksetzen — sonst bliebe eine Zustimmung stehen, die beim
Absenden gestempelt würde.

- [ ] **Schritt 5: E2E-Nachweis**

`e2e/media-consent-placement.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { FormPage } from './pages/FormPage';
import { fillStep1, fillStep2, expectCurrentStep } from './helpers/form-helpers';

test('ohne Aufnahme fragt Schritt 4 nicht nach der Freigabe von Aufnahmen', async ({ page }) => {
	const formPage = new FormPage(page);
	await formPage.goto();
	await fillStep1(formPage);
	await fillStep2(formPage);
	await formPage.next(); // Schritt 3 überspringen
	await expectCurrentStep(page, /Kontaktdaten/i);

	await expect(page.getByTestId('field-nameConsent')).toBeVisible();
	await expect(page.getByTestId('field-privacyConsent')).toBeVisible();
	await expect(page.getByTestId('field-mediaConsent')).toBeHidden();
});
```

> Die Hilfsfunktionen und `formPage.next()` aus `e2e/helpers/form-helpers.ts` bzw.
> `e2e/pages/FormPage.ts` übernehmen; die genauen Namen dort nachsehen.

- [ ] **Schritt 6: Prüfen**

Befehl: `npm run test:quick && npx playwright test e2e/media-consent-placement.spec.ts`
Erwartet: PASS

- [ ] **Schritt 7: Commit und PR**

```bash
git add src/lib/report e2e/media-consent-placement.spec.ts
git commit -m "fix(report): ask for media consent only when media exists"
git push -u origin HEAD
gh pr create --title "refactor(report): group all consents on the contact step" --body "Bündelt die vier Einwilligungen mit Nachweisspalten auf Schritt 4. mediaConsent erscheint nur bei vorhandener Aufnahme — siehe D3 in docs/PLAN_EINSTIEGSSEITE_UMSETZUNG_2026-08-05.md"
```

---

## Selbstprüfung des Plans

**Codebase-Check (2026-08-05):** Alle 21 im Plan genannten Dateipfade existieren. Die
Fundstellen von `formStepsConfig` wurden gezählt statt geschätzt: `stepValidation.ts` 3,
`ModernReportForm.svelte` 4, `StepNavigation.svelte` 5, `RequiredConsent.svelte` 2 —
zusammen **14**, nicht die zuvor genannten 12. In beiden Dokumenten korrigiert. Der
Test-Helfer heißt `renderWithFormContext`
(`$lib/report/components/testing/renderWithFormContext.testutil`); `AnimalInfo.svelte.test.ts`
bringt zusätzlich zwei eigene Wrapper mit, die Task 7 nutzt. Die Typografie-Utilities
(`text-title`, `text-section`, `text-support`) sind im `@theme`-Block von `app.css`
belegt. Browser-Komponententests laufen über `npm run test:unit:client`
(`vitest run --project client`); `npm run test:unit` ist **server-only**.

**Konsistenz:** Tasks 1–15 lückenlos, jede referenzierte Task-Nummer existiert. Keine
Platzhalter. Typen durchgängig: `getFormSteps(data: FormStepsInput)` wird in Task 2
eingeführt und in den Tasks 3, 8, 11, 14 und 15 mit derselben Signatur benutzt;
`FormStepsInput` wächst dabei um `sightingFrom` (Task 11) und `hasMedia` (Task 15), ohne
dass frühere Aufrufer brechen.

**Definition of Done für PR 3:** Punkte 15–18 in Abschnitt 12 der Spezifikation — dort
nachgetragen, nicht hier gedoppelt.

**Abdeckung der Spezifikation:** Alle 14 Punkte der Definition of Done haben einen Task —
Punkte 1–3 → Task 5, Punkt 4 → Task 6, Punkt 5 → Tasks 2/3, Punkt 6 → Task 8, Punkt 7 →
Task 5, Punkt 8 → Task 7, Punkt 9 → Task 10, Punkt 10 → Task 10 Schritt 2 (Sichtprüfung,
kein Test), Punkte 11–14 → Tasks 11/13.

**Bekannte Lücke, bewusst gelassen:** Für Punkt 10 (automatischer Wetter-Abruf im
Totfund-Zweig) gibt es keinen automatisierten Test. Ein E2E-Test dafür müsste den externen
Wetterdienst treffen oder ihn mocken; beides wiegt schwerer als der Nutzen. Der Punkt ist
deshalb als Sichtprüfung in Task 10 verankert.

**Zwei Stellen, an denen der Plan absichtlich unscharf bleibt** — beide mit Begründung im
Task: die genaue Rückgabeform von `validateStep` (Task 3, aus der bestehenden Testdatei zu
übernehmen) und der `$effect` für den Zurück-Fall (Task 5, mit benannter Alternative). In
beiden Fällen ist der Test die Abnahme, nicht eine vorgegebene Implementierung.

import {
	expect,
	test,
	type APIRequestContext,
	type BrowserContext,
	type Page
} from '@playwright/test';
import { seedAdminSession } from './helpers/adminSession';

/**
 * modal-overflow.spec.ts — geschlossene `.modal`-Dialoge bleiben aus dem Fluss
 *
 * **Der Befund, den dieser Test konserviert:** DaisyUI blendet `.modal` nicht
 * per `display: none` aus, sondern über `visibility` — ein geschlossener Dialog
 * steht also weiter im DOM und misst sich regelmäßig breiter als sein
 * Elternelement. Bei der Suche nach horizontalem Überlauf sieht das jedes Mal
 * nach dem Verursacher aus. Ist es nicht: `.modal` ist `position: fixed;
 * inset: 0`, der Dialog ist aus dem Fluss genommen und zählt nicht in
 * `documentElement.scrollWidth`. Hergeleitet und mit Messwerten belegt in
 * `.claude/rules/daisyui.md` → „Geschlossene `.modal`-Dialoge sind kein
 * Überlauf-Verdacht".
 *
 * **Warum das trotzdem einen Wächter braucht:** Die Aussage gilt nur, solange
 * kein *Vorfahr* einen umschließenden Block für `position: fixed` aufspannt.
 * `transform`, `filter`, `backdrop-filter`, `perspective`, `will-change`,
 * `contain` und `container-type` tun das — und keine davon sieht an der
 * Aufrufstelle nach einer Layout-Entscheidung aus. Ein `will-change: transform`
 * an einer Karte, in der ein Dialog steht, oder ein `contain` an einem
 * Listen-Container macht jeden Dialog darunter flussrelativ und damit
 * überlauffähig. Der Bruch entsteht dann weit weg von der Datei, in der er sich
 * auswirkt.
 *
 * **Was der Wächter nicht sieht: `hover:`-Zustände.** Gemessen wird der
 * Ruhezustand, und dort taucht ein Hover-Transform in `getComputedStyle` nie
 * auf — derselbe Vorbehalt, den `design-system.md` für den Token-Scan
 * festhält. Das ist keine theoretische Lücke: `app.css` setzt global
 * `.btn:hover:not(:disabled) { transform: translateY(-1px) }`, dazu steht ein
 * `hover:scale-105` in `SightingsMapView.svelte`. Heute ist kein
 * `dialog.modal` Nachfahre eines solchen Elements; wer einen Dialog künftig in
 * eine Karte mit Hover-Transform hängt, bekommt von hier keine Warnung.
 *
 * **Warum gemessen und nicht die CSS-Eigenschaften abgefragt:** Eine Liste der
 * sieben Eigenschaften wäre eine zweite Quelle neben der Spezifikation und
 * altert mit ihr — `container-type` kam später dazu, die nächste Ergänzung
 * käme still an diesem Test vorbei. Stattdessen wird die *Wirkung* geprüft:
 * Dialog auf 3000 px aufblasen, `scrollWidth` vorher/nachher vergleichen.
 * Das erwischt jede Ursache, auch die noch nicht erfundene.
 *
 * **Warum jede Route eine Gegenprobe fährt:** Ein Scan über einen konformen
 * Bestand belegt nichts über die Regel — dieselbe Begründung, aus der die
 * Klassen-Regeln in `helpers/bannedClasses.ts` gegen konstruierte Beispiele
 * laufen. Hier heißt das: Auf derselben Seite wird dem Elternelement ein
 * `transform` verpasst und verlangt, dass der Überlauf dann **auftritt**.
 * Wäre die Sonde stumpf (Dialog nicht gefunden, Stil nicht angekommen,
 * `scrollWidth` an einem anderen Element gelesen), bliebe sie auch dabei
 * still und der Test fiele auf.
 *
 * **Warum vorher jede Disclosure aufgeklappt wird:** Seit PR #746 steht der
 * `upload-notice-dialog` auf `/` in der Foto-Disclosure von
 * `PositionPanel.svelte`. DaisyUIs `.collapse-content` trägt für die **gesamte
 * Dauer** der Aufklapp-Animation `overflow-x: clip` und schaltet erst im
 * Endzustand auf `visible` — gemessen bei 360 px: zugeklappt `clip`, direkt
 * nach `open = true` `clip` (2. Grid-Spur bereits 7,3 px), nach ~800 ms
 * `visible` und `scrollWidth` 360 → 3053. In diesem Fenster kann **kein**
 * Element im Teilbaum `documentElement.scrollWidth` bewegen: Ein gewöhnliches
 * `div` mit 3000 px an der Dialogposition bleibt dort genauso still wie der
 * `position: fixed`-Dialog. Die Gegenprobe schlug deshalb nicht mehr an, und
 * das Grün der Hauptprüfung war wertlos — nicht weil die Regel brach, sondern
 * weil der Teilbaum nichts durchließ.
 *
 * **Worauf gewartet wird — die Wirkung, nicht eine Hilfsgröße:** Gewartet wird
 * per `expect.poll` darauf, dass ein im Fluss eingehängtes 3000-px-`div` an der
 * Dialogposition `scrollWidth` **bewegt**. Das ist genau die Fähigkeit, die die
 * Gegenprobe danach braucht. Ein Warten auf die Höhe von `.collapse-content`
 * wäre zu schwach (sie wächst früher, als das `clip` verschwindet), ein
 * `waitForTimeout` verboten (`.claude/rules/testing.md`), und das Abschalten
 * aller Transitions per `addStyleTag` hat den Zustand nicht hergestellt. Die
 * Wirkungs-Sonde hält außerdem, falls DaisyUI den Mechanismus austauscht.
 *
 * **Und sie ist zugleich die Vakuum-Sperre:** Ein Dialog in einem
 * abgeschnittenen Teilbaum erfüllt „zählt nicht in `scrollWidth` mit" trivial —
 * dort belegt das Grün der Hauptprüfung nichts über `position: fixed`. Bewegt
 * die Sonde `scrollWidth` an einer Dialogposition dauerhaft nicht, bricht der
 * Test deshalb mit Nennung dieser Position ab, statt still grün zu werden.
 */

/* Der Fall ist ein Mobil-Fall: 360 px ist die Breite, bei der die Frage
   überhaupt aufkam. Ein 3000 px breiter Dialog würde zwar auch auf einem
   Desktop-Viewport überlaufen — aber ein Wächter soll die Bedingung fahren,
   unter der das Problem real wird, nicht eine bequemere. */
test.use({ viewport: { width: 360, height: 780 } });

interface GuardRoute {
	readonly path: string;
	readonly auth: boolean;
	readonly needsDb: boolean;
	/** Untergrenze, damit eine Route ohne Dialoge nicht still grün wird. */
	readonly minDialogs: number;
}

/* Gemessen am 2026-08-04. Die Zahlen sind Untergrenzen, keine Sollwerte — ein
   zusätzlicher Dialog auf einer Route ist kein Testfehler, ein verschwundener
   schon: Ohne diese Schranke prüfte der Test auf einer dialoglosen Seite nichts
   und meldete trotzdem grün.

   `/map` und `/about` stehen bewusst nicht hier — sie enthalten keinen Dialog.

   **Was ungedeckt bleibt:** `MediaModal.svelte`. Der Dialog hängt hinter
   `{#if selectedMedia}` an der Detailansicht einer Sichtung und steht auf
   keiner Route im Ruhezustand im DOM. Die übrigen fünf
   `class="modal"`-Fundstellen sind abgedeckt: UploadNotice und
   SpeciesIdentificationHelp auf `/`, DeleteDialog, ExportModal und die
   Spam-Analyse auf `/admin`. */
const ROUTES: readonly GuardRoute[] = [
	{ path: '/', auth: false, needsDb: false, minDialogs: 2 },
	{ path: '/bestimmungshilfe', auth: false, needsDb: false, minDialogs: 1 },
	{ path: '/admin', auth: true, needsDb: true, minDialogs: 3 }
];

type Fixtures = {
	page: Page;
	context: BrowserContext;
	request: APIRequestContext;
	baseURL: string | undefined;
};

let databaseProbe: Promise<boolean> | undefined;
const databaseAvailable = (request: APIRequestContext) => {
	databaseProbe ??= request
		.get('/api/map/sightings', { timeout: 10_000 })
		.then((response) => response.ok())
		.catch(() => false);
	return databaseProbe;
};

/* Dieselben Wächter wie in `design-tokens.spec.ts`: Auth0-Redirect und
   SvelteKit-Fehlerseite liefern beide ein DOM ohne Dialoge — ohne die Prüfungen
   wäre der Lauf auf /admin grün, ohne die Seite je gesehen zu haben. Die
   `minDialogs`-Schranke unten fängt das zwar auch ab, meldete dann aber
   „zu wenige Dialoge" statt der eigentlichen Ursache. */
const openRoute = async ({ page, context, request, baseURL }: Fixtures, route: GuardRoute) => {
	if (route.needsDb && !(await databaseAvailable(request))) {
		if (process.env.CI) {
			throw new Error(
				`${route.path} braucht eine Datenbank, und /api/map/sightings antwortet nicht. ` +
					'In CI ist das ein Fehler: Der `e2e`-Job startet einen Postgres-Service, wendet die ' +
					'Migrationen an und legt Testdaten an (ci.yml).'
			);
		}
		test.skip(
			true,
			`${route.path} braucht eine Datenbank, und /api/map/sightings antwortet nicht. Lokal: npm run db:start && npm run db:push.`
		);
	}

	if (route.auth) {
		if (!baseURL) throw new Error('baseURL fehlt — playwright.config.ts setzt sie normalerweise');
		await seedAdminSession(context, baseURL);
	}

	const response = await page.goto(route.path);
	const status = response?.status() ?? 0;

	if (status >= 500) {
		throw new Error(`${route.path} antwortet mit ${status} — hier stimmt etwas anderes nicht.`);
	}

	if (!route.auth) return;

	/* Ein Auth0-Redirect landet auf einer fremden Origin und antwortet dabei mit
	   200 — der Statuscode oben sieht das nicht. Ohne diese Prüfung liefe der
	   Test auf der Login-Seite, fände dort null Dialoge und fiele über
	   `minDialogs` mit „zu wenige Dialoge" statt mit der Ursache. */
	if (!page.url().startsWith(baseURL ?? '')) {
		throw new Error(
			`${route.path} hat auf ${page.url()} umgeleitet — das Session-Cookie wurde nicht akzeptiert. ` +
				'Prüfe DATABASE_POSTGRES_URL und COOKIE_NAME in .env und ob die sessions-Tabelle ' +
				'migriert ist (siehe e2e/helpers/adminSession.ts).'
		);
	}

	/* 401/403 bleiben auf derselben URL und liefern Status < 500 — die Prüfung
	   oben greift dafür nicht. Cookie akzeptiert, aber `roles` reicht nicht. */
	if (status === 401 || status === 403) {
		throw new Error(
			`${route.path} antwortet mit ${status} — die Session gilt, aber die Rolle reicht nicht. ` +
				'Die roles-Spalte der Session-Zeile aus e2e/helpers/adminSession.ts muss die von ' +
				'requireUserRole geforderte Rolle enthalten.'
		);
	}
};

interface Probe {
	readonly label: string;
	readonly before: number;
	readonly after: number;
}

interface Measurement {
	readonly dialogCount: number;
	/**
	 * Dialogpositionen, an denen ein gewöhnliches 3000-px-`div` **im Fluss**
	 * `scrollWidth` nicht bewegt — dort ist die Hauptprüfung ohne Aussage.
	 * Erwartet: leer, sobald die Aufklapp-Animationen durch sind.
	 */
	readonly deadPositions: readonly Probe[];
	/** Ein Eintrag je Dialog, der `scrollWidth` bewegt hat — erwartet: leer. */
	readonly contributing: readonly Probe[];
	/** Gegenprobe: `scrollWidth` mit `transform` am Elternelement. */
	readonly control: Probe | null;
}

/**
 * Klappt jede Disclosure der Seite auf.
 *
 * Ohne das steht der `upload-notice-dialog` auf `/` in einer zugeklappten
 * `.collapse` und kann von dort aus nichts bewegen — siehe Kopfkommentar.
 */
const openDisclosures = (page: Page): Promise<void> =>
	page.evaluate(() => {
		for (const d of document.querySelectorAll<HTMLDetailsElement>('details')) d.open = true;
	});

const measure = (page: Page): Promise<Measurement> =>
	page.evaluate(() => {
		const de = document.documentElement;
		const dialogs = [...document.querySelectorAll<HTMLDialogElement>('dialog.modal')];

		const label = (d: HTMLDialogElement, i: number) =>
			d.dataset.testid ?? d.getAttribute('aria-labelledby') ?? `dialog[${i}]`;

		/* Aufblasen statt Vorhandenes messen: Die realen Breiten liegen heute
		   knapp am Viewport und wären als Sonde zu schwach — 3000 px kann kein
		   Layout unbemerkt schlucken. `scrollWidth` wird als Differenz gelesen,
		   nicht gegen `clientWidth`: Eine Route, die schon anderweitig überläuft,
		   soll hier keinen Fehlalarm auslösen (und keinen verdecken). */
		const blowUp = (d: HTMLDialogElement) => {
			const saved = d.style.cssText;
			const before = de.scrollWidth;
			d.style.width = '3000px';
			const after = de.scrollWidth;
			d.style.cssText = saved;
			return { before, after };
		};

		/* Dieselbe Breite, aber an einem gewöhnlichen `div` im Fluss und an
		   derselben Stelle im Baum. Was hier still bleibt, kann auch der Dialog
		   nicht bewegen — dann misst die Hauptprüfung nichts. */
		const probeFlow = (d: HTMLDialogElement) => {
			const parent = d.parentElement;
			if (!parent) return { before: de.scrollWidth, after: de.scrollWidth };
			const probe = document.createElement('div');
			/* `min-width` und `flex: none` zusätzlich zur `width`: In einem Flex-
			   oder Grid-Container schrumpft eine reine Breitenangabe auf den
			   verfügbaren Platz, und die Sonde wäre aus dem falschen Grund still. */
			probe.style.cssText = 'width:3000px;min-width:3000px;height:1px;flex:none';
			const before = de.scrollWidth;
			parent.insertBefore(probe, d);
			const after = de.scrollWidth;
			probe.remove();
			return { before, after };
		};

		const deadPositions: Probe[] = [];
		const contributing: Probe[] = [];
		dialogs.forEach((d, i) => {
			const flow = probeFlow(d);
			if (flow.after <= flow.before) {
				deadPositions.push({ label: label(d, i), ...flow });
				return;
			}
			const { before, after } = blowUp(d);
			if (after > before) contributing.push({ label: label(d, i), before, after });
		});

		/* Gegenprobe am ersten Dialog der Seite: Mit einem umschließenden Block
		   am Elternelement MUSS derselbe Handgriff `scrollWidth` bewegen. */
		let control: Measurement['control'] = null;
		const first = dialogs[0];
		if (first?.parentElement) {
			const parent = first.parentElement;
			const savedParent = parent.style.cssText;
			parent.style.transform = 'translateZ(0)';
			const { before, after } = blowUp(first);
			parent.style.cssText = savedParent;
			control = { label: label(first, 0), before, after };
		}

		return { dialogCount: dialogs.length, deadPositions, contributing, control };
	});

test.describe('Modal-Dialoge — kein Beitrag zum horizontalen Überlauf', () => {
	for (const route of ROUTES) {
		test(`${route.path}: geschlossene .modal-Dialoge bleiben aus dem Fluss`, async ({
			page,
			context,
			request,
			baseURL
		}) => {
			await openRoute({ page, context, request, baseURL }, route);

			/* Gewartet wird auf die Wirkung: Erst wenn ein 3000-px-`div` im Fluss
			   an *jeder* Dialogposition `scrollWidth` bewegt, hat die Messung
			   darunter überhaupt eine Aussage. Solange eine Aufklapp-Animation
			   läuft, klippt `.collapse-content` und die Sonde bleibt still.

			   Das Aufklappen steht mit *in* der Schleife und nicht davor: Eine
			   Disclosure, die erst nach der Hydration dazukommt, bliebe sonst zu,
			   und der Poll könnte nur noch ins Timeout laufen. Auf ein bereits
			   offenes `<details>` wirkt der Handgriff nicht — er startet keine
			   Animation neu. */
			let last: Measurement | undefined;
			await expect
				.poll(
					async () => {
						await openDisclosures(page);
						return (last = await measure(page)).deadPositions.map((p) => p.label);
					},
					{
						message:
							`${route.path}: An diesen Dialogpositionen bewegt selbst ein gewöhnliches ` +
							'3000-px-`div` im Fluss `documentElement.scrollWidth` nicht. Der Teilbaum ' +
							'schneidet also ab (`overflow-x: clip|hidden|auto`) — dort erfüllt jeder Dialog ' +
							'„zählt nicht mit" trivial, und ein Grün wäre ohne Aussage. Häufigste Ursache: ' +
							'eine `.collapse` mitten in der Aufklapp-Animation (dann ist es ein Timing-' +
							'Problem dieses Tests), sonst ein dauerhaft klippender Vorfahr (dann gehört der ' +
							'Dialog dort heraus oder die Route hier ausgetragen).',
						timeout: 10_000
					}
				)
				.toEqual([]);

			const { dialogCount, contributing, control } = last!;

			expect(
				dialogCount,
				`${route.path} rendert nur ${dialogCount} statt mindestens ${route.minDialogs} \`dialog.modal\`. ` +
					'Der Test hätte damit nichts geprüft und wäre trotzdem grün geworden. Entweder ist ein ' +
					'Dialog verschwunden (dann die Untergrenze in ROUTES anpassen) oder die Seite hat nicht ' +
					'vollständig gerendert.'
			).toBeGreaterThanOrEqual(route.minDialogs);

			expect(
				control,
				`${route.path}: Gegenprobe konnte nicht gefahren werden — kein Dialog mit Elternelement gefunden.`
			).not.toBeNull();

			expect(
				control!.after,
				`${route.path}: Die Gegenprobe an "${control?.label}" hat NICHT angeschlagen ` +
					`(${control?.before} → ${control?.after}). Mit einem \`transform\` am Elternelement muss ein ` +
					'3000 px breiter Dialog den Überlauf erzeugen. Tut er das nicht, misst die Sonde etwas ' +
					'anderes als gedacht — und ihr Grün oben ist wertlos.'
			).toBeGreaterThan(control!.before);

			expect(
				contributing,
				`${route.path}: ${contributing.length} Dialog(e) zählen in documentElement.scrollWidth mit — ` +
					`${contributing.map((c) => `${c.label} (${c.before} → ${c.after})`).join(', ')}. ` +
					'Ein `.modal` ist `position: fixed` und darf das nicht. Ursache ist fast immer ein neuer ' +
					'umschließender Block an einem Vorfahren: transform, filter, backdrop-filter, perspective, ' +
					'will-change, contain oder container-type. Hintergrund in .claude/rules/daisyui.md → ' +
					'„Geschlossene `.modal`-Dialoge sind kein Überlauf-Verdacht".'
			).toEqual([]);
		});
	}
});

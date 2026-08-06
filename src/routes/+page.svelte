<!--
  OstseeSichtung - Hauptseite
  Meldeformular für Meerestier-Sichtungen in der Ostsee
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { pushState, replaceState } from '$app/navigation';
	import { tick } from 'svelte';
	import { createLogger } from '$lib/logger';
	import ModernReportForm from '$lib/report/components/ModernReportForm.svelte';
	import ReportKindChoice from '$lib/report/components/ReportKindChoice.svelte';
	import SubmissionSuccess from '$lib/report/components/SubmissionSuccess.svelte';
	import {
		clearReportKind,
		readReportKind,
		reportKindToIsDead,
		reportKindToParam,
		resolveReportKind,
		writeReportKind,
		type ReportKind
	} from '$lib/report/reportKind';
	import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '$lib/storage/localStorage';
	import type { SightingFormValues } from '$lib/types/Form';
	import { isNotIFrame } from '$lib/utils/client/isNotIFrame';

	const logger = createLogger('main:page');

	// Success state management
	let submissionSuccess = $state(false);
	let submittedData = $state<SightingFormValues | null>(null);

	// Komponenten-lokal, NICHT als globaler $state in einem .ts-Modul: dort
	// leckt er auf dem Server zwischen Requests.
	//
	// `page.url` steht auch im SSR zur Verfügung (aus der Request-URL) —
	// der Parameter wird deshalb auf Server und Client gleichermaßen
	// ausgewertet, und ein `?meldung=…`-Direktlink des Museums zeigt ohne
	// Umweg das richtige Formular. Nur die Storage-Quellen (gespeicherter
	// Zweig, gespeichertes `isDead`) bleiben hinter `browser`.
	//
	// Richtiggestellt (Abschlussreview B5, 2026-08-06): Der frühere Kommentar
	// hier behauptete, das Gatter verhindere einen kurzen Auswahlseiten-Flash
	// bei einem Direktlink. Das stimmt nicht — `sessionStorage` existiert im
	// SSR schlicht nicht, das Gatter verhindert nur einen Absturz beim
	// Zugriff, keinen Flash. Der Flash ist für Wiederkehrer OHNE `meldung` in
	// der URL real: Der Server kennt die Storage-Quellen nicht und rendert die
	// Auswahlseite, bis die Hydration den gespeicherten Zweig nachträgt.
	// Ungelöst bleibt das hier nicht — der `$effect` weiter unten trägt den
	// aufgelösten Zweig nachträglich in die URL nach, damit zumindest das
	// NÄCHSTE Reload serverseitig sofort richtig auflöst.
	let reportKind = $state<ReportKind | null>(
		resolveReportKind(
			page.url.searchParams.get('meldung'),
			browser ? readReportKind() : null,
			browser
				? ((loadFromStorage(STORAGE_KEYS.FORM_DATA, null) as { isDead?: boolean } | null)?.isDead ??
						null)
				: null
		)
	);

	function choose(kind: ReportKind) {
		reportKind = kind;
		writeReportKind(kind);
		// History-Eintrag, damit „Zurück" auf die Auswahl führt statt aus der App.
		// Bestehende Query-Parameter (z. B. Kampagnen-Marker aus einem
		// Museums-Link) bleiben erhalten — nur `meldung` wird gesetzt/ersetzt.
		// Wirft weg, keine Komponenten-Reaktivität nötig — dasselbe Muster wie in
		// ExportModal.svelte.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const params = new URLSearchParams(window.location.search);
		params.set('meldung', reportKindToParam(kind));
		pushState(`/?${params.toString()}`, {});
	}

	/**
	 * Gemeinsamer Kern von `changeKind()` und `resetReportKind()` (beide unten):
	 * Zweig auf „noch nicht gewählt" zurücksetzen, den Migrationspfad
	 * neutralisieren und die URL bereinigen, damit die Auswahlseite erscheint
	 * und auch ein Reload dort stehen bleibt.
	 *
	 * `resolveReportKind` hat DREI Quellen, nicht zwei: Query-Parameter,
	 * gespeicherter Zweig — UND `isDead` aus den persistierten Formulardaten
	 * (Migrationspfad für den Altbestand ohne `reportKind`). `clearReportKind()`
	 * räumt nur die zweite Quelle. `ModernReportForm` schreibt `isDead` aber
	 * bereits beim bloßen Öffnen des Formulars nach `FORM_DATA` (siehe dessen
	 * `$effect`, das `$form` verfolgt) — ohne die dritte Quelle ebenfalls zu
	 * neutralisieren, fiele ein Reload auf der frisch gezeigten Auswahlseite
	 * sofort in den verlassenen Zweig zurück, noch bevor eine neue Auswahl
	 * getroffen wurde. Neutralisiert wird deshalb NUR `isDead` selbst — die
	 * übrigen Formulardaten (Position, Datum, Medien, Kontakt) bleiben
	 * unangetastet, sie sind der aufwendigste Teil der Eingabe.
	 *
	 * Der Schlüssel wird dabei ENTFERNT, nicht auf `null` gesetzt:
	 * `sightingSchema.isDead` ist `yup.boolean().default(false)` und nicht
	 * nullable — der Default greift nur bei `undefined`, nicht bei `null`. Ein
	 * fehlender Schlüssel ergibt für `resolveReportKind`s `savedIsDead` über
	 * `?.isDead ?? null` denselben `null` wie ein explizites `null` — UND
	 * lässt `ModernReportForm.svelte` beim nächsten Laden (dortige
	 * `loadFromStorage`-Whitelist gegen `initialFormData`) den Schema-Default
	 * `false` wiederherstellen, statt ein `null` durchzureichen, das das Schema
	 * nicht kennt.
	 */
	function returnToSelection() {
		reportKind = null;
		clearReportKind();
		if (browser) {
			const savedFormData = loadFromStorage<Record<string, unknown> | null>(
				STORAGE_KEYS.FORM_DATA,
				null
			);
			if (savedFormData) {
				const { isDead, ...formDataWithoutIsDead } = savedFormData;
				saveToStorage(STORAGE_KEYS.FORM_DATA, formDataWithoutIsDead);
			}
		}
		// Bestehende Query-Parameter bleiben erhalten — nur `meldung` entfällt.
		// Gleiches Muster wie in `choose()`.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const params = new URLSearchParams(window.location.search);
		params.delete('meldung');
		pushState(`/?${params.toString()}`, {});
	}

	/**
	 * Ausgelöst vom „Ändern"-Knopf in `AnimalInfo` (Schritt 2, über
	 * `ModernReportForm` → `Step2SightingDetails` durchgereicht): zurück zur
	 * Auswahlseite. `history.back()` wäre hier keine Alternative — wer über den
	 * Storage direkt im Formular landet, hat keinen History-Eintrag dafür, und
	 * im meeresmuseum.de-iframe navigierte `back()` die Elternseite weg statt
	 * nur den Zweig zurückzusetzen.
	 */
	function changeKind() {
		returnToSelection();
	}

	/**
	 * Gegenstück zu `onReset()` in `ModernReportForm` („Formular zurücksetzen"),
	 * über dessen `onreset`-Prop verdrahtet (Abschlussreview B1). Der Klick dort
	 * räumt Storage und Formular-Zustand bereits auf, kann den Zweig-`$state`
	 * hier aber nicht selbst anfassen — ohne dieses Gegenstück bliebe die
	 * Auswahlseite unsichtbar, `isDead` fiele im Formular still auf den
	 * Schema-Default `false` zurück, während die URL weiter den alten Zweig
	 * trägt: ein Totfund liefe nach dem Reset lautlos als Lebendsichtung weiter.
	 *
	 * `await tick()`, bevor `returnToSelection()` liest: `onReset()` ruft
	 * `formContext.updateInitialValues(...)` auf, das `$form` ändert — der
	 * `$effect` dort, der `$form` nach `FORM_DATA` spiegelt, läuft aber erst im
	 * nächsten Svelte-Flush. Ohne das Warten läse `returnToSelection()`
	 * entweder noch die soeben gelöschten Daten, oder der Effekt schriebe NACH
	 * dem Aufräumen hier ein frisches `isDead: false` in den Storage zurück.
	 */
	async function resetReportKind() {
		await tick();
		returnToSelection();
	}

	// `popstate` statt `page.url`, weil `pushState` `page.url` nicht
	// aktualisiert (Shallow Routing). Läuft bidirektional durch denselben
	// Resolver wie die Initialisierung; `stored`/`savedIsDead` bleiben `null`,
	// sonst belebte der gespeicherte Zweig die Auswahl beim Zurückgehen wieder.
	$effect(() => {
		if (!browser) return;

		function onPopState() {
			const params = new URLSearchParams(window.location.search);
			reportKind = resolveReportKind(params.get('meldung'), null, null);
		}

		window.addEventListener('popstate', onPopState);
		return () => window.removeEventListener('popstate', onPopState);
	});

	/**
	 * Abschlussreview B5: Zweig aus Storage/Migration nachträglich in die URL
	 * schreiben. `choose()` setzt `meldung` bereits beim Klick (Spec §6.8) —
	 * diese Stelle deckt die Fälle ab, in denen der Zweig NICHT über einen
	 * Klick, sondern über die Storage-Quellen aufgelöst wurde (Lesezeichen auf
	 * die bloße Startseite, iframe-Reload der Elternseite auf
	 * meeresmuseum.de). Ohne sie bliebe die URL dauerhaft ohne `meldung`, und
	 * JEDES Reload zeigte erneut kurz die Auswahlseite, bevor die Hydration den
	 * Zweig nachträgt.
	 *
	 * `replaceState`, nicht `pushState`: Das ist ein Nachtragen, kein
	 * Nutzer-Ereignis — es soll keinen eigenen History-Eintrag erzeugen. Der
	 * Vergleich gegen den aktuellen Parameter macht den Effekt zum No-op,
	 * sobald `choose()`/`changeKind()` die URL bereits selbst gesetzt haben.
	 *
	 * `await tick()`, bevor `replaceState` läuft: Löst sich der Zweig schon
	 * beim allerersten Rendern aus dem Storage auf (kein Klick), feuert dieser
	 * Effekt noch WÄHREND SvelteKit seine eigene Root-Komponente aufbaut
	 * (`client.js`: `root = new app.root(...)`) — die Zuweisung an `root` ist
	 * zu diesem Zeitpunkt noch nicht abgeschlossen, `replaceState` bricht
	 * dann mit einer nicht abgefangenen Rejection ab (`root.$set is not a
	 * function`, empirisch reproduziert). `tick()` verschiebt den Aufruf hinter
	 * den aktuellen Konstruktionsdurchlauf.
	 */
	$effect(() => {
		if (!browser || reportKind === null) return;
		const target = reportKindToParam(reportKind);
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const params = new URLSearchParams(window.location.search);
		if (params.get('meldung') === target) return;
		tick().then(() => {
			params.set('meldung', target);
			replaceState(`/?${params.toString()}`, {});
		});
	});

	/**
	 * Handle form submission
	 */
	async function handleSubmit(formData: SightingFormValues) {
		logger.info(formData, 'Submitting sighting report submitted successfully');
		// Simulate successful submission
		submissionSuccess = true;
		submittedData = formData;
	}

	/**
	 * Handle new submission after success
	 *
	 * Abschlussreview B2: Ohne `returnToSelection()` blieb der Zweig-`$state`
	 * über eine erfolgreiche Übermittlung hinaus stehen — wer gerade einen
	 * Kadaver gemeldet hatte, landete beim nächsten Schweinswal ungefragt
	 * wieder im Totfund-Formular. Spec §6.2 verlangt hier dieselbe Rückkehr zur
	 * Auswahlseite wie bei „Ändern" und beim Formular-Reset.
	 */
	function handleNewReport() {
		submissionSuccess = false;
		submittedData = null;
		returnToSelection();
	}
</script>

<svelte:head>
	<title>Ostsee-Tiere - Meerestiere melden</title>
	<meta
		name="description"
		content="Ostsee-Tiere - Melden Sie Ihre Meerestier-Sichtung in der Ostsee. Unterstützen Sie die Meeresforschung mit Ihren Beobachtungen."
	/>
	<meta
		name="keywords"
		content="Meerestiere, Sichtung, Ostsee, Schweinswal, Robben, Melden, Forschung, Naturbeobachtung"
	/>

	<!-- Open Graph -->
	<meta property="og:title" content="Ostsee-Tiere - Meerestiere melden" />
	<meta
		property="og:description"
		content="Melden Sie Ihre Meerestier-Sichtung in der Ostsee. Unterstützen Sie die Meeresforschung mit Ihren Beobachtungen."
	/>
	<meta property="og:type" content="website" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Ostsee-Tiere - Meerestiere melden" />
	<meta
		name="twitter:description"
		content="Melden Sie Ihre Meerestier-Sichtung in der Ostsee. Unterstützen Sie die Meeresforschung mit Ihren Beobachtungen."
	/>
</svelte:head>

<div
	class="bg-base-100 mx-auto p-6"
	class:max-w-[600px]={!isNotIFrame}
	class:max-w-2xl={isNotIFrame}
>
	<div class="mb-8">
		<!-- Form Content -->
		{#if reportKind === null}
			<ReportKindChoice onchoose={choose} />
		{:else if submissionSuccess && submittedData}
			<SubmissionSuccess {submittedData} {handleNewReport} />
		{:else}
			<ModernReportForm
				onSubmit={handleSubmit}
				initialIsDead={reportKindToIsDead(reportKind)}
				onchangekind={changeKind}
				onreset={resetReportKind}
			/>
		{/if}
	</div>
</div>

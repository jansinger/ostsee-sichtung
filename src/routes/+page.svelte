<!--
  OstseeSichtung - Hauptseite
  Meldeformular für Meerestier-Sichtungen in der Ostsee
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { pushState } from '$app/navigation';
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
	// ausgewertet. Nur die `localStorage`-Quellen (gespeicherter Zweig,
	// gespeichertes `isDead`) bleiben hinter `browser`: Ohne das Gatter
	// rendert der Server bei jeder Anfrage per Direktlink kurz die
	// Auswahlseite, bevor die Hydration den localStorage-Stand nachträgt —
	// ein Klick in diesem Fenster ginge verloren (natives `checked` springt
	// an, Sveltes State bleibt `null`).
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
	 * Gegenstück zu `choose()`, ausgelöst vom „Ändern"-Knopf in `AnimalInfo`
	 * (Schritt 2, über `ModernReportForm` → `Step2SightingDetails`
	 * durchgereicht): zurück zur Auswahlseite. `history.back()` wäre hier keine
	 * Alternative — wer über den `localStorage` direkt im Formular landet, hat
	 * keinen History-Eintrag dafür, und im meeresmuseum.de-iframe navigierte
	 * `back()` die Elternseite weg statt nur den Zweig zurückzusetzen.
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
	 * unangetastet, sie sind der aufwendigste Teil der Eingabe. Das Leeren der
	 * zweigspezifischen Felder (z. B. `deadCondition`) ist Task 8.
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
	function changeKind() {
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
	 */
	function handleNewReport() {
		submissionSuccess = false;
		submittedData = null;
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
			/>
		{/if}
	</div>
</div>

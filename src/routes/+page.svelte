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
		readReportKind,
		reportKindToIsDead,
		resolveReportKind,
		writeReportKind,
		type ReportKind
	} from '$lib/report/reportKind';
	import { loadFromStorage, STORAGE_KEYS } from '$lib/storage/localStorage';
	import type { SightingFormValues } from '$lib/types/Form';
	import { isNotIFrame } from '$lib/utils/client/isNotIFrame';

	const logger = createLogger('main:page');

	// Success state management
	let submissionSuccess = $state(false);
	let submittedData = $state<SightingFormValues | null>(null);

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

	/**
	 * Der Nutzer navigiert mit „Zurück" auf einen Stand ohne Parameter — dann
	 * gehört die Auswahl wieder gezeigt.
	 *
	 * **Abweichung vom Plan:** Der Plan sah dafür einen `$effect` auf
	 * `page.url`/`page.state` (`$app/state`) vor. Gemessen (Playwright,
	 * Konsolen-Log im Effekt): `pushState()` mit einer geänderten URL
	 * aktualisiert `page.url` in dieser SvelteKit-Version NIE — auch nicht
	 * verzögert. Grund ist die Zweckbestimmung von Shallow Routing selbst:
	 * `pushState` erzeugt einen History-Eintrag „ohne zu navigieren", und
	 * SvelteKit hält `page.url` deshalb bewusst auf der zuletzt tatsächlich
	 * navigierten Seite — hier `/`. Ein `$effect`, der auf `reportKind`
	 * reagiert, sah dadurch **immer** „kein Parameter" und setzte die gerade
	 * getroffene Auswahl sofort wieder zurück; die Reihenfolge von
	 * `pushState`/Zuweisung änderte daran nichts (beide Varianten geprüft).
	 *
	 * Der native `popstate`-Handler liest stattdessen `window.location.search`
	 * direkt — dieselbe Frage („steht der Parameter noch in der aktuellen
	 * URL?"), nur ohne den Umweg über `page.url`. `popstate` feuert genau bei
	 * Browser-Zurück/Vor, nicht bei `pushState` selbst.
	 */
	$effect(() => {
		if (!browser) return;

		function onPopState() {
			const params = new URLSearchParams(window.location.search);
			if (!params.get('meldung')) {
				reportKind = null;
			}
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
			<ModernReportForm onSubmit={handleSubmit} initialIsDead={reportKindToIsDead(reportKind)} />
		{/if}
	</div>
</div>

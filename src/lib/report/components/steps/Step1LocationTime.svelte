<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import PositionAndTime from '$lib/report/components/sections/PositionAndTime.svelte';
	import ReportKindFeedback from '$lib/report/components/ReportKindFeedback.svelte';

	let {
		// Default-Noop wie an den übrigen `onchangekind`-Aufrufstellen
		// (`Step2SightingDetails.svelte`): `exactOptionalPropertyTypes` verbietet
		// sonst das Weiterreichen eines undefaulteten optionalen Props.
		onchangekind = () => {}
	}: {
		/** Reicht den „Ändern"-Knopf aus `ReportKindFeedback` unverändert weiter —
		 *  nur `+page.svelte` kennt die Einstiegsseite, zu der er zurückführt. */
		onchangekind?: () => void;
	} = $props();
</script>

<div class="space-y-6 md:space-y-8">
	<!-- Step Header -->
	<div class="space-y-2 px-2 text-center md:px-0">
		<!-- Unterhalb `md` ausgeblendet: Das Symbol ist dekorativ (die Überschrift
		     darunter sagt dasselbe) und kostete mit seinem Abstand 48 px in genau
		     dem Bereich, in dem der Platz fehlt. Auf breiten Geräten bleibt es. -->
		<div class="hidden justify-center md:flex">
			<div
				class="bg-primary/20 flex h-10 w-10 items-center justify-center rounded-full md:h-12 md:w-12"
			>
				<Icon icon="lucide:map-pin" width="20" class="text-primary md:h-6 md:w-6" />
			</div>
		</div>
		<h2 class="text-base-content text-xl font-bold md:text-2xl">Position & Zeitpunkt</h2>
		<p class="text-base-content/70 mx-auto max-w-2xl text-sm md:text-base">
			<strong>Wo und wann fand die Sichtung statt?</strong> Je genauer, desto wertvoller für die Forschung.
		</p>
		<!-- Abschlussreview B6: Genau hier merkt ein Melder am ehesten, dass er
		     falsch abgebogen ist („Funddatum" statt „Datum und Uhrzeit" weiter
		     unten) — bislang stand der einzige Korrekturweg erst auf Schritt 2,
		     unterhalb der Upload-Karte. Dieselbe Rückmeldung wie dort
		     (`sections/AnimalInfo.svelte`), ausgelagert nach
		     `ReportKindFeedback.svelte`, damit die Regel nicht zweimal existiert. -->
		<ReportKindFeedback {onchangekind} />
	</div>

	<!-- Step Content -->
	<PositionAndTime />
</div>

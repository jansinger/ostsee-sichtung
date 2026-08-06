<script lang="ts">
	import { getFormContext } from '$lib/report/formContext';
	import { isDeadFinding } from '$lib/report/formConfig';

	// Default-Noop wie an den übrigen `onchangekind`-Aufrufstellen
	// (`Step2SightingDetails.svelte`, `ModernReportForm.svelte`):
	// `exactOptionalPropertyTypes` verbietet sonst das Weiterreichen eines
	// undefaulteten optionalen Props.
	let { onchangekind = () => {} }: { onchangekind?: () => void } = $props();

	const { form } = getFormContext();
</script>

<!--
  Abschlussreview B6: Diese Rückmeldung stand bis dahin ausschließlich in
  `sections/AnimalInfo.svelte` (Schritt 2) — auf Schritt 1 gab es damit keinen
  Korrekturweg zurück zur Einstiegsseite, obwohl der Melder genau dort am
  ehesten merkt, falsch abgebogen zu sein („Funddatum" statt „Datum und
  Uhrzeit"). Ausgelagert hierher, damit dieselbe Zeile an zwei Stellen
  (`AnimalInfo.svelte`, `steps/Step1LocationTime.svelte`) stehen kann, ohne
  dass die Regel zweimal gepflegt wird und beide Antworten auseinanderlaufen
  können.

  isDeadFinding statt eines rohen Booleans: `isDead` kommt beim Wiederaufsetzen
  aus dem Storage als String und in der Admin-Maske als Zahl aus der DB. Ein
  roher Ternär (`$form.isDead ? … : …`) träfe bei einem falsy-wirkenden, aber
  nicht-leeren String wie '0' die falsche Antwort.
-->
<p class="text-base-content/70 text-support mb-4">
	Sie melden:
	<strong class="text-base-content">
		{isDeadFinding($form.isDead) ? 'Fund eines toten Tieres' : 'Beobachtung eines lebenden Tieres'}
	</strong>
	<!-- Trennpunkt aus Spec §7.5 („Sie melden: … · [Ändern]"). Bedeutungslos für
	     Screenreader — aria-hidden, wie die übrigen Zierzeichen im Projekt
	     (design-system.md, „*-Regel"-Abschnitt). -->
	<span aria-hidden="true"> · </span>
	<button
		type="button"
		class="btn btn-outline btn-sm"
		onclick={onchangekind}
		aria-label="Art der Meldung ändern"
	>
		Ändern
	</button>
</p>

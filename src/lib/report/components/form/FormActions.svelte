<script lang="ts">
	import { getFormContext } from '$lib/report/formContext';
	import ReportKindFeedback from '$lib/report/components/ReportKindFeedback.svelte';

	// `onCancel` bleibt Teil der Props für Abwärtskompatibilität mit
	// ModernReportForm.svelte, das den Wert weiterreicht. Der bisherige
	// "Abbrechen"-Button wurde entfernt, da `onCancel` in der einzigen
	// aktuellen Einbindung (src/routes/+page.svelte) auf dieselbe Seite
	// navigiert, auf der das Formular bereits liegt — der Button hatte also
	// keine erkennbare Wirkung. Ein Button ohne Funktion ist schlechter als
	// gar keiner. Sollte künftig ein Aufrufer eine echte Abbrechen-Semantik
	// benötigen (z.B. iFrame-Einbindung mit "zurück an Elternseite"), kann
	// hier wieder ein Button ergänzt werden.
	let {
		onReset = () => {},
		onCancel: _onCancel = () => {},
		// Default-Noop wie an den übrigen `onchangekind`-Aufrufstellen:
		// `exactOptionalPropertyTypes` verbietet sonst das Weiterreichen als
		// `{onchangekind}` an `ReportKindFeedback`, dessen eigener Default
		// (`= () => {}`) den externen Proptyp auf `() => void` ohne `undefined`
		// verengt.
		onchangekind = () => {}
	}: {
		onReset?: () => void;
		onCancel?: () => void;
		/** Reicht den „Ändern"-Knopf aus `ReportKindFeedback` weiter — nur
		 *  `+page.svelte` kennt die Einstiegsseite, zu der er zurückführt. */
		onchangekind?: () => void;
	} = $props();

	const { isSubmitting } = getFormContext();

	function handleReset() {
		if (
			confirm(
				'Möchten Sie das Formular wirklich zurücksetzen? Alle bisher eingegebenen Daten gehen verloren.'
			)
		) {
			onReset();
		}
	}
</script>

<!-- Form Actions -->
<div
	class="mx-auto mt-8 flex flex-col items-center gap-2 md:flex-row md:justify-between md:gap-4"
	data-testid="form-actions"
>
	<!-- „Sie melden: … · [Ändern]" stand bis hierher am Kopf von Schritt 1 und
	     ein zweites Mal in der Karte „Tierinformationen" auf Schritt 2. Oben
	     verbrauchte die Zeile genau den Platz, der auf dem Telefon am knappsten
	     ist — vor dem ersten Feld stehen dort schon Seitentitel, Schritt-Anzeige
	     und Schritt-Überschrift. Hier unten steht sie neben „Zurücksetzen", wo
	     die übrigen Korrekturen an der Meldung als Ganzes sitzen, und gilt für
	     alle vier Schritte statt nur für zwei. -->
	<ReportKindFeedback {onchangekind} />

	<button
		type="button"
		class="btn btn-outline btn-error btn-sm w-full md:w-auto"
		onclick={handleReset}
		disabled={$isSubmitting}
	>
		Formular zurücksetzen
	</button>
</div>

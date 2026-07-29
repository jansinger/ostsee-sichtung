<script lang="ts">
	import { getFormContext } from '$lib/report/formContext';

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
		onCancel: _onCancel = () => {}
	}: {
		onReset?: () => void;
		onCancel?: () => void;
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
<div class="mx-auto mt-8 flex justify-center md:justify-start">
	<button
		type="button"
		class="btn btn-outline btn-error btn-sm min-h-11 w-full md:w-auto"
		onclick={handleReset}
		disabled={$isSubmitting}
	>
		Formular zurücksetzen
	</button>
</div>

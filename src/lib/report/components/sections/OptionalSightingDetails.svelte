<script lang="ts">
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import SectionCard from './SectionCard.svelte';

	/** Siehe `Behavior.svelte` — vollständiger Editor statt kuratierter Teilmenge. */
	let { adminMode = false }: { adminMode?: boolean } = $props();
</script>

<!-- Sighting Details Section -->
<SectionCard title="Weitere Sichtungsdetails" icon="lucide:activity">
	<!-- Das Museum hat „Verteilung der Tiere" am 2026-08-04 aus dem Meldeformular
	     abbestellt: Sie lässt sich aus der Anzahl der Tiere erschließen. Die
	     Admin-Maske behält das Feld, weil dort der Bestand korrigiert wird. -->
	{#if adminMode}
		<FormField name="distribution" />
	{/if}

	<!-- `shipCount` steht im Meldeformular jetzt in `BoatInfo.svelte`: Die Anzahl
	     umliegender Schiffe gehört zu den Boot-/Schiffsangaben, nicht zwischen
	     die Beobachtungsdetails. Die Admin-Maske bindet `BoatInfo` nicht ein und
	     bekommt das Feld deshalb hier — sonst wäre es dort ersatzlos weg
	     (5.539 Datensätze mit Inhalt). -->
	{#if adminMode}
		<FormField name="shipCount" />
	{/if}
</SectionCard>

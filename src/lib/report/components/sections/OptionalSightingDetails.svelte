<script lang="ts">
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import SectionCard from './SectionCard.svelte';

	/** Siehe `Behavior.svelte` — vollständiger Editor statt kuratierter Teilmenge. */
	let { adminMode = false }: { adminMode?: boolean } = $props();
</script>

<!-- Sighting Details Section -->
<!-- Die Karte als Ganzes hängt an `adminMode`, nicht mehr nur ihre Felder: Beide
     Felder sind inzwischen admin-only — `distribution` seit dem 2026-08-04,
     `shipCount` seit dem Umzug nach `BoatInfo.svelte`. Im Meldeformular blieb
     dadurch eine Karte mit Überschrift, Rahmen und Abstand übrig, in der nichts
     stand; `SectionCard` rendert seinen Titel unbedingt und kennt keinen
     Leer-Zustand.

     Der innere Schutz bleibt trotzdem sinnvoll: Bindet jemand die Sektion später
     wieder ins Meldeformular ein, zeigt sie dort nicht still zwei Felder, die
     das Museum abbestellt hat. -->
{#if adminMode}
	<SectionCard title="Weitere Sichtungsdetails" icon="lucide:activity">
		<!-- Das Museum hat „Verteilung der Tiere" am 2026-08-04 aus dem Meldeformular
		     abbestellt: Sie lässt sich aus der Anzahl der Tiere erschließen. Die
		     Admin-Maske behält das Feld, weil dort der Bestand korrigiert wird. -->
		<FormField name="distribution" />

		<!-- `shipCount` steht im Meldeformular jetzt in `BoatInfo.svelte`: Die Anzahl
		     umliegender Schiffe gehört zu den Boot-/Schiffsangaben, nicht zwischen
		     die Beobachtungsdetails. Die Admin-Maske bindet `BoatInfo` nicht ein und
		     bekommt das Feld deshalb hier — sonst wäre es dort ersatzlos weg
		     (5.539 Datensätze mit Inhalt). -->
		<FormField name="shipCount" />
	</SectionCard>
{/if}

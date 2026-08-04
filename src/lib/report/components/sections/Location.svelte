<script lang="ts">
	import { getFormContext } from '$lib/report/formContext';
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import LocationInput from '$lib/report/components/form/LocationInput.svelte';
	import VerifyLocation from '$lib/report/components/form/VerifyLocation.svelte';
	import { toCoordinate } from '$lib/report/components/form/coordinateValue';
	import SectionCard from './SectionCard.svelte';

	const { form, handleChange } = getFormContext();

	// Reactive form state using Svelte 5 $derived runes
	let hasPosition = $derived($form.hasPosition);

	// Rohwerte aus dem Formular (im Admin ggf. Strings aus toFixed) auf echte
	// Zahlen normalisieren. Fehlt eine Koordinate, bleibt sie undefined —
	// LocationInput zentriert die Karte dann über defaultCenter, ohne die
	// Eingabefelder mit Phantom-Werten zu füllen.
	let latitude = $derived(toCoordinate($form.latitude));
	let longitude = $derived(toCoordinate($form.longitude));
</script>

<!-- Location Section -->
<SectionCard title="Standort der Sichtung" icon="lucide:map-pin">
	<!-- Position Type Selection -->
	<FormField name="hasPosition" />

	<!-- GPS Coordinates (shown when hasPosition = true) -->
	{#if hasPosition}
		<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-1">
			<!-- `required={hasPosition}` statt eines festen `true`: Das Sternchen an
			     den Koordinaten und die Schema-Regel
			     (`latitude.when('hasPosition', …)`) sollen aus derselben Größe
			     kommen wie das `{#if}` darüber. Wer die Bedingung des Blocks später
			     ändert, ändert damit auch die Pflicht-Markierung mit. -->
			<LocationInput {latitude} {longitude} required={hasPosition} onchange={handleChange} />

			{#if latitude !== undefined && longitude !== undefined}
				<VerifyLocation {longitude} {latitude} />
			{/if}
		</div>
	{/if}

	<!--
		Ortsbeschreibung und Seezeichen stehen UNABHÄNGIG von `hasPosition` — anders
		als im Meldeformular, wo die Beschreibung die Alternative zur Position ist.
		Hier wird ein vorhandener Datensatz korrigiert, nicht eine Meldung erfasst:
		Koordinaten und Ortstext schließen einander nicht aus, sie stehen im
		Altbestand regelmäßig nebeneinander.

		Vorher lagen beide Felder im `{:else}`-Zweig, und `adminEditInitialValues`
		leitet `hasPosition` aus den Koordinaten ab. Damit war ausgerechnet der
		Altbestand unerreichbar, dessentwegen `seaMark` überhaupt im Schema bleibt:
		902 der 1.033 Datensätze mit Seezeichen tragen zugleich Koordinaten, bei
		`fahrwasser` sind es 1.191 (gemessen am 2026-08-02).

		Das Meldeformular ist davon nicht betroffen — es nutzt
		`position/LocationDescription.svelte` und zeigt seit A2.4 nur `waterway`.
	-->
	<FormField name="waterway" />
	<FormField name="seaMark" />
</SectionCard>

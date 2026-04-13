<script lang="ts">
	import { getFormContext } from '$lib/report/formContext';
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import LocationInput from '$lib/report/components/form/LocationInput.svelte';
	import VerifyLocation from '$lib/report/components/form/VerifyLocation.svelte';
	import SectionCard from './SectionCard.svelte';

	const { form, handleChange } = getFormContext();

	// Reactive form state using Svelte 5 $derived runes
	let hasPosition = $derived($form.hasPosition);
</script>

<!-- Location Section -->
<SectionCard title="Standort der Sichtung" icon="lucide:map-pin">
	<!-- Position Type Selection -->
	<FormField name="hasPosition" />

	<!-- GPS Coordinates (shown when hasPosition = true) -->
	{#if hasPosition}
		<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-1">
			<LocationInput
				latitude={$form.latitude}
				longitude={$form.longitude}
				onchange={handleChange}
			/>

			<VerifyLocation longitude={$form.longitude} latitude={$form.latitude} />
		</div>
	{:else}
		<!-- Waterway Input (shown when hasPosition = false) -->
		<FormField name="waterway" />
		<!-- Sea Mark (always optional) -->
		<FormField name="seaMark" />
	{/if}
</SectionCard>

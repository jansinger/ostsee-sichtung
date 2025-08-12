<script lang="ts">
	import { MapPin } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import { getFormContext } from '$lib/report/formContext';
	import FormField from '../form/fields/FormField.svelte';
	import LocationInput from '../form/LocationInput.svelte';
	import VerifyLocation from '../form/VerifyLocation.svelte';

	const { form, handleChange } = getFormContext();

	// Reactive form state using Svelte 5 $derived runes
	let hasPosition = $derived($form.hasPosition);
</script>

<!-- Location Section -->
<div class="card bg-base-200 shadow-sm">
	<div class="card-body">
		<h3 class="card-title flex items-center gap-2 text-lg">
			<Icon src={MapPin} size="20" class="text-primary" />
			Standort der Sichtung
		</h3>

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
	</div>
</div>

<style>
	/* Card hover effects for better interactivity */
	.card {
		transition: all 0.2s ease;
	}

	.card:hover {
		transform: translateY(-1px);
		box-shadow: 0 8px 25px -8px oklch(var(--b3));
	}
</style>

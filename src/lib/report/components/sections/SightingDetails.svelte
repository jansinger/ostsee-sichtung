<script lang="ts">
	import { getFormContext } from '$lib/report/formContext';
	import { BoatDriveEnum } from '$lib/report/formOptions/boatDrive';
	import { SightingFromEnum } from '$lib/report/formOptions/sightingFrom';
	import { slide } from 'svelte/transition';
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import SectionCard from './SectionCard.svelte';

	const { form } = getFormContext();
</script>

<!-- Sighting Details Section -->
<SectionCard title="Sichtungsdetails" icon="lucide:activity">
	<div class="mt-2 grid grid-cols-1 gap-4 md:grid-cols-1">
		<FormField name="sightingFrom" />
		{#if String($form.sightingFrom) === String(SightingFromEnum.OTHER)}
			<div transition:slide>
				<FormField name="sightingFromText" />
			</div>
		{/if}
	</div>
	<div class="mt-2 grid grid-cols-1 gap-4 md:grid-cols-1">
		<FormField name="boatDrive" />
		{#if String($form.boatDrive) === String(BoatDriveEnum.OTHER)}
			<div transition:slide>
				<FormField name="boatDriveText" />
			</div>
		{/if}
	</div>

	<FormField name="distance" />
</SectionCard>

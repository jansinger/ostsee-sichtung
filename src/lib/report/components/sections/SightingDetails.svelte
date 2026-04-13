<script lang="ts">
	import { getFormContext } from '$lib/report/formContext';
	import { BoatDriveEnum } from '$lib/report/formOptions/boatDrive';
	import { SightingFromEnum } from '$lib/report/formOptions/sightingFrom';
	import Icon from '$lib/components/Icon.svelte';
	import { slide } from 'svelte/transition';
	import FormField from '$lib/report/components/form/fields/FormField.svelte';

	const { form } = getFormContext();
</script>

<!-- Sighting Details Section -->
<div class="card bg-base-200 shadow-sm">
	<div class="card-body">
		<h3 class="card-title flex items-center gap-2 text-lg">
			<Icon icon="lucide:activity" width="20" class="text-primary" />
			Sichtungsdetails
		</h3>

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
	</div>
</div>

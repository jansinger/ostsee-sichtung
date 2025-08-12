<script lang="ts">
	import { getFormContext } from '$lib/report/formContext';
	import { BoatDriveEnum } from '$lib/report/formOptions/boatDrive';
	import { SightingFromEnum } from '$lib/report/formOptions/sightingFrom';
	import { Activity } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import { slide } from 'svelte/transition';
	import FormField from '../form/fields/FormField.svelte';

	const { form } = getFormContext();
</script>

<!-- Sighting Details Section -->
<div class="card bg-base-200 shadow-sm">
	<div class="card-body">
		<h3 class="card-title flex items-center gap-2 text-lg">
			<Icon src={Activity} size="20" class="text-primary" />
			Sichtungsdetails
		</h3>

		<div class="mt-2 grid grid-cols-1 gap-4 md:grid-cols-1">
			<FormField name="sightingFrom" />
			{#if $form.sightingFrom === Number(SightingFromEnum.OTHER)}
				<div transition:slide>
					<FormField name="sightingFromText" />
				</div>
			{/if}
		</div>
		<div class="mt-2 grid grid-cols-1 gap-4 md:grid-cols-1">
			<FormField name="boatDrive" />
			{#if $form.boatDrive === Number(BoatDriveEnum.OTHER)}
				<div transition:slide>
					<FormField name="boatDriveText" />
				</div>
			{/if}
		</div>

		<FormField name="distance" />
	</div>
</div>

<style>
	/* Card hover effects */
	.card {
		transition: all 0.2s ease;
	}

	.card:hover {
		transform: translateY(-1px);
		box-shadow: 0 8px 25px -8px oklch(var(--b3));
	}
</style>

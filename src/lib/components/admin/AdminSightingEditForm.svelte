<script lang="ts">
	import { adminSightingSchema } from '$lib/form/validation/sightingSchema';
	import Form from '$lib/report/components/form/Form.svelte';
	import Administrative from '$lib/report/components/sections/Administrative.svelte';
	import AnimalInfo from '$lib/report/components/sections/AnimalInfo.svelte';
	import Behavior from '$lib/report/components/sections/Behavior.svelte';
	import DateTime from '$lib/report/components/sections/DateTime.svelte';
	import Environment from '$lib/report/components/sections/Environment.svelte';
	import Location from '$lib/report/components/sections/Location.svelte';
	import OptionalSightingDetails from '$lib/report/components/sections/OptionalSightingDetails.svelte';
	import type { FormContext } from '$lib/report/types';

	import BooleanStatus from './BooleanStatus.svelte';
	import Media from '$lib/report/components/sections/Media.svelte';
	import SightingDetails from '$lib/report/components/sections/SightingDetails.svelte';
	import type { FrontendSighting } from '$lib/types';
	import { formatLocalDateTime } from '$lib/utils/format/dateTime';
	import { untrack } from 'svelte';

	import { buildAdminEditInitialValues } from './adminEditInitialValues';

	let {
		sighting = {} as FrontendSighting,
		onSave = (_sighting: FrontendSighting) => {},
		onCancel = () => {}
	} = $props<{
		sighting: FrontendSighting;
		onSave?: (sighting: FrontendSighting) => void;
		onCancel?: () => void;
	}>();

	let formContext: FormContext = $state({}) as FormContext;

	async function submitForm(values: Record<string, unknown>): Promise<FrontendSighting> {
		try {
			// API-Aufruf zum Speichern der Daten
			const response = await fetch(`/api/sightings/${sighting.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(values)
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => null);
				throw new Error(
					errorData?.message || `Fehler beim Speichern der Daten (${response.status})`
				);
			}

			const updatedSighting = await response.json();
			await onSave(updatedSighting);
			return updatedSighting;
		} catch (error) {
			console.error('Fehler beim Speichern:', error);
			throw error;
		}
	}

	// Initialisiere das Formular mit den vorhandenen Daten (one-time, untracked)
	const initProps = untrack(() => ({
		initialValues: buildAdminEditInitialValues(sighting),
		validationSchema: adminSightingSchema,
		onSubmit: submitForm
	}));
	let isValid = $derived(formContext.isValid);
	let isSubmitting = $derived(formContext.isSubmitting);
	let errors = $derived(formContext.errors);
</script>

<Form class="space-y-6" {...initProps} bind:context={formContext}>
	<div class="grid grid-cols-1 gap-4 md:grid-cols-1">
		<div class="space-y-4">
			<div class="card bg-base-200 p-4">
				<!-- Technische Informationen -->
				<div class="text-base-content/70 text-sm">
					<p>Datensatz ID: {sighting.id}</p>
					<p>Gemeldet: {formatLocalDateTime(sighting.created)}</p>
					<p>Verifiziert: <BooleanStatus value={sighting.verified} /></p>
					{#if sighting.approvedAt}
						<p>Freigegeben am: {formatLocalDateTime(sighting.approvedAt)}</p>
					{/if}
				</div>
			</div>

			<Location />
			<DateTime />
			<AnimalInfo />
			<SightingDetails />
		</div>

		<!-- Rechte Spalte - Zusatzinformationen -->
		<div class="space-y-4">
			<!-- Zusätzliche Informationen -->
			<OptionalSightingDetails adminMode={true} />
			<!-- Umweltbedingungen -->
			<Environment adminMode={true} />
			<!-- Verhalten und Reaktion -->
			<Behavior adminMode={true} />
			<Media adminMode={true} />
			<!-- Administratives -->
			<Administrative />
		</div>
	</div>
	<!-- Fehler-Liste anzeigen, wenn es Validierungsfehler gibt -->
	{#if $errors && Object.values($errors).some((message) => typeof message === 'string' && message !== '')}
		<div class="alert alert-error">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6 shrink-0 stroke-current"
				fill="none"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<div>
				<h3 class="font-bold">Eingabefehler gefunden:</h3>
				<ul class="mt-2 list-inside list-disc">
					{#each Object.entries($errors).filter(([_field, message]) => typeof message === 'string' && message !== '') as [_field, message] (_field)}
						<li class="text-sm">{message}</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}

	<!-- Aktionsbuttons -->
	<div class="mt-6 flex justify-end space-x-2">
		<button type="button" class="btn btn-ghost" onclick={onCancel}> Abbrechen </button>
		<button type="submit" class="btn btn-primary" disabled={$isSubmitting || !$isValid}>
			{#if $isSubmitting}
				<span class="loading loading-spinner loading-xs mr-2"></span>
			{/if}
			Speichern
		</button>
	</div>
</Form>

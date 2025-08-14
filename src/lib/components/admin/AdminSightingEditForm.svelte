<script lang="ts">
	import { sightingSchema } from '$lib/form/validation/sightingSchema';
	import Form from '$lib/report/components/form/Form.svelte';
	import Administrative from '$lib/report/components/sections/Administrative.svelte';
	import AnimalInfo from '$lib/report/components/sections/AnimalInfo.svelte';
	import Behavior from '$lib/report/components/sections/Behavior.svelte';
	import DateTime from '$lib/report/components/sections/DateTime.svelte';
	import Environment from '$lib/report/components/sections/Environment.svelte';
	import Location from '$lib/report/components/sections/Location.svelte';
	import Media from '$lib/report/components/sections/Media.svelte';
	import OptionalSightingDetails from '$lib/report/components/sections/OptionalSightingDetails.svelte';
	import type { FormContext } from '$lib/report/types';
	import { formatDate } from '$lib/utils/format/formatDate';
	import type { Readable, Writable } from 'svelte/store';
	import BooleanStatus from './BooleanStatus.svelte';
	// Note: mediaStore and onMount not needed for admin edit form
	import type { FrontendSighting, UploadedFileInfo } from '$lib/types';

	let {
		sighting = {} as FrontendSighting,
		onSave = (_sighting: FrontendSighting) => Promise.resolve(),
		onCancel = () => {}
	} = $props<{
		sighting: FrontendSighting;
		onSave?: (sighting: FrontendSighting) => Promise<void>;
		onCancel?: () => void;
	}>();

	let formContext: FormContext = $state({}) as FormContext;

	// Note: Admin edit form doesn't use mediaStore for existing files
	// Files are managed directly through the sighting.files property

	async function submitForm(values: Record<string, unknown>): Promise<FrontendSighting> {
		try {
			// For admin edit form, use the existing files from the sighting
			const uploadedFiles: UploadedFileInfo[] = sighting.files || [];

			// API-Aufruf zum Speichern der Daten
			const response = await fetch(`/api/sightings/${sighting.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					...values,
					uploadedFiles
				})
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

	// Initialisiere das Formular mit den vorhandenen Daten
	const initProps = {
		initialValues: {
			...sighting,
			sightingDate: sighting.sightingDate
				? new Date(sighting.sightingDate).toISOString().split('T')[0]
				: '',
			time: sighting.sightingDate
				? new Date(sighting.sightingDate).toLocaleTimeString('de-DE', {
						hour: '2-digit',
						minute: '2-digit'
					})
				: '',
			longitude: Number(sighting.longitude)?.toFixed(4) || 0,
			latitude: Number(sighting.latitude)?.toFixed(4) || 0,
			hasPosition: Boolean(sighting.longitude && sighting.latitude)
		},
		validationSchema: sightingSchema,
		onSubmit: submitForm
	};
	let isValid: Readable<boolean> = $derived(formContext.isValid);
	let isSubmitting: Readable<boolean> = $derived(formContext.isSubmitting);
	let errors: Writable<Record<string, string>> = $derived(formContext.errors);
</script>

<Form class="space-y-6" {...initProps} bind:context={formContext}>
	<div class="grid grid-cols-1 gap-4 md:grid-cols-1">
		<div class="space-y-4">
			<div class="card bg-base-200 p-4">
				<!-- Technische Informationen -->
				<div class="text-sm text-gray-600">
					<p>Datensatz ID: {sighting.id}</p>
					<p>Gemeldet: {formatDate(sighting.created)}</p>
					<p>Geprüft: <BooleanStatus value={sighting.verified} /></p>
					{#if sighting.approvedAt}
						<p>Freigegeben am: {formatDate(sighting.approvedAt)}</p>
					{/if}
				</div>
			</div>

			<Location />
			<DateTime />
			<AnimalInfo />
		</div>

		<!-- Rechte Spalte - Zusatzinformationen -->
		<div class="space-y-4">
			<!-- Zusätzliche Informationen -->
			<OptionalSightingDetails />
			<!-- Umweltbedingungen -->
			<Environment />
			<!-- Schiffs-/Bootsangaben -->
			<Behavior />
			<Media />
			<!-- Administratives -->
			<Administrative />
		</div>
	</div>
	<!-- Fehler-Liste anzeigen, wenn es Validierungsfehler gibt -->
	{#if formContext && $errors && Object.values($errors).some((message) => message !== '')}
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
					{#each Object.entries($errors).filter(([_field, message]) => message !== '') as [_field, message], index (index)}
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

<script lang="ts">
	import { getFormContext } from '$lib/report/formContext';
	import { getUploadConfig } from '$lib/stores/configStore';
	import { get } from 'svelte/store';
	import type { ValidationPreset } from '$lib/types';
	import Icon from '$lib/components/Icon.svelte';
	import DropzoneEnhanced from '$lib/report/components/form/fields/DropzoneEnhanced.svelte';
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import LocationInput from '$lib/report/components/form/LocationInput.svelte';
	import VerifyLocation from '$lib/report/components/form/VerifyLocation.svelte';
	import { hasCoordinates, toCoordinate } from '$lib/report/components/form/coordinateValue';
	import { derivePositionMethod } from './positionMethod';

	const { form, handleChange } = getFormContext();

	// Position input method: 'photo', 'map', 'manual'
	//
	// U10: Die initiale Methode wird EINMALIG beim Mount aus dem bereits
	// vorhandenen Formularzustand abgeleitet (z.B. nach Wiederherstellung aus
	// der Session) — siehe `derivePositionMethod` in `./positionMethod.ts`.
	// Der Aufruf von `get(form)` hier im $state-Initializer läuft nur einmal
	// bei der Komponenten-Erstellung, NICHT reaktiv — eine spätere manuelle
	// Auswahl des Nutzers (siehe `selectMethod`) wird dadurch nie überschrieben.
	let positionMethod = $state<'photo' | 'map' | 'manual'>(derivePositionMethod(get(form)));

	// Generiere eine einfache referenceId für Upload (temporäre Lösung)
	const referenceId = $derived($form.referenceId);

	// Echte Koordinaten aus dem Formular — bleiben undefined, solange keine Position
	// gewählt wurde. Die Karte startet über einen separaten Anzeige-Mittelpunkt
	// (defaultCenter) über der Ostsee, ohne die Eingabefelder zu füllen.
	const longitude = $derived(toCoordinate($form.longitude));
	const latitude = $derived(toCoordinate($form.latitude));

	// Fahrwasser ist laut Schema Pflicht, solange keine GPS-Position vorliegt
	// (`waterway.when('hasPosition', { is: (v) => v !== true, ... })`).
	const waterwayRequired = $derived($form.hasPosition !== true);

	// Dynamic GPS photo configuration
	let gpsPhotoConfig = $state<ValidationPreset | null>(null);

	// Load upload configuration and create GPS photo preset
	$effect(() => {
		getUploadConfig().then((config) => {
			// Create GPS photo config based on server configuration
			// but restrict to images only and single file
			gpsPhotoConfig = {
				allowedTypes: config.allowedTypes.filter((type) => type.startsWith('image/')),
				maxFileSize: Math.min(config.maxFileSize, 30 * 1024 * 1024), // Use server config or 30MB, whichever is smaller
				maxFiles: 1, // GPS photos are always single file
				accept: 'image/*'
			};
		});
	});

	/** Setzt ein Formularfeld über den synthetischen handleChange-Event-Pfad. */
	function setField(name: string, value: unknown) {
		handleChange({ target: { name, value } } as unknown as Event);
	}

	function selectMethod(method: 'photo' | 'map' | 'manual') {
		positionMethod = method;

		// Beim Wechsel zur Beschreibung: echte Koordinaten und hasPosition zurücksetzen,
		// damit keine Phantom-Position (leere/alte GPS-Daten) bestehen bleibt.
		if (method === 'manual') {
			setField('latitude', undefined);
			setField('longitude', undefined);
			setField('hasPosition', false);
		}
	}

	/**
	 * Koordinaten-Änderung aus der Karte / den GPS-Eingabefeldern.
	 * hasPosition ist genau dann true, wenn echte Breiten- UND Längengrade gesetzt sind.
	 */
	function handleLocationChange(event: Event) {
		handleChange(event);
		const values = get(form);
		setField('hasPosition', hasCoordinates(values.latitude, values.longitude));
	}
</script>

<!-- Position & Time Section -->
<div class="space-y-6">
	<!-- Position Input Method Selection -->
	<div class="border-base-300 bg-base-200/50 rounded-lg border p-3 sm:p-4">
		<h3 class="mb-3 flex items-center gap-2 text-base font-semibold sm:text-lg">
			<Icon aria-hidden="true" icon="lucide:map-pin" width="20" class="text-primary" />
			Positionsangabe
		</h3>
		<p class="text-base-content/70 mb-6 text-sm">
			Wählen Sie die für Sie einfachste Methode zur Positionsangabe
		</p>

		<fieldset class="fieldset m-0 min-w-0 border-0 p-0">
			<legend class="sr-only">Wie möchten Sie den Standort angeben?</legend>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				<!-- Photo Method -->
				<div class="relative">
					<input
						type="radio"
						id="method-photo"
						name="position-method"
						value="photo"
						bind:group={positionMethod}
						onchange={() => selectMethod('photo')}
						class="sr-only"
					/>
					<label
						for="method-photo"
						class="block cursor-pointer rounded-lg border-2 p-4 transition-all md:h-28
							{positionMethod === 'photo'
							? 'border-primary bg-primary/10'
							: 'border-base-300 hover:border-primary/50'}"
					>
						<div class="flex flex-col items-center text-center">
							<Icon
								aria-hidden="true"
								icon="lucide:camera"
								width="24"
								class="mb-2 {positionMethod === 'photo' ? 'text-primary' : 'text-base-content/60'}"
							/>
							<h4 class="text-sm font-semibold">Foto mit GPS</h4>
							<p class="text-base-content/60 mt-1 text-xs">Bevorzugt - GPS und Datum automatisch</p>
						</div>
					</label>
				</div>

				<!-- Map Method -->
				<div class="relative">
					<input
						type="radio"
						id="method-map"
						name="position-method"
						value="map"
						bind:group={positionMethod}
						onchange={() => selectMethod('map')}
						class="sr-only"
					/>
					<label
						for="method-map"
						class="block cursor-pointer rounded-lg border-2 p-4 transition-all md:h-28
							{positionMethod === 'map'
							? 'border-primary bg-primary/10'
							: 'border-base-300 hover:border-primary/50'}"
					>
						<div class="flex flex-col items-center text-center">
							<Icon
								aria-hidden="true"
								icon="lucide:map-pin"
								width="24"
								class="mb-2 {positionMethod === 'map' ? 'text-primary' : 'text-base-content/60'}"
							/>
							<h4 class="text-sm font-semibold">Karte / GPS Position</h4>
							<p class="text-base-content/60 mt-1 text-xs">Position auf Karte wählen</p>
						</div>
					</label>
				</div>

				<!-- Manual Method -->
				<div class="relative">
					<input
						type="radio"
						id="method-manual"
						name="position-method"
						value="manual"
						bind:group={positionMethod}
						onchange={() => selectMethod('manual')}
						class="sr-only"
					/>
					<label
						for="method-manual"
						class="block cursor-pointer rounded-lg border-2 p-4 transition-all md:h-28
							{positionMethod === 'manual'
							? 'border-primary bg-primary/10'
							: 'border-base-300 hover:border-primary/50'}"
					>
						<div class="flex flex-col items-center text-center">
							<Icon
								aria-hidden="true"
								icon="lucide:square-pen"
								width="24"
								class="mb-2 {positionMethod === 'manual' ? 'text-primary' : 'text-base-content/60'}"
							/>
							<h4 class="text-sm font-semibold">Beschreibung</h4>
							<p class="text-base-content/60 mt-1 text-xs">Beschreibung der Position</p>
						</div>
					</label>
				</div>
			</div>
		</fieldset>

		<div class="bg-base-100 mt-4 rounded-lg p-4">
			<!-- Photo Upload Section -->
			{#if positionMethod === 'photo'}
				<h4 class="mb-3 flex items-center gap-2 font-semibold">
					<Icon aria-hidden="true" icon="lucide:camera" width="18" />
					Foto mit GPS-Daten hochladen
				</h4>

				{#if gpsPhotoConfig}
					<DropzoneEnhanced
						{referenceId}
						maxFiles={1}
						config={gpsPhotoConfig}
						enableGPSExtraction={true}
						title="Foto per Drag & Drop oder Klick hochladen"
						additionalText="GPS-Daten werden automatisch ausgelesen"
					/>
				{:else}
					<div class="skeleton h-32 w-full"></div>
				{/if}
			{/if}

			<!-- Map/GPS Input Section -->
			{#if positionMethod === 'map'}
				<h4 class="mb-3 flex items-center gap-2 font-semibold">
					<Icon aria-hidden="true" icon="lucide:map-pin" width="18" />
					Position auf Karte wählen
				</h4>
				<LocationInput {latitude} {longitude} onchange={handleLocationChange} />
			{/if}

			{#if positionMethod !== 'manual'}
				{#if latitude !== undefined && longitude !== undefined}
					<VerifyLocation {longitude} {latitude} />
				{/if}

				<!--
					Fallback-Bereich: Das Fahrwasser ist ohne GPS-Position Pflicht und muss
					deshalb in JEDER Methode erreichbar sein — sonst landet der Nutzer beim
					Klick auf "Weiter" in einer Sackgasse (Fehler ohne zugehöriges Feld).
				-->
				<div class="divider text-base-content/60 mt-6 mb-3 text-xs">oder</div>

				<div class="border-base-300 bg-base-200/40 rounded-lg border p-3 sm:p-4">
					<h5 class="mb-1 flex items-center gap-2 text-sm font-semibold">
						<Icon aria-hidden="true" icon="lucide:waves" width="16" class="text-primary" />
						Kein GPS? Beschreiben Sie das Seegebiet
					</h5>
					<p class="text-base-content/70 mb-3 text-xs">
						Viele Fotos enthalten keine GPS-Daten, und nicht jede Position lässt sich auf der Karte
						wiederfinden — das ist kein Problem. Eine kurze Beschreibung des Fahrwassers genügt uns,
						auch ungefähre Angaben sind wertvoll.
					</p>

					<FormField name="waterway" required={waterwayRequired} />
					<FormField name="seaMark" />
				</div>
			{/if}

			<!-- Manual Input Section -->
			{#if positionMethod === 'manual'}
				<h4 class="mb-3 flex items-center gap-2 font-semibold">
					<Icon aria-hidden="true" icon="lucide:square-pen" width="18" />
					Beschreibung der Position
				</h4>

				<FormField name="waterway" required={waterwayRequired} />
				<FormField name="seaMark" />
			{/if}
		</div>
	</div>

	<!-- Date and Time Section (always visible) -->
	<div class="border-base-300 bg-base-200/50 rounded-lg border p-3 sm:p-4">
		<h3 class="mb-3 flex items-center gap-2 text-base font-semibold sm:text-lg">
			<Icon aria-hidden="true" icon="lucide:calendar" width="20" class="text-primary" />
			Datum und Uhrzeit
		</h3>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<FormField name="sightingDate" />
			<FormField name="sightingTime" />
		</div>
	</div>
</div>

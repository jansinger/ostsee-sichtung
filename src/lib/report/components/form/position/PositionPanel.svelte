<script lang="ts">
	import { untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { getFormContext } from '$lib/report/formContext';
	import { getUploadConfig } from '$lib/stores/configStore';
	import type { ValidationPreset } from '$lib/types';
	import Icon from '$lib/components/Icon.svelte';
	import DropzoneEnhanced from '$lib/report/components/form/fields/DropzoneEnhanced.svelte';
	import LocationInput from '$lib/report/components/form/LocationInput.svelte';
	import VerifyLocation from '$lib/report/components/form/VerifyLocation.svelte';
	import { hasCoordinates, toCoordinate } from '$lib/report/components/form/coordinateValue';
	import LocationDescription from './LocationDescription.svelte';
	import { shouldOpenMapOnCoordinateChange } from './positionPanelState';

	const { form, handleChange } = getFormContext();

	const referenceId = $derived($form.referenceId);

	// Echte Koordinaten aus dem Formular — bleiben undefined, solange keine Position
	// gewählt wurde. Die Karte startet über einen separaten Anzeige-Mittelpunkt.
	const longitude = $derived(toCoordinate($form.longitude));
	const latitude = $derived(toCoordinate($form.latitude));

	// Nur für die Karten-Automatik. Bewusst NICHT als Guard für VerifyLocation:
	// Ein separater Boolean verengt die Typen im Template nicht (svelte-check
	// kennt kein Aliased-Narrowing über `$derived`), VerifyLocation bekäme also
	// `number | undefined` und fiele still auf seine Default-Koordinaten
	// (54.5/13.5) zurück. Der Guard unten prüft deshalb direkt auf `undefined`.
	const coordinatesPresent = $derived(latitude !== undefined && longitude !== undefined);

	// Karte: automatisch aufklappen, sobald eine Position NEU entsteht — danach
	// gehört der Zustand dem Nutzer (er darf zuklappen, ohne dass es zurückspringt).
	let mapOpen = $state(false);
	// `hadCoordinates` ist reiner Vorzustands-Speicher, keine Eingabe des Effects.
	// Würde es hier normal gelesen, wäre es Abhängigkeit DES Effects, der es selbst
	// schreibt — der Effect liefe ein zweites Mal und die steigende Flanke wäre
	// nicht mehr eindeutig. `untrack` hält die einzige Abhängigkeit bei
	// `coordinatesPresent` (gleiches Muster wie LocationInput.svelte:41-48).
	let hadCoordinates = $state(false);
	$effect(() => {
		const present = coordinatesPresent;
		if (
			shouldOpenMapOnCoordinateChange(
				present,
				untrack(() => hadCoordinates)
			)
		) {
			mapOpen = true;
		}
		hadCoordinates = present;
	});

	// GPS-Foto-Konfiguration: Server-Config, aber nur Bilder und genau eine Datei.
	let gpsPhotoConfig = $state<ValidationPreset | null>(null);
	$effect(() => {
		getUploadConfig().then((config) => {
			gpsPhotoConfig = {
				allowedTypes: config.allowedTypes.filter((type) => type.startsWith('image/')),
				maxFileSize: Math.min(config.maxFileSize, 30 * 1024 * 1024),
				maxFiles: 1,
				accept: 'image/*'
			};
		});
	});

	/** Setzt ein Formularfeld über den synthetischen handleChange-Event-Pfad. */
	function setField(name: string, value: unknown): void {
		handleChange({ target: { name, value } } as unknown as Event);
	}

	/**
	 * Koordinaten-Änderung aus Karte oder Eingabefeldern.
	 * hasPosition ist genau dann true, wenn Breiten- UND Längengrad gesetzt sind.
	 */
	function handleLocationChange(event: Event): void {
		handleChange(event);
		const values = get(form);
		setField('hasPosition', hasCoordinates(values.latitude, values.longitude));
	}
</script>

<div class="border-base-300 bg-base-200/50 rounded-lg border p-3 sm:p-4">
	<h3 class="mb-3 flex items-center gap-2 text-base font-semibold sm:text-lg">
		<Icon aria-hidden="true" icon="lucide:map-pin" width="20" class="text-primary" />
		Positionsangabe
	</h3>
	<p class="text-base-content/70 mb-6 text-sm">
		Wo haben Sie das Tier gesehen? Ein Foto mit GPS-Daten ist der schnellste Weg.
	</p>

	<!-- Hero: Foto mit GPS. Tint-Fläche trägt bewusst text-base-content,
	     NICHT text-primary-content (weiß auf hellblau ≈ 1,3:1). -->
	<div
		class="border-primary bg-primary/5 text-base-content rounded-lg border-2 p-4 sm:p-6"
		data-testid="photo-position-card"
	>
		<h4 class="mb-1 flex items-center gap-2 font-semibold">
			<Icon aria-hidden="true" icon="lucide:camera" width="20" class="text-primary" />
			Foto mit GPS hochladen
		</h4>
		<p class="text-base-content/70 mb-4 text-sm">
			Der schnellste Weg: Position, Datum und Uhrzeit werden automatisch übernommen.
		</p>

		{#if gpsPhotoConfig}
			<DropzoneEnhanced
				{referenceId}
				maxFiles={1}
				config={gpsPhotoConfig}
				enableGPSExtraction={true}
				title="Foto auswählen oder hierher ziehen"
				additionalText="GPS-Daten werden automatisch ausgelesen"
			/>
		{:else}
			<div class="skeleton h-32 w-full"></div>
		{/if}
	</div>

	<div class="divider text-base-content/60 mt-6 mb-3 text-xs">oder Position selbst setzen</div>

	<details class="bg-base-100 collapse" bind:open={mapOpen} data-testid="map-disclosure">
		<summary class="collapse-title min-h-11 py-3 text-sm font-medium">
			Position auf Karte wählen
		</summary>
		<div class="collapse-content">
			<!--
				Erst mounten, wenn die Disclosure offen ist. OLMap ruft `updateSize()`
				nur in `updateMarker` auf (OLMap.svelte:67) — eine Karte, die in einem
				geschlossenen <details> entsteht, misst einen Container ohne Ausdehnung
				und rendert leer, bis zufällig eine Koordinatenänderung eintrifft.
				Nebeneffekt: Ohne geöffnete Karte werden auch keine Kacheln geladen.
			-->
			{#if mapOpen}
				<LocationInput
					{latitude}
					{longitude}
					collapsibleCoordinates={true}
					onchange={handleLocationChange}
				/>
			{/if}
		</div>
	</details>

	<!-- Bewusst AUSSERHALB der Disclosure: Klappt der Nutzer die Karte zu, während
	     Koordinaten gesetzt sind, muss die Ostsee-Prüfung sichtbar bleiben. -->
	{#if latitude !== undefined && longitude !== undefined}
		<VerifyLocation {longitude} {latitude} />
	{/if}
</div>

<LocationDescription />

<script lang="ts">
	import type { MapTranslations } from '$lib/map/mapUtils';
	import { SimpleMapController } from '$lib/map/simpleMapController';
	import { speciesLabels } from '$lib/report/formOptions/species';
	import 'ol/ol.css';
	import { onDestroy, onMount } from 'svelte';

	// Props
	let {
		mapContainerId = 'simple-map',
		showTitle = true,
		title = 'Sichtungskarte',
		showYearSelector = true,
		containerClass = 'relative h-screen w-screen overflow-hidden'
	} = $props<{
		mapContainerId?: string;
		showTitle?: boolean;
		title?: string;
		showYearSelector?: boolean;
		containerClass?: string;
	}>();

	// Map translations
	const translations: MapTranslations = {
		overview: 'Übersichtskarte',
		zoom_title: 'Kartenauschnitt auf alle Meldungen zoomen',
		zoom: 'Alle Meldungen',
		report_date: 'Sichtung vom ',
		language: 'de',
		species: 'Tierart',
		species_legend: 'Tierart [ sichtbar / gesamt ]',
		position: 'Position',
		count: 'Anzahl Tiere',
		young: 'Davon Jungtiere',
		ship: 'Schiffsname',
		name: 'Name',
		area: 'Fahrwasser',
		latitude: 'Breite',
		longitude: 'Länge',
		found_dead: 'Totfund',
		speciesMap: speciesLabels
	};

	// State
	let mapController: SimpleMapController | null = null;
	let selectedYear = $state(new Date().getFullYear());
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	// Available years (last 10 years)
	const availableYears = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

	onMount(async () => {
		try {
			// Initialize map
			mapController = new SimpleMapController({
				target: mapContainerId,
				translations
			});

			// Load initial data
			await loadYear(selectedYear);
		} catch (err) {
			console.error('Error initializing map:', err);
			error = 'Fehler beim Laden der Karte';
		}
	});

	onDestroy(() => {
		if (mapController) {
			mapController.destroy();
		}
	});

	async function loadYear(year: number): Promise<void> {
		if (!mapController) return;

		isLoading = true;
		error = null;

		try {
			await mapController.loadData(year);
		} catch (err) {
			console.error('Error loading year data:', err);
			error = `Fehler beim Laden der Daten für ${year}`;
		} finally {
			isLoading = false;
		}
	}

	async function handleYearChange(event: Event): Promise<void> {
		const target = event.target as HTMLSelectElement;
		const year = parseInt(target.value);
		selectedYear = year;
		await loadYear(year);
	}

	function fitToData(): void {
		if (mapController) {
			mapController.fitToData();
		}
	}
</script>

<div class={containerClass}>
	<!-- Title -->
	{#if showTitle}
		<div
			class="absolute top-4 left-4 z-30 rounded-lg bg-white/90 px-3 py-2 shadow-md backdrop-blur-sm"
		>
			<h1 class="text-lg font-bold text-gray-800">{title}</h1>
		</div>
	{/if}

	<!-- Controls -->
	<div class="absolute top-4 right-4 z-30 flex flex-col gap-2">
		{#if showYearSelector}
			<div class="rounded-lg bg-white/90 px-3 py-2 shadow-md backdrop-blur-sm">
				<label for="year-select" class="mb-1 block text-sm font-medium text-gray-700">
					Jahr:
				</label>
				<select
					id="year-select"
					bind:value={selectedYear}
					onchange={handleYearChange}
					class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
					disabled={isLoading}
				>
					{#each availableYears as year (year)}
						<option value={year}>{year}</option>
					{/each}
				</select>
			</div>
		{/if}

		<!-- Fit to data button -->
		<button
			onclick={fitToData}
			class="rounded-lg bg-white/90 px-3 py-2 shadow-md backdrop-blur-sm transition-colors hover:bg-white/95"
			title="Alle Sichtungen anzeigen"
		>
			<span class="text-sm font-medium text-gray-700">🔍 Alle anzeigen</span>
		</button>
	</div>

	<!-- Loading indicator -->
	{#if isLoading}
		<div
			class="absolute top-20 right-4 z-30 rounded-lg bg-blue-500/90 px-3 py-2 shadow-md backdrop-blur-sm"
		>
			<div class="flex items-center gap-2">
				<div
					class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
				></div>
				<span class="text-sm font-medium text-white">Lade Daten...</span>
			</div>
		</div>
	{/if}

	<!-- Error message -->
	{#if error}
		<div
			class="absolute top-20 right-4 z-30 rounded-lg bg-red-500/90 px-3 py-2 shadow-md backdrop-blur-sm"
		>
			<span class="text-sm font-medium text-white">{error}</span>
		</div>
	{/if}

	<!-- Map container -->
	<div id={mapContainerId} class="h-full w-full"></div>

	<!-- Legend -->
	<div
		class="absolute bottom-4 left-4 z-30 rounded-lg bg-white/90 px-3 py-2 shadow-md backdrop-blur-sm"
	>
		<h3 class="mb-2 text-sm font-bold text-gray-800">Legende</h3>
		<div class="space-y-1">
			<div class="flex items-center gap-2">
				<div class="h-3 w-3 rounded-full bg-blue-500"></div>
				<span class="text-xs text-gray-700">Schweinswal</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="h-3 w-3 rounded-full bg-red-500"></div>
				<span class="text-xs text-gray-700">Kegelrobbe</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="h-3 w-3 rounded-full bg-green-500"></div>
				<span class="text-xs text-gray-700">Seehund</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="h-3 w-3 rounded-full bg-red-600"></div>
				<span class="text-xs text-gray-700">Totfund</span>
			</div>
		</div>
	</div>
</div>

<style>
	/* OpenLayers popup styling */
	:global(.ol-popup) {
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
	}

	:global(.ol-popup-content) {
		position: relative;
	}

	:global(.ol-popup-closer:hover) {
		color: #333 !important;
	}

	/* Map controls styling */
	:global(.ol-control) {
		background-color: rgba(255, 255, 255, 0.9) !important;
		backdrop-filter: blur(4px);
	}

	/* Remove default OpenLayers attribution positioning */
	:global(.ol-attribution) {
		bottom: 4px !important;
		right: 4px !important;
		max-width: 200px;
	}
</style>

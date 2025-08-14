<script lang="ts">
	import FilterPanel from './Panel/FilterPanel.svelte';
	import LegendPanel from './Panel/LegendPanel.svelte';
	import { MapCountManager, type CountData } from '$lib/map/countManager';
	import { SichtungenMap } from '$lib/map/mapController';
	import type { MapTranslations } from '$lib/map/mapUtils';
	import { MapPanelManager } from '$lib/map/panelManager';
	import { MapTimeSliderManager } from '$lib/map/timeSliderManager';
	import { speciesLabels } from '$lib/report/formOptions/species';
	import 'ol/ol.css';
	import { onMount } from 'svelte';

	// Props
	let { 
		mapContainerId = 'map',
		showTitle = true,
		title = 'Sichtungskarte',
		showLogo = true,
		containerClass = 'relative h-screen w-screen overflow-hidden',
		titleClass = 'bg-opacity-50 text-1xl absolute top-2 left-2 z-30 rounded bg-gray-500 px-2 py-1 font-bold text-white'
	} = $props<{
		mapContainerId?: string;
		showTitle?: boolean;
		title?: string;
		showLogo?: boolean;
		containerClass?: string;
		titleClass?: string;
	}>();

	// Übersetzungen für die Karte
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
		// Importierte Tierartendaten für die Karte verwenden
		speciesMap: speciesLabels
	};

	// Manager-Instanzen
	let mapInstance: SichtungenMap;
	let panelManager: MapPanelManager;
	let timeSliderManager: MapTimeSliderManager;
	let countManager: MapCountManager;

	// Reaktive Variablen
	let counts = $state<CountData>({
		speciesCounts: {},
		colorCounts: {}
	});

	// UI-Zustände
	let showKeyboardHelp = $state(false);
	let isLoadingData = $state(false);
	let errorMessage = $state<string | null>(null);

	// Verfügbare Jahre für den Filter
	let years: number[] = [];
	const currentYear = new Date().getFullYear();

	// Initialisiere die Jahre für den Filter (10 Jahre zurück)
	for (let i = 0; i < 10; i++) {
		years.unshift(currentYear - i);
	}

	// Initialisiere die Karte und Manager beim Mounten der Komponente
	onMount(() => {
		// Initialisiere Manager
		panelManager = new MapPanelManager();
		timeSliderManager = new MapTimeSliderManager();
		countManager = new MapCountManager();

		// Initialisiere Karte
		mapInstance = new SichtungenMap({
			translations,
			target: mapContainerId,
			yearSelectorId: 'year-select',
			filterInputId: 'filter-input',
			sliderRangeId: 'slider-range',
			timeStartId: 'time-start',
			timeEndId: 'time-end'
		});

		// Initialisiere Count Manager und setze Callback
		countManager.initialize(mapInstance, translations);
		countManager.onCountsUpdated((newCounts) => {
			counts = newCounts;
		});

		// Mache den CountManager global verfügbar für die Panel-Komponenten
		(window as unknown as { mapCountManager: typeof countManager }).mapCountManager = countManager;

		// Initialisiere andere Manager
		panelManager.initializePanels();
		timeSliderManager.initialize(mapInstance);

		// Erste Aktualisierung nach kurzer Verzögerung
		setTimeout(() => {
			countManager.updateCounts();
		}, 1500);

		// Tastatur-Navigation Setup
		setupKeyboardNavigation();

		// Event-Listener für Loading-Zustände
		setupLoadingHandlers();
	});

	/**
	 * Setup für Loading-State-Management
	 */
	function setupLoadingHandlers() {
		// Überwache Filter-Änderungen
		const filterInputs = document.querySelectorAll(
			'#year-select, #filter-input, .species-checkbox, .color-checkbox'
		);
		filterInputs.forEach((input) => {
			input.addEventListener('change', () => {
				isLoadingData = true;
				errorMessage = null;

				// Loading-Indikator nach 2 Sekunden automatisch ausblenden
				setTimeout(() => {
					isLoadingData = false;
				}, 2000);
			});
		});

		// Global Error Handler für API-Fehler
		window.addEventListener('unhandledrejection', (event) => {
			console.error('Unhandled promise rejection:', event.reason);
			errorMessage = 'Fehler beim Laden der Kartendaten. Bitte versuchen Sie es erneut.';
			isLoadingData = false;
		});
	}

	/**
	 * Fehler-Toast schließen
	 */
	function dismissError() {
		errorMessage = null;
	}

	/**
	 * Tastatur-Navigation für die Karte
	 */
	function setupKeyboardNavigation() {
		document.addEventListener('keydown', (event) => {
			// Nur aktiv wenn kein Input-Element fokussiert ist
			if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
				return;
			}

			switch (event.key) {
				case 'h':
				case 'H':
				case '?':
					event.preventDefault();
					showKeyboardHelp = !showKeyboardHelp;
					break;
				case 'f':
				case 'F': {
					event.preventDefault();
					// Toggle Filter Panel
					const filterButton = document.querySelector(
						'[aria-label*="Filter"]'
					) as HTMLButtonElement;
					filterButton?.click();
					break;
				}
				case 'l':
				case 'L': {
					event.preventDefault();
					// Toggle Legende Panel
					const legendButton = document.querySelector(
						'[aria-label*="Legende"]'
					) as HTMLButtonElement;
					legendButton?.click();
					break;
				}
				case 'z':
				case 'Z': {
					event.preventDefault();
					// Zoom auf alle Meldungen
					const zoomButton = document.querySelector(
						'.zoom-all-control button'
					) as HTMLButtonElement;
					zoomButton?.click();
					break;
				}
				case 'Escape':
					showKeyboardHelp = false;
					break;
			}
		});
	}
</script>

<div class={containerClass}>
	{#if showTitle}
		<h1 class={titleClass}>
			{title}
		</h1>
	{/if}

	<!-- Vollbild-Karte -->
	<div class="relative h-full w-full">
		<div
			id={mapContainerId}
			class="h-full w-full"
			role="application"
			aria-label="Interaktive Sichtungskarte der Ostsee"
		></div>
		<div
			id="info"
			class="pointer-events-none absolute z-10 hidden max-w-sm rounded border border-gray-300 bg-white p-2 shadow-lg"
		></div>
		<!-- Bestehender Load-Overlay -->
		<div
			id="overlay-load"
			class="bg-opacity-70 absolute top-0 left-0 z-20 flex hidden h-full w-full items-center justify-center bg-white"
		>
			<div class="loading loading-lg loading-spinner"></div>
		</div>

		<!-- Neuer Filter-Load-Indikator -->
		{#if isLoadingData}
			<div
				class="alert alert-info fixed top-4 left-1/2 z-30 w-auto -translate-x-1/2 transform shadow-lg"
			>
				<div class="loading loading-sm loading-spinner"></div>
				<span>Karte wird aktualisiert...</span>
			</div>
		{/if}

		<!-- Error-Toast -->
		{#if errorMessage}
			<div
				class="alert alert-error fixed top-4 left-1/2 z-30 max-w-md -translate-x-1/2 transform shadow-lg"
			>
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
				<span class="text-sm">{errorMessage}</span>
				<button
					onclick={dismissError}
					class="btn btn-ghost btn-xs"
					aria-label="Fehlermeldung schließen"
				>
					✕
				</button>
			</div>
		{/if}
	</div>

	<!-- Filter-Panel Komponente -->
	<FilterPanel {years} />

	<!-- Legende-Panel Komponente -->
	<LegendPanel {translations} {counts} />

	<!-- Tastatur-Hilfe Button -->
	<button
		onclick={() => (showKeyboardHelp = true)}
		class="bg-info text-info-content hover:bg-info-focus fixed bottom-4 left-4 z-30 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full shadow-lg transition-colors duration-300"
		aria-label="Tastatur-Hilfe anzeigen"
		title="Tastaturkürzel anzeigen (H oder ?)"
	>
		<span class="text-lg font-bold">?</span>
	</button>

	<!-- Logo (unten rechts) - optional -->
	{#if showLogo}
		<div class="absolute right-0 bottom-4 z-30 rounded p-2">
			<img
				src="/dmm-logo.png"
				alt="Logo des Deutschen Meeresmuseums - wissenschaftliche Einrichtung für Meeresforschung und Meeresschutz"
				class="bg-opacity-95 h-20 rounded bg-white p-0 shadow-md"
				id="dmm"
				title="Deutsches Meeresmuseum"
			/>
		</div>
	{/if}

	<!-- Tastatur-Hilfe Modal -->
	{#if showKeyboardHelp}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div class="bg-base-100 max-h-[80vh] max-w-md rounded-lg p-6 shadow-xl">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="text-lg font-bold">Tastaturkürzel</h3>
					<button
						onclick={() => (showKeyboardHelp = false)}
						class="btn btn-ghost btn-sm"
						aria-label="Hilfe schließen"
					>
						✕
					</button>
				</div>

				<div class="space-y-3">
					<div class="flex justify-between">
						<kbd class="kbd kbd-sm">H oder ?</kbd>
						<span class="text-sm">Diese Hilfe anzeigen</span>
					</div>
					<div class="flex justify-between">
						<kbd class="kbd kbd-sm">F</kbd>
						<span class="text-sm">Filter-Panel öffnen/schließen</span>
					</div>
					<div class="flex justify-between">
						<kbd class="kbd kbd-sm">L</kbd>
						<span class="text-sm">Legende-Panel öffnen/schließen</span>
					</div>
					<div class="flex justify-between">
						<kbd class="kbd kbd-sm">Z</kbd>
						<span class="text-sm">Auf alle Meldungen zoomen</span>
					</div>
					<div class="flex justify-between">
						<kbd class="kbd kbd-sm">ESC</kbd>
						<span class="text-sm">Dialoge schließen</span>
					</div>
				</div>

				<div class="text-base-content/60 mt-6 text-xs">
					<p>🧭 Verwenden Sie die Maus oder Touch-Gesten zum Navigieren der Karte</p>
					<p>🔍 Klicken Sie auf Marker für Details</p>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	@import '$lib/map/mapStyles.css';
</style>
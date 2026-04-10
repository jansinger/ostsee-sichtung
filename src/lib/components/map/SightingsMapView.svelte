<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { MapCountManager, type CountData } from '$lib/map/countManager';
	import type { MapTranslations } from '$lib/map/mapUtils';
	import { SichtungenMap } from '$lib/map/optimizedMapController';
	import { MapPanelManager } from '$lib/map/panelManager';
	import { MapTimeSliderManager } from '$lib/map/timeSliderManager';
	import { speciesLabels } from '$lib/report/formOptions/species';
	import { getAvailableYears, getDefaultSightingYear } from '$lib/utils/date/defaultYear';
	import { setMapCountManager } from '$lib/map/mapContext';
	import 'ol/ol.css';
	import LoadingOverlay from './LoadingOverlay.svelte';
	import FilterPanel from './Panel/FilterPanel.svelte';
	import LegendPanel from './Panel/LegendPanel.svelte';

	// Props
	let {
		mapContainerId = 'map',
		showTitle = true,
		title = 'Sichtungskarte',
		showLogo = true,
		containerClass = 'relative h-screen w-screen overflow-hidden',
		titleClass = 'glass text-black text-sm absolute top-4 left-12 z-30 rounded-lg px-3 py-1.5 font-bold shadow-xl backdrop-blur-md flex items-center gap-2'
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
	let mapInstance: SichtungenMap | null = null;
	let panelManager: MapPanelManager | null = null;
	let timeSliderManager: MapTimeSliderManager | null = null;

	// CountManager wird auf Top-Level erstellt und via Context bereitgestellt,
	// damit Child-Komponenten (LegendPanel) ihn bei ihrer Initialisierung finden.
	// setContext MUSS synchron während der Komponenteninitialisierung aufgerufen werden.
	const countManager = new MapCountManager();
	setMapCountManager(countManager);

	// Reaktive Variablen
	let counts = $state<CountData>({
		speciesCounts: {},
		colorCounts: {}
	});

	// Verfügbare Jahre für den Filter (10 Jahre zurück)
	const years = getAvailableYears(10);
	const defaultYear = getDefaultSightingYear();

	// UI-Zustände
	let showKeyboardHelp = $state(false);
	let isLoadingData = $state(false);
	let isInitialLoading = $state(true);
	let loadingType = $state<'initial' | 'filter' | 'features'>('initial');
	let loadingProgress = $state<number | null>(null);
	let errorMessage = $state<string | null>(null);

	// Aktuell angezeigtes Jahr für den Titel
	let currentDisplayedYear = $state(defaultYear);

	// Event Handler für Cleanup
	let keyboardHandler: ((event: KeyboardEvent) => void) | null = null;
	let unhandledRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;
	let loadingHandlerCleanup: (() => void) | null = null;
	let initTimeoutId: ReturnType<typeof setTimeout> | null = null;

	// Modern $effect for map initialization and cleanup
	$effect(() => {
		// Check if we have the required DOM element
		const mapElement = document.getElementById(mapContainerId);
		if (mapElement) {
			// Initialisiere Manager
			panelManager = new MapPanelManager();
			timeSliderManager = new MapTimeSliderManager();

			// Initialisiere Karte
			mapInstance = new SichtungenMap({
				translations,
				target: mapContainerId,
				yearSelectorId: 'year-select',
				filterInputId: 'filter-input',
				sliderRangeId: 'slider-range',
				timeStartId: 'time-start',
				timeEndId: 'time-end',
				enableLocationControl: false // Kein LocationControl für normale Karten-Views
			});

			// Initialisiere Count Manager und setze Callback
			countManager.initialize(mapInstance, translations);
			countManager.onCountsUpdated((newCounts) => {
				counts = newCounts;
			});

			// Initialisiere andere Manager
			panelManager.initializePanels();
			timeSliderManager.initialize(mapInstance);

			// Erste Aktualisierung nach kurzer Verzögerung
			const initialCountManager = countManager;
			const initialMapInstance = mapInstance;
			initTimeoutId = setTimeout(() => {
				initialCountManager.updateCounts();
				// Aktualisiere das angezeigte Jahr im Titel
				currentDisplayedYear = initialMapInstance.getDisplayedYear();
				// Initial loading abgeschlossen
				isInitialLoading = false;
				initTimeoutId = null;
			}, 1500);

			// Tastatur-Navigation Setup
			setupKeyboardNavigation();

			// Event-Listener für Loading-Zustände
			loadingHandlerCleanup = setupLoadingHandlers();

			// Cleanup function (replaces onDestroy)
			return () => {
				cleanup();
			};
		}

		// Return undefined if mapElement is not available yet
		return;
	});

	// Effect zum Registrieren des Jahr-Änderungs-Callbacks
	$effect(() => {
		if (mapInstance) {
			const instance = mapInstance;
			instance.setYearChangeCallback((newYear: number) => {
				currentDisplayedYear = newYear;
			});

			return () => {
				instance.setYearChangeCallback(() => {});
			};
		}

		// Return void if map is not available
		return;
	});

	/**
	 * Cleanup-Funktion für Event-Listener und Map-Instanzen
	 */
	function cleanup() {
		// Entferne Event-Listener
		if (keyboardHandler) {
			document.removeEventListener('keydown', keyboardHandler);
			keyboardHandler = null;
		}

		if (unhandledRejectionHandler) {
			window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
			unhandledRejectionHandler = null;
		}

		// Cleanup Loading Handler Observer
		if (loadingHandlerCleanup) {
			loadingHandlerCleanup();
			loadingHandlerCleanup = null;
		}

		// Ausstehenden Init-Timeout abbrechen, falls Komponente vor Ablauf unmountet
		if (initTimeoutId !== null) {
			clearTimeout(initTimeoutId);
			initTimeoutId = null;
		}

		// CountManager-Ressourcen aufräumen
		countManager.dispose();

		// Map-Ressourcen aufräumen (Geolocation, Overlay, Event-Listener)
		if (mapInstance) {
			mapInstance.dispose();
		}

		// Reset Manager
		panelManager = null;
		timeSliderManager = null;
		mapInstance = null;

		// WICHTIG: Stelle sicher, dass body/html wieder scrollbar sind
		// Falls irgendeine Library diese verändert hat
		if (typeof document !== 'undefined') {
			document.body.style.overflow = '';
			document.documentElement.style.overflow = '';
		}
	}

	/**
	 * Setup für Loading-State-Management mit verbesserter UX
	 */
	function setupLoadingHandlers() {
		let filterTimeout: ReturnType<typeof setTimeout>;

		function handleFilterChange(type: 'filter' | 'features' = 'filter') {
			clearTimeout(filterTimeout);

			isLoadingData = true;
			loadingType = type;
			errorMessage = null;
			loadingProgress = 0;

			// Simuliere Fortschritt für bessere UX
			const progressInterval = setInterval(() => {
				if (loadingProgress !== null && loadingProgress < 90) {
					loadingProgress = Math.min(loadingProgress + 10, 90);
				}
			}, 200);

			// Loading nach variablem Timeout beenden
			filterTimeout = setTimeout(
				() => {
					clearInterval(progressInterval);
					loadingProgress = 100;

					// Kurz 100% anzeigen, dann ausblenden
					setTimeout(() => {
						isLoadingData = false;
						loadingProgress = null;
					}, 300);
				},
				Math.random() * 1000 + 1500
			); // 1.5-2.5 Sekunden
		}

		// Delegated change handler — works for dynamically added inputs without MutationObserver
		const handleChange = (e: Event) => {
			const target = e.target as HTMLElement;
			if (target.matches('#year-select')) {
				handleFilterChange('features');
			} else if (target.matches('.species-checkbox, .color-checkbox')) {
				handleFilterChange('filter');
			}
		};

		// Delegated keydown handler for search field
		const handleKeydown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			if (target.matches('#filter-input') && e.key === 'Enter') {
				handleFilterChange('filter');
			}
		};

		document.addEventListener('change', handleChange);
		document.addEventListener('keydown', handleKeydown);

		// Global Error Handler für API-Fehler
		unhandledRejectionHandler = (event) => {
			console.error('Unhandled promise rejection:', event.reason);
			errorMessage = 'Fehler beim Laden der Kartendaten. Bitte versuchen Sie es erneut.';
			isLoadingData = false;
			isInitialLoading = false;
			loadingProgress = null;
		};
		window.addEventListener('unhandledrejection', unhandledRejectionHandler);

		return () => {
			document.removeEventListener('change', handleChange);
			document.removeEventListener('keydown', handleKeydown);
		};
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
		keyboardHandler = (event) => {
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
					if (showKeyboardHelp) {
						showKeyboardHelp = false;
					} else {
						// Schließe offene Panels in der Priorität: Filter → Legende
						const filterPanel = document.querySelector('[aria-labelledby="filter-title"]');
						const legendPanel = document.querySelector('[aria-labelledby="legend-title"]');
						if (filterPanel?.getAttribute('aria-hidden') === 'false') {
							filterPanel
								.querySelector<HTMLButtonElement>('[aria-label="Filter schließen"]')
								?.click();
						} else if (legendPanel?.getAttribute('aria-hidden') === 'false') {
							legendPanel
								.querySelector<HTMLButtonElement>('[aria-label="Legende schließen"]')
								?.click();
						}
					}
					break;
			}
		};
		document.addEventListener('keydown', keyboardHandler);
	}
</script>

<div class="{containerClass} map-container-wrapper">
	{#if showTitle}
		<h1 class={titleClass}>
			<Icon icon="lucide:map" width="24" height="24" class="text-primary" />
			<span>{title} {currentDisplayedYear}</span>
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

		<!-- Verbesserter Loading-Overlay -->
		<LoadingOverlay
			isVisible={isInitialLoading || isLoadingData}
			type={isInitialLoading ? 'initial' : loadingType}
			progress={loadingProgress}
			canCancel={false}
		/>

		<!-- Error-Toast -->
		{#if errorMessage}
			<div
				role="alert"
				class="alert alert-error fixed top-20 left-1/2 z-[60] max-w-md -translate-x-1/2 transform shadow-lg"
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
	<FilterPanel {years} {defaultYear} />

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
		<div class="group absolute right-1 bottom-6 z-30">
			<div
				class="border-primary/10 rounded-xl border bg-white/95 p-1 shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-105 hover:shadow-2xl"
			>
				<div class="flex flex-col items-center">
					<img
						src="/dmm-logo.png"
						alt="Logo des Deutschen Meeresmuseums - wissenschaftliche Einrichtung für Meeresforschung und Meeresschutz"
						class="h-12 w-auto"
						id="dmm"
						title="Deutsches Meeresmuseum"
					/>
				</div>
			</div>
		</div>
	{/if}

	<!-- Tastatur-Hilfe Modal -->
	{#if showKeyboardHelp}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="help-modal-title"
				class="bg-base-100 max-h-[80vh] max-w-md rounded-lg p-6 shadow-xl"
			>
				<div class="mb-4 flex items-center justify-between">
					<h3 id="help-modal-title" class="text-lg font-bold">Tastaturkürzel</h3>
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

				<div class="text-base-content/60 mt-6 space-y-1 text-xs">
					<p class="flex items-center gap-2">
						<Icon icon="lucide:navigation" width="14" height="14" class="text-primary" />
						Verwenden Sie die Maus oder Touch-Gesten zum Navigieren der Karte
					</p>
					<p class="flex items-center gap-2">
						<Icon icon="lucide:mouse-pointer" width="14" height="14" class="text-primary" />
						Klicken Sie auf Marker für Details
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Map styles sind jetzt global in app.css importiert -->

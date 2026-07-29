<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { MapCountManager, type CountData } from '$lib/map/countManager';
	import { getDaysInYear } from '$lib/map/dateUtils';
	import type { MapTranslations } from '$lib/map/mapUtils';
	import { SichtungenMap } from '$lib/map/optimizedMapController';
	import { MapPanelManager } from '$lib/map/panelManager';
	import { MapTimeSliderManager } from '$lib/map/timeSliderManager';
	import { speciesLabels } from '$lib/report/formOptions/species';
	import {
		getAvailableYears,
		getDefaultSightingYear,
		pickDefaultYear,
		type YearWithCount
	} from '$lib/utils/date/defaultYear';
	import { setMapCountManager } from '$lib/map/mapContext';
	import { toListEntries, type SightingListProperties } from '$lib/map/listViewUtils';
	import 'ol/ol.css';
	import LoadingOverlay from './LoadingOverlay.svelte';
	import FilterPanel from './Panel/FilterPanel.svelte';
	import LegendPanel from './Panel/LegendPanel.svelte';
	import SightingsListView from './SightingsListView.svelte';

	// Props
	let {
		mapContainerId = 'map',
		showTitle = true,
		title = 'Sichtungskarte',
		showLogo = true,
		containerClass = 'relative h-screen w-screen overflow-hidden',
		titleClass = 'glass text-base-content text-sm absolute top-4 left-12 z-30 rounded-lg px-3 py-1.5 font-bold shadow-xl backdrop-blur-md flex items-center gap-2'
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
	// $state: Die Instanz entsteht erst nach dem async Jahres-Fetch — der
	// Callback-Registrierungs-$effect unten muss auf die Zuweisung reagieren.
	let mapInstance = $state<SichtungenMap | null>(null);
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
	// Bisheriges Fallback-Jahr, synchron verfügbar für den allerersten Render
	// (bevor GET /api/map/sightings/years geladen ist). Als Konstante erfasst,
	// damit die beiden $state-Deklarationen unten nicht voneinander abhängen.
	const initialFallbackYear = getDefaultSightingYear();
	// Default-Jahr: wird aktualisiert, sobald die verfügbaren Jahre geladen
	// sind (QW2b). Bei fehlgeschlagenem Request bleibt der Fallback.
	let defaultYear = $state(initialFallbackYear);
	// Rohdaten der verfügbaren Jahre (Antwort von GET /api/map/sightings/years)
	let availableYearsData = $state<YearWithCount[]>([]);
	// Sichtungsanzahl je Jahr für die Jahres-Dropdown-Beschriftung ("2025 (817)")
	let yearCounts = $derived(
		Object.fromEntries(availableYearsData.map((entry) => [entry.year, entry.count]))
	);
	// Jüngstes Jahr mit tatsächlichen Daten (für den Empty-State-Button, QW2b)
	let latestYearWithData = $derived(
		availableYearsData
			.filter((entry) => entry.count > 0)
			.reduce<number | undefined>(
				(latest, entry) => (latest === undefined || entry.year > latest ? entry.year : latest),
				undefined
			)
	);

	// UI-Zustände
	// K3: Umschaltbare Ansicht — die Liste ist die Screenreader-/Tastatur-Alternative
	// zur Karte und zeigt dieselbe gefilterte Datenmenge.
	let viewMode = $state<'map' | 'list'>('map');
	let showKeyboardHelp = $state(false);
	// H5: Panel-Zustände leben hier und werden per bind:isOpen an die Panels
	// gereicht — Tastaturkürzel schalten den State direkt statt DOM-Buttons
	// per querySelector zu klicken.
	let filterOpen = $state(false);
	let legendOpen = $state(false);
	let isLoadingData = $state(false);
	let isInitialLoading = $state(true);
	let loadingType = $state<'initial' | 'filter' | 'features'>('initial');
	let errorMessage = $state<string | null>(null);

	// Aktuell angezeigtes Jahr für den Titel
	let currentDisplayedYear = $state(initialFallbackYear);

	// Feature-Anzahl direkt vom Map-Controller abfragen (robuster als counts-basiert)
	let featureCount = $state(0);
	let totalFeatures = $derived(
		Object.values(counts.speciesCounts).reduce((sum, c) => sum + c.total, 0)
	);
	let visibleFeatures = $derived(
		Object.values(counts.speciesCounts).reduce((sum, c) => sum + c.visible, 0)
	);
	// Die Empty-State-Overlays gehören zur Kartenansicht — in der Listenansicht
	// übernimmt SightingsListView die "Keine Sichtungen"-Meldung (role="status").
	let showNoResults = $derived(
		viewMode === 'map' &&
			!isInitialLoading &&
			!isLoadingData &&
			!errorMessage &&
			featureCount === 0 &&
			totalFeatures === 0
	);
	let showNoVisibleResults = $derived(
		viewMode === 'map' &&
			!isInitialLoading &&
			!isLoadingData &&
			!errorMessage &&
			featureCount > 0 &&
			visibleFeatures === 0
	);

	// K3: Einträge für die Listenansicht — gleiche Datenbasis und gleiche Filter
	// wie die Karte. `counts` dient als reaktiver Trigger: der CountManager feuert
	// nach jeder Filter-, Zeitraum- und Jahresänderung, dadurch bleibt die Liste
	// ohne zweiten Datenpfad synchron zur Karte.
	let listEntries = $derived.by(() => {
		void counts;
		if (!mapInstance) return [];
		const hidden = mapInstance.getHidden();
		const filters = {
			hiddenSpecies: hidden.species,
			hiddenColors: hidden.colors,
			timeFilter: mapInstance.getTimeFilter()
		};
		const propsList = mapInstance
			.getFeatures()
			.map((feature) => feature.getProperties() as unknown as SightingListProperties);
		return toListEntries(propsList, filters, speciesLabels);
	});

	// Event Handler für Cleanup
	let keyboardHandler: ((event: KeyboardEvent) => void) | null = null;

	/**
	 * Lädt die verfügbaren Jahre (QW2a-Endpoint) und ermittelt daraus das
	 * Default-Jahr (QW2b). Fehlerpfad: stiller Fallback auf das bisherige
	 * Verhalten (getDefaultSightingYear()) — kein Fehler-Toast dafür, da es
	 * sich um eine reine Komfort-Optimierung handelt.
	 */
	async function loadAvailableYears(): Promise<number> {
		let fetchedYears: YearWithCount[] = [];
		try {
			const response = await fetch('/api/map/sightings/years');
			if (response.ok) {
				const data = await response.json();
				if (Array.isArray(data?.years)) {
					fetchedYears = data.years;
				}
			}
		} catch (err) {
			console.warn('Konnte verfügbare Jahre nicht laden, nutze Standard-Jahr:', err);
		}

		availableYearsData = fetchedYears;

		return pickDefaultYear(fetchedYears, initialFallbackYear);
	}

	/**
	 * Schaltet das angezeigte Jahr um — über denselben Pfad wie das
	 * Jahres-Dropdown im Filter-Panel (DOM-Wert setzen + `change`-Event), damit
	 * genau ein Code-Pfad für den Jahreswechsel existiert. Wird vom
	 * Empty-State-Button (QW2b) verwendet.
	 */
	function switchToYear(year: number) {
		const yearSelect = document.getElementById('year-select') as HTMLSelectElement | null;
		if (!yearSelect) return;
		yearSelect.value = year.toString();
		yearSelect.dispatchEvent(new Event('change', { bubbles: true }));
	}

	// Modern $effect for map initialization and cleanup
	$effect(() => {
		// Check if we have the required DOM element
		const mapElement = document.getElementById(mapContainerId);
		if (!mapElement) {
			return;
		}

		let cancelled = false;
		let firstLoadComplete = false;

		void (async () => {
			// QW2b: Verfügbare Jahre vor Karteninitialisierung laden, damit die
			// Karte direkt mit einem Jahr startet, das tatsächlich Daten hat.
			const initialYear = await loadAvailableYears();
			if (cancelled) return;

			defaultYear = initialYear;

			// Initialisiere Manager
			panelManager = new MapPanelManager();
			timeSliderManager = new MapTimeSliderManager();

			// Initialisiere Karte mit Loading-Callback (muss vor initialem setYear gesetzt sein)
			mapInstance = new SichtungenMap({
				translations,
				target: mapContainerId,
				yearSelectorId: 'year-select',
				filterInputId: 'filter-input',
				sliderRangeId: 'slider-range',
				timeStartId: 'time-start',
				timeEndId: 'time-end',
				enableLocationControl: false,
				initialYear,
				onLoading: (loading) => {
					isLoadingData = loading;
					if (loading) {
						loadingType = 'features';
						errorMessage = null;
					} else if (!firstLoadComplete) {
						firstLoadComplete = true;
						countManager.updateCounts();
						currentDisplayedYear = mapInstance!.getDisplayedYear();
						isInitialLoading = false;
					}
				},
				onError: (err) => {
					console.error('Map data load failed:', err);
					errorMessage = 'Fehler beim Laden der Kartendaten. Bitte versuchen Sie es erneut.';
					isLoadingData = false;
					isInitialLoading = false;
				}
			});

			// Initialisiere Count Manager und setze Callback
			countManager.initialize(mapInstance, translations);
			const countMapInstance = mapInstance;
			countManager.onCountsUpdated((newCounts) => {
				counts = newCounts;
				featureCount = countMapInstance.getFeatures().length;
			});

			// Initialisiere andere Manager
			panelManager.initializePanels();
			timeSliderManager.initialize(mapInstance);

			// Tastatur-Navigation Setup
			setupKeyboardNavigation();
		})();

		// Cleanup function (replaces onDestroy) — auch relevant, falls die
		// Komponente zerstört wird, bevor der obige async Block fertig ist.
		return () => {
			cancelled = true;
			cleanup();
		};
	});

	// Effect zum Registrieren des Jahr-Änderungs-Callbacks
	$effect(() => {
		if (mapInstance) {
			const instance = mapInstance;
			instance.setYearChangeCallback((newYear: number) => {
				currentDisplayedYear = newYear;
				// QW4: Zeitslider auf den vollen neuen Jahresbereich zurücksetzen,
				// sonst bleiben die Thumbs auf der zuvor gewählten Position stehen.
				timeSliderManager?.reset(getDaysInYear(newYear));
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
			// Escape ist kein Zeichen-Shortcut (WCAG 2.1.4 greift nicht) und
			// wirkt global — auch bei Fokus im Suchfeld, deshalb VOR dem
			// Input-Guard behandelt.
			// QW3: Kaskade Popup → Hilfe-Modal → Filter-Panel → Legende.
			// Jede Stufe schließt nur genau eine Ebene pro Tastendruck.
			if (event.key === 'Escape') {
				if (mapInstance?.closePopup()) {
					return;
				}
				if (showKeyboardHelp) {
					showKeyboardHelp = false;
					return;
				}
				if (filterOpen) {
					filterOpen = false;
					return;
				}
				if (legendOpen) {
					legendOpen = false;
				}
				return;
			}

			// Zeichen-Shortcuts: nicht aktiv, wenn ein Eingabe-Element
			// fokussiert ist
			if (
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLSelectElement ||
				event.target instanceof HTMLTextAreaElement ||
				(event.target instanceof HTMLElement && event.target.isContentEditable)
			) {
				return;
			}

			// H7 (WCAG 2.1.4): Einzeltasten-Shortcuts nur, wenn der Fokus in
			// der Karten-Region liegt — sonst lösen Spracheingabe oder
			// beiläufiges Tippen sie versehentlich aus.
			const mapElement = document.getElementById(mapContainerId);
			if (!(event.target instanceof Node) || !mapElement?.contains(event.target)) {
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
				case 'F':
					event.preventDefault();
					filterOpen = !filterOpen;
					break;
				case 'l':
				case 'L':
					event.preventDefault();
					legendOpen = !legendOpen;
					break;
				case 'z':
				case 'Z':
					event.preventDefault();
					mapInstance?.zoomAllFeatures();
					break;
			}
		};
		document.addEventListener('keydown', keyboardHandler);
	}
</script>

<div class="{containerClass} map-container-wrapper">
	<!-- K3: Skip-Link — erstes fokussierbares Element, überspringt die Karte.
	     Nur in der Kartenansicht: in der Liste gibt es nichts zu überspringen. -->
	{#if viewMode === 'map'}
		<a
			href="#map-skip-target"
			class="btn btn-primary sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-1/2 focus:z-[70] focus:-translate-x-1/2"
		>
			Karte überspringen
		</a>
	{/if}

	{#if showTitle}
		<h1 class={titleClass}>
			<Icon icon="lucide:map" width="24" height="24" class="text-primary" />
			<span>{title} {currentDisplayedYear}</span>
		</h1>
	{/if}

	<!-- Vollbild-Karte -->
	<div class="relative h-full w-full">
		<!--
			K3: tabindex="0" macht das OL-Target fokussierbar — damit greifen die
			OpenLayers-Default-Interactions KeyboardPan (Pfeiltasten) und
			KeyboardZoom (+/−), vgl. https://openlayers.org/en/latest/examples/accessible.html
			role="application" bleibt bewusst erhalten: Die Karte ist damit echt
			tastaturbedienbar; der Bedienhinweis hängt per aria-describedby dran.
			In der Listenansicht nimmt inert die Karte samt OL-Controls aus Fokus-
			und AT-Reihenfolge — aria-hidden allein ließe die Zoom-Buttons
			fokussierbar (WCAG 4.1.2, axe "aria-hidden-focus").
		-->
		<div
			id={mapContainerId}
			class="sightings-map-target h-full w-full"
			role="application"
			tabindex={viewMode === 'map' ? 0 : -1}
			inert={viewMode === 'list'}
			aria-label="Interaktive Sichtungskarte der Ostsee"
			aria-describedby="map-keyboard-hint"
		></div>
		<p id="map-keyboard-hint" class="sr-only">
			Nach dem Fokussieren der Karte verschieben die Pfeiltasten den Kartenausschnitt, Plus und
			Minus zoomen. Als Alternative steht die Listenansicht über den Umschalter „Karte / Liste" zur
			Verfügung.
		</p>
		<div
			id="info"
			class="border-base-300 bg-base-100 pointer-events-none absolute z-10 hidden max-w-sm rounded border p-2 shadow-lg"
		></div>
		<!-- Bestehender Load-Overlay -->
		<div
			id="overlay-load"
			class="bg-base-100/70 absolute top-0 left-0 z-20 flex hidden h-full w-full items-center justify-center"
		>
			<div class="loading loading-lg loading-spinner"></div>
		</div>

		<!-- Verbesserter Loading-Overlay -->
		<LoadingOverlay
			isVisible={isInitialLoading || isLoadingData}
			type={isInitialLoading ? 'initial' : loadingType}
		/>

		<!-- Keine Sichtungen für das gewählte Jahr -->
		{#if showNoResults}
			<div
				role="status"
				class="glass absolute top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-lg px-5 py-3 text-center shadow-lg backdrop-blur-md"
			>
				<p class="text-base-content text-sm font-medium">
					Keine Sichtungen für {currentDisplayedYear} vorhanden.
				</p>
				{#if latestYearWithData !== undefined && latestYearWithData !== currentDisplayedYear}
					<button
						type="button"
						class="btn btn-primary btn-sm mt-2"
						onclick={() => switchToYear(latestYearWithData!)}
					>
						Sichtungen {latestYearWithData} anzeigen
					</button>
				{/if}
			</div>
		{/if}

		<!-- Alle Sichtungen durch Filter ausgeblendet -->
		{#if showNoVisibleResults}
			<div
				role="status"
				class="glass absolute top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-lg px-5 py-3 text-center shadow-lg backdrop-blur-md"
			>
				<p class="text-base-content text-sm font-medium">
					Keine Sichtungen für den aktuellen Filter sichtbar.
				</p>
				<p class="text-base-content/60 mt-1 text-xs">
					Passen Sie den Zeitraum oder die Tierart-Filter an.
				</p>
			</div>
		{/if}

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
		<!-- K3: Listenansicht — barrierefreie Tabellen-Alternative zur Karte -->
		{#if viewMode === 'list'}
			<section
				class="bg-base-100 absolute inset-0 z-20 overflow-y-auto pt-16 pb-24"
				aria-label="Listenansicht der Sichtungen"
			>
				<div class="mx-auto max-w-3xl px-4">
					<SightingsListView entries={listEntries} year={currentDisplayedYear} />
				</div>
			</section>
		{/if}
	</div>

	<!-- K3: Sprungziel des Skip-Links — direkt hinter der Karte, vor den Panels -->
	<div id="map-skip-target" tabindex="-1" class="sr-only">Ende der Karte</div>

	<!-- K3: Umschalter Karte/Liste -->
	<div
		class="absolute bottom-4 left-1/2 z-30 -translate-x-1/2"
		role="group"
		aria-label="Darstellung der Sichtungen wählen"
	>
		<div class="join shadow-lg">
			<button
				type="button"
				class="btn join-item min-h-11 {viewMode === 'map' ? 'btn-primary' : ''}"
				aria-pressed={viewMode === 'map'}
				onclick={() => (viewMode = 'map')}
			>
				Karte
			</button>
			<button
				type="button"
				class="btn join-item min-h-11 {viewMode === 'list' ? 'btn-primary' : ''}"
				aria-pressed={viewMode === 'list'}
				onclick={() => (viewMode = 'list')}
			>
				Liste
			</button>
		</div>
	</div>

	<!-- Filter-Panel Komponente -->
	<FilterPanel
		{years}
		{defaultYear}
		{yearCounts}
		isLoading={isLoadingData}
		bind:isOpen={filterOpen}
	/>

	<!-- Legende-Panel Komponente -->
	<LegendPanel {translations} {counts} bind:isOpen={legendOpen} />

	<!-- Tastatur-Hilfe Button -->
	<button
		onclick={() => (showKeyboardHelp = true)}
		class="bg-info text-info-content hover:bg-info/80 fixed bottom-4 left-4 z-30 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full shadow-lg transition-colors duration-300"
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
						<Icon icon="lucide:info" width="14" height="14" class="text-primary" aria-hidden="true" />
						Die Buchstaben-Kürzel wirken, solange der Fokus auf der Karte liegt
					</p>
					<p class="flex items-center gap-2">
						<Icon icon="lucide:navigation" width="14" height="14" class="text-primary" aria-hidden="true" />
						Karte mit Tab fokussieren, dann mit den Pfeiltasten verschieben und mit + / − zoomen
					</p>
					<p class="flex items-center gap-2">
						<Icon icon="lucide:list" width="14" height="14" class="text-primary" aria-hidden="true" />
						Der Umschalter „Karte / Liste" zeigt alle Sichtungen als Tabelle
					</p>
					<p class="flex items-center gap-2">
						<Icon icon="lucide:mouse-pointer" width="14" height="14" class="text-primary" aria-hidden="true" />
						Klicken Sie auf Marker für Details
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Map styles sind jetzt global in app.css importiert -->

<style>
	/*
	 * K3: Sichtbarer Fokusring für das Karten-Target. Inset-Offset, damit der
	 * Ring trotz overflow-hidden des Vollbild-Containers sichtbar bleibt.
	 */
	.sightings-map-target:focus-visible {
		outline: 3px solid var(--color-primary);
		outline-offset: -3px;
	}
</style>

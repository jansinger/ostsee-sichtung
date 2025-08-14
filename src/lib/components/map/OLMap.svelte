<script lang="ts">
	import { addMarker, createMap, setMapCenter } from '$lib/utils/map/openLayersHelpers';
	import { Info } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import type { Map } from 'ol';
	import type { Coordinate } from 'ol/coordinate';
	import type Feature from 'ol/Feature';
	import type { Point } from 'ol/geom';
	import { fromLonLat } from 'ol/proj';
	import { onDestroy, onMount } from 'svelte';

	let {
		latitude = $bindable(54.5),
		longitude = $bindable(13.5),
		zoom = 8,
		readonly = false,
		enableGPS = false,
		onchange = () => {}
	} = $props<{
		latitude?: number;
		longitude?: number;
		zoom?: number;
		readonly?: boolean;
		enableGPS?: boolean;
		onchange?: (longitude: number, latitude: number) => void;
	}>();

	let mapElement: HTMLElement;
	let map: Map | null = null;
	let markerFeature: Feature | null = null;

	// Konvertiere Breiten- und Längengrad in OpenLayers-Koordinaten (lon, lat)
	let coordinates = $derived([longitude, latitude]) as Coordinate;
	let markerMoved = false;

	// Funktion zum Aktualisieren der Markerposition
	function updateMarkerPosition(coords: Coordinate) {
		markerMoved = true;
		// Extrahiere lon und lat aus den Koordinaten
		const [lon, lat] = coords;
		longitude = lon ? parseFloat(lon.toFixed(4)) : 0;
		latitude = lat ? parseFloat(lat.toFixed(4)) : 0;
		if (map) {
			setMapCenter(map, coords);
		}
		try {
			if (onchange) {
				onchange(longitude, latitude);
			}
		} catch (error) {
			console.error('Error occurred while handling map change:', error);
		}
	}

	// GPS-Position Handler
	function handleGPSPosition(gpsCoords: Coordinate) {
		updateMarkerPosition(gpsCoords);
		// Marker manuell aktualisieren wenn nötig
		if (map && markerFeature && markerFeature.getGeometry()) {
			const transformedCoords = fromLonLat(gpsCoords);
			(markerFeature.getGeometry() as Point).setCoordinates(transformedCoords);
		}
	}

	onMount(() => {
		// Erstelle die Karte
		map = createMap(
			mapElement,
			coordinates,
			zoom,
			!readonly && enableGPS, // GPS nur wenn nicht readonly und explizit aktiviert
			readonly ? undefined : handleGPSPosition // GPS-Callback nur wenn nicht readonly
		);

		// Füge den initialen Marker hinzu
		const marker = addMarker(
			map,
			coordinates,
			!readonly, // Marker ist verschiebbar, wenn die Karte nicht schreibgeschützt ist
			readonly ? undefined : updateMarkerPosition
		);

		markerFeature = marker.feature;
	});

	function updateMarker(coords: Coordinate) {
		if (map && coords) {
			// Rufe setMapCenter als Async-Funktion auf
			setMapCenter(map, coords);
			map?.updateSize();
			// Aktualisiere die Markerposition, wenn markerFeature noch existiert
			if (markerFeature && markerFeature.getGeometry()) {
				const transformedCoords = fromLonLat(coords);
				(markerFeature.getGeometry() as Point).setCoordinates(transformedCoords);
			}
		}
	}

	$effect(() => {
		if (!markerMoved) {
			updateMarker(coordinates);
		}
		markerMoved = false;
	});

	onDestroy(() => {
		// Bereinige die Karte beim Entfernen der Komponente
		if (map) {
			map.setTarget(undefined);
		}
	});
</script>

<div bind:this={mapElement} class="ol-map-container z-10 h-full w-full overflow-hidden"></div>

{#if !readonly}
	<div class="alert mt-2 mb-0">
		<Icon src={Info} class="h-6 w-6 shrink-0" />
		<span>Marker verschieben oder GPS-Button (📍) für aktuelle Position nutzen.</span>
	</div>
{/if}

<style>
	.ol-map-container {
		position: relative;
		display: block;
		width: 100%;
		height: var(--map-height, 400px);
		border: 1px solid #ccc;
	}

	:global(.drag-hint) {
		font-size: 0.85rem;
		color: #666;
		background-color: #f9f9f9;
		border-radius: 4px;
		padding: 2px 8px;
		display: inline-block;
		white-space: nowrap;
	}

	/* OpenLayers-spezifische Stile */
	:global(.ol-viewport) {
		border-radius: 4px;
	}

	:global(.ol-zoom) {
		top: 0.5em;
		left: 0.5em;
	}

	/* Cursor-Styling für verschiebbaren Marker */
	:global(.ol-viewport .ol-selectable) {
		cursor: move;
		cursor: grab;
	}

	:global(.ol-viewport .ol-selectable:active) {
		cursor: grabbing;
	}

	:global(.ol-map) {
		width: 100%;
		height: 100%;
	}
	:global(.ol-control) {
		background-color: rgba(255, 255, 255, 0.4);
		border-radius: 4px;
		padding: 2px;
	}
	:global(.ol-control button) {
		background-color: rgba(0, 60, 136, 0.5);
		color: white;
		border: none;
		border-radius: 2px;
		margin: 1px;
		padding: 0;
		font-size: 1.14em;
		font-weight: bold;
		height: 1.375em;
		width: 1.375em;
		line-height: 0.4em;
		text-align: center;
	}
	:global(.ol-control button:hover) {
		background-color: rgba(0, 60, 136, 0.7);
	}

	/* GPS Control Styles */
	:global(.gps-control) {
		top: 4.5em;
		left: 0.5em;
	}

	:global(.gps-control .gps-button) {
		background-color: rgba(0, 60, 136, 0.5);
		color: white;
		border: none;
		border-radius: 2px;
		height: 1.375em;
		width: 1.375em;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 1px;
		padding: 0;
	}

	:global(.gps-control .gps-button:hover) {
		background-color: rgba(0, 60, 136, 0.7);
	}

	/* Aktiver Zustand für das neue Location Control */
	:global(.gps-control .gps-button[style*="background-color: rgb(59, 130, 246)"]) {
		background-color: #3b82f6 !important;
		color: white !important;
	}

	:global(.gps-control .gps-button svg) {
		width: 16px;
		height: 16px;
		stroke: white;
	}

	:global(.gps-control .gps-button:disabled) {
		opacity: 0.6;
		cursor: not-allowed;
	}

	:global(.gps-control .gps-button.loading) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>

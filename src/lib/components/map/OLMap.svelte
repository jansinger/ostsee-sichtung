<script lang="ts">
	import { addMarker, createMap, setMapCenter } from '$lib/utils/map/openLayersHelpers';
	import Icon from '$lib/components/Icon.svelte';
	import type { Map } from 'ol';
	import type { Coordinate } from 'ol/coordinate';
	import type Feature from 'ol/Feature';
	import type { Point } from 'ol/geom';
	import { fromLonLat } from 'ol/proj';

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

	// Modern $effect for map initialization and cleanup
	$effect(() => {
		if (mapElement) {
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

			// Cleanup function (replaces onDestroy)
			return () => {
				if (map) {
					map.dispose();
					map = null;
					markerFeature = null;
				}
			};
		}

		// Return undefined if mapElement is not available yet
		return;
	});

	// Reactive effect for coordinate updates
	$effect(() => {
		if (!markerMoved) {
			updateMarker(coordinates);
		}
		markerMoved = false;
	});
</script>

<!-- Karte ist ein interaktives Application-Widget (OpenLayers-Tastatursteuerung); tabindex bewusst gesetzt -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	bind:this={mapElement}
	class="ol-map-container z-10 h-full w-full overflow-hidden"
	role="application"
	aria-label={readonly
		? 'Interaktive Karte der Sichtungen'
		: 'Interaktive Karte zur Positionsauswahl. Pfeiltasten zum Verschieben, Plus/Minus zum Zoomen.'}
	tabindex="0"
></div>

{#if !readonly}
	<div class="alert mt-2 mb-0">
		<Icon icon="lucide:info" class="h-6 w-6 shrink-0" />
		<span>Marker verschieben oder GPS-Button für aktuelle Position nutzen.</span>
	</div>
{/if}

<!-- OpenLayers styles sind jetzt global in app.css über mapStyles.css importiert -->

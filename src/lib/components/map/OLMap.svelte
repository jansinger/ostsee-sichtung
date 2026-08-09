<script lang="ts">
	import { addMarker, createMap, setMapCenter } from '$lib/utils/map/openLayersHelpers';
	import Icon from '$lib/components/Icon.svelte';
	import { untrack } from 'svelte';
	import type { Map, MapBrowserEvent } from 'ol';
	import type { Coordinate } from 'ol/coordinate';
	import type Feature from 'ol/Feature';
	import type { Point } from 'ol/geom';
	import type BaseLayer from 'ol/layer/Base';
	import { fromLonLat, toLonLat } from 'ol/proj';

	let {
		latitude = $bindable(54.5),
		longitude = $bindable(13.5),
		zoom = 8,
		readonly = false,
		enableGPS = false,
		hasPosition = true,
		hintOverride = undefined,
		onchange = () => {}
	} = $props<{
		latitude?: number;
		longitude?: number;
		zoom?: number;
		readonly?: boolean;
		enableGPS?: boolean;
		/**
		 * Ob `latitude`/`longitude` eine bewusst gewählte Position sind oder nur
		 * ein Kartenmittelpunkt, den der Aufrufer setzen musste, damit die Karte
		 * nicht im Nullmeridian startet (siehe `LocationInput.svelte`).
		 *
		 * Default `true` — Aufrufer mit echten Koordinaten (Admin-Ansicht,
		 * Foto-EXIF-Karte) verhalten sich damit unverändert. Nur wo eine Position
		 * fehlen kann, muss `false` übergeben werden; dann bleibt der Marker aus,
		 * bis der Nutzer eine Stelle wählt.
		 */
		hasPosition?: boolean;
		/**
		 * Überschreibt die Marker-Erklärung. Ohne Wert bleibt der bisherige Wortlaut —
		 * Admin-Ansicht und Foto-EXIF-Karte ändern sich dadurch nicht.
		 */
		hintOverride?: string;
		onchange?: (longitude: number, latitude: number) => void;
	}>();

	let mapElement: HTMLElement;
	let map: Map | null = null;
	let markerFeature: Feature | null = null;
	let markerLayer: BaseLayer | null = null;

	// Konvertiere Breiten- und Längengrad in OpenLayers-Koordinaten (lon, lat)
	let coordinates = $derived([longitude, latitude]) as Coordinate;
	let markerMoved = false;

	/**
	 * `hasPosition` ist die einzige Quelle für die Marker-Sichtbarkeit — bewusst
	 * kein zusätzliches „hier gerade getippt"-Flag. Der Aufrufer meldet über
	 * `onchange` und spiegelt das Ergebnis synchron in `hasPosition` zurück
	 * (`LocationInput.svelte`), sodass der Marker im selben Durchlauf erscheint.
	 * Ein eigenes Flag würde zusätzlich verhindern, dass der Marker wieder
	 * verschwindet, wenn der Melder die Koordinatenfelder später leert.
	 */
	let mapHint = $derived.by(() => {
		if (hintOverride !== undefined) return hintOverride;
		if (!hasPosition) {
			return 'Noch keine Position gewählt. Tippen Sie auf die Karte, um die Stelle zu markieren, an der Sie das Tier gesehen haben.';
		}
		const base =
			'Tippen Sie auf die Karte oder ziehen Sie den Marker an die Stelle, an der Sie das Tier gesehen haben.';
		return enableGPS ? `${base} Der GPS-Button übernimmt Ihre aktuelle Position.` : base;
	});

	/** Verschiebt die Marker-Geometrie auf die übergebene Position. */
	function moveMarkerTo(coords: Coordinate): void {
		if (markerFeature?.getGeometry()) {
			(markerFeature.getGeometry() as Point).setCoordinates(fromLonLat(coords));
		}
	}

	/**
	 * Übernimmt eine vom Nutzer gewählte Position (Ziehen, Tippen, GPS) und meldet
	 * sie nach außen.
	 *
	 * `recenter` unterscheidet die Gesten: Beim Ziehen und bei GPS rückt die Karte
	 * wie bisher auf die neue Position nach; beim Tippen bleibt der Ausschnitt
	 * stehen, sonst springt der getippte Punkt unter dem Finger weg.
	 */
	function applyPosition(coords: Coordinate, recenter: boolean): void {
		markerMoved = true;
		// Extrahiere lon und lat aus den Koordinaten
		const [lon, lat] = coords;
		longitude = lon ? parseFloat(lon.toFixed(4)) : 0;
		latitude = lat ? parseFloat(lat.toFixed(4)) : 0;
		moveMarkerTo(coords);
		if (recenter && map) {
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

	// Marker verschoben (Translate-Interaktion)
	function updateMarkerPosition(coords: Coordinate): void {
		applyPosition(coords, true);
	}

	// GPS-Position Handler
	function handleGPSPosition(gpsCoords: Coordinate): void {
		applyPosition(gpsCoords, true);
	}

	/**
	 * Tippen/Klicken auf die Karte setzt die Position. Auf dem Telefon ist das die
	 * erwartete Geste; ohne sie war das Ziehen des Markers der einzige Weg — und
	 * solange kein Marker sichtbar ist, gäbe es gar nichts zu ziehen.
	 *
	 * `singleclick` statt `click`, damit ein Doppelklick (= Zoom) die Position
	 * nicht mitverschiebt.
	 */
	function handleMapClick(event: MapBrowserEvent): void {
		applyPosition(toLonLat(event.coordinate), false);
	}

	function updateMarker(coords: Coordinate) {
		if (map && coords) {
			// Rufe setMapCenter als Async-Funktion auf
			setMapCenter(map, coords);
			map?.updateSize();
			// Aktualisiere die Markerposition, wenn markerFeature noch existiert
			moveMarkerTo(coords);
		}
	}

	// Modern $effect for map initialization and cleanup
	$effect(() => {
		if (mapElement) {
			// Karte genau einmal pro Ziel-Element aufbauen: `coordinates` und `zoom`
			// werden bewusst untracked gelesen. Sonst würde jede Koordinaten-
			// änderung — also jedes Tippen und jedes Ziehen — die komplette Karte
			// verwerfen und neu erzeugen (Kachel-Nachladen, verlorener Zoom).
			// Laufende Änderungen übernimmt der Effekt weiter unten.
			const initial = untrack(() => coordinates);
			const initialZoom = untrack(() => zoom);

			// Erstelle die Karte
			map = createMap(
				mapElement,
				initial,
				initialZoom,
				!readonly && enableGPS, // GPS nur wenn nicht readonly und explizit aktiviert
				readonly ? undefined : handleGPSPosition // GPS-Callback nur wenn nicht readonly
			);

			// Füge den initialen Marker hinzu
			const marker = addMarker(
				map,
				initial,
				!readonly, // Marker ist verschiebbar, wenn die Karte nicht schreibgeschützt ist
				readonly ? undefined : updateMarkerPosition
			);

			markerFeature = marker.feature;
			markerLayer = marker.layer;
			// Untracked: sonst hinge der Aufbau-Effekt an `hasPosition` und die
			// erste gewählte Position würde die Karte komplett neu erzeugen.
			markerLayer.setVisible(untrack(() => hasPosition));

			if (!readonly) {
				map.on('singleclick', handleMapClick);
			}

			// Cleanup function (replaces onDestroy)
			return () => {
				if (map) {
					map.dispose();
					map = null;
					markerFeature = null;
					markerLayer = null;
				}
			};
		}

		// Return undefined if mapElement is not available yet
		return;
	});

	// Marker erst zeigen, wenn eine echte Position vorliegt.
	$effect(() => {
		markerLayer?.setVisible(hasPosition);
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
	class="ol-map-container z-base h-full w-full overflow-hidden"
	role="application"
	data-position={hasPosition ? 'set' : 'unset'}
	aria-label={readonly
		? 'Interaktive Karte der Sichtungen'
		: 'Interaktive Karte zur Positionsauswahl. Pfeiltasten zum Verschieben, Plus/Minus zum Zoomen.'}
	tabindex="0"
></div>

{#if !readonly}
	<div class="alert mt-2 mb-0" role="status">
		<Icon icon="lucide:info" class="h-6 w-6 shrink-0" aria-hidden="true" />
		<span data-testid="map-hint">{mapHint}</span>
	</div>
{/if}

<!-- OpenLayers styles sind jetzt global in app.css über mapStyles.css importiert -->

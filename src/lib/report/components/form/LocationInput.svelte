<script lang="ts">
	import { ddToDm, ddToDms, dmsToDd, dmToDd } from '$lib/utils/geo/coordinateConversion';
	import { untrack } from 'svelte';

	import OLMap from '$lib/components/map/OLMap.svelte';

	type DmsParts = { deg: number | null; min: number | null; sec: number | null };
	type DmParts = { deg: number | null; min: number | null };

	let {
		mode = 'dd',
		latitude = $bindable(),
		longitude = $bindable(),
		defaultCenter = { latitude: 54.5, longitude: 13.5 },
		collapsibleCoordinates = false,
		enableMapGps = true,
		coordinatesHint = null,
		onchange = () => {}
	} = $props<{
		mode?: 'dms' | 'dm' | 'dd';
		/** Echter Formularwert — bleibt undefined, solange keine Position gewählt wurde. */
		latitude?: number | undefined;
		/** Echter Formularwert — bleibt undefined, solange keine Position gewählt wurde. */
		longitude?: number | undefined;
		/** Nur für die Kartenansicht: Startpunkt, solange keine echte Position vorliegt. */
		defaultCenter?: { latitude: number; longitude: number };
		/**
		 * Legt Formatwahl und Eingabefelder in einen Collapse-Container.
		 * Default `false` — beide Einsatzorte zeigen die Koordinaten inzwischen
		 * direkt an (Meldeformular seit dem Museumswunsch „Koordinaten-Eingabe
		 * dauerhaft sichtbar").
		 */
		collapsibleCoordinates?: boolean;
		/**
		 * Schaltet das OpenLayers-GPS-Control der Karte.
		 *
		 * Bewusst ein EIGENER Schalter und nicht mehr `!collapsibleCoordinates`:
		 * Diese Kopplung hielt nur, solange „Felder sichtbar" und „eigenes
		 * GPS-Control" dasselbe bedeuteten. Das Meldeformular braucht seit der
		 * dauerhaft sichtbaren Koordinaten-Eingabe die Kombination „Felder
		 * sichtbar, aber KEIN Control" — es stellt mit „Mein aktueller Standort"
		 * einen eigenen Button, und zwei Bedienelemente für dieselbe Aktion
		 * verstoßen gegen „gleiche Aktion = gleiche Variante"
		 * (`.claude/rules/design-system.md`).
		 *
		 * Default `true`, damit die Admin-Maske (`sections/Location.svelte`)
		 * unverändert bleibt.
		 */
		enableMapGps?: boolean;
		/**
		 * Optionaler Hinweis über den Koordinatenfeldern. Nur das Meldeformular
		 * setzt ihn — in der Admin-Maske gibt es die Karten-Übernahme nicht,
		 * auf die der Satz sich bezieht.
		 */
		coordinatesHint?: string | null;
		onchange?: EventListener | null;
	}>();

	// Hydrations-sichere id für die Verknüpfung Hinweis ↔ Koordinaten-Gruppe.
	// `$props.id()` liefert auf Server und Client denselben Wert; ein selbst
	// gewürfelter Wert würde beim Hydrieren auseinanderlaufen, ein fester
	// Literal-Wert bräche, sobald zwei Karten auf einer Seite stehen.
	const hintId = $props.id();

	// Kartenansicht ist von den Eingabefeldern getrennt: Die Karte braucht immer
	// konkrete Zahlen (sonst startet sie im Nullmeridian), die Zahlenfelder bleiben
	// leer, solange der Nutzer keine Position gewählt hat.
	let mapLatitude = $state(untrack(() => latitude ?? defaultCenter.latitude));
	let mapLongitude = $state(untrack(() => longitude ?? defaultCenter.longitude));

	// Nur wenn beide Formularwerte gesetzt sind, gibt es eine echte Position. Die
	// Karte zeigt sonst zwar `defaultCenter`, aber keinen Marker — ein Marker auf
	// dem Startpunkt wäre von einer bewusst gewählten Position nicht zu
	// unterscheiden und würde als „Position steht schon" gelesen.
	let hasPosition = $derived(latitude !== undefined && longitude !== undefined);

	// Echte Position von außen (EXIF-GPS, Formular-Restore) auf die Karte spiegeln.
	$effect(() => {
		if (latitude === undefined) return;
		if (untrack(() => mapLatitude) !== latitude) mapLatitude = latitude;
	});
	$effect(() => {
		if (longitude === undefined) return;
		if (untrack(() => mapLongitude) !== longitude) mapLongitude = longitude;
	});

	let dms: { latitude: DmsParts; longitude: DmsParts } = $state({
		latitude: { deg: null, min: null, sec: null },
		longitude: { deg: null, min: null, sec: null }
	});
	let dm: { latitude: DmParts; longitude: DmParts } = $state({
		latitude: { deg: null, min: null },
		longitude: { deg: null, min: null }
	});

	// Dezimalgrad-Felder: schreibbares $derived, damit ein geleertes Feld (null) nicht
	// als Koordinate durchgereicht wird und externe Änderungen trotzdem ankommen.
	let ddLatitude: number | null = $derived(latitude ?? null);
	let ddLongitude: number | null = $derived(longitude ?? null);

	const EMPTY_DMS: DmsParts = { deg: null, min: null, sec: null };
	const EMPTY_DM: DmParts = { deg: null, min: null };

	$effect(() => {
		dms.longitude = longitude === undefined ? { ...EMPTY_DMS } : ddToDms(longitude);
		dms.latitude = latitude === undefined ? { ...EMPTY_DMS } : ddToDms(latitude);
		dm.longitude = longitude === undefined ? { ...EMPTY_DM } : ddToDm(longitude);
		dm.latitude = latitude === undefined ? { ...EMPTY_DM } : ddToDm(latitude);
	});

	/** Leere Eingabefelder als NaN weiterreichen — die Konverter behandeln NaN bereits als 0. */
	function part(value: number | null): number {
		return value ?? Number.NaN;
	}

	/** Vorzeichen aus dem Grad-Feld; NaN (leeres Feld) bedeutet Nord/Ost. */
	function signOf(deg: number): 1 | -1 {
		return isNaN(deg) || deg >= 0 ? 1 : -1;
	}

	/**
	 * Meldet eine Koordinatenänderung an das Formular. Bewusst über synthetische
	 * Events statt über DOM-Referenzen: Die Dezimalgrad-Felder existieren in den
	 * Modi "dm"/"dms" gar nicht, ein Marker-Verschieben würde dort sonst nie im
	 * Formular ankommen.
	 */
	function notifyChange() {
		if (!onchange) return;
		emitField('latitude', latitude);
		emitField('longitude', longitude);
	}

	/**
	 * `createForm.handleChange` übernimmt `target.value` unverändert in den
	 * Formular-State. Ein leerer String würde dort als Koordinate liegen bleiben
	 * und beim Validieren zu `NaN` casten ("Breitengrad must be a number type"),
	 * obwohl die Koordinate ohne GPS-Position optional ist. Deshalb wird eine
	 * fehlende Koordinate als `undefined` und eine vorhandene als `number`
	 * gemeldet — nie als String.
	 */
	function emitField(name: 'latitude' | 'longitude', value: number | undefined) {
		onchange?.({
			target: { id: name, name, value }
		} as unknown as Event);
	}

	function updateFromFields() {
		try {
			if (mode === 'dms') {
				const latDeg = part(dms.latitude.deg);
				const lonDeg = part(dms.longitude.deg);
				latitude = dmsToDd(latDeg, part(dms.latitude.min), part(dms.latitude.sec), signOf(latDeg));
				longitude = dmsToDd(
					lonDeg,
					part(dms.longitude.min),
					part(dms.longitude.sec),
					signOf(lonDeg)
				);
			} else if (mode === 'dm') {
				const latDeg = part(dm.latitude.deg);
				const lonDeg = part(dm.longitude.deg);
				latitude = dmToDd(latDeg, part(dm.latitude.min), signOf(latDeg));
				longitude = dmToDd(lonDeg, part(dm.longitude.min), signOf(lonDeg));
			}
		} catch (error) {
			console.error('Fehler beim Aktualisieren der Felder:', error);
		}
		notifyChange();
	}

	/** Marker verschoben oder GPS-Button genutzt → Kartenposition wird zur echten Position. */
	function onMapChange() {
		latitude = mapLatitude;
		longitude = mapLongitude;
		notifyChange();
	}

	/**
	 * Direkte Eingabe in die Dezimalgrad-Felder: leeres Feld ⇒ keine Position.
	 *
	 * Meldet bewusst über `notifyChange()` statt das DOM-Event weiterzureichen:
	 * Das Original-Event trägt nur das gerade bearbeitete Feld und dessen
	 * String-Wert (leer beim Löschen) — die andere Koordinate bliebe im Formular
	 * stehen. `notifyChange()` meldet beide normalisiert aus dem Komponenten-State.
	 */
	function onDecimalChange() {
		latitude = ddLatitude ?? undefined;
		longitude = ddLongitude ?? undefined;
		notifyChange();
	}
</script>

{#snippet coordinateFields()}
	<div class="mb-4 flex items-center justify-between">
		<label class="label" for="gps-format">GPS-Eingabeformat</label>
		<select id="gps-format" class="select ml-auto w-auto" bind:value={mode}>
			<option value="dd">Dezimalgrad (z.B. 54.5042° N)</option>
			<option value="dm">Grad, Dezimalminute (z.B. 54° 30.25' N)</option>
			<option value="dms">Grad, Minute, Sekunde (z.B. 54° 30' 15" N)</option>
		</select>
	</div>

	{#if mode === 'dms'}
		<div class="grid grid-cols-1 gap-2 md:grid-cols-2">
			<div>
				<label class="label" for="dms-lat-deg">Breite (N)</label>
				<div class="flex gap-2">
					<div>
						<input
							id="dms-lat-deg"
							class="input w-16"
							type="number"
							min="0"
							max="90"
							placeholder="Grad"
							bind:value={dms.latitude.deg}
							onchange={updateFromFields}
						/>
					</div>
					<input
						class="input w-16"
						type="number"
						min="0"
						max="59"
						placeholder="Min"
						aria-label="Breite Minuten"
						bind:value={dms.latitude.min}
						onchange={updateFromFields}
					/>
					<input
						class="input w-16"
						type="number"
						min="0"
						max="59"
						placeholder="Sek"
						aria-label="Breite Sekunden"
						bind:value={dms.latitude.sec}
						onchange={updateFromFields}
					/>
				</div>
			</div>
			<div>
				<label class="label" for="dms-lon-deg">Länge (E)</label>
				<div class="flex gap-2">
					<div>
						<input
							id="dms-lon-deg"
							class="input w-16"
							type="number"
							min="0"
							max="180"
							placeholder="Grad"
							bind:value={dms.longitude.deg}
							onchange={updateFromFields}
						/>
					</div>
					<input
						class="input w-16"
						type="number"
						min="0"
						max="59"
						placeholder="Min"
						aria-label="Länge Minuten"
						bind:value={dms.longitude.min}
						onchange={updateFromFields}
					/>
					<input
						class="input w-16"
						type="number"
						min="0"
						max="59"
						placeholder="Sek"
						aria-label="Länge Sekunden"
						bind:value={dms.longitude.sec}
						onchange={updateFromFields}
					/>
				</div>
			</div>
		</div>
	{:else if mode === 'dm'}
		<div class="grid grid-cols-1 gap-2 md:grid-cols-2">
			<div>
				<label class="label" for="dm-lat-deg">Breite (N)</label>
				<div class="flex gap-2">
					<div>
						<input
							id="dm-lat-deg"
							class="input w-16"
							type="number"
							min="0"
							max="90"
							placeholder="Grad"
							bind:value={dm.latitude.deg}
							onchange={updateFromFields}
						/>
					</div>
					<input
						class="input w-24"
						type="number"
						min="0"
						max="59.9999"
						step="0.01"
						placeholder="Dezimalmin"
						aria-label="Breite Dezimalminuten"
						bind:value={dm.latitude.min}
						onchange={updateFromFields}
					/>
				</div>
			</div>
			<div>
				<label class="label" for="dm-lon-deg">Länge (E)</label>
				<div class="flex gap-2">
					<div>
						<input
							id="dm-lon-deg"
							class="input w-16"
							type="number"
							min="0"
							max="180"
							placeholder="Grad"
							bind:value={dm.longitude.deg}
							onchange={updateFromFields}
						/>
					</div>
					<input
						class="input w-24"
						type="number"
						min="0"
						max="59.9999"
						step="0.01"
						placeholder="Dezimalmin"
						aria-label="Länge Dezimalminuten"
						bind:value={dm.longitude.min}
						onchange={updateFromFields}
					/>
				</div>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-2 md:grid-cols-2">
			<div>
				<label class="label" for="latitude">Breite (N)</label>
				<input
					id="latitude"
					class="input w-full"
					type="number"
					min="-90"
					max="90"
					step="0.0001"
					placeholder="Dezimalgrad"
					bind:value={ddLatitude}
					onchange={onDecimalChange}
				/>
			</div>
			<div>
				<label class="label" for="longitude">Länge (E)</label>
				<input
					id="longitude"
					class="input w-full"
					type="number"
					min="-180"
					max="180"
					step="0.0001"
					placeholder="Dezimalgrad"
					bind:value={ddLongitude}
					onchange={onDecimalChange}
				/>
			</div>
		</div>
	{/if}
{/snippet}

<div class="w-full">
	<div class="border-base-300 mb-4 overflow-hidden rounded-lg border">
		<!--
			Das OpenLayers-GPS-Control (`FormLocationControl`) bleibt nur dort, wo es
			die einzige Standort-Bedienung ist — also in der Admin-Maske
			(`sections/Location.svelte`, Default `enableMapGps={true}`).

			Im Meldeformular liefert `PositionPanel` bereits einen eigenen Button
			„Mein aktueller Standort" über der Karte. Beide schreiben dieselbe
			Koordinate ins Formular; zwei Bedienelemente für dieselbe Aktion
			verstoßen gegen „gleiche Aktion = gleiche Variante" (design-system.md).
		-->
		<OLMap
			bind:latitude={mapLatitude}
			bind:longitude={mapLongitude}
			readonly={false}
			enableGPS={enableMapGps}
			{hasPosition}
			onchange={onMapChange}
		/>
	</div>

	{#if collapsibleCoordinates}
		<details class="bg-base-100 collapse" data-testid="coordinate-fields">
			<summary class="collapse-title min-h-11 py-3 text-sm font-medium">
				Koordinaten eingeben
			</summary>
			<div class="collapse-content">
				{@render coordinateFields()}
			</div>
		</details>
	{:else if coordinatesHint}
		<!-- Der Hinweis gilt für die ganze Koordinaten-Gruppe, nicht für ein
		     einzelnes Feld — je nach Format sind es zwei bis sechs Eingaben.
		     Deshalb `role="group"` mit `aria-describedby` statt sechs einzelner
		     Verweise: So wird er beim Betreten der Gruppe einmal angesagt.

		     Ohne diese Verknüpfung wäre der Satz nur optisch vorhanden — die
		     Felder hier sind rohe Inputs und laufen nicht über `FormField`,
		     das `aria-describedby` sonst zentral setzt (`design-system.md`). -->
		<div role="group" aria-label="Koordinaten" aria-describedby={hintId}>
			<p id={hintId} class="text-base-content/70 text-support mb-2" data-testid="coordinates-hint">
				{coordinatesHint}
			</p>
			{@render coordinateFields()}
		</div>
	{:else}
		{@render coordinateFields()}
	{/if}
</div>

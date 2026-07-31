<script lang="ts">
	import { untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { getFormContext } from '$lib/report/formContext';
	import { getUploadConfig } from '$lib/stores/configStore';
	import type { ValidationPreset } from '$lib/types';
	import Icon from '$lib/components/Icon.svelte';
	import UploadNotice from '$lib/report/components/form/UploadNotice.svelte';
	import DropzoneEnhanced from '$lib/report/components/form/fields/DropzoneEnhanced.svelte';
	import LocationInput from '$lib/report/components/form/LocationInput.svelte';
	import VerifyLocation from '$lib/report/components/form/VerifyLocation.svelte';
	import { hasCoordinates, toCoordinate } from '$lib/report/components/form/coordinateValue';
	import { openAncestorDetails } from '$lib/utils/fieldNavigation';
	import SectionCard from '$lib/report/components/sections/SectionCard.svelte';
	import LocationDescription from './LocationDescription.svelte';
	import { requestCurrentPosition } from './geolocation';
	import {
		photoStatus,
		shouldOpenMapOnCoordinateChange,
		shouldWarnAboutMissingGps
	} from './positionPanelState';

	const { form, handleChange, mediaStore } = getFormContext();

	// `mediaStore` ist das `$state`-Objekt aus Form.svelte und wird über den
	// Context als derselbe Proxy weitergereicht. DropzoneEnhanced ersetzt die
	// Liste per Zuweisung (`updateMediaFiles`) — der Property-Write auf dem Proxy
	// weckt dieses `$derived`. Das geschieht zweimal je Upload: beim Drop
	// (synchron) und erneut, wenn die EXIF-Auswertung durch ist. Nur deshalb kann
	// `photoStatus` von `'analyzing'` auf sein Endergebnis wechseln.
	//
	// Der Store gehört dem ganzen Formular, nicht diesem Schritt; die Eingrenzung
	// auf die Dateien des Positions-Schritts steckt in `photoStatus`.
	const status = $derived(photoStatus(mediaStore.mediaFiles));

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
			const maxFileSize = Math.min(config.maxFileSize, 30 * 1024 * 1024);
			gpsPhotoConfig = {
				allowedTypes: config.allowedTypes.filter((type) => type.startsWith('image/')),
				maxFileSize,
				maxVideoFileSize: maxFileSize,
				maxFiles: 1,
				accept: 'image/*'
			};
		});
	});

	/**
	 * Wurde die Aufnahmezeit des aktuellen Fotos wirklich ins Formular übernommen?
	 *
	 * Kommt als Meldung aus `DropzoneEnhanced` und nicht aus `$form.sightingDate`:
	 * Das Feld hat mit `berlinToday()` einen Schema-Default und ist damit IMMER
	 * gefüllt (`sightingSchema.ts`). Ein Gate darauf war immer wahr — genau
	 * deshalb musste der Satz „Datum und Uhrzeit konnten übernommen werden"
	 * vorher wieder entfernt werden.
	 */
	let exifDateTimeApplied = $state(false);

	/** Setzt ein Formularfeld über den synthetischen handleChange-Event-Pfad. */
	function setField(name: string, value: unknown): void {
		handleChange({ target: { name, value } } as unknown as Event);
	}

	/**
	 * Einziger Schreiber von `hasPosition` **in diesem Panel**: genau dann true,
	 * wenn Breiten- UND Längengrad im Formular als echte Zahlen vorliegen.
	 * Bewusst aus dem Store gelesen statt aus den gerade geschriebenen Werten —
	 * so gilt dieselbe Regel für Karte, Eingabefelder und GPS-Button.
	 *
	 * Es ist nicht der einzige Schreiber im Meldeformular. Die EXIF-Auswertung
	 * schreibt das Flag selbst, in `DropzoneEnhanced.svelte`:
	 * - `applyExifPosition` setzt `true`,
	 * - `resetExifPositionIfUnchanged` setzt `false`.
	 * (Die Admin-Maske hat mit `sections/Location.svelte` ein eigenes,
	 * nutzerbedientes Feld — anderes Formular, hier ohne Belang.)
	 *
	 * Die Invariante hält trotzdem: Jeder dieser Schreiber setzt
	 * `latitude`/`longitude` im selben Aufruf und leitet das Flag aus derselben
	 * Bedingung ab („beide Koordinaten sind echte Zahlen"). Wer einen weiteren
	 * Schreiber ergänzt, muss genau das mitbringen — sonst behauptet das
	 * Formular eine Position, die es nicht gibt, und `waterway` verliert seine
	 * konditionale Pflicht.
	 */
	function syncHasPosition(): void {
		const values = get(form);
		setField('hasPosition', hasCoordinates(values.latitude, values.longitude));
	}

	/** Koordinaten-Änderung aus Karte oder Eingabefeldern. */
	function handleLocationChange(event: Event): void {
		handleChange(event);
		syncHasPosition();
	}

	let mapSummary = $state<HTMLElement | null>(null);

	/** Öffnet die Karte und setzt den Fokus dorthin — nicht nur scrollen. */
	function openMap(): void {
		mapOpen = true;
		mapSummary?.focus();
		mapSummary?.scrollIntoView({ block: 'center' });
	}

	/**
	 * Springt zur Ortsbeschreibung und fokussiert das Fahrwasser-Feld.
	 *
	 * `data-testid` und NICHT `data-field`: Letzteres sitzt auf dem Wrapper-<div>
	 * von FormField (FormField.svelte:77), das nicht fokussierbar ist. Das Testid
	 * hängt am Input selbst (FieldRenderer.svelte:188 → BaseInput.svelte:84).
	 *
	 * `LocationDescription` ist immer ein `<details>`. Dessen Startzustand kommt
	 * einmalig aus `descriptionCollapsed`, danach gehört er dem Nutzer — das Feld
	 * kann also zugeklappt sein, sowohl beim Start (Koordinaten vorhanden, beide
	 * Beschreibungsfelder leer) als auch weil der Nutzer selbst zugeklappt hat.
	 * `.focus()` auf ein Element in einem geschlossenen <details> täte still
	 * nichts, deshalb vorher aufklappen.
	 *
	 * Das funktioniert nur, weil dort bewusst kein `bind:open` sitzt — ein
	 * gebundener Zustand schriebe das hier gesetzte `open` sofort zurück.
	 *
	 * Der Vorfahren-`<details>`-Loop steckt in `openAncestorDetails`
	 * (`$lib/utils/fieldNavigation.ts`) — `scrollToFirstError` dort braucht
	 * denselben Schritt für jedes Feld hinter einer Disclosure, nicht nur für
	 * `waterway`.
	 */
	function focusDescription(): void {
		const field = document.querySelector<HTMLElement>('[data-testid="field-waterway"]');
		if (!field) return;
		openAncestorDetails(field);
		field.focus();
		field.scrollIntoView({ block: 'center' });
	}

	let locating = $state(false);
	let locationError = $state<string | null>(null);

	/**
	 * Übernimmt den Gerätestandort und öffnet die Karte zur Kontrolle.
	 *
	 * Der Button bleibt währenddessen fokussierbar (nur `aria-disabled`), weil
	 * `disabled` ihn aus der Tab-Reihenfolge nimmt und der Browser den Fokus
	 * verwirft — ein Tastatur-Nutzer verlöre für die Dauer der Ortung seine
	 * Position. Den Doppelklick-Schutz übernimmt stattdessen dieser Wächter.
	 */
	async function useCurrentPosition(): Promise<void> {
		if (locating) return;
		locating = true;
		locationError = null;

		const result = await requestCurrentPosition(
			typeof navigator === 'undefined' ? undefined : navigator.geolocation
		);
		locating = false;

		if (!result.ok) {
			locationError = result.message;
			return;
		}

		setField('latitude', result.latitude);
		setField('longitude', result.longitude);
		syncHasPosition();
		mapOpen = true;
	}
</script>

<SectionCard title="Positionsangabe" icon="lucide:map-pin" variant="inset">
	<p class="text-base-content/70 mb-6 text-sm">
		Wo haben Sie das Tier gesehen? Ein Foto mit GPS-Daten ist der schnellste Weg.
	</p>

	<!-- Hero: Foto mit GPS. Tint-Fläche trägt bewusst text-base-content,
	     NICHT text-primary-content (weiß auf hellblau ≈ 1,3:1). -->
	<div
		class="border-primary bg-primary/5 text-base-content rounded-lg border-2 p-4 md:p-6"
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
			<!-- `showNoGpsWarning={false}`: Der Fall wird unten ausführlicher erklärt
			     (Zustand C). Ohne das Abschalten stünden zwei Warn-Alerts mit
			     derselben Aussage direkt übereinander. -->
			<DropzoneEnhanced
				{referenceId}
				maxFiles={1}
				config={gpsPhotoConfig}
				enableGPSExtraction={true}
				showNoGpsWarning={false}
				showPositionMap={false}
				onExifDateTimeApplied={(applied) => (exifDateTimeApplied = applied)}
				actionLabel="Foto auswählen"
				additionalText="GPS-Daten werden automatisch ausgelesen"
			/>
		{:else}
			<div class="skeleton h-32 w-full"></div>
		{/if}

		<!-- Zustand C: Foto ohne EXIF-GPS.

		     Bewusst `'no-gps'` und nicht „kein GPS im Formular": Während der
		     Auswertung meldet `photoStatus` `'analyzing'` und hier steht nichts.
		     Sonst würde ein Foto MIT GPS im Moment des Drops für GPS-los erklärt
		     und die Behauptung Sekundenbruchteile später zurückgenommen — mit
		     `role="status"` sagt ein Screenreader sie inzwischen an.

		     Die zweite Bedingung (`coordinatesPresent`) steckt in
		     `shouldWarnAboutMissingGps`: Solange das Panel Koordinaten anzeigt,
		     darf es ihr Fehlen nicht behaupten. -->
		{#if shouldWarnAboutMissingGps(status, coordinatesPresent)}
			<div class="alert alert-warning mt-4" role="status" data-testid="photo-no-gps">
				<Icon aria-hidden="true" icon="lucide:circle-alert" width="20" class="shrink-0" />
				<div>
					<p class="text-sm">
						In diesem Foto sind keine GPS-Daten gespeichert. Das ist häufig — viele Kameras und
						weitergeleitete Bilder enthalten keine Position. Das Foto ist trotzdem wertvoll und
						bleibt erhalten.
					</p>
					<!-- Nur wenn es wirklich passiert ist: `exifDateTimeApplied` kommt aus
					     DropzoneEnhanced. Ein Gate auf `$form.sightingDate` wäre immer wahr
					     (Schema-Default `berlinToday()`). -->
					{#if exifDateTimeApplied}
						<p class="mt-2 text-sm" data-testid="photo-datetime-applied">
							Datum und Uhrzeit konnten übernommen werden.
						</p>
					{/if}
					<div class="mt-3 flex flex-wrap gap-2">
						<button
							type="button"
							class="btn btn-outline btn-sm min-h-11"
							onclick={openMap}
							data-testid="exit-to-map"
						>
							Auf Karte wählen
						</button>
						<button
							type="button"
							class="btn btn-outline btn-sm min-h-11"
							onclick={focusDescription}
							data-testid="exit-to-description"
						>
							Seegebiet beschreiben
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- BEWUSST unter der Dropzone: Die Hero-Karte begann auf einem 812-px-Gerät
		     erst bei 659 px, und dazwischen standen ~150 px Datenschutz-Prosa
		     zwischen „Der schnellste Weg …" und dem Auslöser. Der Hinweis bleibt
		     vollständig, nur nicht mehr im Weg. -->
		<div class="mt-4">
			<UploadNotice />
		</div>
	</div>

	<div class="divider text-base-content/70 text-support mt-6 mb-3">oder Position selbst setzen</div>

	<!-- Eigener Button statt des OpenLayers-GPS-Controls: Die Karte startet
	     zugeklappt, im Startzustand gäbe es sonst gar keinen sichtbaren
	     GPS-Button. Beschriftung und Fehlerpfad liegen so außerdem in unserer
	     Hand — beides ist im Karten-Control nicht erreichbar. -->
	<button
		type="button"
		class="btn btn-outline w-full md:w-auto"
		onclick={useCurrentPosition}
		aria-disabled={locating}
		data-testid="use-current-position"
	>
		{#if locating}
			<span aria-hidden="true" class="loading loading-spinner loading-sm"></span>
		{:else}
			<Icon aria-hidden="true" icon="lucide:crosshair" width="18" />
		{/if}
		<!-- Der Spinner ist rein dekorativ; die Beschriftung trägt den Ladezustand,
		     damit er auch angesagt wird und nicht nur zu sehen ist. -->
		{locating ? 'Standort wird ermittelt …' : 'Mein aktueller Standort'}
	</button>
	<p class="text-base-content/70 text-support mt-1 mb-3">
		Übernimmt den Standort Ihres Geräts — sinnvoll, wenn Sie die Sichtung direkt vor Ort melden.
	</p>

	{#if locationError}
		<div
			class="alert alert-warning mb-3"
			role="alert"
			aria-live="polite"
			data-testid="geolocation-error"
		>
			<Icon aria-hidden="true" icon="lucide:circle-alert" width="20" class="shrink-0" />
			<span class="text-sm">{locationError}</span>
		</div>
	{/if}

	<details class="bg-base-100 collapse" bind:open={mapOpen} data-testid="map-disclosure">
		<!-- `<summary>` ist nativ fokussierbar — kein `tabindex` nötig. -->
		<summary bind:this={mapSummary} class="collapse-title min-h-11 py-3 text-sm font-medium">
			Position auf Karte wählen
		</summary>
		<div class="collapse-content">
			<!--
				Erst mounten, wenn die Disclosure offen ist: Für die Mehrheit, die die
				Karte nie aufklappt, entsteht so keine OpenLayers-Instanz und es werden
				keine Kacheln geladen.

				Nicht der Grund: eine „leer rendernde" Karte. OpenLayers beobachtet das
				Ziel-Element seit jeher mit einem ResizeObserver
				(node_modules/ol/Map.js:449 in ol 10.9.0) und ruft `updateSize()` selbst
				auf, sobald der Container Ausdehnung bekommt — eine im geschlossenen
				<details> erzeugte Karte würde sich also von allein korrigieren.
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
</SectionCard>

<LocationDescription />

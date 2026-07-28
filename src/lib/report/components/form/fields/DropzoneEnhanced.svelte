<script lang="ts">
	/**
	 * DropzoneEnhanced Component
	 *
	 * Eine erweiterte Dropzone-Komponente für den Datei-Upload mit folgenden Hauptfunktionen:
	 * - Sofortige Dateianalyse mit EXIF-Datenextraktion (GPS, Zeitstempel)
	 * - Paralleler Upload mehrerer Dateien mit Fortschrittsanzeige
	 * - GPS-Positionsextraktion aus Fotos für automatische Standortbestimmung
	 * - Thumbnail-Vorschau für Bilder
	 * - Integration mit dem Formular-System und Media Store
	 * - Automatische Wiederherstellung von Dateien beim erneuten Besuch des Formularschritts
	 * - Validierung von GPS-Koordinaten (Ostsee-Check)
	 *
	 * Die Komponente unterstützt zwei Modi:
	 * 1. GPS-Extraktionsmodus (enableGPSExtraction=true): Einzeldatei-Upload mit Kartenanzeige
	 * 2. Media-Upload-Modus: Multi-Datei-Upload mit Galerie-Ansicht
	 */
	import UnifiedDropzone from '$lib/components/form/UnifiedDropzone.svelte';
	import OLMap from '$lib/components/map/OLMap.svelte';
	import { createLogger } from '$lib/logger';
	import { getFormContext } from '$lib/report/formContext';
	import { createToast } from '$lib/stores/toastState.svelte';
	import type { ExifData, UploadedFileInfo, ValidationPreset } from '$lib/types';
	import { deleteFileDirect } from '$lib/utils';
	import { formatFileSize } from '$lib/utils/file/fileSize';
	import { getFileIcon } from '$lib/utils/file/fileType';
	import { splitDateTime } from '$lib/utils/format/dateTime';
	import { formatLocation } from '$lib/utils/format/formatLocation';
	import { isInBalticArea } from '$lib/utils/geo/checkBalticSea';
	import { MediaFile } from '$lib/utils/media/MediaFile';
	import { deleteMultipleFiles } from '$lib/utils/upload/fileProcessing';
	import {
		shouldResetExifPosition,
		type AppliedExifPosition
	} from '$lib/report/components/form/fields/exifPositionReset';
	import {
		isPositionUid,
		loadPositionUids,
		markPositionFile,
		unmarkPositionFile
	} from '$lib/report/components/form/fields/positionFileOrigin';
	import { get } from 'svelte/store';

	import Icon from '$lib/components/Icon.svelte';

	const logger = createLogger('DropzoneEnhanced');
	let { form, handleChange, mediaStore } = getFormContext();

	// Merkt sich die zuletzt aus EXIF in den Formularzustand übernommene
	// Position (siehe `applyExifPosition`). Wird beim Entfernen des Fotos
	// (`handleClear`/`handleFileRemoved`) genutzt, um `latitude`/`longitude`/
	// `hasPosition` NUR dann zurückzunehmen, wenn der Nutzer sie seither nicht
	// manuell überschrieben hat (siehe `exifPositionReset.ts`).
	let appliedExifPosition = $state<AppliedExifPosition | null>(null);

	// Component Props
	let {
		referenceId, // Eindeutige ID für Upload-Referenz (meist sighting.tempId)
		maxFiles = 10, // Maximale Anzahl erlaubter Dateien
		config, // Datei-Validierungskonfiguration (Größe, Typen, etc.)
		enableGPSExtraction = false, // GPS-Extraktionsmodus aktivieren (für Position-Schritt)
		title, // Optionaler Titel für die Dropzone
		additionalText = 'GPS-Daten werden beim Upload verarbeitet',
		/**
		 * Eigener Warnhinweis „Keine GPS-Daten im Foto" (nur im GPS-Modus sichtbar).
		 *
		 * Abschaltbar für Aufrufer, die den Fall selbst und ausführlicher behandeln
		 * — sonst stünden zwei `alert alert-warning` mit derselben Aussage
		 * übereinander.
		 *
		 * Aufrufer (Stand Task 9):
		 * - `form/position/PositionPanel.svelte` — setzt `false` und erklärt den
		 *   Fall selbst (Zustand C, inkl. der Auswege „Auf Karte wählen" und
		 *   „Seegebiet beschreiben").
		 * - `sections/Media.svelte` — übernimmt den Default `true`, erreicht den
		 *   Hinweis aber nie: mit `enableGPSExtraction={false}` ist
		 *   `isPositionStep` falsch und der GPS-Zweig wird gar nicht gerendert.
		 *
		 * An diesem Default hängt damit aktuell kein sichtbarer Hinweis; er bleibt
		 * `true` als sicheres Verhalten für einen künftigen GPS-Modus-Aufrufer ohne
		 * eigene Erklärung. Bewusst eine eigene Prop und nicht an `isPositionStep`
		 * gehängt: Der Zweck ist „Aufrufer erklärt es selbst", nicht „welcher Modus".
		 */
		showNoGpsWarning = true
	} = $props<{
		referenceId: string;
		maxFiles?: number;
		config: ValidationPreset;
		enableGPSExtraction?: boolean;
		title?: string;
		additionalText?: string;
		showNoGpsWarning?: boolean;
	}>();

	// Lokaler State für Dropzone-Dateien (temporär während des Drag & Drop)
	let dropzoneFiles = $state<File[]>([]);

	// Modus-Bestimmung basierend auf maxFiles
	let isSingleFileMode = $derived(maxFiles === 1);
	let isPositionStep = $derived(enableGPSExtraction && isSingleFileMode);

	// Initialisierung der Upload-Map mit bestehenden Formulardaten
	let uploadedFiles = $derived($form.uploadedFiles);

	// Direkte, abgeleitete Referenz auf mediaStore.mediaFiles für Reaktivität
	let mediaFiles = $derived(mediaStore.mediaFiles);

	// Hilfsfunktion zum Aktualisieren des mediaStore
	function updateMediaFiles(newFiles: MediaFile[]): void {
		mediaStore.mediaFiles = newFiles;
	}

	$effect.pre(() => {
		logger.info('Updating media files from uploaded files');
		const currentMediaFiles = mediaStore.mediaFiles;
		let hasChanges = false;
		const updatedFiles = [...currentMediaFiles];
		// Herkunft aus dem Storage statt aus `isPositionStep`: `uf` trägt sie
		// nicht, und das Positions-Panel urteilt nur über Dateien des
		// Positions-Schritts (positionPanelState.ts). Mit `isPositionStep`
		// stempelte die zuerst gemountete Dropzone ihre eigene Herkunft auf alle
		// wiederhergestellten Dateien — nach einem Reload auf Schritt 1 galten
		// Schritt-3-Medien als Positions-Foto, nach einem Reload auf Schritt 2+
		// verlor das echte Positions-Foto seinen Hinweis (positionFileOrigin.ts).
		const positionUids = loadPositionUids();

		uploadedFiles.forEach((uf) => {
			if (!currentMediaFiles.some((mf) => mf.uid === uf.uid)) {
				updatedFiles.push(
					MediaFile.fromUploadedFile(uf, referenceId, isPositionUid(positionUids, uf.uid))
				);
				hasChanges = true;
			}
		});

		if (hasChanges) {
			updateMediaFiles(updatedFiles);
		}
	});

	// Mediafile für Positionsdaten - bevorzuge Dateien mit GPS, aber zeige auch erste Datei ohne GPS
	let positionMediaFile = $derived(
		mediaFiles.find((mf) => mf.hasPosition()) ?? (isPositionStep ? mediaFiles[0] : undefined)
	);

	/**
	 * Trigger a change event for the specified form field.
	 * @param name - The name of the form field.
	 * @param value - The new value for the form field.
	 */
	function triggerChange(name: string, value: unknown) {
		handleChange({ target: { name, value } } as unknown as Event);
	}

	/**
	 * Adds a newly uploaded file to the list of uploaded files.
	 * @param uploadedFile
	 */
	function addUploadedFile(uploadedFile: UploadedFileInfo) {
		uploadedFiles = [...uploadedFiles, uploadedFile];
		triggerChange('uploadedFiles', uploadedFiles);
	}

	/**
	 * Deletes a file from the uploaded files list and media files.
	 * @param uid
	 */
	function deleteFile(uid: string) {
		uploadedFiles = uploadedFiles.filter((uf) => uf.uid !== uid);
		updateMediaFiles(mediaStore.mediaFiles.filter((mf) => mf.uid !== uid));
		unmarkPositionFile(uid);
		triggerChange('uploadedFiles', uploadedFiles);
	}

	/**
	 * Übernimmt eine aus EXIF gelesene GPS-Position in den Formularzustand und
	 * merkt sich die geschriebenen Rohwerte in `appliedExifPosition`, damit ein
	 * späteres Entfernen des Fotos diese (und nur diese) wieder zurücknehmen kann.
	 */
	function applyExifPosition(exifData: ExifData): void {
		const latitude = exifData.latitude!.toFixed(4);
		const longitude = exifData.longitude!.toFixed(4);
		triggerChange('latitude', latitude);
		triggerChange('longitude', longitude);
		// Echte Koordinaten vorhanden → Position ist gesetzt
		triggerChange('hasPosition', true);
		appliedExifPosition = { latitude, longitude };
	}

	/**
	 * Nimmt eine zuvor aus EXIF übernommene Position wieder zurück — aber NUR,
	 * wenn die aktuellen Formular-Koordinaten noch exakt diesem Wert entsprechen
	 * (siehe `shouldResetExifPosition` in `exifPositionReset.ts`). Hat der Nutzer
	 * die Position inzwischen manuell überschrieben, bleibt sie erhalten.
	 */
	function resetExifPositionIfUnchanged(): void {
		if (shouldResetExifPosition(get(form), appliedExifPosition)) {
			triggerChange('latitude', undefined);
			triggerChange('longitude', undefined);
			triggerChange('hasPosition', false);
		}
		appliedExifPosition = null;
	}

	$effect(() => {
		if (positionMediaFile) {
			if (positionMediaFile.exifData?.latitude && positionMediaFile.exifData?.longitude) {
				applyExifPosition(positionMediaFile.exifData);
			}
			const timestamp = positionMediaFile.timestamp;
			if (timestamp) {
				const { date: sightingDate, time: sightingTime } = splitDateTime(timestamp);
				logger.info({ sightingDate, sightingTime }, 'New sighting data extracted');
				triggerChange('sightingDate', sightingDate);
				triggerChange('sightingTime', sightingTime);
			}
		}
	});

	/**
	 * Verarbeitet neu hinzugefügte Dateien
	 *
	 * Workflow:
	 * 1. Sofortige Dateianalyse für Preview (EXIF, Thumbnails)
	 * 2. Paralleler Upload im Hintergrund
	 * 3. GPS-Extraktion bei entsprechendem Modus
	 * 4. Update von Preview-State und Media Store
	 *
	 * @param newFiles - Array von neu hinzugefügten Dateien
	 */
	async function handleFilesAdded(newFiles: File[]) {
		if (newFiles.length === 0) return;

		// Single-File-Modus: Bestehende Datei ersetzen
		if (isSingleFileMode && mediaFiles.length > 0) {
			createToast('info', 'Nur eine Datei erlaubt. Bestehende Datei wird ersetzt.');
			await handleClear();
		}

		// Datei-Limit prüfen und ggf. beschränken
		const currentCount = mediaFiles?.length || 0;
		const allowedCount = Math.min(newFiles.length, maxFiles - currentCount);
		const filesToProcess = newFiles.slice(0, allowedCount);

		if (filesToProcess.length < newFiles.length) {
			createToast(
				'warning',
				`Nur ${allowedCount} von ${newFiles.length} Dateien können hinzugefügt werden (Maximum: ${maxFiles}).`
			);
		}

		if (filesToProcess.length === 0) return;

		// Add new files to mediaFiles and process them
		const newMediaFiles = filesToProcess.map((file) => {
			const mediaFile = MediaFile.createMediaFile(referenceId, file, isPositionStep);
			// Herkunft sofort festhalten, damit sie einen Reload übersteht — hier
			// ist sie bekannt, nach dem Reload nirgends mehr (positionFileOrigin.ts).
			if (isPositionStep) {
				markPositionFile(mediaFile.uid);
			}
			mediaFile.uploadedFile
				.then((uploadedFile) => {
					// Update form data
					addUploadedFile(uploadedFile);
					createToast('success', 'Datei erfolgreich hochgeladen.');
				})
				.catch((error) => {
					logger.error({ error }, 'Fehler beim Hochladen der Datei.');
					deleteFile(mediaFile.uid);
					createToast('error', 'Fehler beim Hochladen der Datei');
				});
			// Trigger positionMediaFile update when metadata is ready
			//
			// Mit Rejection-Zweig, und der ist nicht kosmetisch: `analyzed` ist ein
			// gewöhnliches Klassenfeld und weckt nichts; das einzige reaktive Signal
			// ist die Neuzuweisung von `mediaStore.mediaFiles` unten. Lehnt die
			// Metadaten-Promise ab und liefe nur der Erfolgs-Zweig, bliebe diese
			// Zuweisung aus — das Panel hinge für immer in `'analyzing'`: kein
			// GPS-Hinweis, kein Ausweg, keine Fehlermeldung. Zusätzlich entstünde
			// eine unbehandelte Rejection.
			const refreshAfterMetadata = (): void => {
				// Directly update form GPS data here — the $effect that reads positionMediaFile.exifData
				// runs before EXIF extraction completes (async), and won't re-run afterwards because
				// positionMediaFile stays the same object reference (plain class property, not $state).
				if (isPositionStep && mediaFile.hasPosition()) {
					applyExifPosition(mediaFile.exifData!);
					if (mediaFile.timestamp) {
						const { date: sightingDate, time: sightingTime } = splitDateTime(mediaFile.timestamp);
						logger.info(
							{ sightingDate, sightingTime },
							'New sighting data extracted from metadata'
						);
						triggerChange('sightingDate', sightingDate);
						triggerChange('sightingTime', sightingTime);
					}
				}
				// Trigger store update to refresh derived values.
				//
				// Bedingungslos, und das ist der Punkt: Der Abschluss der Auswertung IST
				// die Neuigkeit — auch (gerade) dann, wenn kein GPS gefunden wurde.
				// PositionPanel unterscheidet „wird ausgewertet" von „kein GPS" über
				// `MediaFile.isAnalyzed()`; ohne diese Zuweisung bliebe sein `$derived`
				// auf dem Stand vom Drop-Zeitpunkt stehen und der Hinweis auf das Foto
				// ohne GPS erschiene nie.
				//
				// Der bisherige Wächter (`!hadPositionMediaFile && hasPosition()`) hat
				// den Fall ohne GPS ausgelassen. Doppelt angewandt wird dadurch nichts:
				// `positionMediaFile` ist ein `$derived` und liefert dieselbe Instanz
				// wie zuvor — Sveltes Gleichheitsprüfung (deriveds.js:396) stoppt die
				// Propagation, der `$effect` oben läuft also nicht erneut.
				updateMediaFiles([...mediaStore.mediaFiles]);
			};
			mediaFile.metadata.then(refreshAfterMetadata, (error) => {
				logger.warn({ error, uid: mediaFile.uid }, 'EXIF-Auswertung fehlgeschlagen');
				refreshAfterMetadata();
			});
			return mediaFile;
		});
		updateMediaFiles([...mediaStore.mediaFiles, ...newMediaFiles]);
	}

	/**
	 * Entfernt eine einzelne Datei
	 *
	 * Schritte:
	 * 1. Löschung vom Server (falls hochgeladen)
	 * 2. Entfernung aus Upload-Map
	 * 3. Entfernung aus Media Store
	 * 4. GPS-Formulardaten zurücknehmen — aber NUR, wenn sie noch dem zuletzt
	 *    aus diesem Foto übernommenen EXIF-Wert entsprechen und der Nutzer sie
	 *    nicht inzwischen manuell überschrieben hat (siehe `resetExifPositionIfUnchanged`)
	 * 5. User-Feedback
	 *
	 * @param index - Index der zu löschenden Datei im gefilterten Array
	 */
	async function handleFileRemoved(uidOrFilename: string) {
		// Suche nach der Mediendatei
		const mediaFile = mediaFiles.find(
			(mf) => mf.uid === uidOrFilename || mf.fileName === uidOrFilename
		);
		if (!mediaFile) {
			logger.warn({ uidOrFilename }, 'No media file found with uid or filename');
			return;
		}

		// Doppelklick-Schutz
		if (mediaFile.isDeleting) {
			return;
		}
		mediaFile.isDeleting = true;

		try {
			const fileInfo = await mediaFile.uploadedFile;

			// Vom Server löschen falls hochgeladen
			if (fileInfo) {
				await deleteFileDirect(fileInfo.filePath);
				// Aus lokalen Stores entfernen
				deleteFile(mediaFile.uid);
				resetExifPositionIfUnchanged();
				createToast('success', 'Datei erfolgreich gelöscht.');
			}
		} catch (error) {
			logger.info({ error }, 'Fehler beim Löschen der Datei vom Server.');
			createToast('error', 'Fehler beim Löschen der Datei.');
		}
	}

	/**
	 * Löscht alle Dateien und setzt den Komponenten-State zurück
	 *
	 * Aufräum-Schritte:
	 * 1. Object URLs freigeben (Memory Leaks vermeiden)
	 * 2. Alle Dateien vom Server löschen
	 * 3. UI-State komplett zurücksetzen
	 * 4. GPS-Formulardaten zurücknehmen — aber NUR, wenn sie noch dem zuletzt aus
	 *    EXIF übernommenen Wert entsprechen und der Nutzer sie nicht inzwischen
	 *    manuell überschrieben hat (siehe `resetExifPositionIfUnchanged`)
	 */
	function handleClear() {
		try {
			dropzoneFiles = [];

			// Vormerkungen der entfernten Dateien zurücknehmen, bevor der Store leer
			// ist — sonst blieben verwaiste uids im sessionStorage stehen.
			for (const mediaFile of mediaStore.mediaFiles) {
				unmarkPositionFile(mediaFile.uid);
			}

			// Clear media files im Store
			updateMediaFiles([]);

			// Alle hochgeladenen Dateien vom Server löschen
			deleteMultipleFiles(uploadedFiles);

			// Clear uploaded files
			uploadedFiles = [];
			resetExifPositionIfUnchanged();

			triggerChange('uploadedFiles', uploadedFiles);
			createToast('success', 'Alle Dateien erfolgreich gelöscht.');
		} catch (_error) {
			createToast('error', 'Fehler beim Löschen aller Dateien.');
		}
	}
</script>

<div class="space-y-4">
	<!-- Enhanced Preview Section mit EXIF-Daten (only for non-GPS mode or multiple files) -->
	{#if !isPositionStep && mediaFiles && mediaFiles.length > 0}
		<div class="bg-base-200 rounded-lg p-4">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-sm font-semibold">
					{mediaFiles.length} Datei{mediaFiles.length !== 1 ? 'en' : ''}
					<!-- {previewFiles.length > 0 ? '(wird verarbeitet...)' : 'hochgeladen'} -->
				</h3>
				<!-- `min-h-11` hält das 44-px-Touch-Target, das `btn-sm` sonst
				     unterschreitet (design-system.md, A11y-Mindestanforderungen). -->
				<button
					type="button"
					class="btn btn-ghost btn-sm text-error hover:bg-error hover:text-error-content min-h-11"
					onclick={handleClear}
				>
					Alle löschen
				</button>
			</div>

			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				<!-- Uploaded files -->
				{#each mediaFiles as mediaFile (mediaFile.uid)}
					<!-- Media File Card -->
					{#if mediaFile}
						<div class="card bg-base-100 shadow-sm">
							<div class="card-body p-3">
								{#await mediaFile.metadata then fileMetadata}
									<!-- Thumbnail -->
									<div class="relative">
										<div
											class="bg-base-200 flex h-20 items-center justify-center overflow-hidden rounded"
										>
											{#if mediaFile.thumbnail}
												<img
													src={mediaFile.thumbnail}
													alt={mediaFile.fileName}
													class="h-full w-full object-contain"
												/>
											{:else}
												<span class="text-xl" role="img" aria-label="File type icon">
													{getFileIcon(fileMetadata.mimeType)}
												</span>
											{/if}
										</div>

										<!-- Position step indicator -->
										{#if mediaFile.isFromPositionStep}
											<div
												class="bg-primary text-primary-content absolute top-1 left-1 rounded px-1.5 py-0.5 text-xs"
											>
												Position
											</div>
										{/if}

										{#await mediaFile.uploadedFile}
											<!-- Loading spinner overlay -->
											<div
												class="absolute inset-0 flex items-center justify-center rounded bg-black/30"
											>
												<div class="loading loading-spinner loading-sm text-white"></div>
											</div>

											<!-- Upload progress indicator -->
											<div
												class="bg-info text-info-content absolute top-1 left-1 rounded px-1.5 py-0.5 text-xs"
											>
												Upload...
											</div>
										{:then}
											<!-- Remove button. `min-h-11 min-w-11` hält das 44-px-Touch-Target
											     (design-system.md); der Button ist absolut positioniert und
											     kann das Datei-Grid in Schritt 3 deshalb nicht umbrechen.
											     `btn-error:hover` war eine tote Klasse — diese Schreibweise
											     erzeugt Tailwind nicht (Variante wäre `hover:…`). -->
											<button
												type="button"
												class="btn btn-circle btn-sm btn-error text-error-content absolute -top-2 -right-2 min-h-11 min-w-11"
												onclick={() => handleFileRemoved(mediaFile.uid)}
												aria-label="Datei entfernen"
											>
												<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M6 18L18 6M6 6l12 12"
													></path>
												</svg>
											</button>
										{/await}
									</div>
								{/await}
								<!-- File Info -->
								<div class="mt-2">
									<h4 class="truncate text-xs font-medium" title={mediaFile.fileName}>
										{mediaFile.fileName}
									</h4>
									<p class="text-base-content/60 text-xs">
										{formatFileSize(mediaFile.size)}
									</p>
								</div>

								{#await mediaFile.metadata then fileMetadata}
									<!-- GPS Info -->
									{#if fileMetadata.exifData?.latitude && fileMetadata.exifData?.longitude}
										<div class="bg-success/10 mt-1 rounded p-1.5">
											<div class="flex items-center gap-1">
												<Icon icon="lucide:map-pin" width="12" class="text-success" />
												<span class="text-success text-xs font-medium">GPS</span>
												{#if isInBalticArea(fileMetadata.exifData.longitude, fileMetadata.exifData.latitude)}
													<span class="badge badge-success badge-xs">Ostsee</span>
												{:else}
													<span class="badge badge-warning badge-xs">Außerhalb</span>
												{/if}
											</div>
											<p class="text-success/80 mt-0.5 text-xs">
												{formatLocation(
													fileMetadata.exifData.longitude,
													fileMetadata.exifData.latitude
												)}
											</p>
										</div>
									{:else if fileMetadata.mimeType.startsWith('image/')}
										<div class="bg-base-300/50 mt-1 rounded p-1.5">
											<p class="text-base-content/60 flex items-center gap-1 text-xs">
												<Icon icon="lucide:map-pin" width="12" class="text-base-content/60" />
												Keine GPS-Daten
											</p>
										</div>
									{/if}

									<!-- Additional EXIF Info -->
									{#if mediaFile.timestamp}
										<div class="mt-1">
											<p class="text-base-content/60 flex items-center gap-1 text-xs">
												<Icon icon="lucide:calendar" width="12" height="12" class="text-primary" />
												{mediaFile.timestamp.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}
											</p>
										</div>
									{/if}
								{/await}
							</div>
						</div>
					{/if}
				{/each}
			</div>
		</div>
	{/if}

	<!-- Map View (when GPS data available) or Preview/Dropzone -->
	{#if isPositionStep && positionMediaFile}
		{#await positionMediaFile.metadata}
			<!-- Loading state while metadata is being extracted -->
			<div class="bg-base-100 border-base-300 rounded-lg border p-4">
				<div
					class="flex items-center justify-center gap-2 py-8"
					role="status"
					aria-label="Analysiere Bilddaten"
				>
					<div class="loading loading-spinner loading-md text-primary"></div>
					<span class="text-base-content/60 text-sm">Analysiere Bilddaten...</span>
				</div>
			</div>
		{:then positionMediafileMetadata}
			{#if positionMediafileMetadata.exifData?.latitude && positionMediafileMetadata.exifData?.longitude}
				<!-- Map Display with GPS Position -->
				<div class="bg-base-100 border-base-300 rounded-lg border p-4">
					<!-- `flex-wrap gap-2`: Die Zeile trägt drei Elemente, darunter ein
					     `text-nowrap`-Badge mit den Koordinaten. Seit der Button auf
					     `btn-sm` steht, passt sie auf schmalen Geräten nicht mehr
					     zwingend in eine Zeile — ohne Umbruch liefe sie über. -->
					<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
						<div class="flex items-center gap-2">
							<Icon icon="lucide:map-pin" class="text-success h-[18px] w-[18px]" />
							<h4 class="text-sm font-semibold">GPS-Position</h4>
						</div>
						<div class="badge badge-success badge-sm text-nowrap">
							{formatLocation(
								positionMediafileMetadata.exifData?.longitude,
								positionMediafileMetadata.exifData?.latitude
							)}
						</div>
						{#await positionMediaFile.uploadedFile}
							<div class="loading loading-spinner loading-sm text-primary">
								Upload läuft im Hintergrund...
							</div>
						{:then}
							<!-- `min-h-11` hält das 44-px-Touch-Target (design-system.md). -->
							<button
								type="button"
								class="btn btn-ghost btn-sm text-error hover:bg-error hover:text-error-content min-h-11"
								onclick={handleClear}
							>
								Neu auswählen
							</button>
						{/await}
					</div>

					<div
						class="bg-base-200 border-base-300 overflow-hidden rounded-lg border"
						style="height: 300px;"
					>
						<OLMap
							latitude={positionMediafileMetadata.exifData.latitude!}
							longitude={positionMediafileMetadata.exifData.longitude!}
							zoom={13}
							readonly={true}
							--map-height="300px"
						/>
					</div>

					{#if positionMediaFile.timestamp}
						<div class="mt-3 text-center">
							<p class="text-base-content/60 flex items-center justify-center gap-1 text-xs">
								<Icon icon="lucide:calendar" width="12" height="12" class="text-primary" />
								Aufnahmezeit: {positionMediaFile.timestamp.toLocaleString('de-DE', {
									timeZone: 'Europe/Berlin'
								})}
							</p>
						</div>
					{/if}

					<!-- Show upload progress if still uploading -->
					{#await positionMediaFile.uploadedFile}
						<div
							class="mt-3 flex items-center justify-center gap-2"
							role="status"
							aria-label="Upload läuft"
						>
							<div class="loading loading-spinner loading-sm"></div>
							<span class="text-base-content/60 text-sm">Upload läuft im Hintergrund...</span>
						</div>
					{/await}
				</div>
			{:else}
				<!-- Image uploaded but no GPS data - show preview with info -->
				<div class="bg-base-100 border-base-300 rounded-lg border p-4">
					<div class="mb-3 flex items-center justify-between gap-2">
						<div class="flex items-center gap-2">
							<Icon icon="lucide:image" class="text-primary h-[18px] w-[18px]" />
							<h4 class="text-sm font-semibold">Foto hochgeladen</h4>
						</div>
						{#await positionMediaFile.uploadedFile}
							<div class="loading loading-spinner loading-sm text-primary"></div>
						{:then}
							<!-- `min-h-11` hält das 44-px-Touch-Target (design-system.md). -->
							<button
								type="button"
								class="btn btn-ghost btn-sm text-error hover:bg-error hover:text-error-content min-h-11"
								onclick={handleClear}
							>
								Neu auswählen
							</button>
						{/await}
					</div>

					<!-- Thumbnail preview -->
					{#if positionMediaFile.thumbnail}
						<div
							class="bg-base-200 flex h-40 items-center justify-center overflow-hidden rounded-lg"
						>
							<img
								src={positionMediaFile.thumbnail}
								alt={positionMediaFile.fileName}
								class="h-full w-full object-contain"
							/>
						</div>
					{/if}

					<!-- Warning: No GPS data — entfällt, wenn der Aufrufer den Fall selbst
					     erklärt (siehe Prop `showNoGpsWarning`). -->
					{#if showNoGpsWarning}
						<div class="alert alert-warning mt-3">
							<Icon icon="lucide:map-pin-off" width="20" />
							<div>
								<h4 class="font-medium">Keine GPS-Daten im Foto</h4>
								<p class="text-sm">
									Bitte wählen Sie die Position manuell auf der Karte oder laden Sie ein Foto mit
									GPS-Daten hoch.
								</p>
							</div>
						</div>
					{/if}

					{#if positionMediaFile.timestamp}
						<div class="mt-3 text-center">
							<p class="text-base-content/60 flex items-center justify-center gap-1 text-xs">
								<Icon icon="lucide:calendar" width="12" height="12" class="text-primary" />
								Aufnahmezeit: {positionMediaFile.timestamp.toLocaleString('de-DE', {
									timeZone: 'Europe/Berlin'
								})}
							</p>
						</div>
					{/if}

					<!-- Show upload progress if still uploading -->
					{#await positionMediaFile.uploadedFile}
						<div
							class="mt-3 flex items-center justify-center gap-2"
							role="status"
							aria-label="Upload läuft"
						>
							<div class="loading loading-spinner loading-sm"></div>
							<span class="text-base-content/60 text-sm">Upload läuft im Hintergrund...</span>
						</div>
					{/await}
				</div>
			{/if}
		{:catch}
			<!-- Ohne diesen Zweig schlägt eine abgelehnte Metadaten-Promise als
			     Svelte-Fehler durch (plus unbehandelte Rejection) und der Nutzer sieht
			     gar nichts. Die Datei selbst ist da — was fehlt, sind nur die
			     EXIF-Angaben. Deshalb Hinweis statt Abbruch, mit demselben Ausweg wie
			     im GPS-losen Fall. -->
			<div class="alert alert-warning" role="status" data-testid="photo-analysis-failed">
				<Icon aria-hidden="true" icon="lucide:circle-alert" width="20" class="shrink-0" />
				<div>
					<p class="text-sm">
						Die Bilddaten dieses Fotos konnten nicht gelesen werden. Position, Datum und Uhrzeit
						bitte selbst angeben — das Foto bleibt erhalten.
					</p>
					<div class="mt-3">
						<button
							type="button"
							class="btn btn-outline btn-sm min-h-11"
							onclick={handleClear}
							data-testid="photo-analysis-failed-reset"
						>
							Neu auswählen
						</button>
					</div>
				</div>
			</div>
		{/await}
	{:else}
		<!-- Unified Dropzone -->
		<UnifiedDropzone
			{config}
			bind:files={dropzoneFiles}
			onFilesAdded={handleFilesAdded}
			onFileRemoved={handleFileRemoved}
			onClear={handleClear}
			multiple={!isSingleFileMode}
			title={title ||
				(mediaFiles && mediaFiles.length > 0
					? isSingleFileMode
						? 'Foto ersetzen'
						: 'Weitere Dateien hinzufügen'
					: isSingleFileMode
						? 'Foto hochladen'
						: 'Medien hochladen')}
			{additionalText}
			showPreview={false}
		/>
	{/if}
</div>

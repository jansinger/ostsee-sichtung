<script lang="ts">
	import UnifiedDropzone from '$lib/components/form/UnifiedDropzone.svelte';
	import OLMap from '$lib/components/map/OLMap.svelte';
	import { createLogger } from '$lib/logger';
	import { getFormContext } from '$lib/report/formContext';
	import { mediaStore } from '$lib/stores/mediaStore';
	import { createToast } from '$lib/stores/toastStore';
	import { analyzeFile, isInBalticSea, type FileMetadata } from '$lib/utils/exifUtils';
	import { FILE_VALIDATION_PRESETS } from '$lib/utils/fileValidation';
	import { formatLocation } from '$lib/utils/format/formatLocation';
	import { deleteFileDirect, uploadFileDirect } from '$lib/utils/uploadUtils';
	import { Calendar, Camera, MapPin, SquarePen } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import { SvelteMap } from 'svelte/reactivity';
	import FormField from '../form/fields/FormField.svelte';
	import LocationInput from '../form/LocationInput.svelte';
	import VerifyLocation from '../form/VerifyLocation.svelte';

	const logger = createLogger('PositionAndTime');
	const { form, handleChange } = getFormContext();

	// Position input method: 'photo', 'map', 'manual'
	let positionMethod = $state<'photo' | 'map' | 'manual'>('photo');
	let isAnalyzing = $state(false);
	let isUploading = $state(false);
	let photoMetadata: FileMetadata | null = $state(null);
	let photoFile: File | null = $state(null);
	let dropzoneFiles = $state<File[]>([]);
	let uploadedPhotoPath: string | null = $state(null);

	// Lokaler Zustand für hochgeladene Dateien (für Form-Updates)
	let uploadedFiles = new SvelteMap<
		string,
		{ filePath: string; originalName: string; mimeType: string; size: number }
	>();

	// Initialize uploadedFiles SvelteMap from form data array
	if ($form.uploadedFiles && Array.isArray($form.uploadedFiles) && $form.uploadedFiles.length > 0) {
		// Convert array format from form schema to SvelteMap format
		$form.uploadedFiles.forEach((fileInfo) => {
			uploadedFiles.set(fileInfo.originalName, {
				filePath: fileInfo.filePath,
				originalName: fileInfo.originalName,
				mimeType: fileInfo.mimeType,
				size: fileInfo.size
			});
		});
	}

	// Update form when uploaded files change
	$effect(() => {
		const filesArray = Array.from(uploadedFiles.values());
		handleChange({
			target: {
				name: 'uploadedFiles',
				value: filesArray
			}
		} as unknown as Event);
	});

	// Generiere eine einfache referenceId für Upload (temporäre Lösung)
	const referenceId = $derived($form.referenceId);

	// Reactive form state (for potential future use)
	// let hasPosition = $derived($form.hasPosition);

	// Restore state from form data when component is re-mounted or step is revisited
	$effect(() => {
		// Restore uploaded files and photo state from form data
		if (
			$form.uploadedFiles &&
			Array.isArray($form.uploadedFiles) &&
			$form.uploadedFiles.length > 0
		) {
			// Find position photos in uploaded files
			const positionPhotos = $form.uploadedFiles.filter(
				(file) => file.mimeType?.startsWith('image/') && file.filePath && file.originalName
			);

			if (positionPhotos.length > 0 && !photoFile) {
				const firstPhoto = positionPhotos[0];
				if (firstPhoto) {
					uploadedPhotoPath = firstPhoto.filePath;

					// Set position method to photo if we have position data
					if (
						$form.hasPosition &&
						$form.latitude &&
						$form.longitude &&
						positionMethod !== 'photo'
					) {
						positionMethod = 'photo';
					}

					// Create a mock file object for display purposes
					// This allows showing the uploaded photo even after step navigation
					try {
						// Create basic metadata for display
						photoMetadata = {
							name: firstPhoto.originalName,
							size: firstPhoto.size,
							type: firstPhoto.mimeType,
							lastModified: new Date(),
							thumbnail: `/uploads/${firstPhoto.filePath}`, // Use server path for display
							exif: {
								latitude: $form.latitude ? parseFloat($form.latitude.toString()) : null,
								longitude: $form.longitude ? parseFloat($form.longitude.toString()) : null,
								altitude: null, // No altitude data stored in form
								timestamp: $form.sightingDate
									? new Date($form.sightingDate + 'T' + ($form.sightingTime || '12:00'))
									: null
							}
						};

						// Create a mock File object for display - this helps with the UI state
						photoFile = new File([''], firstPhoto.originalName, { type: firstPhoto.mimeType });

						// Also add this file to mediaStore if it's not already there
						// This ensures the file appears in both Position step and Media step
						mediaStore.addFromPositionStep(photoFile, photoMetadata);
					} catch (error) {
						logger.warn({ error, file: firstPhoto }, 'Error restoring photo metadata');
					}
				}
			}
		}
	});

	async function processFile(file: File) {
		if (!file.type.startsWith('image/')) {
			createToast('error', 'Bitte wählen Sie eine Bilddatei aus.');
			return;
		}

		isAnalyzing = true;
		photoFile = file;

		try {
			const metadata = await analyzeFile(file);
			photoMetadata = metadata;

			// Check if photo has GPS data
			if (metadata.exif.latitude !== null && metadata.exif.longitude !== null) {
				// Validate Baltic Sea location
				if (isInBalticSea(metadata.exif.latitude, metadata.exif.longitude)) {
					// Set position in form
					handleChange({
						target: { name: 'latitude', value: metadata.exif.latitude.toString() }
					} as unknown as Event);
					handleChange({
						target: { name: 'longitude', value: metadata.exif.longitude.toString() }
					} as unknown as Event);
					handleChange({ target: { name: 'hasPosition', value: true } } as unknown as Event);

					// Set date/time if available
					if (metadata.exif.timestamp) {
						const date = metadata.exif.timestamp;
						handleChange({
							target: { name: 'sightingDate', value: date.toISOString().split('T')[0] }
						} as unknown as Event);
						handleChange({
							target: { name: 'sightingTime', value: date.toTimeString().slice(0, 5) }
						} as unknown as Event);
					}

					// Add photo to media store for later media upload
					mediaStore.addFromPositionStep(file, metadata);

					createToast('success', 'GPS-Position und Datum erfolgreich aus dem Foto übernommen!');
				} else {
					createToast(
						'warning',
						'Das Foto wurde außerhalb der Ostsee aufgenommen. Bitte verwenden Sie ein anderes Foto oder wählen Sie eine andere Eingabemethode.'
					);
				}
			} else {
				createToast(
					'info',
					'Das Foto enthält keine GPS-Daten. Sie können trotzdem die Kartenansicht oder manuelle Eingabe verwenden.'
				);
			}
		} catch (error) {
			logger.warn({ error, fileName: file.name }, 'Error analyzing photo');
			createToast('error', 'Fehler beim Analysieren des Fotos.');
		} finally {
			isAnalyzing = false;
		}
	}

	async function handleFilesAdded(newFiles: File[]) {
		if (newFiles.length > 0) {
			const file = newFiles[0]; // Only take the first file for GPS position
			if (!file) return; // TypeScript type guard

			await processFile(file);

			// Upload-Phase (separat von der Analyse)
			if (photoFile && referenceId) {
				// Upload nur wenn die Datei erfolgreich verarbeitet wurde
				isUploading = true;
				try {
					const uploadResult = await uploadFileDirect(file, referenceId);
					uploadedPhotoPath = uploadResult.filePath;

					// Speichere die Datei-Informationen für späteres Löschen und DB-Speicherung
					uploadedFiles.set(file.name, {
						filePath: uploadResult.filePath,
						originalName: file.name,
						mimeType: file.type,
						size: file.size
					});

					logger.info(
						{ fileName: file.name, filePath: uploadResult.filePath },
						'Position photo uploaded and tracked'
					);
					createToast('success', 'Foto erfolgreich hochgeladen!');
				} catch (error) {
					logger.error({ error, fileName: file.name }, 'Failed to upload position photo');
					const errorMessage = (error as Error).message;
					if (
						errorMessage.includes('Ungültiger MIME-Type') ||
						errorMessage.includes('Nur Bild- und Videoformate')
					) {
						createToast('error', 'Ungültiges Dateiformat. Nur Bilder und Videos sind erlaubt.');
						await removeInvalidPositionFiles();
					} else if (errorMessage.includes('zu groß') || errorMessage.includes('Maximum')) {
						createToast('error', 'Datei zu groß. Maximum: 100MB pro Datei.');
						await removeInvalidPositionFiles();
					} else if (errorMessage.includes('leer')) {
						createToast('error', 'Leere Dateien können nicht hochgeladen werden.');
						await removeInvalidPositionFiles();
					} else {
						createToast('error', 'Fehler beim Hochladen des Fotos. Versuchen Sie es erneut.');
					}
					// Remove file from uploadedFiles map on error
					uploadedFiles.delete(file.name);
				} finally {
					isUploading = false;
				}
			}
		}
	}

	async function handleFileRemoved(_index: number) {
		// Clear the photo when removed from dropzone
		await clearPhoto();
	}

	async function handleDropzoneClear() {
		await clearPhoto();
	}

	async function clearPhoto() {
		try {
			// Lösche vom Server wenn hochgeladen
			if (uploadedPhotoPath) {
				try {
					await deleteFileDirect(uploadedPhotoPath);
					logger.info({ filePath: uploadedPhotoPath }, 'Position photo deleted from server');
				} catch (deleteError) {
					logger.error(
						{ deleteError, filePath: uploadedPhotoPath },
						'Failed to delete position photo from server'
					);
					createToast('error', 'Fehler beim Löschen des Fotos vom Server.');
				}
			}

			// Remove from media store if it was added
			mediaStore.clear();

			// Clear uploaded files map (will trigger form update via $effect)
			uploadedFiles.clear();

			uploadedPhotoPath = null;
			photoFile = null;
			photoMetadata = null;
			dropzoneFiles = [];
		} catch (error) {
			logger.error({ error }, 'Failed to clear photo');
			createToast('error', 'Fehler beim Löschen des Fotos.');
		}
	}

	async function removeInvalidPositionFiles() {
		try {
			// Entferne das aktuelle Position-Foto bei Fehlern
			await clearPhoto();
			createToast(
				'info',
				'Ungültiges Foto wurde entfernt. Bitte versuchen Sie es mit einem anderen Bild.'
			);
		} catch (error) {
			logger.error({ error }, 'Failed to remove invalid position file');
		}
	}

	function selectMethod(method: 'photo' | 'map' | 'manual') {
		positionMethod = method;

		// Reset position data when switching methods (except when using photo data)
		if (method !== 'photo' || !photoMetadata?.exif.latitude) {
			handleChange({
				target: { name: 'hasPosition', value: method !== 'manual' }
			} as unknown as Event);
			if (method === 'manual') {
				handleChange({ target: { name: 'latitude', value: '' } } as unknown as Event);
				handleChange({ target: { name: 'longitude', value: '' } } as unknown as Event);
			}
		}
	}
</script>

<!-- Position & Time Section -->
<div class="space-y-6">
	<!-- Position Input Method Selection -->
	<div class="card bg-base-200 shadow-sm">
		<div class="card-body">
			<h3 class="card-title mb-4 flex items-center gap-2 text-lg">
				<Icon src={MapPin} size="20" class="text-primary" />
				Positionsangabe
			</h3>
			<p class="text-base-content/70 mb-6 text-sm">
				Wählen Sie die für Sie einfachste Methode zur Positionsangabe
			</p>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				<!-- Photo Method -->
				<div class="relative">
					<input
						type="radio"
						id="method-photo"
						name="position-method"
						value="photo"
						bind:group={positionMethod}
						onchange={() => selectMethod('photo')}
						class="sr-only"
					/>
					<label
						for="method-photo"
						class="block cursor-pointer rounded-lg border-2 p-4 transition-all
						{positionMethod === 'photo'
							? 'border-primary bg-primary/10'
							: 'border-base-300 hover:border-primary/50'}"
					>
						<div class="flex flex-col items-center text-center">
							<Icon
								src={Camera}
								size="24"
								class="mb-2 {positionMethod === 'photo' ? 'text-primary' : 'text-base-content/60'}"
							/>
							<h4 class="text-sm font-semibold">Foto mit GPS</h4>
							<p class="text-base-content/60 mt-1 text-xs">Bevorzugt - GPS und Datum automatisch</p>
						</div>
					</label>
				</div>

				<!-- Map Method -->
				<div class="relative">
					<input
						type="radio"
						id="method-map"
						name="position-method"
						value="map"
						bind:group={positionMethod}
						onchange={() => selectMethod('map')}
						class="sr-only"
					/>
					<label
						for="method-map"
						class="block cursor-pointer rounded-lg border-2 p-4 transition-all
						{positionMethod === 'map'
							? 'border-primary bg-primary/10'
							: 'border-base-300 hover:border-primary/50'}"
					>
						<div class="flex flex-col items-center text-center">
							<Icon
								src={MapPin}
								size="24"
								class="mb-2 {positionMethod === 'map' ? 'text-primary' : 'text-base-content/60'}"
							/>
							<h4 class="text-sm font-semibold">Karte / GPS Position</h4>
							<p class="text-base-content/60 mt-1 text-xs">Position auf Karte wählen</p>
						</div>
					</label>
				</div>

				<!-- Manual Method -->
				<div class="relative">
					<input
						type="radio"
						id="method-manual"
						name="position-method"
						value="manual"
						bind:group={positionMethod}
						onchange={() => selectMethod('manual')}
						class="sr-only"
					/>
					<label
						for="method-manual"
						class="block cursor-pointer rounded-lg border-2 p-4 transition-all
						{positionMethod === 'manual'
							? 'border-primary bg-primary/10'
							: 'border-base-300 hover:border-primary/50'}"
					>
						<div class="flex flex-col items-center text-center">
							<Icon
								src={SquarePen}
								size="24"
								class="mb-2 {positionMethod === 'manual' ? 'text-primary' : 'text-base-content/60'}"
							/>
							<h4 class="text-sm font-semibold">Beschreibung</h4>
							<p class="text-base-content/60 mt-1 text-xs">Beschreibung der Position</p>
						</div>
					</label>
				</div>
			</div>

			<!-- Photo Upload Section -->
			{#if positionMethod === 'photo'}
				<div class="bg-base-100 rounded-lg p-4">
					<h4 class="mb-3 flex items-center gap-2 font-semibold">
						<Icon src={Camera} size="18" />
						Foto mit GPS-Daten hochladen
					</h4>

					{#if !photoFile}
						<UnifiedDropzone
							config={FILE_VALIDATION_PRESETS.PHOTO_GPS}
							bind:files={dropzoneFiles}
							onFilesAdded={handleFilesAdded}
							onFileRemoved={handleFileRemoved}
							onClear={handleDropzoneClear}
							multiple={false}
							title="Foto per Drag & Drop oder Klick hochladen"
							additionalText="GPS-Daten werden automatisch ausgelesen"
							isAnalyzing={isAnalyzing || isUploading}
							loadingText={isAnalyzing
								? 'Analysiere Foto...'
								: isUploading
									? 'Lade Foto hoch...'
									: 'Analysiere Foto...'}
							showPreview={false}
						/>
					{:else}
						<!-- Photo Preview -->
						<div class="bg-base-200 space-y-4 rounded-lg p-4">
							<!-- Top section with photo and basic info -->
							<div class="flex items-start gap-4">
								<!-- Thumbnail -->
								<div class="flex-shrink-0">
									{#if photoMetadata?.thumbnail}
										<img
											src={photoMetadata.thumbnail}
											alt="Foto Vorschau"
											class="h-16 w-16 rounded object-cover"
										/>
									{:else}
										<div class="bg-base-300 flex h-16 w-16 items-center justify-center rounded">
											<Icon src={Camera} size="20" class="text-base-content/60" />
										</div>
									{/if}
								</div>

								<!-- Photo Info -->
								<div class="flex-grow">
									<h5 class="text-sm font-medium">{photoFile.name}</h5>

									{#if isAnalyzing}
										<div class="mt-2 flex items-center gap-2">
											<div class="loading loading-spinner loading-sm"></div>
											<span class="text-base-content/60 text-xs">Analysiere Foto...</span>
										</div>
									{:else if photoMetadata}
										<!-- GPS Data Display -->
										{#if photoMetadata.exif.latitude && photoMetadata.exif.longitude}
											<div class="mt-2 space-y-1">
												<div class="flex items-center gap-1">
													<Icon src={MapPin} size="14" class="text-success" />
													<span class="text-success text-xs font-medium">GPS-Position gefunden</span
													>
													{#if isInBalticSea(photoMetadata.exif.latitude, photoMetadata.exif.longitude)}
														<span class="badge badge-success badge-xs">Ostsee</span>
													{:else}
														<span class="badge badge-warning badge-xs">Außerhalb Ostsee</span>
													{/if}
												</div>
												<p class="text-base-content/80 text-xs">
													{formatLocation(
														photoMetadata.exif.latitude,
														photoMetadata.exif.longitude
													)}
												</p>
											</div>
										{:else}
											<div class="mt-2">
												<div class="flex items-center gap-1">
													<Icon src={MapPin} size="14" class="text-warning" />
													<span class="text-warning text-xs font-medium">Keine GPS-Daten</span>
												</div>
											</div>
										{/if}

										<!-- Date/Time Data -->
										{#if photoMetadata.exif.timestamp}
											<div class="mt-1">
												<div class="flex items-center gap-1">
													<Icon src={Calendar} size="14" class="text-info" />
													<span class="text-info text-xs">
														{photoMetadata.exif.timestamp.toLocaleString('de-DE')}
													</span>
												</div>
											</div>
										{/if}
									{/if}
								</div>

								<!-- Remove Button -->
								<button
									type="button"
									class="btn btn-ghost btn-sm"
									onclick={() => clearPhoto()}
									aria-label="Foto entfernen"
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
							</div>

							<!-- Map section (only when GPS data is available in Baltic Sea) -->
							{#if photoMetadata?.exif.latitude && photoMetadata.exif.longitude && isInBalticSea(photoMetadata.exif.latitude, photoMetadata.exif.longitude)}
								<div
									class="border-base-300 animate-in slide-in-from-bottom-2 fade-in border-t pt-4 duration-500"
								>
									<div class="mb-3 flex items-center gap-2">
										<Icon src={MapPin} size="16" class="text-success" />
										<h6 class="text-sm font-medium">Position auf der Karte</h6>
									</div>
									<div
										class="bg-base-100 border-base-300 overflow-hidden rounded-lg border shadow-sm"
										style="height: 200px;"
									>
										<OLMap
											latitude={photoMetadata.exif.latitude}
											longitude={photoMetadata.exif.longitude}
											zoom={12}
											readonly={true}
											--map-height="200px"
										/>
									</div>
									<p class="text-base-content/60 mt-2 text-center text-xs">
										<Icon src={MapPin} size="16" class="text-success" /> Position aus dem Foto: {formatLocation(
											photoMetadata.exif.latitude,
											photoMetadata.exif.longitude
										)}
									</p>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Map/GPS Input Section -->
			{#if positionMethod === 'map'}
				<div class="bg-base-100 rounded-lg p-4">
					<h4 class="mb-3 flex items-center gap-2 font-semibold">
						<Icon src={MapPin} size="18" />
						Position auf Karte wählen
					</h4>

					<LocationInput
						latitude={$form.latitude}
						longitude={$form.longitude}
						onchange={handleChange}
					/>

					{#if $form.latitude && $form.longitude}
						<VerifyLocation longitude={$form.longitude} latitude={$form.latitude} />
					{/if}
				</div>
			{/if}

			<!-- Manual Input Section -->
			{#if positionMethod === 'manual'}
				<div class="bg-base-100 space-y-4 rounded-lg p-4">
					<h4 class="mb-3 flex items-center gap-2 font-semibold">
						<Icon src={SquarePen} size="18" />
						Beschreibung der Position
					</h4>

					<FormField name="waterway" />
					<FormField name="seaMark" />
				</div>
			{/if}
		</div>
	</div>

	<!-- Date and Time Section (always visible) -->
	<div class="card bg-base-200 shadow-sm">
		<div class="card-body">
			<h3 class="card-title mb-4 flex items-center gap-2 text-lg">
				<Icon src={Calendar} size="20" class="text-primary" />
				Datum und Uhrzeit
			</h3>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<FormField name="sightingDate" />
				<FormField name="sightingTime" />
			</div>
		</div>
	</div>
</div>

<style>
	.card {
		transition: all 0.2s ease;
	}

	.card:hover {
		transform: translateY(-1px);
		box-shadow: 0 8px 25px -8px oklch(var(--b3));
	}
</style>

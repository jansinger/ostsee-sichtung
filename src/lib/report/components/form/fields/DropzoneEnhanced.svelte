<script lang="ts">
	import UnifiedDropzone from '$lib/components/form/UnifiedDropzone.svelte';
	import OLMap from '$lib/components/map/OLMap.svelte';
	import { createLogger } from '$lib/logger';
	import { getFormContext } from '$lib/report/formContext';
	import { mediaStore, type MediaFile } from '$lib/stores/mediaStore';
	import { createToast } from '$lib/stores/toastStore';
	import {
		analyzeFileInstant,
		isInBalticSea,
		type ClientFileMetadata
	} from '$lib/utils/client/fileAnalysis';
	import { formatFileSize } from '$lib/utils/file/fileSize';
	import { getFileIcon } from '$lib/utils/file/fileType';
	import { type FileValidationConfig } from '$lib/utils/fileValidation';
	import { formatLocation } from '$lib/utils/format/formatLocation';
	import {
		restoreMediaFiles,
		restorePositionFiles,
		shouldRestore
	} from '$lib/utils/upload/dataRestoration';
	import {
		deleteFile,
		deleteMultipleFiles,
		getUploadErrorMessage,
		processFilesComplete
	} from '$lib/utils/upload/fileProcessing';
	import {
		clearUploadedFiles,
		createFormSyncEffect,
		createUploadedFilesMap,
		removeUploadedFile,
		updateUploadedFiles
	} from '$lib/utils/upload/formIntegration';
	import { processPhotoGPSData } from '$lib/utils/upload/gpsExtraction';
	import { formDataToUploadData } from '$lib/utils/uploadHelpers';
	import { MapPin } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';

	const logger = createLogger('DropzoneEnhanced');
	const { form, handleChange } = getFormContext();

	let {
		referenceId,
		maxFiles = 10,
		config,
		enableGPSExtraction = false,
		title,
		additionalText = 'GPS-Daten werden beim Upload verarbeitet'
	} = $props<{
		referenceId?: string;
		maxFiles?: number;
		config: FileValidationConfig;
		enableGPSExtraction?: boolean;
		title?: string;
		additionalText?: string;
	}>();

	let dropzoneFiles = $state<File[]>([]);

	// State for instant preview files (before upload completes)
	let previewFiles = $state<
		{ fileName: string; metadata: ClientFileMetadata; isUploading: boolean }[]
	>([]);

	// Track upload completion to prevent race conditions
	let uploadCompletions = $state<Set<string>>(new Set());

	// Track if restoration has been attempted to prevent infinite loops
	let restorationAttempted = $state<boolean>(false);

	// Determine if single file mode (for GPS extraction)
	const isSingleFileMode = maxFiles === 1;
	const multiple = !isSingleFileMode;

	// Subscribe to media store - declare early for derived state
	let mediaFiles = $state<MediaFile[]>([]);

	// Initialize uploaded files map with form integration
	const initialFiles =
		$form.uploadedFiles && Array.isArray($form.uploadedFiles)
			? $form.uploadedFiles.map(formDataToUploadData)
			: [];

	let uploadedFiles = createUploadedFilesMap(initialFiles, { handleChange });

	// Update form when uploaded files change
	$effect(createFormSyncEffect(uploadedFiles, { handleChange }));

	// Derived state for GPS availability
	const hasGPSData = $derived.by(() => {
		// Check preview files first (instant feedback)
		const previewWithGPS = previewFiles.find(
			(pf) => pf.metadata.exif.latitude !== null && pf.metadata.exif.longitude !== null
		);
		if (previewWithGPS) return previewWithGPS.metadata.exif;

		// Check uploaded files
		const uploadedWithGPS = mediaFiles.find(
			(mf) => mf.metadata.exif.latitude !== null && mf.metadata.exif.longitude !== null
		);
		if (uploadedWithGPS) return uploadedWithGPS.metadata.exif;

		return null;
	});

	// Show map instead of dropzone when GPS data is available (for GPS extraction mode)
	const showMapInsteadOfDropzone = $derived(
		enableGPSExtraction && isSingleFileMode && hasGPSData !== null
	);

	$effect(() => {
		const unsubscribe = mediaStore.subscribe((store) => {
			// For GPS extraction mode (position step), show only position files
			// For media mode, show only non-position files
			if (enableGPSExtraction) {
				mediaFiles = store.files.filter((mf) => mf.isFromPositionStep === true);
			} else {
				mediaFiles = store.files.filter((mf) => !mf.isFromPositionStep);
			}
		});
		return unsubscribe;
	});

	// Restore media files from form data when component is re-mounted or step is revisited
	$effect(() => {
		// Only attempt restoration once per component mount/mode to prevent infinite loops
		if (restorationAttempted) {
			return;
		}

		const uploadedFilesData =
			$form.uploadedFiles && Array.isArray($form.uploadedFiles)
				? $form.uploadedFiles.map(formDataToUploadData)
				: [];

		// Check if restoration is needed based on component mode
		if (enableGPSExtraction) {
			// For position step: check if position files need restoration
			if (shouldRestore(uploadedFilesData, mediaFiles, true)) {
				restorePositionFiles(uploadedFilesData, $form, mediaFiles);
				restorationAttempted = true;
			}
		} else {
			// For media step: check if media files need restoration
			if (shouldRestore(uploadedFilesData, mediaFiles, false)) {
				restoreMediaFiles(uploadedFilesData, mediaFiles);
				restorationAttempted = true;
			}
		}
	});

	async function handleFilesAdded(newFiles: File[]) {
		if (newFiles.length === 0) return;

		// Check file limit for single file mode
		if (isSingleFileMode && (mediaFiles.length > 0 || previewFiles.length > 0)) {
			createToast('info', 'Nur eine Datei erlaubt. Bestehende Datei wird ersetzt.');
			await handleClear();
		}

		// Check overall file limit
		const currentCount = mediaFiles.length + previewFiles.length;
		const allowedCount = Math.min(newFiles.length, maxFiles - currentCount);
		const filesToProcess = newFiles.slice(0, allowedCount);

		if (filesToProcess.length < newFiles.length) {
			createToast(
				'warning',
				`Nur ${allowedCount} von ${newFiles.length} Dateien können hinzugefügt werden (Maximum: ${maxFiles}).`
			);
		}

		if (filesToProcess.length === 0) return;

		// Process each file independently for parallel uploads
		filesToProcess.forEach(async (file) => {
			try {
				// Step 1: Instant analysis for immediate preview
				const metadata = await analyzeFileInstant(file);

				// Check if file is already in preview or uploaded (prevent duplicates)
				const alreadyInPreview = previewFiles.find((pf) => pf.fileName === file.name);
				const alreadyUploaded = mediaFiles.find((mf) => mf.metadata.name === file.name);

				if (alreadyInPreview || alreadyUploaded) {
					return;
				}

				// Add to preview state immediately with upload flag
				const newPreviewFile = {
					fileName: file.name,
					metadata,
					isUploading: true
				};
				previewFiles = [...previewFiles, newPreviewFile];

				// Handle GPS extraction for single file mode (position step) - immediate
				if (
					enableGPSExtraction &&
					isSingleFileMode &&
					metadata.exif.latitude &&
					metadata.exif.longitude
				) {
					processPhotoGPSData(metadata, { handleChange });
				}

				// Step 2: Individual file upload (runs in parallel for each file)
				if (!referenceId) {
					throw new Error('Reference ID is required for upload');
				}

				// Upload this single file
				const { uploadedFiles: newUploadedFiles } = await processFilesComplete([file], {
					referenceId,
					onFileUploaded: (uploadedFile, _uploadData, updatedMetadata) => {
						// Prevent duplicate processing of the same file
						if (uploadCompletions.has(uploadedFile.name)) {
							return;
						}

						// Mark this file as completed
						uploadCompletions.add(uploadedFile.name);

						// Clean up object URL if it exists
						const previewData = previewFiles.find((pf) => pf.fileName === uploadedFile.name);
						if (previewData?.metadata.thumbnail) {
							URL.revokeObjectURL(previewData.metadata.thumbnail);
						}

						// Prepare the media file entry
						const mediaFileEntry: MediaFile = {
							file: uploadedFile,
							metadata: updatedMetadata
						};

						if (enableGPSExtraction) {
							mediaFileEntry.isFromPositionStep = true;
						}

						// Remove from preview state
						previewFiles = previewFiles.filter((pf) => pf.fileName !== uploadedFile.name);

						// Add to media store
						mediaStore.addFiles([mediaFileEntry]);
					},
					onFileProcessingError: (failedFile, _error) => {
						// Mark as completed to prevent further processing
						uploadCompletions.add(failedFile.name);

						// Clean up object URL if it exists
						const previewData = previewFiles.find((pf) => pf.fileName === failedFile.name);
						if (previewData?.metadata.thumbnail) {
							URL.revokeObjectURL(previewData.metadata.thumbnail);
						}

						// Remove failed file from preview state using filter
						previewFiles = previewFiles.filter((pf) => pf.fileName !== failedFile.name);

						// Remove from media store if it was there
						const fileIndex = mediaFiles.findIndex((mf) => mf.metadata.name === failedFile.name);
						if (fileIndex !== -1) {
							mediaStore.removeFile(fileIndex);
						}
					},
					onSuccess: () => {},
					onError: (message) => createToast('error', `${file.name}: ${message}`)
				});

				// Update uploaded files map
				updateUploadedFiles(uploadedFiles, newUploadedFiles);
			} catch (_error) {
				// Mark as completed to prevent further processing
				uploadCompletions.add(file.name);

				// Clean up object URL if it exists
				const previewData = previewFiles.find((pf) => pf.fileName === file.name);
				if (previewData?.metadata.thumbnail) {
					URL.revokeObjectURL(previewData.metadata.thumbnail);
				}

				// Remove failed file from preview using filter
				previewFiles = previewFiles.filter((pf) => pf.fileName !== file.name);

				const errorMessage = getUploadErrorMessage(_error as Error);
				createToast('error', `${file.name}: ${errorMessage}`);
			}
		});
	}

	// Track files being deleted to prevent double-clicks
	let filesBeingDeleted = $state<Set<string>>(new Set());

	async function handleFileRemoved(index: number) {
		try {
			const mediaFile = mediaFiles[index];
			if (!mediaFile) {
				logger.warn({ index }, 'No media file found at index');
				return;
			}

			const fileName = mediaFile.metadata.name;

			// Prevent double-click deletion
			if (filesBeingDeleted.has(fileName)) {
				return;
			}

			// Mark file as being deleted
			filesBeingDeleted.add(fileName);

			const fileInfo = uploadedFiles.get(fileName);

			// Delete from server if uploaded
			if (fileInfo) {
				try {
					await deleteFile(fileInfo.filePath, fileName);
					removeUploadedFile(uploadedFiles, fileName);
				} catch (_deleteError) {
					filesBeingDeleted.delete(fileName);
					createToast('error', 'Fehler beim Löschen der Datei vom Server.');
					return;
				}
			}

			// Find the actual index in the store (not in filtered array)
			const store = mediaStore.get();
			const actualIndex = store.files.findIndex((f: MediaFile) => f.metadata.name === fileName);

			if (actualIndex !== -1) {
				// Remove from media store using actual index
				mediaStore.removeFile(actualIndex);
			}

			// Remove from deletion tracking
			filesBeingDeleted.delete(fileName);

			createToast('success', 'Datei erfolgreich gelöscht.');
		} catch (_error) {
			createToast('error', 'Fehler beim Löschen der Datei.');
			// Clean up deletion tracking on error
			const mediaFile = mediaFiles[index];
			if (mediaFile) {
				filesBeingDeleted.delete(mediaFile.metadata.name);
			}
		}
	}

	async function handleClear() {
		try {
			// Clean up all object URLs from preview files
			for (const previewData of previewFiles) {
				if (previewData.metadata.thumbnail) {
					URL.revokeObjectURL(previewData.metadata.thumbnail);
				}
			}

			// Delete all uploaded files from server
			await deleteMultipleFiles(uploadedFiles);
			clearUploadedFiles(uploadedFiles);

			// Clear UI state
			mediaStore.clear();
			dropzoneFiles = [];
			previewFiles = []; // Use assignment instead of length = 0 for better reactivity
			filesBeingDeleted.clear();
			uploadCompletions.clear();
			restorationAttempted = false;

			// Reset GPS form data if in GPS extraction mode
			if (enableGPSExtraction) {
				handleChange({ target: { name: 'hasPosition', value: false } } as unknown as Event);
				handleChange({ target: { name: 'latitude', value: '' } } as unknown as Event);
				handleChange({ target: { name: 'longitude', value: '' } } as unknown as Event);
			}

			createToast('success', 'Alle Dateien erfolgreich gelöscht.');
		} catch (_error) {
			createToast('error', 'Fehler beim Löschen aller Dateien.');
		}
	}
</script>

<div class="space-y-4">
	<!-- Enhanced Preview Section mit EXIF-Daten (only for non-GPS mode or multiple files) -->
	{#if !showMapInsteadOfDropzone && (mediaFiles.length > 0 || previewFiles.length > 0)}
		<div class="bg-base-200 rounded-lg p-4">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-sm font-semibold">
					{mediaFiles.length + previewFiles.length} Datei{mediaFiles.length +
						previewFiles.length !==
					1
						? 'en'
						: ''}
					{previewFiles.length > 0 ? '(wird verarbeitet...)' : 'hochgeladen'}
				</h3>
				<button
					type="button"
					class="btn btn-ghost btn-xs text-error hover:bg-error hover:text-white"
					onclick={handleClear}
				>
					Alle löschen
				</button>
			</div>

			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				<!-- Preview files (currently uploading) -->
				{#each previewFiles as previewData (previewData.fileName)}
					<div class="card bg-base-100 shadow-sm">
						<div class="card-body p-3">
							<!-- Thumbnail with loading overlay -->
							<div class="relative">
								<div
									class="bg-base-200 flex h-20 items-center justify-center overflow-hidden rounded"
								>
									{#if previewData.metadata.thumbnail}
										<img
											src={previewData.metadata.thumbnail}
											alt={previewData.metadata.name}
											class="h-full object-cover"
										/>
									{:else}
										<span class="text-xl" role="img" aria-label="File type icon">
											{getFileIcon(previewData.metadata.type)}
										</span>
									{/if}
								</div>

								<!-- Loading spinner overlay -->
								{#if previewData.isUploading}
									<div
										class="absolute inset-0 flex items-center justify-center rounded bg-black/30"
									>
										<div class="loading loading-spinner loading-sm text-white"></div>
									</div>
								{/if}

								<!-- Upload progress indicator -->
								<div
									class="bg-info text-info-content absolute top-1 left-1 rounded px-1.5 py-0.5 text-xs"
								>
									Upload...
								</div>
							</div>

							<!-- File Info -->
							<div class="mt-2">
								<h4 class="truncate text-xs font-medium" title={previewData.metadata.name}>
									{previewData.metadata.name}
								</h4>
								<p class="text-base-content/60 text-xs">
									{formatFileSize(previewData.metadata.size)}
								</p>
							</div>

							<!-- GPS Info (immediate feedback) -->
							{#if previewData.metadata.exif.latitude !== null && previewData.metadata.exif.longitude !== null}
								<div class="bg-success/10 mt-1 rounded p-1.5">
									<div class="flex items-center gap-1">
										<span class="text-xs">📍</span>
										<span class="text-success text-xs font-medium">GPS</span>
										{#if isInBalticSea(previewData.metadata.exif.latitude, previewData.metadata.exif.longitude)}
											<span class="badge badge-success badge-xs">Ostsee</span>
										{:else}
											<span class="badge badge-warning badge-xs">Außerhalb</span>
										{/if}
									</div>
									<p class="text-success/80 mt-0.5 text-xs">
										{formatLocation(
											previewData.metadata.exif.longitude,
											previewData.metadata.exif.latitude
										)}
									</p>
								</div>
							{:else if previewData.metadata.type.startsWith('image/')}
								<div class="bg-base-300/50 mt-1 rounded p-1.5">
									<p class="text-base-content/60 text-xs">📍 Keine GPS-Daten</p>
								</div>
							{/if}

							<!-- Timestamp Info -->
							{#if previewData.metadata.exif.timestamp}
								<div class="mt-1">
									<p class="text-base-content/60 text-xs">
										📅 {previewData.metadata.exif.timestamp.toLocaleString('de-DE')}
									</p>
								</div>
							{/if}
						</div>
					</div>
				{/each}

				<!-- Uploaded files (completed) -->
				{#each mediaFiles as mediaFile, index (mediaFile.metadata.name + index)}
					<div class="card bg-base-100 shadow-sm">
						<div class="card-body p-3">
							<!-- Thumbnail -->
							<div class="relative">
								<div
									class="bg-base-200 flex h-20 items-center justify-center overflow-hidden rounded"
								>
									{#if mediaFile.metadata.thumbnail}
										<img
											src={mediaFile.metadata.thumbnail}
											alt={mediaFile.metadata.name}
											class="h-full object-cover"
										/>
									{:else}
										<span class="text-xl" role="img" aria-label="File type icon">
											{getFileIcon(mediaFile.metadata.type)}
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

								<!-- Remove button -->
								<button
									type="button"
									class="btn btn-circle btn-xs bg-error hover:bg-error-focus absolute -top-2 -right-2 text-white"
									onclick={() => handleFileRemoved(index)}
									aria-label="Datei entfernen"
								>
									<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										></path>
									</svg>
								</button>
							</div>

							<!-- File Info -->
							<div class="mt-2">
								<h4 class="truncate text-xs font-medium" title={mediaFile.metadata.name}>
									{mediaFile.metadata.name}
								</h4>
								<p class="text-base-content/60 text-xs">
									{formatFileSize(mediaFile.metadata.size)}
								</p>
							</div>

							<!-- GPS Info -->
							{#if mediaFile.metadata.exif.latitude !== null && mediaFile.metadata.exif.longitude !== null}
								<div class="bg-success/10 mt-1 rounded p-1.5">
									<div class="flex items-center gap-1">
										<span class="text-xs">📍</span>
										<span class="text-success text-xs font-medium">GPS</span>
										{#if isInBalticSea(mediaFile.metadata.exif.latitude, mediaFile.metadata.exif.longitude)}
											<span class="badge badge-success badge-xs">Ostsee</span>
										{:else}
											<span class="badge badge-warning badge-xs">Außerhalb</span>
										{/if}
									</div>
									<p class="text-success/80 mt-0.5 text-xs">
										{formatLocation(
											mediaFile.metadata.exif.longitude,
											mediaFile.metadata.exif.latitude
										)}
									</p>
								</div>
							{:else if mediaFile.metadata.type.startsWith('image/')}
								<div class="bg-base-300/50 mt-1 rounded p-1.5">
									<p class="text-base-content/60 text-xs">📍 Keine GPS-Daten</p>
								</div>
							{/if}

							<!-- Additional EXIF Info -->
							{#if mediaFile.metadata.exif.timestamp}
								<div class="mt-1">
									<p class="text-base-content/60 text-xs">
										📅 {mediaFile.metadata.exif.timestamp.toLocaleString('de-DE')}
									</p>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Map View (when GPS data available) or Unified Dropzone -->
	{#if showMapInsteadOfDropzone}
		<!-- Map Display with GPS Position -->
		<div class="bg-base-100 border-base-300 rounded-lg border p-4">
			<div class="mb-3 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<Icon src={MapPin} size="18" class="text-success" />
					<h4 class="text-sm font-semibold">GPS-Position gefunden</h4>
					{#if hasGPSData}
						<span class="badge badge-success badge-sm">
							{formatLocation(hasGPSData.latitude!, hasGPSData.longitude!)}
						</span>
					{/if}
				</div>
				{#if previewFiles.length === 0}
					<button
						type="button"
						class="btn btn-ghost btn-xs text-error hover:bg-error hover:text-white"
						onclick={handleClear}
					>
						Neu auswählen
					</button>
				{/if}
			</div>

			{#if hasGPSData}
				<div
					class="bg-base-200 border-base-300 overflow-hidden rounded-lg border"
					style="height: 300px;"
				>
					<OLMap
						latitude={hasGPSData.latitude!}
						longitude={hasGPSData.longitude!}
						zoom={13}
						readonly={true}
						--map-height="300px"
					/>
				</div>

				{#if hasGPSData.timestamp}
					<div class="mt-3 text-center">
						<p class="text-base-content/60 text-xs">
							📅 Aufnahmezeit: {hasGPSData.timestamp.toLocaleString('de-DE')}
						</p>
					</div>
				{/if}
			{/if}

			<!-- Show upload progress if still uploading -->
			{#if previewFiles.some((pf) => pf.isUploading)}
				<div class="mt-3 flex items-center justify-center gap-2">
					<div class="loading loading-spinner loading-sm"></div>
					<span class="text-base-content/60 text-sm">Upload läuft im Hintergrund...</span>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Unified Dropzone -->
		<UnifiedDropzone
			{config}
			bind:files={dropzoneFiles}
			onFilesAdded={handleFilesAdded}
			onFileRemoved={handleFileRemoved}
			onClear={handleClear}
			{multiple}
			title={title ||
				(mediaFiles.length + previewFiles.length > 0
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

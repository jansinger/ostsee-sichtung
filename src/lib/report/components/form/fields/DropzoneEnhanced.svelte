<script lang="ts">
	import UnifiedDropzone from '$lib/components/form/UnifiedDropzone.svelte';
	import { createLogger } from '$lib/logger';
	import { getFormContext } from '$lib/report/formContext';
	import { mediaStore, type MediaFile } from '$lib/stores/mediaStore';
	import { createToast } from '$lib/stores/toastStore';
	import { analyzeClientFile, isInBalticSea, convertServerExifToClient, type ClientFileMetadata } from '$lib/utils/client/fileAnalysis';
	import { FILE_VALIDATION_PRESETS } from '$lib/utils/fileValidation';
	import { formatLocation } from '$lib/utils/format/formatLocation';
	import { deleteFileDirect, uploadFileDirect } from '$lib/utils/uploadUtils';
	import { uploadResultToFormData, formDataToUploadData, type UploadFileData } from '$lib/utils/uploadHelpers';
	import { formatFileSize } from '$lib/utils/file/fileSize';
	import { getFileIcon } from '$lib/utils/file/fileType';
	import { SvelteMap } from 'svelte/reactivity';

	const logger = createLogger('DropzoneEnhanced');
	const { form, handleChange } = getFormContext();

	let { referenceId } = $props<{
		referenceId?: string;
	}>();

	let isAnalyzing = $state(false);
	let isUploading = $state(false);
	let dropzoneFiles = $state<File[]>([]);

	// Lokaler Zustand für hochgeladene Dateien (Name -> full upload info mapping)
	let uploadedFiles = new SvelteMap<string, UploadFileData>();

	// Initialize uploadedFiles SvelteMap from form data array
	if ($form.uploadedFiles && Array.isArray($form.uploadedFiles) && $form.uploadedFiles.length > 0) {
		// Convert array format from form schema to SvelteMap format
		$form.uploadedFiles.forEach((fileInfo) => {
			uploadedFiles.set(fileInfo.originalName, formDataToUploadData(fileInfo));
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

	// Subscribe to media store
	let mediaFiles = $state<MediaFile[]>([]);

	$effect(() => {
		const unsubscribe = mediaStore.subscribe((store) => {
			mediaFiles = store.files;
		});
		return unsubscribe;
	});

	// Restore media files from form data when component is re-mounted or step is revisited
	$effect(() => {
		// Only restore if form has uploaded files but mediaStore doesn't have enough files
		if ($form.uploadedFiles && Array.isArray($form.uploadedFiles) && $form.uploadedFiles.length > 0) {
			// Check if we need to restore files (handle case where PositionAndTime may have added first file already)
			const existingFileNames = mediaFiles.map(mf => mf.metadata.name);
			const filesToRestore = $form.uploadedFiles.filter(fileInfo => 
				!existingFileNames.includes(fileInfo.originalName)
			);
			
			if (filesToRestore.length > 0) {
				// Convert uploaded files back to MediaFile format for display
				const restoredMediaFiles: MediaFile[] = [];
				
				for (const fileInfo of filesToRestore) {
					try {
						// Create mock File object for display
						const mockFile = new File([''], fileInfo.originalName, { type: fileInfo.mimeType });
						
						// Create basic metadata for display
						const mockMetadata: ClientFileMetadata = {
							name: fileInfo.originalName,
							size: fileInfo.size,
							type: fileInfo.mimeType,
							lastModified: new Date(),
							thumbnail: `/uploads/${fileInfo.filePath}`, // Use server path for display
							exif: {
								latitude: null, // We don't store EXIF data in form, only GPS coordinates separately
								longitude: null,
								altitude: null,
								timestamp: null
							}
						};
						
						restoredMediaFiles.push({
							file: mockFile,
							metadata: mockMetadata,
							isFromPositionStep: false // Files restored here are considered additional media files
						});
					} catch (error) {
						logger.warn({ error, fileInfo }, 'Error restoring media file from form data');
					}
				}
				
				if (restoredMediaFiles.length > 0) {
					logger.info({ count: restoredMediaFiles.length }, 'Restored additional media files from form data');
					mediaStore.addFiles(restoredMediaFiles.map(mf => ({ file: mf.file, metadata: mf.metadata })));
				}
			}
		}
	});

	async function handleFilesAdded(newFiles: File[]) {
		if (newFiles.length === 0) return;

		isAnalyzing = true;

		try {
			// 1. Analysiere EXIF-Daten
			const newAnalyses = await Promise.all(newFiles.map((file) => analyzeClientFile(file)));

			// 2. Füge neue Dateien zum media store hinzu
			const newMediaFiles = newAnalyses
				.map((metadata, index) => ({
					file: newFiles[index],
					metadata
				}))
				.filter((item): item is { file: File; metadata: ClientFileMetadata } => item.file !== undefined);

			mediaStore.addFiles(newMediaFiles);

			// 3. Note: GPS data extraction is now handled server-side
			// Client-side analysis only provides basic file metadata and thumbnails
			createToast(
				'info',
				`${newFiles.length} neue Datei(en) analysiert. GPS-Daten werden beim Upload verarbeitet.`
			);
		} catch (error) {
			logger.warn({ error }, 'Error analyzing files');
			createToast('error', 'Fehler beim Analysieren der Dateien.');
		} finally {
			isAnalyzing = false;
		}

		// Upload-Phase (separat von der Analyse)
		logger.info({ fileCount: newFiles.length, referenceId }, 'Starting upload phase');
		if (newFiles.length > 0 && referenceId) {
			isUploading = true;
			try {
				// Upload jede Datei direkt
				for (const file of newFiles) {
					try {
						const uploadResult = await uploadFileDirect(file, referenceId);
						// Speichere die vollständigen Datei-Informationen für späteres Löschen und DB-Speicherung
						uploadedFiles.set(file.name, uploadResultToFormData(uploadResult));
						
						// Update media store with server EXIF data if available
						if (uploadResult.exifData) {
							const serverExif = convertServerExifToClient(uploadResult.exifData);
							const existingMediaIndex = mediaFiles.findIndex(mf => mf.metadata.name === file.name);
							
							if (existingMediaIndex !== -1) {
								// Update existing media file with EXIF data
								const updatedMetadata: ClientFileMetadata = {
									...mediaFiles[existingMediaIndex].metadata,
									exif: serverExif
								};
								
								// Remove and re-add with updated metadata
								mediaStore.removeFile(existingMediaIndex);
								mediaStore.addFiles([{ file, metadata: updatedMetadata }]);
							}
						}
						
						logger.info(
							{ fileName: file.name, uploadResult, hasGPS: !!(uploadResult.exifData?.latitude) },
							'File uploaded with full metadata'
						);
					} catch (uploadError) {
						logger.error({ uploadError, fileName: file.name }, 'Failed to upload file');
						// Entferne fehlerhafte Datei aus der UI
						const fileIndex = mediaFiles.findIndex((mf) => mf.metadata.name === file.name);
						if (fileIndex !== -1) {
							await handleFileRemoved(fileIndex);
						}
						throw uploadError; // Re-throw für Gesamtfehlerbehandlung
					}
				}
				// Count files with GPS data
				const filesWithGPS = newFiles.filter(file => {
					const fileData = uploadedFiles.get(file.name);
					return fileData && fileData.originalName && uploadedFiles.get(file.name)?.filePath;
				}).length;
				
				if (filesWithGPS > 0) {
					createToast('success', `${newFiles.length} Datei(en) hochgeladen! GPS-Daten wurden extrahiert.`);
				} else {
					createToast('success', `${newFiles.length} Datei(en) erfolgreich hochgeladen!`);
				}
			} catch (error) {
				// Allgemeine Fehlerbehandlung
				const errorMessage = (error as Error).message;
				if (
					errorMessage.includes('Ungültiger MIME-Type') ||
					errorMessage.includes('Nur Bild- und Videoformate')
				) {
					createToast('error', 'Ungültiges Dateiformat. Nur Bilder und Videos sind erlaubt.');
				} else if (errorMessage.includes('zu groß') || errorMessage.includes('Maximum')) {
					createToast('error', 'Datei zu groß. Maximum: 100MB pro Datei.');
				} else if (errorMessage.includes('leer')) {
					createToast('error', 'Leere Dateien können nicht hochgeladen werden.');
				} else {
					createToast('error', 'Fehler beim Hochladen der Dateien. Versuchen Sie es erneut.');
				}
			} finally {
				isUploading = false;
			}
		}
	}

	async function handleFileRemoved(index: number) {
		try {
			const mediaFile = mediaFiles[index];
			if (!mediaFile) {
				logger.warn({ index }, 'No media file found at index');
				return;
			}

			const fileName = mediaFile.metadata.name;
			const fileInfo = uploadedFiles.get(fileName);

			logger.info({ fileName, fileInfo, index }, 'Attempting to remove file');

			// Lösche vom Server wenn hochgeladen
			if (fileInfo) {
				try {
					await deleteFileDirect(fileInfo.filePath);
					uploadedFiles.delete(fileName);
					logger.info({ fileName, filePath: fileInfo.filePath }, 'File deleted from server');
				} catch (deleteError) {
					logger.error(
						{ deleteError, filePath: fileInfo.filePath },
						'Failed to delete file from server'
					);
					createToast('error', 'Fehler beim Löschen der Datei vom Server.');
					return;
				}
			}

			// Entferne aus mediaStore (UI)
			mediaStore.removeFile(index);
			createToast('success', 'Datei erfolgreich gelöscht.');
		} catch (error) {
			logger.error({ error, index }, 'Failed to remove file');
			createToast('error', 'Fehler beim Löschen der Datei.');
		}
	}

	async function handleClear() {
		try {
			// Lösche alle hochgeladenen Dateien vom Server
			const deletePromises = Array.from(uploadedFiles.values()).map(async (fileInfo) => {
				try {
					await deleteFileDirect(fileInfo.filePath);
					logger.info({ filePath: fileInfo.filePath }, 'File deleted from server during clear');
				} catch (deleteError) {
					logger.error(
						{ deleteError, filePath: fileInfo.filePath },
						'Failed to delete file from server during clear'
					);
					// Nicht blockierend - andere Dateien sollen trotzdem gelöscht werden
				}
			});

			await Promise.allSettled(deletePromises);
			uploadedFiles.clear();

			mediaStore.clear();
			dropzoneFiles = [];

			createToast('success', 'Alle Dateien erfolgreich gelöscht.');
		} catch (error) {
			logger.error({ error }, 'Failed to clear files');
			createToast('error', 'Fehler beim Löschen aller Dateien.');
		}
	}

</script>

<div class="space-y-4">
	<!-- Enhanced Preview Section mit EXIF-Daten -->
	{#if mediaFiles.length > 0}
		<div class="bg-base-200 rounded-lg p-4">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-sm font-semibold">
					{mediaFiles.length} Datei{mediaFiles.length !== 1 ? 'en' : ''} hochgeladen
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

	<!-- Unified Dropzone -->
	<UnifiedDropzone
		config={FILE_VALIDATION_PRESETS.MEDIA}
		bind:files={dropzoneFiles}
		onFilesAdded={handleFilesAdded}
		onFileRemoved={handleFileRemoved}
		onClear={handleClear}
		title={mediaFiles.length > 0 ? 'Weitere Dateien hinzufügen' : 'Medien hochladen'}
		additionalText="GPS-Daten werden beim Upload verarbeitet"
		isAnalyzing={isAnalyzing || isUploading}
		loadingText={isAnalyzing
			? 'Analysiere Dateien...'
			: isUploading
				? 'Lade Dateien hoch...'
				: 'Verarbeite Dateien...'}
		showPreview={false}
	/>
</div>

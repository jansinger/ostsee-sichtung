<script lang="ts">
	import type { SightingFile } from '$lib/types/sightingFile';
	import type { UploadedFileInfo } from '$lib/types/types';
	import { formatDate } from '$lib/utils/format/FormatDate';
	import { formatLocation } from '$lib/utils/format/formatLocation';
	import {
		Calendar,
		Camera,
		Download,
		FileType,
		HardDrive,
		MapPin,
		Settings,
		X
	} from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';

	let {
		file,
		onClose
	}: {
		file: SightingFile | UploadedFileInfo;
		onClose: () => void;
	} = $props();

	let modalElement: HTMLDialogElement;

	function isImage(mimeType: string): boolean {
		return mimeType.startsWith('image/');
	}

	function isVideo(mimeType: string): boolean {
		return mimeType.startsWith('video/');
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	function handleModalClick(event: MouseEvent) {
		// Schließe Modal nur wenn auf Backdrop geklickt wird
		if (event.target === modalElement) {
			onClose();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	// Modal automatisch öffnen
	$effect(() => {
		if (modalElement) {
			modalElement.showModal();
		}
	});

	function hasGPSData(): boolean {
		return !!(file.exifData?.latitude && file.exifData?.longitude);
	}

	function hasCameraData(): boolean {
		return !!(
			file.exifData?.make ||
			file.exifData?.model ||
			file.exifData?.exposureTime ||
			file.exifData?.fNumber ||
			file.exifData?.iso
		);
	}

	function formatCaptureDateTime(): string {
		if (!file.exifData?.dateTimeOriginal) return '';
		return formatDate(file.exifData.dateTimeOriginal);
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Modal -->
<dialog
	bind:this={modalElement}
	class="modal modal-open"
	onclick={handleModalClick}
	aria-labelledby="modal-title"
	aria-describedby="modal-description"
>
	<div class="modal-box flex max-h-[90vh] w-11/12 max-w-6xl flex-col overflow-hidden p-0">
		<!-- Modal Header -->
		<div class="bg-base-200 border-base-300 flex items-center justify-between border-b p-4">
			<div class="flex min-w-0 flex-1 items-center gap-3">
				<Icon src={FileType} size="20" class="text-primary flex-shrink-0" />
				<div class="min-w-0 flex-1">
					<h3 id="modal-title" class="text-base-content truncate text-lg font-bold">
						{file.originalName}
					</h3>
					<p id="modal-description" class="text-base-content/60 text-sm">
						{file.mimeType} • {formatFileSize(file.size)}
					</p>
				</div>
			</div>
			<div class="flex flex-shrink-0 items-center gap-2">
				<a
					href={file.url}
					download={file.originalName}
					class="btn btn-ghost btn-sm"
					aria-label="Datei herunterladen"
				>
					<Icon src={Download} size="16" />
					Herunterladen
				</a>
				<button
					type="button"
					class="btn btn-ghost btn-sm btn-circle"
					onclick={onClose}
					aria-label="Modal schließen"
				>
					<Icon src={X} size="16" />
				</button>
			</div>
		</div>

		<!-- Modal Content -->
		<div class="flex-1 overflow-y-auto">
			<div class="p-4">
				{#if isImage(file.mimeType)}
					<!-- Bild anzeigen -->
					<div class="bg-base-100 flex justify-center overflow-hidden rounded-lg">
						<img
							src={file.url}
							alt={file.originalName}
							class="max-h-[50vh] max-w-full object-contain"
							loading="lazy"
							onerror={(e) => {
								console.error('Modal image loading failed:', file.filePath, e);
								// Fallback for modal images
								const img = e.target as HTMLImageElement;
								if (!img.src.includes('_fallback')) {
									if (file.url.startsWith('/uploads/')) {
									img.src = `${file.url}?_fallback=1`;
								}
								}
							}}
						/>
					</div>
				{:else if isVideo(file.mimeType)}
					<!-- Video anzeigen -->
					<div class="bg-base-100 flex justify-center overflow-hidden rounded-lg">
						<video
							src={file.url}
							controls
							class="max-h-[50vh] max-w-full"
							preload="metadata"
						>
							<track kind="captions" />
							Ihr Browser unterstützt das Video-Element nicht.
						</video>
					</div>
				{:else}
					<!-- Andere Dateitypen - Vorschau nicht möglich -->
					<div class="flex flex-col items-center justify-center py-12 text-center">
						<Icon src={FileType} size="48" class="text-base-content/40 mb-4" />
						<h4 class="mb-2 text-lg font-semibold">Vorschau nicht verfügbar</h4>
						<p class="text-base-content/60 mb-4">Für diesen Dateityp ist keine Vorschau möglich.</p>
						<a
							href={file.url}
							download={file.originalName}
							class="btn btn-primary"
						>
							<Icon src={Download} size="16" />
							Datei herunterladen
						</a>
					</div>
				{/if}
			</div>
		</div>

		<!-- Modal Footer -->
		<div class="bg-base-200 border-base-300 space-y-4 border-t p-4">
			<!-- Basis-Informationen -->
			<div class="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
				<div class="flex items-center gap-2">
					<Icon src={FileType} size="14" class="text-base-content/60" />
					<span class="text-base-content/60">Typ:</span>
					<span class="font-medium">{file.mimeType}</span>
				</div>
				<div class="flex items-center gap-2">
					<Icon src={HardDrive} size="14" class="text-base-content/60" />
					<span class="text-base-content/60">Größe:</span>
					<span class="font-medium">{formatFileSize(file.size)}</span>
				</div>
				<div class="flex items-center gap-2">
					<Icon src={Calendar} size="14" class="text-base-content/60" />
					<span class="text-base-content/60">Hochgeladen:</span>
					<span class="font-medium">{formatDate(file.uploadedAt)}</span>
				</div>
			</div>

			<!-- EXIF-Informationen für Bilder -->
			{#if file.exifData && isImage(file.mimeType)}
				<div class="border-base-300 border-t pt-4">
					<div class="collapse-arrow bg-base-100 collapse">
						<input type="checkbox" class="peer" />
						<h4 class="collapse-title flex items-center gap-2 text-sm font-semibold">
							<Icon src={Camera} size="16" class="text-primary" />
							EXIF-Daten
							{#if hasGPSData()}
								<span class="badge badge-success badge-xs ml-2">GPS</span>
							{/if}
							{#if hasCameraData()}
								<span class="badge badge-secondary badge-xs ml-1">Kamera</span>
							{/if}
						</h4>
						<div class="collapse-content">
							<div class="space-y-3 pt-2">
								<!-- GPS-Daten -->
								{#if hasGPSData()}
									<div class="bg-base-200 rounded-lg p-3">
										<h5 class="mb-2 flex items-center gap-1 text-xs font-medium">
											<Icon src={MapPin} size="12" class="text-success" />
											GPS-Position
										</h5>
										<div class="space-y-1 text-xs">
											<div>
												<span class="text-base-content/60">Koordinaten:</span>
												<span class="ml-1 font-medium"
													>{formatLocation(file.exifData?.longitude, file.exifData?.latitude)}</span
												>
											</div>
											{#if file.exifData.altitude}
												<div>
													<span class="text-base-content/60">Höhe:</span>
													<span class="ml-1 font-medium">{file.exifData.altitude.toFixed(1)} m</span
													>
												</div>
											{/if}
										</div>
									</div>
								{/if}

								<!-- Kamera-Daten -->
								{#if hasCameraData()}
									<div class="bg-base-200 rounded-lg p-3">
										<h5 class="mb-2 flex items-center gap-1 text-xs font-medium">
											<Icon src={Settings} size="12" class="text-secondary" />
											Kamera-Einstellungen
										</h5>
										<div class="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
											{#if file.exifData.make || file.exifData.model}
												<div>
													<span class="text-base-content/60">Kamera:</span>
													<span class="ml-1 font-medium"
														>{[file.exifData.make, file.exifData.model]
															.filter(Boolean)
															.join(' ')}</span
													>
												</div>
											{/if}
											{#if file.exifData.dateTimeOriginal}
												<div>
													<span class="text-base-content/60">Aufgenommen:</span>
													<span class="ml-1 font-medium">{formatCaptureDateTime()}</span>
												</div>
											{/if}
											{#if file.exifData.exposureTime}
												<div>
													<span class="text-base-content/60">Belichtung:</span>
													<span class="ml-1 font-medium">{file.exifData.exposureTime}</span>
												</div>
											{/if}
											{#if file.exifData.fNumber}
												<div>
													<span class="text-base-content/60">Blende:</span>
													<span class="ml-1 font-medium">f/{file.exifData.fNumber}</span>
												</div>
											{/if}
											{#if file.exifData.iso}
												<div>
													<span class="text-base-content/60">ISO:</span>
													<span class="ml-1 font-medium">{file.exifData.iso}</span>
												</div>
											{/if}
											{#if file.exifData.focalLength}
												<div>
													<span class="text-base-content/60">Brennweite:</span>
													<span class="ml-1 font-medium">{file.exifData.focalLength} mm</span>
												</div>
											{/if}
											{#if file.exifData.width && file.exifData.height}
												<div>
													<span class="text-base-content/60">Auflösung:</span>
													<span class="ml-1 font-medium"
														>{file.exifData.width} × {file.exifData.height}</span
													>
												</div>
											{/if}
											{#if file.exifData.flash !== undefined}
												<div>
													<span class="text-base-content/60">Blitz:</span>
													<span class="ml-1 font-medium">{file.exifData.flash ? 'Ja' : 'Nein'}</span
													>
												</div>
											{/if}
										</div>
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Backdrop -->
	<form method="dialog" class="modal-backdrop bg-black/60 backdrop-blur-sm">
		<button onclick={onClose} aria-label="Modal schließen">Schließen</button>
	</form>
</dialog>

<style>
	/* Modal styling improvements */
	.modal-box {
		box-shadow:
			0 20px 25px -5px rgb(0 0 0 / 0.1),
			0 10px 10px -5px rgb(0 0 0 / 0.04);
	}

	/* Image styling */
	img {
		border-radius: 0.5rem;
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
	}

	/* Video styling */
	video {
		border-radius: 0.5rem;
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
	}

	/* Better mobile responsiveness */
	@media (max-width: 640px) {
		.modal-box {
			width: 95%;
			max-width: 95%;
			max-height: 95vh;
		}

		img,
		video {
			max-height: 40vh;
		}

		.grid-cols-1 {
			grid-template-columns: 1fr;
		}
	}

	/* Accessibility improvements */
	@media (prefers-reduced-motion: reduce) {
		.modal-box,
		img,
		video {
			transition: none;
		}
	}

	/* High contrast mode support */
	@media (prefers-contrast: high) {
		.modal-box {
			border: 2px solid;
		}

		.bg-base-200 {
			border-color: currentColor;
		}
	}

	/* Focus styles */
	button:focus-visible,
	a:focus-visible {
		outline: 2px solid oklch(var(--p));
		outline-offset: 2px;
	}
</style>

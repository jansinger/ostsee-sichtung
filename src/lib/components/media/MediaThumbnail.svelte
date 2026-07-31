<script lang="ts">
	import type { UploadedFileInfo } from '$lib/types';
	import { formatFileSize } from '$lib/utils/file/fileSize';
	import { isImageFile, isVideoFile } from '$lib/utils/file/fileType';
	import Icon from '$lib/components/Icon.svelte';

	let {
		file,
		onclick
	}: {
		file: UploadedFileInfo;
		onclick?: () => void;
	} = $props();

	function isImage(mimeType: string): boolean {
		return isImageFile(mimeType);
	}

	function isVideo(mimeType: string): boolean {
		return isVideoFile(mimeType);
	}

	function handleClick() {
		onclick?.();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onclick?.();
		}
	}

	function hasGPSData(): boolean {
		return !!(file.exifData?.latitude && file.exifData?.longitude);
	}
</script>

<div
	class="media-thumbnail group bg-base-100 relative cursor-pointer overflow-hidden rounded-lg shadow-sm transition-all hover:scale-105 hover:shadow-md"
	onclick={handleClick}
	onkeydown={handleKeydown}
	tabindex="0"
	role="button"
	aria-label={`${file.originalName} öffnen`}
>
	{#if isImage(file.mimeType)}
		<!-- Bild Thumbnail -->
		<div class="relative aspect-square overflow-hidden">
			<img
				src={`/api/media/${file.filePath}`}
				alt={file.originalName}
				class="h-full w-full object-contain transition-all group-hover:scale-110"
				loading="lazy"
				onerror={(e) => {
					console.error('Image loading failed:', `/api/media/${file.filePath}`, e);
					// Fallback to original URL if secure endpoint fails
					const img = e.target as HTMLImageElement;
					if (!img.src.includes('fallback=true')) {
						img.src = `${file.url}?fallback=true`;
					}
				}}
			/>
			<!-- Hover Overlay. bg-scrim/<n> statt bg-black/<n>: der Wert steht seit
			     dem 2026-07-30 als --scrim-surface in tokens.css. Ein Schleier ist
			     keine Fläche des Themes, sondern eine Abdunklung des Fotos darunter —
			     die Begründung, warum das Token neutrales Schwarz ist und nicht
			     bg-neutral, steht dort. -->
			<div
				class="bg-scrim/60 absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
			>
				<Icon icon="lucide:eye" width="24" class="text-on-scrim" />
			</div>

			<!-- GPS Badge für Bilder -->
			{#if hasGPSData()}
				<div
					class="bg-success text-success-content absolute top-2 right-2 rounded-full p-1 shadow-md"
				>
					<Icon icon="lucide:map-pin" width="12" />
				</div>
			{/if}
		</div>
	{:else if isVideo(file.mimeType)}
		<!-- Video Thumbnail -->
		<div
			class="bg-base-300 relative flex aspect-square items-center justify-center overflow-hidden"
		>
			<!-- Video Preview (falls Browser unterstützt) -->
			<!-- preload="none": Mit "metadata" lädt der Browser die Datei an, was
			     ohne Range-Support die GANZE Datei war — in einer Kachelansicht
			     einmal pro Video. Das Play-Overlay darunter zeigt ohnehin an, dass
			     hier ein Video liegt; geladen wird erst im Modal. -->
			<video
				src={`/api/media/${file.filePath}`}
				class="h-full w-full object-contain"
				muted
				preload="none"
				onerror={(e) => {
					console.error('Video loading failed:', `/api/media/${file.filePath}`, e);
				}}
			>
				<track kind="captions" />
			</video>

			<!-- Play Icon Overlay -->
			<div class="absolute inset-0 flex items-center justify-center">
				<div
					class="bg-scrim/60 group-hover:bg-scrim/80 rounded-full p-3 transition-all group-hover:scale-110"
				>
					<Icon icon="lucide:play" width="24" class="text-on-scrim" />
				</div>
			</div>

			<!-- Hover Overlay. Trägt nichts, was gelesen werden muss — /20 ist hier
			     eine reine Andeutung über dem Videobild und bleibt deshalb, anders als
			     im Zweig darunter, unverändert. -->
			<div
				class="bg-scrim/20 absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
			></div>
		</div>
	{:else}
		<!-- Andere Dateitypen -->
		<div
			class="bg-base-200 relative flex aspect-square items-center justify-center overflow-hidden"
		>
			<div class="p-4 text-center">
				<Icon icon="lucide:file-text" width="32" class="text-base-content/60 mx-auto mb-2" />
				<p class="text-base-content/60 max-w-full truncate text-xs">
					{file.originalName}
				</p>
			</div>

			<!-- Hover Overlay. Der einzige der drei Zweige, der NICHT über fremdem
			     Bildinhalt liegt: darunter steht bg-base-200 (#d1d8df), eine bekannte
			     Theme-Fläche. Der vorherige Schleier auf /20 ergab dort für das Icon
			     gerechnete 2,27:1 und verfehlte WCAG 1.4.11 (3:1) — anders als bei
			     Foto und Video war das kein „hängt vom Inhalt ab", sondern ein fester,
			     zu niedriger Wert. Mit /60 sind es 7,34:1. -->
			<div
				class="bg-scrim/60 absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
			>
				<Icon icon="lucide:download" width="20" class="text-on-scrim" />
			</div>
		</div>
	{/if}

	<!-- File Info Footer -->
	<div class="bg-base-100 p-2">
		<p class="text-base-content truncate text-xs font-medium" title={file.originalName}>
			{file.originalName}
		</p>
		<div class="mt-1 flex items-center justify-between">
			<p class="text-base-content/60 text-xs">
				{formatFileSize(file.size)}
			</p>
			{#if isVideo(file.mimeType)}
				<div class="badge badge-primary badge-xs">Video</div>
			{:else if isImage(file.mimeType)}
				<div class="badge badge-secondary badge-xs">Bild</div>
			{:else}
				<div class="badge badge-neutral badge-xs">Datei</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.media-thumbnail {
		min-height: 120px;
	}

	/* Enhanced focus styles for accessibility */
	.media-thumbnail:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	/* Better hover transitions */
	.media-thumbnail img {
		transition: transform 0.3s ease;
	}

	.media-thumbnail:hover img {
		transform: scale(1.05);
	}

	/* Video thumbnail specific styling */
	video {
		transition: opacity 0.3s ease;
	}

	.media-thumbnail:hover video {
		opacity: 0.8;
	}

	/* Badge positioning and styling */
	.badge {
		font-size: 0.65rem;
		font-weight: 500;
	}

	/* Improved text truncation */
	.truncate {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Animation for scale effect */
	@media (prefers-reduced-motion: reduce) {
		.media-thumbnail,
		.media-thumbnail img,
		.group:hover img,
		.group:hover div {
			transition: none;
			transform: none;
		}
	}

	/* High contrast mode support */
	@media (prefers-contrast: high) {
		.media-thumbnail {
			border: 1px solid;
		}

		/* Better visibility for overlays in high contrast mode */
		.media-thumbnail:hover div {
			background-color: rgba(0, 0, 0, 0.9) !important;
		}
	}

	/* Mobile optimizations */
	@media (max-width: 640px) {
		.media-thumbnail {
			min-height: 100px;
		}

		.p-2 {
			padding: 0.5rem;
		}
	}

	/* Loading state für Bilder - zeigt Pattern bis Bild geladen ist */
	img {
		background-color: var(--color-base-200);
		background-image: linear-gradient(
			45deg,
			transparent 25%,
			var(--color-base-300) 25%,
			var(--color-base-300) 50%,
			transparent 50%,
			transparent 75%,
			var(--color-base-300) 75%
		);
		background-size: 20px 20px;
		animation: loadingPattern 1s linear infinite;
	}

	/* Deaktiviert Loading-Pattern wenn Bild erfolgreich geladen wurde */
	.media-thumbnail img[src] {
		background: none !important;
		animation: none !important;
	}
</style>

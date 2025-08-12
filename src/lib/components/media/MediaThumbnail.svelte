<script lang="ts">
	import type { UploadedFileInfo } from '$lib/types/types';
	import { Play, FileText, Eye, Download, MapPin } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';

	let {
		file,
		onclick
	}: {
		file: UploadedFileInfo;
		onclick?: () => void;
	} = $props();

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
	class="media-thumbnail group relative overflow-hidden rounded-lg bg-base-100 shadow-sm transition-all hover:shadow-md hover:scale-105 cursor-pointer"
	onclick={handleClick}
	onkeydown={handleKeydown}
	tabindex="0"
	role="button"
	aria-label={`${file.originalName} öffnen`}
>
	{#if isImage(file.mimeType)}
		<!-- Bild Thumbnail -->
		<div class="aspect-square relative overflow-hidden">
			<img
				src={`/uploads/${file.filePath}`}
				alt={file.originalName}
				class="h-full w-full object-cover transition-all group-hover:scale-110"
				loading="lazy"
				onerror={(e) => {
					console.error('Image loading failed:', file.filePath, e);
					// Fallback: try direct URL if redirect failed
					const img = e.target as HTMLImageElement;
					if (!img.src.includes('_fallback')) {
						img.src = `/uploads/${file.filePath}?_fallback=1`;
					}
				}}
			/>
			<!-- Hover Overlay -->
			<div
				class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
			>
				<Icon src={Eye} size="24" class="text-white" />
			</div>
			
			<!-- GPS Badge für Bilder -->
			{#if hasGPSData()}
				<div class="absolute top-2 right-2 bg-success text-success-content rounded-full p-1 shadow-md">
					<Icon src={MapPin} size="12" />
				</div>
			{/if}
		</div>
	{:else if isVideo(file.mimeType)}
		<!-- Video Thumbnail -->
		<div class="aspect-square relative overflow-hidden bg-base-300 flex items-center justify-center">
			<!-- Video Preview (falls Browser unterstützt) -->
			<video
				src={`/uploads/${file.filePath}`}
				class="h-full w-full object-cover"
				muted
				preload="metadata"
				poster=""
				onerror={(e) => {
					console.error('Video loading failed:', file.filePath, e);
				}}
			>
				<track kind="captions" />
			</video>
			
			<!-- Play Icon Overlay -->
			<div class="absolute inset-0 flex items-center justify-center">
				<div class="bg-black/60 rounded-full p-3 transition-all group-hover:bg-black/80 group-hover:scale-110">
					<Icon src={Play} size="24" class="text-white" />
				</div>
			</div>
			
			<!-- Hover Overlay -->
			<div
				class="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100"
			>
			</div>
		</div>
	{:else}
		<!-- Andere Dateitypen -->
		<div class="aspect-square relative overflow-hidden bg-base-200 flex items-center justify-center">
			<div class="text-center p-4">
				<Icon src={FileText} size="32" class="text-base-content/60 mb-2 mx-auto" />
				<p class="text-xs text-base-content/60 truncate max-w-full">
					{file.originalName}
				</p>
			</div>
			
			<!-- Hover Overlay -->
			<div
				class="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100"
			>
				<Icon src={Download} size="20" class="text-white" />
			</div>
		</div>
	{/if}

	<!-- File Info Footer -->
	<div class="p-2 bg-base-100">
		<p class="text-xs font-medium text-base-content truncate" title={file.originalName}>
			{file.originalName}
		</p>
		<div class="flex items-center justify-between mt-1">
			<p class="text-xs text-base-content/60">
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
		outline: 2px solid oklch(var(--p));
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

	/* Loading state for images */
	img {
		background-color: oklch(var(--b2));
		background-image: linear-gradient(45deg, transparent 25%, oklch(var(--b3)) 25%, oklch(var(--b3)) 50%, transparent 50%, transparent 75%, oklch(var(--b3)) 75%);
		background-size: 20px 20px;
		animation: loading 1s linear infinite;
	}

	img[src] {
		background: none;
		animation: none;
	}

	@keyframes loading {
		0% {
			background-position: 0 0;
		}
		100% {
			background-position: 20px 20px;
		}
	}
</style>
<script lang="ts">
	import type { UploadedFileInfo } from '$lib/types/types';
	import { Images, Video, FileText } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import MediaThumbnail from './MediaThumbnail.svelte';
	import MediaModal from './MediaModal.svelte';

	let {
		files = [],
		showTitle = true,
		className = ''
	}: {
		files: UploadedFileInfo[];
		showTitle?: boolean;
		className?: string;
	} = $props();

	let selectedMedia = $state<UploadedFileInfo | null>(null);

	function openModal(file: UploadedFileInfo) {
		selectedMedia = file;
	}

	function closeModal() {
		selectedMedia = null;
	}

	function isImage(mimeType: string): boolean {
		return mimeType.startsWith('image/');
	}

	function isVideo(mimeType: string): boolean {
		return mimeType.startsWith('video/');
	}

	function getFileTypeIcon(mimeType: string) {
		if (isImage(mimeType)) return Images;
		if (isVideo(mimeType)) return Video;
		return FileText;
	}

	// Gruppiere Dateien nach Typ
	const imageFiles = $derived(files.filter(file => isImage(file.mimeType)));
	const videoFiles = $derived(files.filter(file => isVideo(file.mimeType)));
	const otherFiles = $derived(files.filter(file => !isImage(file.mimeType) && !isVideo(file.mimeType)));

	// Debug: Log EXIF data
	$effect(() => {
		if (files.length > 0) {
			console.log('MediaGallery: Files with EXIF data:', files.map(f => ({
				name: f.originalName,
				mimeType: f.mimeType,
				hasExif: !!f.exifData,
				exifData: f.exifData
			})));
		}
	});
</script>

{#if files.length > 0}
	<div class={`media-gallery ${className}`}>
		{#if showTitle}
			<div class="mb-4 flex items-center gap-2">
				<Icon src={Images} size="20" class="text-primary" />
				<h4 class="text-lg font-semibold">Medien ({files.length})</h4>
			</div>
		{/if}

		<!-- Bilder -->
		{#if imageFiles.length > 0}
			<div class="mb-6">
				<div class="mb-2 flex items-center gap-2">
					<Icon src={Images} size="16" class="text-secondary" />
					<h5 class="text-sm font-medium text-base-content/70">
						Bilder ({imageFiles.length})
					</h5>
				</div>
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
					{#each imageFiles as file (file.id)}
						<MediaThumbnail {file} onclick={() => openModal(file)} />
					{/each}
				</div>
			</div>
		{/if}

		<!-- Videos -->
		{#if videoFiles.length > 0}
			<div class="mb-6">
				<div class="mb-2 flex items-center gap-2">
					<Icon src={Video} size="16" class="text-secondary" />
					<h5 class="text-sm font-medium text-base-content/70">
						Videos ({videoFiles.length})
					</h5>
				</div>
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
					{#each videoFiles as file (file.id)}
						<MediaThumbnail {file} onclick={() => openModal(file)} />
					{/each}
				</div>
			</div>
		{/if}

		<!-- Andere Dateien -->
		{#if otherFiles.length > 0}
			<div class="mb-6">
				<div class="mb-2 flex items-center gap-2">
					<Icon src={FileText} size="16" class="text-secondary" />
					<h5 class="text-sm font-medium text-base-content/70">
						Andere Dateien ({otherFiles.length})
					</h5>
				</div>
				<div class="space-y-2">
					{#each otherFiles as file (file.id)}
						<div class="flex items-center gap-3 rounded-lg bg-base-100 p-3 shadow-sm">
							<Icon src={getFileTypeIcon(file.mimeType)} size="20" class="text-base-content/60" />
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium text-base-content truncate">
									{file.originalName}
								</p>
								<p class="text-xs text-base-content/60">
									{(file.size / 1024).toFixed(1)} KB
								</p>
							</div>
							<a
								href={`/uploads/${file.filePath}`}
								download={file.originalName}
								class="btn btn-ghost btn-sm"
								aria-label="Datei herunterladen"
							>
								Herunterladen
							</a>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Modal für Vollbildansicht -->
	{#if selectedMedia}
		<MediaModal file={selectedMedia} onClose={closeModal} />
	{/if}
{:else}
	<div class="flex items-center justify-center rounded-lg bg-base-100 p-8 text-center">
		<div class="space-y-3">
			<Icon src={Images} size="32" class="mx-auto text-base-content/40" />
			<p class="text-sm text-base-content/60">Keine Medien vorhanden</p>
		</div>
	</div>
{/if}

<style>
	.media-gallery {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Responsive grid improvements */
	@media (max-width: 640px) {
		:global(.grid-cols-2) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 640px) {
		:global(.sm\:grid-cols-3) {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	@media (min-width: 1024px) {
		:global(.lg\:grid-cols-4) {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	/* Animation for grid items */
	:global(.media-gallery .grid > *) {
		animation: fadeInUp 0.3s ease-out forwards;
	}

	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Accessibility improvements */
	@media (prefers-reduced-motion: reduce) {
		:global(.media-gallery .grid > *) {
			animation: none;
		}
	}
</style>
<script lang="ts">
	import { createToast } from '$lib/stores/toastState.svelte';
	import type { ValidationPreset } from '$lib/types';
	import { validateFiles } from '$lib/utils';
	import { getFileTypeDescription } from '$lib/utils/validation/fileValidation';

	import Icon from '$lib/components/Icon.svelte';

	let {
		config,
		files = $bindable<File[]>([]),
		onFilesAdded = (_newFiles: File[]) => {},
		onFileRemoved = (_index: number) => {},
		onClear = () => {},
		multiple = true,
		title = 'Dateien hochladen',
		subtitle = getFileTypeDescription(config.allowedTypes),
		emptyText = 'Klicken oder Drag & Drop',
		additionalText = '',
		class: className = '',
		isAnalyzing = false,
		loadingText = 'Analysiere Dateien...',
		showPreview = true
	} = $props<{
		config: ValidationPreset;
		files?: File[];
		onFilesAdded?: (files: File[]) => void;
		onFileRemoved?: (name: string) => void;
		onClear?: () => void;
		multiple?: boolean;
		title?: string;
		subtitle?: string;
		emptyText?: string;
		additionalText?: string;
		class?: string;
		isAnalyzing?: boolean;
		loadingText?: string;
		showPreview?: boolean;
	}>();

	let isDragOver = $state(false);
	let fileInput: HTMLInputElement;

	// Generate unique ID for the input
	const inputId = `dropzone-${Math.random().toString(36).substring(2, 9)}`;

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files) {
			processFiles(Array.from(target.files));
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragOver = false;

		if (event.dataTransfer?.files) {
			processFiles(Array.from(event.dataTransfer.files));
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragOver = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		isDragOver = false;
	}

	function processFiles(newFiles: File[]) {
		const validation = validateFiles(newFiles, config);

		if (validation.errors.length > 0) {
			// Zeige Fehler als Toast
			validation.errors.forEach((error) => {
				createToast('error', error);
			});
		}

		if (validation.validFiles && validation.validFiles.length > 0) {
			if (multiple) {
				files = [...files, ...validation.validFiles];
			} else {
				files = validation.validFiles.slice(0, 1);
			}
			onFilesAdded(validation.validFiles);
		}

		// Reset input
		if (fileInput) {
			fileInput.value = '';
		}
	}

	function removeFile(file: File) {
		onFileRemoved(file.name);
		files = files.filter((f: File) => f !== file);
	}

	function clearAll() {
		files = [];
		onClear();
		if (fileInput) {
			fileInput.value = '';
		}
	}

	function openFileDialog() {
		fileInput?.click();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			openFileDialog();
		}
	}

	function getFileIconName(type: string): string {
		if (type.startsWith('image/')) return 'lucide:images';
		if (type.startsWith('video/')) return 'lucide:video';
		return 'lucide:file';
	}
</script>

<div class="space-y-4 {className}">
	<!-- File Preview Section (nur wenn showPreview und Dateien vorhanden) -->
	{#if showPreview && files.length > 0}
		<div class="bg-base-200 rounded-lg p-4">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-sm font-semibold">
					{files.length} Datei{files.length !== 1 ? 'en' : ''} hochgeladen
				</h3>
				{#if multiple}
					<button
						type="button"
						class="btn btn-ghost btn-xs text-error hover:bg-error hover:text-white"
						onclick={clearAll}
					>
						Alle löschen
					</button>
				{/if}
			</div>

			<div class="grid gap-3 {multiple ? 'sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}">
				{#each files as file, index (file.name + index)}
					<div class="card bg-base-100 shadow-sm">
						<div class="card-body p-3">
							<!-- File Info -->
							<div class="flex items-start gap-3">
								<!-- File Icon/Thumbnail -->
								<div class="flex-shrink-0">
									<div
										class="bg-base-200 flex h-12 w-12 items-center justify-center rounded"
									>
										<Icon icon={getFileIconName(file.type)} width="24" height="24" class="text-primary" />
									</div>
								</div>

								<!-- File Details -->
								<div class="flex-grow">
									<h4 class="truncate text-sm font-medium" title={file.name}>
										{file.name}
									</h4>
									<p class="text-base-content/60 text-xs">
										{(file.size / (1024 * 1024)).toFixed(2)} MB
									</p>
								</div>

								<!-- Remove Button -->
								<button
									type="button"
									class="btn btn-ghost btn-xs text-error"
									onclick={() => removeFile(file)}
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
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Dropzone -->
	<div
		class="cursor-pointer rounded-lg border-2 border-dashed p-6 transition-all duration-200
			{isDragOver
			? 'border-primary bg-primary/10 scale-[1.02]'
			: 'border-base-300 hover:border-primary hover:bg-primary/5'}"
		ondrop={handleDrop}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		role="button"
		tabindex="0"
		onclick={openFileDialog}
		onkeydown={handleKeydown}
		aria-label="{title} per Drag & Drop oder Klick"
	>
		<input
			bind:this={fileInput}
			id={inputId}
			type="file"
			accept={config.allowedTypes.join(',')}
			{multiple}
			class="hidden"
			onchange={handleFileSelect}
		/>

		{#if isAnalyzing}
			<div class="flex flex-col items-center">
				<div class="loading loading-spinner loading-lg text-primary mb-2"></div>
				<p class="text-primary text-sm font-medium">
					{loadingText}
				</p>
			</div>
		{:else}
			<div class="flex flex-col items-center">
				<Icon
					icon="lucide:upload"
					class="mb-2 h-8 w-8 transition-colors {isDragOver ? 'text-primary' : 'text-base-content/40'}"
				/>
				<p class="text-sm font-medium {isDragOver ? 'text-primary' : ''}">
					{isDragOver ? `${multiple ? 'Dateien' : 'Datei'} hier ablegen!` : title}
				</p>
				<p class="text-base-content/60 mt-1 text-xs">
					{emptyText}
				</p>
				<p class="text-base-content/40 mt-1 text-xs">
					{subtitle}{additionalText ? ` - ${additionalText}` : ''}
				</p>
			</div>
		{/if}
	</div>
</div>

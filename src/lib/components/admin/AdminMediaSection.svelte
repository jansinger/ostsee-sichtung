<script lang="ts">
	import { FILE_VALIDATION_PRESETS } from '$lib/constants/upload';
	import UnifiedDropzone from '$lib/components/form/UnifiedDropzone.svelte';
	import { createLogger } from '$lib/logger';
	import { getFormContext } from '$lib/report/formContext';
	import { mediaStore } from '$lib/stores/mediaStore';
	import { toastStore } from '$lib/stores/toastStore';
	import type { UploadedFileInfo } from '$lib/types';
	import { formatFileSize } from '$lib/utils/file/fileSize';
	import { getFileIcon } from '$lib/utils/file/fileType';
	import { Camera, Trash2, Eye } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import FormField from '$lib/report/components/form/fields/FormField.svelte';

	const logger = createLogger('AdminMediaSection');
	const { form, handleChange } = getFormContext();

	let {
		sighting,
		onFilesChange = (_files: UploadedFileInfo[]) => {}
	} = $props<{
		sighting: { files?: UploadedFileInfo[] };
		onFilesChange?: (files: UploadedFileInfo[]) => void;
	}>();

	// Initialize with existing files
	let existingFiles = $state(sighting.files || []);
	let newFiles = $state<File[]>([]);

	// Combine existing and new files for display
	let allFiles = $derived([...existingFiles, ...newFiles]);

	function removeExistingFile(fileToRemove: UploadedFileInfo) {
		existingFiles = existingFiles.filter(file => file.id !== fileToRemove.id);
		onFilesChange(existingFiles);
	}

	function removeNewFile(fileToRemove: File) {
		newFiles = newFiles.filter(file => file !== fileToRemove);
	}

	function onFilesAdded(files: File[]) {
		newFiles = [...newFiles, ...files];
		logger.info({ count: files.length }, 'Neue Dateien hinzugefügt');
	}

	function onFileRemoved(index: number) {
		newFiles = newFiles.filter((_, i) => i !== index);
	}

	function viewFile(file: UploadedFileInfo | File) {
		const url = file instanceof File ? URL.createObjectURL(file) : file.url;
		window.open(url, '_blank');
	}
</script>

<!-- Admin Media Section -->
<div class="card bg-base-200 shadow-sm">
	<div class="card-body">
		<h3 class="card-title flex items-center gap-2 text-lg">
			<Icon src={Camera} size="20" class="text-primary" />
			Foto- oder Videoaufnahmen
		</h3>
		
		<div class="text-base-content/70 mb-4 text-sm">
			<p class="mb-2 font-medium">📸 Vorhandene und neue Medien bearbeiten</p>
		</div>

		<FormField name="mediaConsent" />

		<!-- Existing Files Display -->
		{#if existingFiles.length > 0}
			<div class="mb-4">
				<h4 class="font-semibold mb-2">Vorhandene Dateien ({existingFiles.length})</h4>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
					{#each existingFiles as file (file.id)}
						<div class="card bg-base-100 shadow-sm p-3">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2 flex-1 min-w-0">
									<Icon src={getFileIcon(file.mimeType)} size="20" class="text-primary shrink-0" />
									<div class="min-w-0 flex-1">
										<p class="text-sm font-medium truncate" title={file.originalName}>
											{file.originalName}
										</p>
										<p class="text-xs text-base-content/60">
											{formatFileSize(file.size)}
										</p>
									</div>
								</div>
								<div class="flex gap-1">
									<button
										type="button"
										class="btn btn-ghost btn-xs"
										onclick={() => viewFile(file)}
										title="Ansehen"
									>
										<Icon src={Eye} size="16" />
									</button>
									<button
										type="button"
										class="btn btn-ghost btn-xs text-error"
										onclick={() => removeExistingFile(file)}
										title="Löschen"
									>
										<Icon src={Trash2} size="16" />
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- New Files Display -->
		{#if newFiles.length > 0}
			<div class="mb-4">
				<h4 class="font-semibold mb-2">Neue Dateien ({newFiles.length})</h4>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
					{#each newFiles as file (file.name)}
						<div class="card bg-base-100 shadow-sm p-3 border border-primary/20">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2 flex-1 min-w-0">
									<Icon src={getFileIcon(file.type)} size="20" class="text-primary shrink-0" />
									<div class="min-w-0 flex-1">
										<p class="text-sm font-medium truncate" title={file.name}>
											{file.name}
										</p>
										<p class="text-xs text-base-content/60">
											{formatFileSize(file.size)}
										</p>
									</div>
								</div>
								<div class="flex gap-1">
									<button
										type="button"
										class="btn btn-ghost btn-xs"
										onclick={() => viewFile(file)}
										title="Ansehen"
									>
										<Icon src={Eye} size="16" />
									</button>
									<button
										type="button"
										class="btn btn-ghost btn-xs text-error"
										onclick={() => removeNewFile(file)}
										title="Löschen"
									>
										<Icon src={Trash2} size="16" />
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Upload Zone -->
		<UnifiedDropzone
			bind:files={newFiles}
			config={FILE_VALIDATION_PRESETS.MEDIA}
			{onFilesAdded}
			{onFileRemoved}
			title="Zusätzliche Dateien hochladen"
			multiple={true}
		/>

		<div class="alert alert-info mt-4">
			<Icon src={Camera} size="20" />
			<span class="text-sm">
				Änderungen an Medien werden beim Speichern der Sichtung übernommen.
			</span>
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
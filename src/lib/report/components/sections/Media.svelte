<script lang="ts">
	import { getUploadConfig } from '$lib/stores/configStore';
	import { getFormContext } from '$lib/report/formContext';
	import Icon from '$lib/components/Icon.svelte';
	import DropzoneEnhanced from '$lib/report/components/form/fields/DropzoneEnhanced.svelte';
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import type { ValidationPreset } from '$lib/types';

	// Generiere eine einfache referenceId für Upload (temporäre Lösung)
	const { form } = getFormContext();
	let referenceId = $derived($form.referenceId);
	
	// Dynamic upload configuration
	let uploadConfig = $state<ValidationPreset | null>(null);
	
	// Generate dynamic format description
	let formatDescription = $derived(() => {
		if (!uploadConfig) return 'JPG, PNG, MP4, MOV, AVI';
		
		const imageTypes = uploadConfig.allowedTypes.filter(type => type.startsWith('image/'));
		const videoTypes = uploadConfig.allowedTypes.filter(type => type.startsWith('video/'));
		
		const imageFormats = imageTypes.map(type => type.split('/')[1]?.toUpperCase()).filter(Boolean);
		const videoFormats = videoTypes.map(type => type.split('/')[1]?.toUpperCase()).filter(Boolean);
		
		const allFormats = [...imageFormats, ...videoFormats];
		return allFormats.join(', ');
	});
	
	// Generate file size description
	let maxSizeDescription = $derived(() => {
		if (!uploadConfig) return 'max 50MB';
		const sizeMB = Math.round(uploadConfig.maxFileSize / (1024 * 1024));
		return `max ${sizeMB}MB`;
	});
	
	// Load upload configuration on component mount
	$effect(() => {
		getUploadConfig().then(config => {
			uploadConfig = config;
		});
	});
</script>

<!-- Media Section -->
<div class="card bg-base-200 shadow-sm">
	<div class="card-body">
		<h3 class="card-title flex items-center gap-2 text-lg">
			<Icon icon="lucide:camera" width="20" class="text-primary" />
			Foto- oder Videoaufnahmen
		</h3>
		<div class="text-base-content/70 mb-4 text-sm">
			<p class="mb-2 font-medium flex items-center gap-2">
				<Icon icon="lucide:camera" width="16" class="text-primary" />
				Fotos und Videos sind extrem wertvoll für die Forschung!
			</p>
			<ul class="list-inside list-disc space-y-1 text-xs">
				<li><strong>Artbestimmung:</strong> Auch unscharfe Bilder können helfen</li>
				<li><strong>Verhaltensanalyse:</strong> Videos zeigen wichtige Verhaltensmuster</li>
				<li><strong>GPS-Daten:</strong> Automatische Positionserkennung aus Bildern</li>
				<li><strong>Formatunterstützung:</strong> {formatDescription()} ({maxSizeDescription()})</li>
			</ul>
		</div>
		<FormField name="mediaConsent" />
		{#if uploadConfig}
			<DropzoneEnhanced
				{referenceId}
				maxFiles={10}
				config={uploadConfig}
				enableGPSExtraction={false}
			/>
		{:else}
			<div class="skeleton h-32 w-full"></div>
		{/if}
		<div class="alert alert-info mt-4">
			<Icon icon="lucide:camera" width="20" />
			<span class="text-sm">
				Falls Sie uns Ihre Medien auf einem anderen Weg zukommen lassen möchten, erhalten Sie
				Instruktionen nach dem Absenden des Formulars.
			</span>
		</div>
	</div>
</div>

<style>
	/* Card hover effects */
	.card {
		transition: all 0.2s ease;
	}

	.card:hover {
		transform: translateY(-1px);
		box-shadow: 0 8px 25px -8px oklch(var(--b3));
	}
</style>

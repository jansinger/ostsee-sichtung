<script lang="ts">
	import { getUploadConfig } from '$lib/stores/configStore';
	import { getFormContext } from '$lib/report/formContext';
	import Icon from '$lib/components/Icon.svelte';
	import DropzoneEnhanced from '$lib/report/components/form/fields/DropzoneEnhanced.svelte';
	import FormField from '$lib/report/components/form/fields/FormField.svelte';
	import UploadNotice from '$lib/report/components/form/UploadNotice.svelte';
	import { getFileTypeDescription } from '$lib/utils/validation/fileValidation';
	import type { ValidationPreset } from '$lib/types';
	import { MEDIA_FALLBACK_EMAIL } from '$lib/constants/contact';
	import SectionCard from './SectionCard.svelte';

	// Generiere eine einfache referenceId für Upload (temporäre Lösung)
	const { form } = getFormContext();
	let referenceId = $derived($form.referenceId);

	// Dynamic upload configuration
	let uploadConfig = $state<ValidationPreset | null>(null);

	// Generate dynamic format description
	let formatDescription = $derived(
		uploadConfig ? getFileTypeDescription(uploadConfig.allowedTypes) : 'JPG, PNG, GIF, WEBP'
	);

	// Videos sind nur erlaubt, wenn die Konfiguration das hergibt — der
	// Dauerhinweis auf die Übertragungsdauer soll nicht erscheinen, wenn gar
	// keine Videos akzeptiert werden.
	let allowsVideo = $derived(
		uploadConfig?.allowedTypes.some((type) => type.startsWith('video/')) ?? false
	);

	// Zwei Grenzen, zwei Zahlen: Ein einzelner „max 100MB" wäre für Bilder
	// falsch, ein einzelner „max 10MB" für Videos.
	let maxSizeDescription = $derived.by(() => {
		if (!uploadConfig) return 'Bilder max. 10 MB';
		const imageMB = Math.round(uploadConfig.maxFileSize / (1024 * 1024));
		const hasVideo = uploadConfig.allowedTypes.some((type) => type.startsWith('video/'));
		if (!hasVideo) return `max. ${imageMB} MB`;
		const videoMB = Math.round(uploadConfig.maxVideoFileSize / (1024 * 1024));
		return `Bilder max. ${imageMB} MB, Videos max. ${videoMB} MB`;
	});

	// Load upload configuration on component mount
	$effect(() => {
		getUploadConfig().then((config) => {
			uploadConfig = config;
		});
	});
</script>

<!-- Media Section -->
<SectionCard title="Fotos und Videos" icon="lucide:camera">
	<div class="text-base-content/70 mb-4 text-sm">
		<p class="mb-2 flex items-center gap-2 font-medium">
			<Icon icon="lucide:camera" width="16" class="text-primary" aria-hidden="true" />
			Aufnahmen sind extrem wertvoll für die Forschung!
		</p>
		<ul class="list-inside list-disc space-y-1 text-xs">
			<li><strong>Artbestimmung:</strong> Auch unscharfe Aufnahmen können helfen</li>
			<li><strong>GPS-Daten:</strong> Automatische Positionserkennung aus Fotos</li>
			<li>
				<strong>Formate:</strong>
				{formatDescription} ({maxSizeDescription})
			</li>
			{#if allowsVideo}
				<li>
					<strong>Videos:</strong> Große Videos können über Mobilfunk mehrere Minuten dauern — bitte lassen
					Sie die Seite so lange geöffnet.
				</li>
			{/if}
		</ul>
	</div>
	<UploadNotice />
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
		<Icon icon="lucide:mail" width="20" class="text-info-strong" aria-hidden="true" />
		<span class="text-sm">
			Ist eine Aufnahme zu groß für den Upload? Senden Sie die Meldung trotzdem ab und schicken Sie
			die Datei anschließend an <a class="link" href="mailto:{MEDIA_FALLBACK_EMAIL}"
				>{MEDIA_FALLBACK_EMAIL}</a
			>.
		</span>
	</div>
</SectionCard>

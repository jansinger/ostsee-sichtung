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

	// Im Admin-Bearbeitungsformular bleibt die Medien-Einwilligung sichtbar, aber
	// gesperrt: Sie ist eine Aussage der meldenden Person, kein Attribut des
	// Datensatzes. Ein Admin könnte sie weder stellvertretend erteilen noch
	// nachweisen — `updateSighting` schreibt die Nachweisspalten bewusst nicht
	// mehr mit (Art. 7 Abs. 1 DSGVO).
	let { adminMode = false }: { adminMode?: boolean } = $props();

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
	<FormField name="mediaConsent" disabled={adminMode} />
	{#if adminMode}
		<!--
			Bewusst ohne `aria-describedby`: Ein `disabled` Control ist nicht
			fokussierbar, eine Beschreibung daran würde im Formularmodus nie
			vorgelesen. Der sichtbare Text in Dokumentreihenfolge ist hier der
			wirksame Weg. Die Feld-Pipeline (`FieldRenderer`) bietet ohnehin keinen
			Hook für eine zusätzliche Beschreibung.
		-->
		<p class="text-support text-base-content/70 mt-1">
			Diese Einwilligung kann nur die meldende Person selbst erteilen oder zurückziehen.
		</p>
	{/if}
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
			<!-- `wrap-anywhere`: Die Adresse ist ein einziges Wort von 207px und damit
			     die Mindestbreite dieses Alerts. Auf 320px schob sie das Dokument um
			     60px über den Fensterrand hinaus (`e2e/horizontal-overflow.spec.ts`) —
			     ein Alert kann seinem Inhalt nicht ausweichen, und der Seiten-Wrapper
			     wächst als Flex-Item mit `mx-auto` mit. -->
			die Datei anschließend an
			<a class="link wrap-anywhere" href="mailto:{MEDIA_FALLBACK_EMAIL}">{MEDIA_FALLBACK_EMAIL}</a>.
		</span>
	</div>
</SectionCard>

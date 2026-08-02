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
		showPreview = true,
		/**
		 * Beschriftung eines echten Vollton-Buttons INNERHALB der Dropzone.
		 *
		 * Ohne ihn ist die gestrichelte Fläche selbst der einzige Auslöser — auf
		 * einem Telefon beschreibt „Klicken oder Drag & Drop" eine unmögliche
		 * Handlung, und die Fläche allein trägt die Prominenz nicht, die eine
		 * Hero-Karte braucht.
		 *
		 * Ist die Prop gesetzt, wechselt die Rollenverteilung auf das
		 * GitHub-/Figma-Muster: Die Fläche ist nur noch Drop-Ziel, der Button ist
		 * das Klickziel. Deshalb verliert die Fläche dann `role="button"`,
		 * `tabindex` und ihre Tastatur-/Klick-Handler — sonst stünde ein Button in
		 * einem Button (verschachtelte Interaktion) und ein Klick öffnete den
		 * Dateidialog zweimal.
		 *
		 * Ohne die Prop bleibt alles wie bisher (Schritt 3, Admin-Maske).
		 */
		actionLabel = undefined,
		/**
		 * Dichte Variante für Aufrufer, die bereits eine eigene Überschrift über
		 * der Fläche haben.
		 *
		 * Auf Schritt 1 des Sichtungsformulars standen drei Beschriftungen
		 * derselben Handlung übereinander — die Karten-Überschrift „Foto mit GPS
		 * hochladen", der Dropzone-Titel „Foto hochladen" und der Button „Foto
		 * auswählen" — und die Fläche kostete 212 px, bevor die Karte überhaupt
		 * begann. `compact` streicht die mittlere Beschriftung samt dekorativem
		 * Icon und nimmt den Innenabstand von `p-6` auf `p-4` zurück.
		 *
		 * Der Titel entfällt NUR zusammen mit einem `actionLabel`: Ohne Button ist
		 * er über `zoneTriggerAttributes` der zugängliche Name der Fläche, und ein
		 * Bedienelement ohne Beschriftung bliebe zurück (WCAG 4.1.2). Festgehalten
		 * in `UnifiedDropzone.svelte.test.ts` → „compact".
		 */
		compact = false
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
		actionLabel?: string;
		compact?: boolean;
	}>();

	// Der Titel darf nur weichen, wenn der Button den Namen trägt — siehe Prop.
	const showZoneTitle = $derived(!(compact && actionLabel));

	let isDragOver = $state(false);
	let fileInput: HTMLInputElement;

	// Bleibender Fehlerbereich statt nur Toast: Ein Toast verschwindet nach
	// Sekunden, und ein Validierungsfehler ohne Verknüpfung zum Bedienelement
	// verletzt WCAG 2.1 SC 3.3.1. Der Toast bleibt zusätzlich — er meldet den
	// Fehler denen, die gerade woanders auf der Seite sind.
	let rejectionErrors = $state<string[]>([]);

	// `role="alert"` ist assertive: Der Screenreader liest den Inhalt sofort und
	// vollständig vor. Bei zehn abgelehnten Dateien wären das zehn Zeilen am Stück.
	// Drei plus Zähler sagen dasselbe und bleiben hörbar.
	const MAX_VISIBLE_ERRORS = 3;
	let visibleRejectionErrors = $derived(rejectionErrors.slice(0, MAX_VISIBLE_ERRORS));
	let hiddenRejectionCount = $derived(Math.max(0, rejectionErrors.length - MAX_VISIBLE_ERRORS));

	// Generate unique ID for the input
	const inputId = `dropzone-${Math.random().toString(36).substring(2, 9)}`;
	// Von inputId abgeleitet statt einer fest verdrahteten Zeichenkette: Zwei
	// Dropzones auf derselben Seite hatten sonst dieselbe `#dropzone-errors`-ID,
	// und `aria-describedby` konnte auf die falsche Instanz verweisen.
	const errorsId = `${inputId}-errors`;

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
			rejectionErrors = validation.errors;
			validation.errors.forEach((error) => {
				createToast('error', error);
			});
		} else {
			rejectionErrors = [];
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

	/**
	 * Rolle, Fokus und Handler der gestrichelten Fläche — aber nur, solange sie
	 * selbst das Klickziel ist (kein `actionLabel`).
	 *
	 * Als Spread und nicht als fünf einzelne bedingte Attribute: Sveltes
	 * A11y-Prüfung sieht `role` und `tabindex` sonst getrennt und meldet ein
	 * `tabindex` auf einem nicht-interaktiven Element, obwohl beide immer
	 * gemeinsam entfallen.
	 */
	const zoneTriggerAttributes = $derived(
		actionLabel
			? {}
			: {
					role: 'button',
					tabindex: 0,
					onclick: openFileDialog,
					onkeydown: handleKeydown,
					'aria-label': `${title} per Drag & Drop oder Klick`
				}
	);

	function getFileIconName(type: string): string {
		if (type.startsWith('image/')) return 'lucide:images';
		if (type.startsWith('video/')) return 'lucide:video';
		return 'lucide:file';
	}
</script>

<div class="space-y-4 {className}">
	<!-- File Preview Section (nur wenn showPreview und Dateien vorhanden)

	     Hinweis zur Erreichbarkeit: In der App rendert dieser Block derzeit nie —
	     einziger Consumer ist `DropzoneEnhanced.svelte`, und der setzt
	     `showPreview={false}`. Der Prop-Default ist aber `true`, der nächste
	     Consumer bekäme die Vorschau also sofort. Deshalb gelten hier dieselben
	     Regeln wie nebenan: 44-px-Touch-Targets (`min-h-11`, design-system.md)
	     und ausschließlich Theme-Tokens (`text-error-content` statt `text-white`,
	     daisyui.md). Abgesichert durch `UnifiedDropzone.svelte.test.ts`
	     → „Vorschau-Buttons — A11y und Theme-Tokens". -->
	{#if showPreview && files.length > 0}
		<div class="bg-base-200 rounded-lg p-4">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-sm font-semibold">
					{files.length} Datei{files.length !== 1 ? 'en' : ''} hochgeladen
				</h3>
				{#if multiple}
					<button
						type="button"
						class="btn btn-ghost btn-sm text-error hover:bg-error hover:text-error-content min-h-11"
						onclick={clearAll}
					>
						Alle löschen
					</button>
				{/if}
			</div>

			<div class="grid gap-3 {multiple ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}">
				{#each files as file, index (file.name + index)}
					<div class="card bg-base-100 shadow-sm">
						<div class="card-body p-3">
							<!-- File Info -->
							<div class="flex items-start gap-3">
								<!-- File Icon/Thumbnail -->
								<div class="flex-shrink-0">
									<div class="bg-base-200 flex h-12 w-12 items-center justify-center rounded">
										<Icon
											icon={getFileIconName(file.type)}
											width="24"
											height="24"
											class="text-primary"
										/>
									</div>
								</div>

								<!-- File Details -->
								<div class="flex-grow">
									<h4 class="truncate text-sm font-medium" title={file.name}>
										{file.name}
									</h4>
									<p class="text-base-content/70 text-support">
										{(file.size / (1024 * 1024)).toFixed(2)} MB
									</p>
								</div>

								<!-- Remove Button -->
								<button
									type="button"
									class="btn btn-ghost btn-sm text-error hover:bg-error hover:text-error-content min-h-11 min-w-11"
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
	<!-- Mit `actionLabel` ist diese Fläche nur noch Drop-Ziel; Rolle, Fokus und
	     Handler wandern auf den Button darin (siehe Prop-Dokumentation). -->
	<div
		class="rounded-lg border-2 border-dashed transition-all duration-200
			{compact ? 'p-4' : 'p-6'}
			{actionLabel ? '' : 'cursor-pointer'}
			{isDragOver
			? 'border-primary bg-primary/10 scale-[1.02]'
			: 'border-base-300 hover:border-primary hover:bg-primary/5'}"
		ondrop={handleDrop}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		{...zoneTriggerAttributes}
	>
		<input
			bind:this={fileInput}
			id={inputId}
			data-testid="dropzone-input"
			aria-describedby={rejectionErrors.length > 0 ? errorsId : undefined}
			aria-invalid={rejectionErrors.length > 0}
			type="file"
			accept={config.accept}
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
				{#if showZoneTitle}
					<Icon
						icon="lucide:upload"
						class="mb-2 h-8 w-8 transition-colors {isDragOver
							? 'text-primary'
							: 'text-base-content/70'}"
					/>
				{/if}
				<!-- In der dichten Variante bleibt die Zeile für die Ablage-Rückmeldung
				     trotzdem erreichbar: Der Rahmenwechsel allein sagt nicht, dass jetzt
				     losgelassen werden darf. -->
				{#if showZoneTitle || isDragOver}
					<p class="text-sm font-medium {isDragOver ? 'text-primary' : ''}">
						{isDragOver ? `${multiple ? 'Dateien' : 'Datei'} hier ablegen!` : title}
					</p>
				{/if}
				{#if actionLabel}
					<!-- Ohne Titelzeile darüber steht der Button oben in der Fläche; ein
					     `mt-3` wäre dann Abstand zu nichts. -->
					<button
						type="button"
						class="btn btn-primary min-h-11 {showZoneTitle ? 'mt-3' : ''}"
						onclick={openFileDialog}
					>
						<Icon aria-hidden="true" icon="lucide:camera" width="18" />
						{actionLabel}
					</button>
				{/if}
				<!-- Ein Steuerelement überall, nur der Hinweis ist responsiv: Ziehen gibt
				     es auf einem Telefon nicht, der Satz beschriebe dort eine unmögliche
				     Handlung. -->
				<p class="text-base-content/70 text-support mt-1 {actionLabel ? 'hidden md:inline' : ''}">
					{emptyText}
				</p>
				<p class="text-base-content/70 text-support mt-1">
					{subtitle}{additionalText ? ` - ${additionalText}` : ''}
				</p>
			</div>
		{/if}
	</div>

	{#if rejectionErrors.length > 0}
		<!-- Alerts sind in diesem Projekt Soft-Tints (app.css-Override, daisyui.md):
		     Text ist base-content, die Statusfarbe gehört als Akzent auf das Icon.
		     `text-error-strong`, NICHT `text-error` — design-system.md verlangt für
		     Icons und Text durchgängig die -strong-Variante. -->
		<div
			id={errorsId}
			data-testid="dropzone-errors"
			role="alert"
			class="alert alert-error mt-3 items-start"
		>
			<Icon icon="lucide:circle-alert" width="20" class="text-error-strong" aria-hidden="true" />
			<div class="text-sm">
				<ul class="list-inside list-disc space-y-1">
					<!-- Position als Key, nicht der Text: Zwei gleich große Dateien mit
					     gleichem Namen erzeugen byte-identische Meldungen, und doppelte
					     Keys sind in Svelte ein Laufzeitfehler. Die Liste wird ohnehin
					     immer als Ganzes ersetzt — es gibt nichts zu erhalten. -->
					{#each visibleRejectionErrors as message, index (index)}
						<li>{message}</li>
					{/each}
				</ul>
				{#if hiddenRejectionCount > 0}
					<p class="mt-1 opacity-80">und {hiddenRejectionCount} weitere</p>
				{/if}
			</div>
		</div>
	{/if}
</div>

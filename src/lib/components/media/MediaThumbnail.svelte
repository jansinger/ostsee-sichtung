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

	let imageLoading = $state(true);

	function handleImageLoad() {
		imageLoading = false;
	}

	function handleImageError(event: Event) {
		console.error('Image loading failed:', `/api/media/${file.filePath}`, event);
		// Fallback to original URL if secure endpoint fails
		const img = event.target as HTMLImageElement;
		if (!img.src.includes('fallback=true')) {
			img.src = `${file.url}?fallback=true`;
			return;
		}
		imageLoading = false;
	}
</script>

<div
	class="media-thumbnail group bg-base-100 shadow-raised duration-instant hover:shadow-floating relative cursor-pointer overflow-hidden rounded-lg transition-all hover:scale-105"
	onclick={handleClick}
	onkeydown={handleKeydown}
	tabindex="0"
	role="button"
	aria-label={`${file.originalName} öffnen`}
>
	{#if isImage(file.mimeType)}
		<!-- Bild Thumbnail -->
		<div class="relative aspect-square overflow-hidden">
			<!-- Ladeanzeige, bis das Bild da ist. Sie hängt an `onload`/`onerror` und
			     nicht an einem CSS-Selektor: Der Vorgänger an dieser Stelle war eine
			     Streifen-Animation auf dem `img`, die eine Gegenregel im scoped CSS
			     weiter unten dauerhaft abschaltete — dass sie nie lief, sah man dem
			     Stylesheet nicht an (Begründung dort). Nur der Bild-Zweig hat etwas zu
			     überbrücken: das Video lädt wegen `preload="none"` nichts, der
			     Datei-Zweig zeigt bloß ein Icon.
			     Ohne z-Angabe, aber vor dem Bild im Markup: `absolute` malt ohnehin
			     über das statische `img` und die beiden Overlays danach über sie. -->
			{#if imageLoading}
				<div
					class="skeleton absolute inset-0"
					data-testid="media-thumbnail-skeleton"
					aria-hidden="true"
				></div>
			{/if}
			<img
				src={`/api/media/${file.filePath}`}
				alt={file.originalName}
				class="h-full w-full object-contain transition-all group-hover:scale-110"
				loading="lazy"
				onload={handleImageLoad}
				onerror={handleImageError}
			/>
			<!-- Hover Overlay. bg-scrim/<n> statt bg-black/<n>: der Wert steht seit
			     dem 2026-07-30 als --scrim-surface in tokens.css. Ein Schleier ist
			     keine Fläche des Themes, sondern eine Abdunklung des Fotos darunter —
			     die Begründung, warum das Token neutrales Schwarz ist und nicht
			     bg-neutral, steht dort. -->
			<div
				class="bg-scrim/60 thumbnail-overlay absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
			>
				<Icon icon="lucide:eye" width="24" class="text-on-scrim" />
			</div>

			<!-- GPS Badge für Bilder -->
			{#if hasGPSData()}
				<div
					class="bg-success text-success-content shadow-raised absolute top-2 right-2 rounded-full p-1"
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
			<!-- preload="none": Mit "metadata" stößt der Browser für JEDE Kachel
			     eine eigene Anfrage an, nur um Dauer und Maße zu erfahren — bei 51
			     Videos im Bestand also 51 Verbindungen für ein Standbild, das hier
			     gar nicht gezeigt wird. Das Play-Overlay darunter sagt bereits, dass
			     hier ein Video liegt; geladen wird erst im Modal.
			     (`/api/media` beantwortet seit dem Streaming-Umbau Bereichsanfragen,
			     ein "metadata" würde also nicht mehr die ganze Datei ziehen — die
			     überflüssigen Anfragen bleiben aber.) -->
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
				class="bg-scrim/20 thumbnail-overlay absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
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
				class="bg-scrim/60 thumbnail-overlay absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
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

	/* Bleibt bewusst stehen. Die drei Badges tragen im Markup bereits `badge-xs`;
	   das hier sind die letzten 0,4px darüber plus das Schriftgewicht — eine
	   Feinjustierung, für die DaisyUI keine Modifier-Klasse hat. Anders als die
	   beiden entfernten Regeln unten definiert sie keine Utility neu, sondern
	   justiert eine Komponentenklasse; das ist der Fall, für den ein scoped
	   <style> da ist. */
	.badge {
		font-size: 0.65rem;
		font-weight: 500;
	}

	/* `.truncate` stand hier als eigene Regel und wiederholte Wort für Wort, was
	   Tailwinds gleichnamige Utility ohnehin tut — ersatzlos entfernt. Eine
	   Utility-Klasse im scoped <style> neu zu definieren ist auch dann ein
	   Fehler, wenn die Werte zufällig übereinstimmen: Svelte macht daraus
	   `.truncate.s-xyz` und gewinnt still gegen die Utility-Ebene. Wer die
	   Klasse später im Markup tauscht, verliert eine Zusage, die er hier nicht
	   vermutet. Dasselbe galt für ein `.p-2` im Mobil-Block unten, das Tailwinds
	   eigenen Wert (0.5rem) auf sich selbst setzte.

	   Ebenfalls entfernt: ein `img`-Regelpaar, das bis zur Ladung ein
	   Streifenmuster zeigen sollte (`animation: loadingPattern`). Es hat nie
	   etwas gezeigt — die Gegenregel `.media-thumbnail img[src]` hebt es mit
	   `background: none !important` wieder auf, und `src` steht im Markup als
	   Literal, ist also ab dem ersten Paint da. Die Keyframe `loadingPattern`
	   in app.css hatte hier ihre einzige Aufrufstelle und ist mit entfallen.

	   Die Absicht dahinter lebt im Markup weiter, als DaisyUI-`skeleton` hinter
	   `{#if imageLoading}`. Sie kommt bewusst nicht als CSS-Regel zurück: Ein
	   Ladezustand, den ein Selektor beschreibt, ist genau dann falsch, wenn der
	   Selektor den Zustand verfehlt — und dass er das tut, sieht man dem
	   Stylesheet nicht an. Am Handler ist es prüfbar, und
	   `MediaThumbnail.svelte.test.ts` prüft es: sichtbar vor `load`, weg danach,
	   und weg auch dann, wenn der Fallback endgültig scheitert und `load` nie
	   kommt. */

	/* Animation for scale effect */
	@media (prefers-reduced-motion: reduce) {
		.media-thumbnail,
		.media-thumbnail img,
		.media-thumbnail:hover img,
		.thumbnail-overlay {
			transition: none;
			transform: none;
		}
	}

	/* High contrast mode support */
	@media (prefers-contrast: high) {
		.media-thumbnail {
			border: 1px solid;
		}

		/* Der Schleier wird im Hochkontrast-Modus fast undurchsichtig. Der Wert
		   kommt aus --scrim-surface, nicht als rgba(0,0,0,.9) — es ist derselbe
		   Ton wie beim bg-scrim/60 im Markup, nur dichter, und ein Farbwert
		   gehört auch hier nur einmal ins Projekt (tokens.css). Bis 2026-08-09
		   stand hier ein rohes rgba(): Der Klassen-Scan konnte es strukturell
		   nicht melden, weil in einer CSS-Deklaration keine Klasse steht. Genau
		   dafür gibt es jetzt e2e/helpers/bannedCss.ts. */
		.media-thumbnail:hover .thumbnail-overlay {
			background-color: color-mix(in oklab, var(--scrim-surface) 90%, transparent);
		}
	}

	/* Mobile optimizations */
	@media (max-width: 640px) {
		.media-thumbnail {
			min-height: 100px;
		}
	}
</style>

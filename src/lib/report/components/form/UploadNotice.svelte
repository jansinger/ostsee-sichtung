<script lang="ts">
	/**
	 * Transparenzhinweis an jeder Dropzone: Die Datei wird sofort übertragen,
	 * eine nicht abgeschickte Meldung wird befristet aufgeräumt, über die
	 * Veröffentlichung entscheidet der Melder gesondert.
	 *
	 * Wortlaut und Begründung: $lib/form/consent/uploadNotice
	 *
	 * Der Hinweis stand bis zum 2026-08-02 als Dauer-Alert unter beiden
	 * Dropzones. Auf Schritt 1 kostete das rund 150 px zwischen Foto-Auslöser
	 * und Hero-Karte — die Karte begann auf einem 812-px-Gerät erst unterhalb
	 * des Falzes. Er liegt deshalb jetzt eine Ebene tiefer, in einem Dialog
	 * hinter einer beschrifteten Zeile.
	 *
	 * Das ist die mehrstufige Darstellung, die die Transparenz-Leitlinien zu
	 * Art. 12/13 DSGVO ausdrücklich vorsehen — sie trägt aber nur, solange der
	 * Auslöser unmittelbar an der Dropzone steht, als Datenschutzhinweis
	 * beschriftet ist und der Wortlaut im Dialog **unverkürzt** erscheint. Eine
	 * „kurze Zusammenfassung" an der Dropzone wäre keine Verbesserung, sondern
	 * eine zweite, abweichende Aussage. Festgehalten in `UploadNotice.svelte.test.ts`.
	 */
	import Icon from '$lib/components/Icon.svelte';
	import { UPLOAD_NOTICE } from '$lib/form/consent/uploadNotice';

	// Die Komponente steht zweimal im Formular (Schritt 1 und Schritt 3). Eine
	// feste ID wäre im DOM doppelt und machte `aria-labelledby` unbrauchbar.
	const titleId = $props.id();

	let dialogElement = $state<HTMLDialogElement | null>(null);
</script>

<!-- `btn-ghost`, nicht `link`: Die 44px-Trefferfläche kommt aus dem zentralen
     Touch-Target-Block in `app.css`, und der greift auf `.btn`. Ein Textlink
     müsste sie an der Aufrufstelle nachbauen. -->
<button
	type="button"
	class="btn btn-ghost btn-sm text-base-content/70 gap-2 px-2 font-normal"
	onclick={() => dialogElement?.showModal()}
	data-testid="upload-notice-trigger"
>
	<Icon icon="lucide:info" width="16" class="shrink-0" aria-hidden="true" />
	<!-- Kurz genug für eine Zeile: In der iframe-Einbettung (schmalere Spalte)
	     brach „Datenschutzhinweis zum Upload" um. Worum es geht, sagt der
	     Dialogtitel. -->
	<span>Datenschutzhinweis</span>
</button>

<dialog
	bind:this={dialogElement}
	class="modal"
	aria-labelledby={titleId}
	data-testid="upload-notice-dialog"
>
	<div class="modal-box">
		<h3 id={titleId} class="flex items-center gap-2 text-lg font-bold">
			<Icon icon="lucide:info" width="20" class="text-info-strong shrink-0" aria-hidden="true" />
			Was mit Ihrer Aufnahme passiert
		</h3>
		<p class="mt-3 text-sm">{UPLOAD_NOTICE}</p>
		<div class="modal-action">
			<button
				type="button"
				class="btn btn-outline"
				onclick={() => dialogElement?.close()}
				data-testid="upload-notice-close"
			>
				Verstanden
			</button>
		</div>
	</div>
	<!-- DaisyUI zeigt für Schließen-Elemente `<form method="dialog">`. Das geht
	     hier NICHT: Beide Aufrufstellen liegen im `<form>` aus `Form.svelte`, und
	     ein verschachteltes Formular ist in HTML unzulässig. Svelte meldet das im
	     SSR als `node_invalid_placement_ssr`, und der Parser verwirft das innere
	     Element — das `</form>` beendet dabei das Sichtungsformular vorzeitig, vor
	     der Hydration verlieren Bedienelemente darunter ihre Zugehörigkeit.
	     `close()` tut dasselbe ohne Formular; Escape schließt weiterhin nativ.
	     Gleiche Lösung wie in `fields/SpeciesIdentificationHelp.svelte`. -->
	<button
		type="button"
		class="modal-backdrop"
		onclick={() => dialogElement?.close()}
		aria-label="Hinweis schließen"
	></button>
</dialog>

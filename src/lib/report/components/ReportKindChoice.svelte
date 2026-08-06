<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import {
		REPORT_KIND_PARAM,
		reportKindToParam,
		resolveReportKind,
		type ReportKind
	} from '$lib/report/reportKind';
	import { isNotIFrame } from '$lib/utils/client/isNotIFrame';
	import { scrollToElement } from '$lib/utils/fieldNavigation';

	let {
		onchoose,
		// B7 (Abschlussreview): `false` per Default — beim allerersten
		// Seitenaufruf (keine vorherige Formularansicht) ist diese Seite kein
		// „Wechsel", ein Fokus-Sprung dorthin verschöbe für Tastaturnutzer nur den
		// ersten Tab-Stopp hinter die Navigation, ohne Nutzen. `+page.svelte`
		// setzt das Prop gezielt nur für den Rücksprung aus dem Formular (Ändern,
		// Reset, Browser-Zurück).
		autofocusHeading = false
	}: { onchoose: (kind: ReportKind) => void; autofocusHeading?: boolean } = $props();

	/**
	 * UX-Review (2026-08-06, Punkt 1): Steht auf `true`, sobald einmal ohne
	 * Auswahl bestätigt wurde. Ersetzt die frühere `aria-disabled`-Sperre am
	 * „Weiter"-Knopf, die zwei Wege still ins Leere laufen ließ — Begründung an
	 * der Aufrufstelle des Knopfes unten.
	 */
	let selectionMissing = $state(false);
	let legendEl: HTMLElement | undefined = $state();

	/*
	 * Die Radios heißen wie der Query-Parameter der Seite (`REPORT_KIND_PARAM`)
	 * und tragen dessen deutsche Werte (`reportKindToParam`). Warum das ein
	 * Vertrag und keine Kosmetik ist, steht an der Konstante in `reportKind.ts`.
	 *
	 * Zwei Dinge, die dieser Weg NICHT leistet:
	 *
	 * 1. **Bestehende Query-Parameter überleben ihn nicht** — ein GET-Submit
	 *    ersetzt die gesamte Query. `choose()` in `+page.svelte` hält sie im
	 *    JS-Pfad erhalten (Kampagnen-Marker aus einem Museums-Link); ohne JS
	 *    bräuchte es dafür je ein verstecktes Feld, dessen Wert nur
	 *    `$app/state` kennt.
	 * 2. **Ohne Auswahl bleibt er stumm.** Vor der Hydration führt „Weiter"
	 *    ohne angekreuzte Option zu `/?` — einem vollständigen Reload ohne
	 *    Erklärung statt der Meldung unten. Ein `required` an den Radios löste
	 *    das nativ, verdrängte aber im JS-Pfad die eigene Meldung durch die
	 *    Browser-Blase, die nicht barrierefrei ist und nicht stehen bleibt. Der
	 *    Zielkonflikt ist zugunsten des JS-Pfads entschieden: Er ist der
	 *    Regelfall, der andere ein Zeitfenster von Sekunden.
	 *
	 * Beides ist bewusst in Kauf genommen — auf diesem Weg passierte vorher
	 * überhaupt nichts (der Knopf war per `pointer-events: none` unerreichbar).
	 */

	/**
	 * B7: „Ändern" tauschte bislang den gesamten Formularbaum gegen diese Seite
	 * aus, ohne den Fokus mitzunehmen — er fiel auf `<body>`, angesagt wurde
	 * nichts. Dieselbe Mechanik wie beim Schrittwechsel (`scrollAndFocusStep` in
	 * `form/StepNavigation.svelte`): Kopf des neuen Inhalts fokussieren.
	 *
	 * Fokussiert wird die `<legend>`, nicht die `<h1>` darüber — die
	 * Überschrift ist im iframe bewusst ausgeblendet (siehe unten), die Legend
	 * dagegen immer vorhanden. Anders als bei den Formular-Schritten braucht es
	 * kein `requestAnimationFrame`: Diese Komponente ist beim ersten Lauf des
	 * Effekts bereits vollständig gerendert, es gibt keinen „alten Inhalt", der
	 * noch im Weg stehen könnte.
	 */
	$effect(() => {
		if (!autofocusHeading || !legendEl) return;
		scrollToElement(legendEl);
		legendEl.setAttribute('tabindex', '-1');
		legendEl.focus({ preventScroll: true });
	});

	/**
	 * Die Auswahl wird aus dem abgeschickten Formular gelesen, nicht aus einem
	 * eigenen `$state`. Der Grund ist derselbe wie beim Feldnamen oben: Wer vor
	 * der Hydration eine Option ankreuzt, tut das im DOM — ein `$state` wüsste
	 * davon nichts und meldete danach „nichts gewählt", obwohl sichtbar etwas
	 * angekreuzt ist.
	 *
	 * `resolveReportKind(param, null, null)` ist hier die Parameter-Zuordnung
	 * ohne Storage-Quellen — dieselbe Aufrufform wie im `popstate`-Handler in
	 * `+page.svelte`.
	 */
	function submit(event: SubmitEvent & { currentTarget: HTMLFormElement }): void {
		event.preventDefault();

		const submitted = new FormData(event.currentTarget).get(REPORT_KIND_PARAM);
		const chosen = resolveReportKind(typeof submitted === 'string' ? submitted : null, null, null);

		if (!chosen) {
			selectionMissing = true;
			// Fokus zur Gruppe, zu der die Meldung gehört — er stünde sonst auf dem
			// Knopf, und ein Screenreader-Nutzer müsste rückwärts suchen, was
			// beanstandet wird. Das Fokussieren eines Radios wählt es nicht aus.
			event.currentTarget.querySelector<HTMLInputElement>('input[type="radio"]')?.focus();
			return;
		}

		selectionMissing = false;
		onchoose(chosen);
	}

	const OPTIONS: Array<{ value: ReportKind; label: string; hint: string; icon: string }> = [
		{
			value: 'alive',
			label: 'Beobachtung eines lebenden Tieres',
			hint: 'Sie haben ein Tier im Wasser oder an Land gesehen.',
			icon: 'custom:porpoise'
		},
		{
			value: 'dead',
			label: 'Fund eines toten Tieres',
			hint: 'Sie haben ein totes Tier gefunden, meist an einem Strand oder Küstenabschnitt.',
			icon: 'lucide:triangle-alert'
		}
	];
</script>

<form class="mx-auto max-w-2xl px-4 py-8" onsubmit={submit} data-testid="report-kind-choice">
	{#if isNotIFrame}
		<!-- Nur außerhalb des meeresmuseum.de-iframe: Die Museumsseite trägt dort
		     ihre eigene Überschrift „Meerestier melden" — dieselbe Bedingung wie
		     an der (bewusst unterdrückten) Formular-Überschrift in
		     `ModernReportForm.svelte`. Ohne sie sah ein eingebetteter Besucher den
		     Titel doppelt, und der Höhensprung beim Wechsel zu Schritt 1 (dort
		     bereits unterdrückt) fiel größer aus (Abschlussreview, Politur). -->
		<h1 class="text-display mb-2">Meerestier melden</h1>
	{/if}
	<!-- Beantwortet die naheliegende Frage „warum werde ich das gefragt?" genau
	     dort, wo sie anfällt — das ist die Begründung für den zusätzlichen Klick. -->
	<p class="text-base-content/70 mb-6">Damit wir Ihnen die passenden Fragen stellen können.</p>

	<!-- role="radiogroup" überschreibt die implizite Rolle `group` des fieldset:
	     nur so sagt ein Screenreader „1 von 2" an und verknüpft die Legend mit
	     den Optionen. Gleiche Mechanik wie in FieldRenderer.svelte. -->
	<!-- aria-invalid und aria-describedby tragen die Gruppe, nicht die einzelnen
	     Radios — aber aus zwei verschiedenen Gründen, die sich leicht
	     verwechseln lassen:

	     `aria-invalid` MUSS hierher: ARIA 1.2 hat es (wie `aria-required`) aus
	     den globalen Zuständen entfernt, `role="radio"` unterstützt es seither
	     nicht (design-system.md, A11y-Minima). `aria-describedby` ist dagegen
	     weiterhin global und stünde an einem Radio nicht falsch — es steht
	     hier, weil die Meldung die GRUPPE beanstandet und nicht eine der beiden
	     Optionen. Dasselbe Muster wie in FieldRenderer.svelte. -->
	<fieldset
		role="radiogroup"
		aria-labelledby="report-kind-legend"
		aria-required="true"
		aria-invalid={selectionMissing ? 'true' : undefined}
		aria-describedby={selectionMissing ? 'report-kind-error' : undefined}
	>
		<legend id="report-kind-legend" class="text-section mb-3" bind:this={legendEl}
			>Was möchten Sie melden?</legend
		>

		<div class="flex flex-col gap-3">
			{#each OPTIONS as option (option.value)}
				<label
					class="border-base-300 hover:bg-base-200 rounded-box flex cursor-pointer items-start gap-3 border p-4"
				>
					<input
						type="radio"
						name={REPORT_KIND_PARAM}
						class="radio radio-primary mt-1"
						value={reportKindToParam(option.value)}
						onchange={() => (selectionMissing = false)}
					/>
					<span class="flex flex-col gap-1">
						<span class="flex items-center gap-2 font-medium">
							<Icon icon={option.icon} width="20" aria-hidden="true" />
							{option.label}
						</span>
						<span class="text-base-content/70 text-support">{option.hint}</span>
					</span>
				</label>
			{/each}
		</div>

		<!-- Gleiche Fehler-Optik wie an jedem Formularfeld (FieldRenderer.svelte),
		     damit die Meldung hier nicht wie ein Fremdkörper aussieht. -->
		{#if selectionMissing}
			<div id="report-kind-error" class="mt-3 text-left" role="alert" aria-live="polite">
				<span class="text-error text-support flex items-center gap-1 font-medium">
					<Icon icon="lucide:triangle-alert" width="14" class="text-error flex-shrink-0" />
					Bitte wählen Sie aus, was Sie melden möchten.
				</span>
			</div>
		{/if}
	</fieldset>

	<!-- Kein `aria-disabled` (und erst recht kein `disabled`): Eine gesperrte
	     Schaltfläche sagte nicht, was fehlt. DaisyUI legt an
	     `.btn[aria-disabled=true]` ein `pointer-events: none` — vor der Hydration
	     erreichte ein Klick das Element damit gar nicht, und per Tastatur lief das
	     Enter durch, ohne dass der stille Wächter in `submit` etwas meldete
	     (UX-Review 2026-08-06, Punkt 1). Die Sperre ist jetzt die Meldung an der
	     Radiogruppe oben. -->
	<button type="submit" class="btn btn-primary mt-6 w-full" data-testid="report-kind-submit">
		Weiter
	</button>
</form>

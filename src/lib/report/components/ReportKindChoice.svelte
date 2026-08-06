<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { ReportKind } from '$lib/report/reportKind';
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

	let selected = $state<ReportKind | null>(null);
	let legendEl: HTMLElement | undefined = $state();

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

	function submit(event: SubmitEvent): void {
		event.preventDefault();
		if (!selected) return;
		onchoose(selected);
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
	<fieldset role="radiogroup" aria-labelledby="report-kind-legend" aria-required="true">
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
						name="reportKind"
						class="radio radio-primary mt-1"
						value={option.value}
						checked={selected === option.value}
						onchange={() => (selected = option.value)}
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
	</fieldset>

	<!-- aria-disabled statt disabled: Die Schaltfläche bleibt fokussierbar, der
	     Tastaturfokus geht beim Sperren nicht verloren. Die Sperre trägt der
	     Wächter in `submit`. -->
	<button
		type="submit"
		class="btn btn-primary mt-6 w-full"
		aria-disabled={selected === null}
		data-testid="report-kind-submit"
	>
		Weiter
	</button>
</form>

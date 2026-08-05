<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { ReportKind } from '$lib/report/reportKind';

	let { onchoose }: { onchoose: (kind: ReportKind) => void } = $props();

	let selected = $state<ReportKind | null>(null);

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
	<h1 class="text-title mb-2">Meerestier melden</h1>
	<!-- Beantwortet die naheliegende Frage „warum werde ich das gefragt?" genau
	     dort, wo sie anfällt — das ist die Begründung für den zusätzlichen Klick. -->
	<p class="text-base-content/70 mb-6">Damit wir Ihnen die passenden Fragen stellen können.</p>

	<!-- role="radiogroup" überschreibt die implizite Rolle `group` des fieldset:
	     nur so sagt ein Screenreader „1 von 2" an und verknüpft die Legend mit
	     den Optionen. Gleiche Mechanik wie in FieldRenderer.svelte. -->
	<fieldset role="radiogroup" aria-labelledby="report-kind-legend" aria-required="true">
		<legend id="report-kind-legend" class="text-section mb-3">Was möchten Sie melden?</legend>

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

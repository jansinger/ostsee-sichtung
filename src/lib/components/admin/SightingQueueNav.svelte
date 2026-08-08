<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { queueHref, type SightingQueue } from './sightingQueue';

	interface Props {
		queue: SightingQueue | null;
		queueFailed: boolean;
		order: 'asc' | 'desc';
	}

	let { queue, queueFailed, order }: Props = $props();

	let prevHref = $derived(queue?.prev ? queueHref(queue.prev, order) : null);
	let nextHref = $derived(queue?.next ? queueHref(queue.next, order) : null);
	let zaehler = $derived(
		queue
			? queue.position
				? `${queue.position} von ${queue.total} offen`
				: `${queue.total} offen`
			: ''
	);
</script>

{#if queueFailed || queue}
	<!-- `queue === null && !queueFailed` rendert nichts: Die Komponente ist
	     zustandslos und wird nur mit einer geladenen oder einer fehlgeschlagenen
	     Warteschlange aufgerufen — ein dritter, „noch nicht geladen"-Zustand
	     würde sonst wie zwei gesperrte Enden plus leerer Zähler aussehen, also
	     genau wie das „abgearbeiteter Stapel"-Bild, gegen das der Fehlerzweig
	     unten antritt. -->
	<nav
		class="bg-base-200 rounded-box flex items-center justify-between gap-2 p-2"
		aria-label="Offene Sichtungen"
	>
		{#if queueFailed}
			<!-- Ein Fehlschlag ist nicht „Stapel zu Ende": Die Leiste sagt ausdrücklich,
			     dass die Position unbekannt ist, statt leere Knöpfe zu zeigen, die wie
			     ein abgearbeiteter Stapel aussähen. -->
			<p class="text-base-content/70 text-support w-full text-center">
				<Icon icon="lucide:unlink" class="mr-1 inline h-4 w-4" aria-hidden="true" />
				Warteschlange nicht geladen — Position unbekannt
			</p>
		{:else}
			{#if prevHref}
				<a class="btn btn-ghost btn-sm" href={prevHref} data-sveltekit-preload-data="hover">
					<Icon icon="lucide:chevron-left" class="h-4 w-4" aria-hidden="true" />
					Vorherige
				</a>
			{:else}
				<!-- Kein Knopf-Attrappe: An einem `.btn` legt DaisyUI auf `aria-disabled=true`
				     `pointer-events: none` — Hover, `title` und der Mausweg wären komplett
				     stumm, und ein `role="button"` ohne Handler bekäme trotzdem einen
				     Tab-Stopp ohne Aussage. Das Stapelende hat dagegen etwas zu sagen
				     („erste offene Sichtung"), das „17 von 653 offen" allein nicht ausdrückt
				     — deshalb reiner Text statt Attrappe, ohne Tab-Stopp. -->
				<span class="text-base-content/70 text-support inline-flex items-center gap-1">
					<Icon icon="lucide:chevron-left" class="h-4 w-4" aria-hidden="true" />
					Erste offene Sichtung
				</span>
			{/if}

			<p class="text-base-content/70 text-support">{zaehler}</p>

			{#if nextHref}
				<a class="btn btn-ghost btn-sm" href={nextHref} data-sveltekit-preload-data="hover">
					Nächste
					<Icon icon="lucide:chevron-right" class="h-4 w-4" aria-hidden="true" />
				</a>
			{:else}
				<span class="text-base-content/70 text-support inline-flex items-center gap-1">
					Letzte offene Sichtung
					<Icon icon="lucide:chevron-right" class="h-4 w-4" aria-hidden="true" />
				</span>
			{/if}
		{/if}
	</nav>
{/if}

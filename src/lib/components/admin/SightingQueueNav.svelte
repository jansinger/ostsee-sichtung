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

<nav
	class="bg-base-200 mb-4 flex items-center justify-between gap-2 rounded-lg p-2"
	aria-label="Offene Sichtungen"
>
	{#if queueFailed}
		<!-- Ein Fehlschlag ist nicht „Stapel zu Ende": Die Leiste sagt ausdrücklich,
		     dass die Position unbekannt ist, statt leere Knöpfe zu zeigen, die wie
		     ein abgearbeiteter Stapel aussähen. -->
		<p class="text-base-content/70 text-support w-full text-center" role="status">
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
			<!-- `aria-disabled` statt `disabled`: Das Ende des Stapels darf den Fokus
			     nicht verwerfen, während jemand per Tastatur arbeitet. -->
			<span class="btn btn-ghost btn-sm" aria-disabled="true" role="button" tabindex="0">
				<Icon icon="lucide:chevron-left" class="h-4 w-4" aria-hidden="true" />
				Vorherige
			</span>
		{/if}

		<p class="text-base-content/70 text-support" aria-live="polite">{zaehler}</p>

		{#if nextHref}
			<a class="btn btn-ghost btn-sm" href={nextHref} data-sveltekit-preload-data="hover">
				Nächste
				<Icon icon="lucide:chevron-right" class="h-4 w-4" aria-hidden="true" />
			</a>
		{:else}
			<span class="btn btn-ghost btn-sm" aria-disabled="true" role="button" tabindex="0">
				Nächste
				<Icon icon="lucide:chevron-right" class="h-4 w-4" aria-hidden="true" />
			</span>
		{/if}
	{/if}
</nav>

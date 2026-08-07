<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import SightingInboxCard from '$lib/components/admin/SightingInboxCard.svelte';
	import { submitVerdict, type SightingVerdict } from '$lib/components/admin/inboxVerdict';
	import { onDestroy } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import ArrowDown from '~icons/lucide/arrow-down';
	import ArrowUp from '~icons/lucide/arrow-up';
	import Info from '~icons/lucide/info';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	/* Erledigte Sichtungen: id → Verdict. Die Karte bleibt 8 s als Undo-Zeile
	   stehen — billiger als ein Bestätigungsdialog vor jeder Aktion, und ein
	   Fehlklick ist folgenlos korrigierbar (reset stellt alle Spalten zurück). */
	let done = $state<Record<number, SightingVerdict>>({});
	let busy = $state<Record<number, boolean>>({});
	const timers = new SvelteMap<number, ReturnType<typeof setTimeout>>();
	const UNDO_MS = 8000;

	/* Der Zähler kommt je nach Treiber als String aus `count(*)` — ohne Number()
	   vergleicht `>` lexikografisch ("9" > "50"). */
	const openTotal = $derived(Number(data.openTotal));

	onDestroy(() => {
		// Ohne dieses Aufräumen feuert ein laufender Undo-Timer nach dem Verlassen
		// der Seite noch invalidateAll() und lädt fremde Routen neu.
		for (const timer of timers.values()) clearTimeout(timer);
		timers.clear();
	});

	async function entscheiden(id: number, verdict: Exclude<SightingVerdict, 'reset'>) {
		if (busy[id]) return;
		busy[id] = true;
		const ok = await submitVerdict(id, verdict);
		busy[id] = false;
		if (!ok) return;
		done[id] = verdict;
		timers.set(
			id,
			setTimeout(() => {
				timers.delete(id);
				// Endgültig aus der Liste — Server-Daten neu laden hält den Zähler frisch.
				invalidateAll();
			}, UNDO_MS)
		);
	}

	async function rueckgaengig(id: number) {
		if (busy[id]) return;
		const timer = timers.get(id);
		if (timer) clearTimeout(timer);
		timers.delete(id);
		busy[id] = true;
		const ok = await submitVerdict(id, 'reset');
		busy[id] = false;
		if (ok) delete done[id];
	}

	function sortierungUmschalten() {
		const ziel = data.order === 'asc' ? 'desc' : 'asc';
		const url = new URL(page.url);
		url.searchParams.set('order', ziel);
		goto(url, { keepFocus: true, noScroll: true });
	}
</script>

<svelte:head>
	<title>Eingang – Verwaltung</title>
</svelte:head>

<div class="container mx-auto max-w-3xl px-4 py-6">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-2xl font-bold">
			Eingang
			<span class="badge badge-outline align-middle">{openTotal} offen</span>
		</h1>
		<button type="button" class="btn btn-ghost btn-sm" onclick={sortierungUmschalten}>
			{#if data.order === 'asc'}
				<ArrowUp width="16" height="16" /> Älteste zuerst
			{:else}
				<ArrowDown width="16" height="16" /> Neueste zuerst
			{/if}
		</button>
	</div>

	{#if data.pendingPhotoAnnouncements > 0}
		<div class="alert alert-info mb-4">
			<Info width="20" height="20" class="shrink-0" aria-hidden="true" />
			<span>
				{data.pendingPhotoAnnouncements} Meldung(en) mit angekündigtem, noch fehlendem Foto —
				<a class="link" href="/admin/sichtungen?mediaUpload=announced_missing">zur Tabelle</a>
			</span>
		</div>
	{/if}

	{#if data.open.length === 0}
		<div class="border-base-300 rounded-lg border border-dashed p-10 text-center">
			<p class="text-lg font-medium">Alles erledigt</p>
			<p class="text-base-content/70 mt-1 text-sm">Keine offenen Sichtungen.</p>
		</div>
	{:else}
		<ul class="flex flex-col gap-3">
			{#each data.open as sighting (sighting.id)}
				<li>
					{#if done[sighting.id]}
						<div class="alert py-2" role="status">
							<span>
								Sichtung #{sighting.id}
								{done[sighting.id] === 'approve' ? 'freigegeben' : 'abgelehnt'}.
							</span>
							<button
								type="button"
								class="btn btn-ghost btn-sm"
								disabled={busy[sighting.id]}
								onclick={() => rueckgaengig(sighting.id)}
							>
								Rückgängig
							</button>
						</div>
					{:else}
						<SightingInboxCard
							{sighting}
							images={data.imagesBySighting[sighting.id] ?? []}
							busy={busy[sighting.id] ?? false}
							onApprove={() => entscheiden(sighting.id, 'approve')}
							onReject={() => entscheiden(sighting.id, 'reject')}
						/>
					{/if}
				</li>
			{/each}
		</ul>
		{#if openTotal > data.open.length}
			<p class="text-base-content/70 mt-4 text-center text-sm">
				{data.open.length} von {openTotal} offenen Sichtungen angezeigt — die Liste füllt sich beim Abarbeiten
				nach.
			</p>
		{/if}
	{/if}
</div>

<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import InboxShortcutHelp from '$lib/components/admin/InboxShortcutHelp.svelte';
	import SightingInboxCard from '$lib/components/admin/SightingInboxCard.svelte';
	import {
		nextActionableIndex,
		resolveInboxShortcut,
		shiftFocusIndex
	} from '$lib/components/admin/inboxShortcuts';
	import { submitVerdict, type SightingVerdict } from '$lib/components/admin/sightingVerdict';
	import {
		SIGHTING_STATUS_PRESENTATION,
		SIGHTING_STATUS_UNDO_MS,
		verdictToStatus
	} from '$lib/components/admin/sightingStatus';
	import { onDestroy, tick } from 'svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
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
	/* Undo-Fenster abgelaufen, aber noch nicht durch einen Reload bestätigt.
	   Getrennt von `done`, weil ein Aufräumen von `done[id]` die Karte sofort
	   zurückholen würde — die Sichtung steht bis zum Reload weiter in
	   `data.open`. Erst nach dem Reload ist der Server die Wahrheit. */
	const abgelaufen = new SvelteSet<number>();

	/* Tastatur-Triage (Spec B1). Die Fokusposition ist ein Index und keine ID:
	   Nachrücken heißt „die nächste Karte in der Liste", und das ist eine Aussage
	   über Positionen. Die Zuordnung Taste → Aktion und die Fokusarithmetik
	   stehen in `inboxShortcuts.ts`. */
	let fokusIndex = $state<number | null>(null);
	let hilfeOffen = $state(false);
	/* Die letzte Entscheidung für U. Sie wird auch beim Klick gesetzt — wer mit
	   der Maus freigibt und die Korrektur per Taste sucht, findet sie damit. */
	let letzteEntscheidungId = $state<number | null>(null);
	/* `$state` und nicht ein einfaches Array: `bind:this` in ein nicht-reaktives
	   Array schreibt zwar, warnt aber zur Laufzeit (`binding_property_non_reactive`)
	   — und die Zuweisung wäre nicht nachvollziehbar, wenn die Liste sich ändert. */
	let kartenElemente = $state<(HTMLLIElement | null)[]>([]);

	/** Welche Positionen noch eine Entscheidung brauchen — Grundlage des Nachrückens. */
	const bedienbar = $derived(
		data.open.map((sighting) => !done[sighting.id] && !abgelaufen.has(sighting.id))
	);

	async function fokussiere(index: number | null) {
		fokusIndex = index;
		if (index === null) return;
		// Erst nach dem Rendern: Nach einer Entscheidung wechselt die Zielkarte
		// gerade ihren Inhalt, und ein Fokus davor landet am alten Knoten.
		await tick();
		kartenElemente[index]?.focus();
	}

	async function entscheidenPerTaste(verdict: Exclude<SightingVerdict, 'reset'>) {
		const index = fokusIndex;
		if (index === null) return;
		const sichtung = data.open[index];
		if (!sichtung || !bedienbar[index]) return;
		await entscheiden(sichtung.id, verdict);
		/* Nachrücken erst nach dem Abschluss und über `bedienbar`: Scheitert der
		   Aufruf, ist die Karte weiter offen — `nextActionableIndex` liefert dann
		   dieselbe Position, und der Fokus bleibt, wo die Arbeit liegt. */
		await fokussiere(nextActionableIndex(bedienbar, index));
	}

	async function rueckgaengigPerTaste() {
		const id = letzteEntscheidungId;
		// Nur innerhalb des Undo-Fensters: Ist der Timer weg, ist die Zeile weg,
		// und ein `reset` würde einen Zustand herstellen, den niemand mehr sieht.
		if (id === null || !timers.has(id)) return;
		await rueckgaengig(id);
		const index = data.open.findIndex((sighting) => sighting.id === id);
		if (index >= 0) await fokussiere(index);
	}

	function aufTaste(event: KeyboardEvent) {
		const aktion = resolveInboxShortcut(event);
		if (!aktion) return;
		if (aktion === 'closeHelp') {
			// Nur schlucken, wenn es etwas zu schließen gab — sonst nimmt die Seite
			// Escape anderen Bedienelementen weg.
			if (!hilfeOffen) return;
			event.preventDefault();
			hilfeOffen = false;
			return;
		}
		event.preventDefault();
		switch (aktion) {
			case 'focusNext':
				void fokussiere(shiftFocusIndex(fokusIndex, data.open.length, 1));
				return;
			case 'focusPrevious':
				void fokussiere(shiftFocusIndex(fokusIndex, data.open.length, -1));
				return;
			case 'approve':
				void entscheidenPerTaste('approve');
				return;
			case 'reject':
				void entscheidenPerTaste('reject');
				return;
			case 'undo':
				void rueckgaengigPerTaste();
				return;
			case 'toggleHelp':
				hilfeOffen = !hilfeOffen;
				return;
		}
	}

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
		letzteEntscheidungId = id;
		timers.set(
			id,
			setTimeout(async () => {
				timers.delete(id);
				abgelaufen.add(id);
				/* Nur nachladen, wenn kein Undo-Fenster mehr offen ist: `invalidateAll`
				   baut die Liste neu auf und schnitte sonst die noch laufenden Fenster
				   anderer Sichtungen ab (freigeben A, 3 s später B → bei t=8 s wäre
				   B's Undo-Zeile nach 5 s statt 8 s weg). Spart nebenbei die
				   Mehrfach-Reloads beim schnellen Abarbeiten. */
				if (timers.size > 0) return;
				// Endgültig aus der Liste — Server-Daten neu laden hält den Zähler frisch.
				await invalidateAll();
				/* Nach dem Reload sind die abgearbeiteten IDs aus `data.open` heraus;
				   die Merker dürfen weg. Taucht eine ID wider Erwarten wieder auf,
				   erscheint sie so als Karte und nicht als tote Undo-Zeile. */
				for (const erledigteId of abgelaufen) {
					delete done[erledigteId];
					delete busy[erledigteId];
				}
				abgelaufen.clear();
			}, SIGHTING_STATUS_UNDO_MS)
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
		if (!ok) return;
		delete done[id];
		// Zurückgenommen ist nichts mehr zurückzunehmen — ein zweites U darf nicht
		// dieselbe Sichtung erneut zurücksetzen.
		if (letzteEntscheidungId === id) letzteEntscheidungId = null;
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

<svelte:window onkeydown={aufTaste} />

<div class="container mx-auto max-w-3xl px-4 py-6">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-2xl font-bold">
			Eingang
			<span class="badge badge-outline align-middle">{data.openTotal} offen</span>
		</h1>
		<button type="button" class="btn btn-ghost btn-sm" onclick={sortierungUmschalten}>
			{#if data.order === 'asc'}
				<ArrowUp width="16" height="16" aria-hidden="true" /> Älteste zuerst
			{:else}
				<ArrowDown width="16" height="16" aria-hidden="true" /> Neueste zuerst
			{/if}
		</button>
	</div>

	<!-- Der Hinweis steht über der Liste und nicht in einem Tooltip: Ein Kürzel,
	     das man erst durch Ausprobieren findet, benutzt niemand. Die Taste selbst
	     ist die Beschriftung des Knopfes, damit Hinweis und Overlay dieselbe
	     Bedienung nennen. -->
	<p class="text-base-content/70 mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
		<span>
			Tastatur: <kbd class="kbd kbd-sm">J</kbd> / <kbd class="kbd kbd-sm">K</kbd> blättern,
			<kbd class="kbd kbd-sm">A</kbd> freigeben, <kbd class="kbd kbd-sm">R</kbd> ablehnen
		</span>
		<button type="button" class="btn btn-ghost btn-xs" onclick={() => (hilfeOffen = true)}>
			alle Kürzel <kbd class="kbd kbd-xs">?</kbd>
		</button>
	</p>

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
			{#each data.open as sighting, index (sighting.id)}
				{@const verdict = done[sighting.id]}
				{#if !abgelaufen.has(sighting.id)}
					<!-- `tabindex="-1"` macht die Karte für J/K anfokussierbar, ohne sie in
					     die Tab-Reihenfolge zu hängen — dort stehen die Schaltflächen
					     darin, und ein zusätzlicher Halt vor jeder Karte verdoppelte den
					     Weg für alle, die ohne die Kürzel arbeiten. -->
					<li
						bind:this={kartenElemente[index]}
						data-inbox-index={index}
						tabindex="-1"
						class="inbox-card"
					>
						{#if verdict}
							{@const status = SIGHTING_STATUS_PRESENTATION[verdictToStatus(verdict)]}
							<div class="alert py-2" role="status">
								<span>
									Sichtung #{sighting.id}
									<span class="badge {status.badgeClass}">
										{status.label}
									</span>
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
								duplicates={data.duplicatesBySighting[sighting.id] ?? []}
								busy={busy[sighting.id] ?? false}
								onApprove={() => entscheiden(sighting.id, 'approve')}
								onReject={() => entscheiden(sighting.id, 'reject')}
							/>
						{/if}
					</li>
				{/if}
			{/each}
		</ul>
		{#if data.openTotal > data.open.length}
			<p class="text-base-content/70 mt-4 text-center text-sm">
				{data.open.length} von {data.openTotal} offenen Sichtungen angezeigt — die Liste füllt sich beim
				Abarbeiten nach.
			</p>
		{/if}
	{/if}
</div>

{#if hilfeOffen}
	<InboxShortcutHelp onClose={() => (hilfeOffen = false)} />
{/if}

<style>
	/* Der Fokus-Ring gehört an die Karte selbst: Bei J/K ist sie das bewegte
	   Element, und ohne sichtbaren Ring wüsste niemand, welche Meldung ein
	   folgendes A entscheidet. Maße und Farbe aus den Tokens. */
	.inbox-card:focus-visible {
		outline: 3px solid var(--color-primary);
		outline-offset: 3px;
		border-radius: var(--radius-box);
	}
</style>

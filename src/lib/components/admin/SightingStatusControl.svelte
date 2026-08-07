<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import {
		SIGHTING_STATUS_ORDER,
		SIGHTING_STATUS_PRESENTATION,
		type SightingStatus
	} from './sightingStatus';
	import type { SightingVerdict } from './sightingVerdict';

	interface Props {
		status: SightingStatus;
		/** Macht den Gruppennamen eindeutig — mehrere Controls je Seite. */
		sightingId: number;
		busy?: boolean;
		/** `sm` für die Tabellenspalte (nur Icons), `md` für Karten und Detailansicht. */
		size?: 'sm' | 'md';
		/**
		 * Zusätzliche Eindeutigkeit für den Gruppennamen, wenn dieselbe Sichtung
		 * gleichzeitig in zwei Layouts im DOM steht (`/admin/sichtungen`:
		 * Mobilkarte UND Desktop-Tabelle, nur per CSS getrennt). HTML-Radios mit
		 * demselben `name` bilden EINE Auswahlgruppe über das ganze Dokument,
		 * unabhängig vom umschließenden `fieldset` — ohne diesen Zusatz hob das
		 * später gerenderte Control (die Tabelle) den `checked`-Zustand der
		 * Mobilkarte silent auf. Aufgefallen an
		 * `statusColumn.svelte.test.ts`, das dieselbe Sichtung in beiden
		 * Bereichen prüft.
		 */
		groupSuffix?: string;
		onchange: (verdict: SightingVerdict) => void;
	}

	let {
		status,
		sightingId,
		busy = false,
		size = 'md',
		groupSuffix = '',
		onchange
	}: Props = $props();

	const groupName = $derived(`sighting-status-${sightingId}${groupSuffix}`);

	function select(target: SightingStatus): void {
		/**
		 * Bewusst kein `target === status`-Vergleich: Ein erneuter Klick auf ein
		 * bereits gewähltes Radio feuert in keinem Browser ein `change` — die
		 * Wache wäre über den DOM nie erreichbar. Schlimmer, sie würde nach einem
		 * fehlgeschlagenen Wechsel genau die Korrektur verschlucken: Scheitert
		 * `submitVerdict`, lädt die aufrufende Seite nicht neu, das Radio steht
		 * im DOM auf dem neuen Wert, `status` bleibt auf dem alten — ein Klick auf
		 * das ursprüngliche Segment müsste dann durchgehen.
		 */
		if (busy) return;
		onchange(SIGHTING_STATUS_PRESENTATION[target].verdict);
	}

	/**
	 * Die Flächenfarbe des aktiven Segments. Vollständige Klassennamen statt
	 * `btn-${…}`: Tailwind 4 erzeugt eine Utility nur, wenn ihr Name als
	 * kompletter String im Quelltext steht (`.claude/rules/daisyui.md`).
	 */
	const ACTIVE_CLASS: Record<SightingStatus, string> = {
		open: 'btn-warning',
		approved: 'btn-success',
		rejected: 'btn-neutral'
	};
</script>

<fieldset class="join" aria-labelledby={`${groupName}-legend`} role="radiogroup">
	<legend id={`${groupName}-legend`} class="sr-only">Status</legend>
	{#each SIGHTING_STATUS_ORDER as option (option)}
		{@const presentation = SIGHTING_STATUS_PRESENTATION[option]}
		{@const active = option === status}
		<label
			class="btn join-item {size === 'sm' ? 'btn-sm' : ''} {active
				? ACTIVE_CLASS[option]
				: 'btn-ghost'}"
			title={presentation.description}
		>
			<input
				type="radio"
				class="sr-only"
				name={groupName}
				value={option}
				checked={active}
				disabled={busy}
				aria-label={presentation.label}
				onchange={() => select(option)}
			/>
			<Icon icon={presentation.icon} width="16" aria-hidden="true" />
			{#if size === 'md'}
				<span>{presentation.label}</span>
			{/if}
		</label>
	{/each}
</fieldset>

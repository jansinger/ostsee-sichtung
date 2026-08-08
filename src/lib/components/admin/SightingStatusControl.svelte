<script lang="ts">
	import { untrack } from 'svelte';
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

	/**
	 * Lokaler, beschreibbarer Spiegel des `status`-Props für `bind:group`
	 * unten. Nötig, weil `checked={active}` (ein unkontrolliertes Attribut)
	 * den DOM-Zustand nach einem Advance im Warteschlangen-Modus stehen ließ:
	 * `+page.svelte` springt dort ohne `invalidateAll()` zur nächsten
	 * Sichtung, die Komponente bekommt dieselbe Instanz mit neuer
	 * `sightingId`, aber erneut `status: 'open'` — der Stapel liefert nur
	 * offene Sichtungen. Der berechnete `active`-Wert für das Segment „Offen"
	 * ändert sich dabei NICHT (vorher wie nachher `true`), Svelte löste also
	 * kein DOM-Update aus, und ein zuvor angeklicktes „Freigegeben"-Radio
	 * blieb im DOM `checked` — ein zweiter Klick darauf feuerte danach kein
	 * `change` mehr (Test: „meldet einen zweiten Klick nach einem Advance …").
	 *
	 * `bind:group` erzwingt den DOM-Zustand direkt aus dem gebundenen Wert,
	 * unabhängig davon, ob sich der Wert seit dem letzten Render geändert hat.
	 * Als **beschreibbares** `$derived` bleibt `selected` mit `status`
	 * synchron, sobald sich das Prop ändert (die Zuweisung in `bind:group`
	 * überschreibt es nur bis zur nächsten Neuberechnung) — und genau das
	 * passiert beim Advance immer dann, wenn zuvor tatsächlich etwas anderes
	 * ausgewählt war (die Warteschlange zeigt nie eine bereits entschiedene
	 * Sichtung), der Fall greift also gerade dort, wo die Korrektur nötig ist.
	 *
	 * Alternativen verworfen:
	 *
	 * - Ein **beschreibbares `$derived`** (`let selected = $derived(status)`,
	 *   von der ESLint-Regel `svelte/prefer-writable-derived` vorgeschlagen)
	 *   sieht nach der naheliegenden Wahl aus, hat den reproduzierten Test
	 *   aber **nicht** grün gemacht: Der überschriebene Wert eines
	 *   beschreibbaren `$derived` wird verworfen, sobald die Quelle (`status`)
	 *   als geändert markiert wird — und genau das bleibt aus, wenn der neue
	 *   Wert (`'open'`) gleich dem alten ist, derselbe Vergleichsfehler wie
	 *   beim ursprünglichen `checked={active}`. Ein `$effect`, das `selected`
	 *   unbedingt zuweist, lief dagegen bei jedem Props-Update erneut und hat
	 *   den Test bestanden — deshalb hier bewusst `$state` + `$effect` statt
	 *   der ESLint-Empfehlung.
	 * - Ein `invalidateAll()` auch im Advance-Pfad behöbe nur den Undo-Teil
	 *   (dort navigiert `+page.svelte` ohnehin auf eine andere Route und lädt
	 *   frisch) — der Advance auf eine ebenfalls offene Sichtung bliebe kaputt,
	 *   weil dort gar keine Navigation mit Neu-Mount stattfindet, sondern
	 *   derselbe DOM-Baum mit neuen Props wiederverwendet wird. Und
	 *   `invalidateAll()` kostet genau die Ladezeit, die der Advance-Pfad
	 *   bewusst spart (siehe Kommentar dort).
	 */
	/* Ein beschreibbares $derived verwirft den überschriebenen Wert nicht
	   zuverlässig (siehe oben, mit fehlschlagendem Test belegt) — $effect
	   weist unbedingt zu. */
	// eslint-disable-next-line svelte/prefer-writable-derived
	let selected = $state(untrack(() => status));
	$effect(() => {
		selected = status;
	});

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
		<!-- Gegen `selected`, nicht gegen `status`: `selected` ist über `bind:group`
		     und den `$effect` oben die verlässlich aktualisierte Quelle (siehe
		     Docblock dort). Gegen `status` gemessen hätte die Flächenfarbe densel-
		     ben Stillstand wie das frühere `checked={active}` — bei unverändertem
		     Wahrheitswert löst Svelte kein Update aus, auch nicht für `class`. -->
		{@const active = option === selected}
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
				bind:group={selected}
				disabled={busy}
				aria-label={presentation.label}
				onchange={() => select(option)}
			/>
			<Icon icon={presentation.icon} width="16" height="16" aria-hidden="true" />
			{#if size === 'md'}
				<span>{presentation.label}</span>
			{/if}
		</label>
	{/each}
</fieldset>

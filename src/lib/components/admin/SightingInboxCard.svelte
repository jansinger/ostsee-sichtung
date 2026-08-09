<script lang="ts">
	import { DEAD_FINDING_PRESENTATION, isDeadFinding } from '$lib/components/admin/deadFinding';
	import { getSpeciesLabel } from '$lib/report/formOptions/species';
	import {
		BALTIC_SEA_STATUS_PRESENTATION,
		getBalticSeaStatus
	} from '$lib/utils/geo/balticSeaStatus';
	import { formatLocalDateTime } from '$lib/utils/format/dateTime';
	import type { SightingSelect } from '$lib/server/db/schema';
	import type { DuplicateCandidate } from '$lib/server/db/duplicateCandidates';
	import Icon from '$lib/components/Icon.svelte';
	import { inboxDetailHref } from './adminReturn';
	import { SIGHTING_STATUS_PRESENTATION } from './sightingStatus';

	interface Props {
		sighting: SightingSelect;
		images: { id: number; filePath: string; originalName: string }[];
		/** Mögliche Doppelmeldungen (Spec B2) — reiner Hinweis, kein Merge. */
		duplicates?: DuplicateCandidate[];
		/** Sortierung des Eingangs — reist mit in die Detailansicht und zurück. */
		order?: 'asc' | 'desc';
		busy: boolean;
		onApprove: () => void;
		onReject: () => void;
	}

	let { sighting, images, duplicates = [], order, busy, onApprove, onReject }: Props = $props();

	/* „1 ähnliche Meldung" statt „1 ähnliche Meldungen": Die Karte ist die
	   Arbeitsfläche des Museums, nicht eine Log-Zeile. */
	const duplicateLabel = $derived(
		duplicates.length === 1 ? '1 ähnliche Meldung' : `${duplicates.length} ähnliche Meldungen`
	);
	const DUPLICATE_REASON_LABEL: Record<DuplicateCandidate['reason'], string> = {
		email: 'gleiche E-Mail, gleiche Stunde',
		position: 'nahe Position, ähnliche Zeit'
	};

	const balticSea = $derived(BALTIC_SEA_STATUS_PRESENTATION[getBalticSeaStatus(sighting)]);
	/* Gleiche Schwellen wie die Spam-Spalte der Tabelle (/admin/sichtungen) —
	   beide Ansichten müssen denselben Score gleich einfärben. */
	const spamBadgeClass = $derived(
		sighting.spamScore == null
			? 'badge-ghost'
			: sighting.spamScore >= 5
				? 'badge-error'
				: sighting.spamScore >= 2
					? 'badge-warning'
					: 'badge-ghost'
	);
	const spamIndicators = $derived(
		Array.isArray(sighting.spamIndicators) ? (sighting.spamIndicators as string[]) : []
	);
	const melderName = $derived([sighting.firstName, sighting.lastName].filter(Boolean).join(' '));
</script>

<article class="card border-base-300 bg-base-100 border shadow-raised">
	<div class="card-body gap-3 p-4">
		<div class="flex flex-wrap items-center gap-2">
			{#if isDeadFinding(sighting.isDead)}
				<span class="badge badge-sm {DEAD_FINDING_PRESENTATION.badgeClass}">
					{DEAD_FINDING_PRESENTATION.label}
				</span>
			{/if}
			<span
				class="badge badge-sm {spamBadgeClass}"
				data-testid="spam-badge"
				title={spamIndicators.join(', ')}
			>
				Spam: {sighting.spamScore ?? '–'}
			</span>
			<span class="badge badge-sm {balticSea.badgeClass}">{balticSea.label}</span>
		</div>

		{#if duplicates.length > 0}
			<!-- Aufklapper statt Direktanzeige: Der Hinweis soll die Karte nicht
			     länger machen als die Meldung selbst. Zusammengeführt wird nichts —
			     die Kandidaten sind Links in die Detailansicht, die Entscheidung
			     bleibt beim Bearbeiter. -->
			<details class="text-sm">
				<summary class="btn btn-ghost btn-sm w-fit justify-start" data-testid="duplicate-badge">
					<Icon icon="lucide:copy" width="16" height="16" aria-hidden="true" />
					<span class="badge badge-sm badge-warning">{duplicateLabel}</span>
					<!-- Der eigene Pfeil ersetzt den ::marker: DaisyUIs `btn` macht das
					     `summary` zu `inline-flex`, und Chrome entfernt den Marker damit.
					     Ohne ihn kündigt nichts an, dass sich hier etwas aufklappt. -->
					<span class="duplicate-chevron inline-flex">
						<Icon icon="lucide:chevron-down" width="16" height="16" aria-hidden="true" />
					</span>
				</summary>
				<ul class="border-warning/30 mt-2 ml-2 space-y-1 border-l pl-3">
					{#each duplicates as candidate (candidate.id)}
						<li>
							<a href={inboxDetailHref(candidate.id, order)} class="link link-hover font-medium">
								#{candidate.id}
							</a>
							<span class="text-base-content/70">
								{getSpeciesLabel(candidate.species)} · {formatLocalDateTime(
									candidate.sightingDate,
									'datetime'
								)} · {DUPLICATE_REASON_LABEL[candidate.reason]}
							</span>
						</li>
					{/each}
				</ul>
			</details>
		{/if}

		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<h3 class="text-base font-semibold">
				<a href={inboxDetailHref(sighting.id, order)} class="link-hover">
					{getSpeciesLabel(sighting.species)} — {sighting.totalCount}
					{#if sighting.juvenileCount > 0}(davon {sighting.juvenileCount} Jungtiere){/if}
				</a>
			</h3>
			<div class="text-base-content/70 text-sm">
				gemeldet {formatLocalDateTime(sighting.created, 'datetime')} · gesichtet {formatLocalDateTime(
					sighting.sightingDate,
					'datetime'
				)}
			</div>
		</div>

		<div class="text-sm">
			{#if melderName}{melderName} ·
			{/if}<span class="font-mono">{sighting.email}</span>
		</div>

		{#if images.length > 0}
			<div class="flex gap-2 overflow-x-auto">
				{#each images as image (image.id)}
					<img
						src={`/api/media/${image.filePath}`}
						alt={image.originalName}
						loading="lazy"
						class="h-16 w-16 flex-none rounded object-cover"
					/>
				{/each}
			</div>
		{/if}

		{#if sighting.waterway}
			<!-- Fahrwasser ist der Orts-Text der Meldung — neben dem Ostsee-Badge die
			     einzige Ortsangabe, die ohne Klick in die Detailansicht lesbar ist. -->
			<p class="text-base-content/80 line-clamp-1 text-sm">Ort: {sighting.waterway}</p>
		{/if}

		{#if sighting.notes}
			<p class="text-base-content/80 line-clamp-2 text-sm">{sighting.notes}</p>
		{/if}

		<div class="card-actions justify-end">
			<a href={inboxDetailHref(sighting.id, order)} class="btn btn-ghost btn-sm">Details</a>
			<button type="button" class="btn btn-outline btn-sm" disabled={busy} onclick={onReject}>
				<Icon
					icon={SIGHTING_STATUS_PRESENTATION.rejected.icon}
					width="16"
					height="16"
					aria-hidden="true"
				/>
				{SIGHTING_STATUS_PRESENTATION.rejected.actionLabel}
			</button>
			<button type="button" class="btn btn-primary btn-sm" disabled={busy} onclick={onApprove}>
				<Icon
					icon={SIGHTING_STATUS_PRESENTATION.approved.icon}
					width="16"
					height="16"
					aria-hidden="true"
				/>
				{SIGHTING_STATUS_PRESENTATION.approved.actionLabel}
			</button>
		</div>
	</div>
</article>

<style>
	/* Dauer und Kurve aus den Motion-Tokens (`design-system.md`): ein Hover-/
	   Zustandswechsel ist `--motion-instant`, keine eigene Zahl. */
	.duplicate-chevron {
		transition: transform var(--motion-instant) var(--motion-ease);
	}

	details[open] .duplicate-chevron {
		transform: rotate(180deg);
	}
</style>

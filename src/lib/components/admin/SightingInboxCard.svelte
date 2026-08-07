<script lang="ts">
	import { DEAD_FINDING_PRESENTATION, isDeadFinding } from '$lib/components/admin/deadFinding';
	import { getSpeciesLabel } from '$lib/report/formOptions/species';
	import {
		BALTIC_SEA_STATUS_PRESENTATION,
		getBalticSeaStatus
	} from '$lib/utils/geo/balticSeaStatus';
	import { formatLocalDateTime } from '$lib/utils/format/dateTime';
	import type { SightingSelect } from '$lib/server/db/schema';
	import Icon from '$lib/components/Icon.svelte';
	import { SIGHTING_STATUS_PRESENTATION } from './sightingStatus';

	interface Props {
		sighting: SightingSelect;
		images: { id: number; filePath: string; originalName: string }[];
		busy: boolean;
		onApprove: () => void;
		onReject: () => void;
	}

	let { sighting, images, busy, onApprove, onReject }: Props = $props();

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

<article class="card border-base-300 bg-base-100 border shadow-sm">
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

		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<h3 class="text-base font-semibold">
				<a href={`/admin/${sighting.id}`} class="link-hover">
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
			<a href={`/admin/${sighting.id}`} class="btn btn-ghost btn-sm">Details</a>
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

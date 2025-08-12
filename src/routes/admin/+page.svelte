<script lang="ts">
	import { deserialize } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import BooleanStatus from '$lib/components/admin/BooleanStatus.svelte';
	import DeleteDialog from '$lib/components/ui/Dialog/DeleteDialog.svelte';
	import { createLogger } from '$lib/logger';
	import Checkbox from '$lib/report/components/form/fields/Checkbox.svelte';
	import { getDistanceLabel } from '$lib/report/formOptions/distance';
	import { getDistributionLabel } from '$lib/report/formOptions/distribution';
	import { getEntryChannelOptions } from '$lib/report/formOptions/entryChannel';
	import { getSpeciesLabel } from '$lib/report/formOptions/species';
	import type { PageData, Sighting } from '$lib/types/types';
	import { formatDate } from '$lib/utils/format/FormatDate';
	import type { ActionResult } from '@sveltejs/kit';
	import { CloseOutline, EyeOutline, FilterOutline, TrashBinOutline } from 'flowbite-svelte-icons';

	const logger = createLogger('SichtungenPage');

	let { data }: { data: PageData } = $props();

	// Reaktive States mit Runes
	let sightings = $derived.by(() => {
		let sightings = $state(data.sightings);
		return sightings;
	});
	let dateFrom = $state($page.url.searchParams.get('dateFrom') || '');
	let dateTo = $state($page.url.searchParams.get('dateTo') || '');
	let verified = $state($page.url.searchParams.get('verified') || '');
	let selectedChannel = $state($page.url.searchParams.get('entryChannel') || 'all');
	let mediaUpload = $state($page.url.searchParams.get('mediaUpload') || '');
	let showDeleteDialog = $state(false);
	let sightingToDelete = $state<Sighting | null>(null);
	let isFilterPanelOpen = $state(false);

	// Prüft ob irgendwelche Filter aktiv sind
	let hasActiveFilters = $derived(() => {
		return !!(dateFrom || dateTo || verified || (selectedChannel && selectedChannel !== 'all') || mediaUpload);
	});

	function updateSort(column: string): void {
		const currentSort = $page.url.searchParams.get('sort');
		const currentOrder = $page.url.searchParams.get('order');

		const newOrder = currentSort === column && currentOrder === 'asc' ? 'desc' : 'asc';

		const url = new URL($page.url);
		url.searchParams.set('sort', column);
		url.searchParams.set('order', newOrder);
		goto(url);
	}

	function applyFilters(): void {
		const url = new URL($page.url);

		// Datum-Filter
		if (dateFrom) url.searchParams.set('dateFrom', dateFrom);
		else url.searchParams.delete('dateFrom');

		if (dateTo) url.searchParams.set('dateTo', dateTo);
		else url.searchParams.delete('dateTo');

		// Verified-Filter
		if (verified) url.searchParams.set('verified', verified);
		else url.searchParams.delete('verified');

		// Eingangskanal-Filter
		if (selectedChannel && selectedChannel !== 'all') {
			url.searchParams.set('entryChannel', selectedChannel);
		} else {
			url.searchParams.delete('entryChannel');
		}

		// Aufnahme-Filter
		if (mediaUpload) url.searchParams.set('mediaUpload', mediaUpload);
		else url.searchParams.delete('mediaUpload');

		url.searchParams.set('page', '1');
		goto(url);
	}

	function resetFilters(): void {
		dateFrom = '';
		dateTo = '';
		verified = '';
		selectedChannel = 'all';
		mediaUpload = '';

		const url = new URL($page.url);
		url.searchParams.delete('dateFrom');
		url.searchParams.delete('dateTo');
		url.searchParams.delete('verified');
		url.searchParams.delete('entryChannel');
		url.searchParams.delete('mediaUpload');
		url.searchParams.set('page', '1');
		goto(url);
	}

	function changePage(newPage: number): void {
		const url = new URL($page.url);
		url.searchParams.set('page', newPage.toString());
		goto(url);
	}

	function changeItemsPerPage(newPerPage: number): void {
		const url = new URL($page.url);
		url.searchParams.set('perPage', newPerPage.toString());
		url.searchParams.set('page', '1');
		goto(url);
	}

	function viewSightingDetails(sighting: Sighting): void {
		// Preserve current filter parameters when navigating to detail view
		const currentParams = $page.url.searchParams;
		const detailUrl = new URL(`/admin/${sighting.id}`, $page.url.origin);
		
		// Copy current search parameters to maintain filters
		for (const [key, value] of currentParams.entries()) {
			detailUrl.searchParams.set(key, value);
		}
		
		goto(detailUrl.toString());
	}

	async function deleteSighting(id: number): Promise<void> {
		const form = new FormData();
		form.append('id', id.toString());

		const response = await fetch('?/delete', {
			method: 'POST',
			body: form
		});

		if (response.ok) {
			window.location.reload();
		}
	}

	async function toggleVerifiedStatus(id: number, currentState: boolean): Promise<void> {
		const form = new FormData();
		form.append('id', id.toString());
		form.append('currentState', currentState ? '1' : '0');

		logger.debug(
			{
				id,
				currentState
			},
			`Toggled verified status for sighting with ID: ${id}`
		);

		try {
			const response = await fetch('?/toggleVerified', {
				method: 'POST',
				body: form
			});

			if (response.ok) {
				const result: ActionResult = deserialize(await response.text());

				// Lokalen State aktualisieren statt Page Reload
				if (result.type === 'success') {
					// Finde den Sighting-Eintrag und update den verified Status
					const sightingIndex = sightings.findIndex((s) => s.id === id);
					if (sightingIndex >= 0 && result.data && sightings[sightingIndex]) {
						sightings[sightingIndex].verified = result.data.newState;
					}
				}
			} else {
				console.error('Fehler beim Ändern des Verifizierungsstatus');
			}
		} catch (error) {
			console.error('Netzwerkfehler beim Ändern des Verifizierungsstatus:', error);
		}
	}
</script>

<div class="container mx-auto p-4">
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Sichtungen</h1>
		<div class="flex items-center gap-2">
			<button
				class="btn btn-sm {isFilterPanelOpen
					? 'btn-accent'
					: hasActiveFilters()
						? 'btn-primary'
						: 'btn-outline'}"
				onclick={() => (isFilterPanelOpen = !isFilterPanelOpen)}
				title="Filter ein-/ausblenden"
			>
				<FilterOutline class="mr-1 h-4 w-4" />
				Filter
				{#if hasActiveFilters()}
					<span class="badge badge-accent badge-sm ml-1">•</span>
				{/if}
			</button>
			{#if data.pagination && data.pagination.total}
				<span class="badge badge-outline">{data.pagination.total} Ergebnisse</span>
			{/if}
		</div>
	</div>

	{#if isFilterPanelOpen}
		<div class="bg-base-200 mb-6 rounded-lg p-4 shadow-sm transition-all duration-300">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-lg font-semibold">Filter</h2>
				<button
					class="btn btn-ghost btn-xs"
					onclick={() => (isFilterPanelOpen = false)}
					title="Filter ausblenden"
					aria-label="Filter ausblenden"
				>
					<CloseOutline class="h-4 w-4" />
				</button>
			</div>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
				<div class="form-control w-full">
					<label for="dateFrom" class="label">
						<span class="label-text">Von</span>
					</label>
					<input
						type="date"
						id="dateFrom"
						name="dateFrom"
						class="input-bordered input h-12 w-full"
						bind:value={dateFrom}
					/>
				</div>
				<div class="form-control w-full">
					<label for="dateTo" class="label">
						<span class="label-text">Bis</span>
					</label>
					<input
						type="date"
						id="dateTo"
						name="dateTo"
						class="input-bordered input h-12 w-full"
						bind:value={dateTo}
					/>
				</div>
				<div class="form-control w-full">
					<label for="verified" class="label">
						<span class="label-text">Verifizierungsstatus</span>
					</label>
					<select
						id="verified"
						name="verified"
						class="select-bordered select h-12 w-full"
						bind:value={verified}
					>
						<option value="">Alle</option>
						<option value="1">Geprüft</option>
						<option value="0">Ungeprüft</option>
					</select>
				</div>
				<div class="form-control w-full">
					<label for="entryChannel" class="label">
						<span class="label-text">Eingangskanal</span>
					</label>
					<select
						id="entryChannel"
						name="entryChannel"
						class="select-bordered select h-12 w-full"
						bind:value={selectedChannel}
					>
						<option value="all">Alle</option>
						{#each getEntryChannelOptions() as { value, label } (value)}
							<option value={String(value)}>{label}</option>
						{/each}
					</select>
				</div>
				<div class="form-control w-full">
					<label for="mediaUpload" class="label">
						<span class="label-text">Aufnahme</span>
					</label>
					<select
						id="mediaUpload"
						name="mediaUpload"
						class="select-bordered select h-12 w-full"
						bind:value={mediaUpload}
					>
						<option value="">Alle</option>
						<option value="1">Mit Aufnahme</option>
						<option value="0">Ohne Aufnahme</option>
					</select>
				</div>
			</div>
			<div class="mt-4 flex justify-end gap-2">
				<button class="btn btn-outline" onclick={resetFilters}>Zurücksetzen</button>
				<button class="btn btn-primary" onclick={applyFilters}>Filter anwenden</button>
			</div>
		</div>
	{/if}

	<div class="border-base-300 bg-base-100 overflow-x-auto rounded-lg border shadow-sm">
		<table class="table-zebra table w-full">
			<thead class="bg-base-200 text-base-content">
				<tr>
					<th class="hover:bg-base-300"> Referenz-ID </th>
					<th class="hover:bg-base-300 cursor-pointer" onclick={() => updateSort('sightingDate')}>
						Sichtungsdatum
						{#if $page.url.searchParams.get('sort') === 'sightingDate'}
							<span class="ml-1">{$page.url.searchParams.get('order') === 'desc' ? '↓' : '↑'}</span>
						{/if}
					</th>
					<th class="hover:bg-base-300 cursor-pointer" onclick={() => updateSort('created')}>
						Meldedatum
						{#if $page.url.searchParams.get('sort') === 'created'}
							<span class="ml-1">{$page.url.searchParams.get('order') === 'desc' ? '↓' : '↑'}</span>
						{/if}
					</th>
					<th class="hover:bg-base-300 cursor-pointer" onclick={() => updateSort('email')}>
						Email
						{#if $page.url.searchParams.get('sort') === 'email'}
							<span class="ml-1">{$page.url.searchParams.get('order') === 'desc' ? '↓' : '↑'}</span>
						{/if}
					</th>
					<th class="hover:bg-base-300 cursor-pointer" onclick={() => updateSort('species')}>
						Tierart
						{#if $page.url.searchParams.get('sort') === 'species'}
							<span class="ml-1">{$page.url.searchParams.get('order') === 'desc' ? '↓' : '↑'}</span>
						{/if}
					</th>
					<th class="hover:bg-base-300 cursor-pointer" onclick={() => updateSort('distance')}>
						Entfernung
						{#if $page.url.searchParams.get('sort') === 'distance'}
							<span class="ml-1">{$page.url.searchParams.get('order') === 'desc' ? '↓' : '↑'}</span>
						{/if}
					</th>
					<th class="hover:bg-base-300 cursor-pointer" onclick={() => updateSort('totalCount')}>
						Anzahl
						{#if $page.url.searchParams.get('sort') === 'totalCount'}
							<span class="ml-1">{$page.url.searchParams.get('order') === 'desc' ? '↓' : '↑'}</span>
						{/if}
					</th>
					<th class="hover:bg-base-300 cursor-pointer" onclick={() => updateSort('juvenileCount')}>
						Jung
						{#if $page.url.searchParams.get('sort') === 'juvenileCount'}
							<span class="ml-1">{$page.url.searchParams.get('order') === 'desc' ? '↓' : '↑'}</span>
						{/if}
					</th>
					<th class="hover:bg-base-300 cursor-pointer" onclick={() => updateSort('distribution')}>
						Verteilung
						{#if $page.url.searchParams.get('sort') === 'distribution'}
							<span class="ml-1">{$page.url.searchParams.get('order') === 'desc' ? '↓' : '↑'}</span>
						{/if}
					</th>
					<th>Aufnahme</th>
					<th>Totfund</th>
					<th>Ostsee</th>
					<th>Verifiziert</th>
					<th>Aktionen</th>
				</tr>
			</thead>
			<tbody>
				{#each sightings as sighting (sighting.id)}
					<tr class="hover:bg-base-200">
						<td>{sighting.referenceId}</td>
						<td>{formatDate(sighting.sightingDate)}</td>
						<td>{formatDate(sighting.created)}</td>
						<td
							><a href="mailto:{sighting.email}" class="link link-primary link-hover"
								>{sighting.email}</a
							></td
						>
						<td>{getSpeciesLabel(sighting.species)}</td>
						<td>{getDistanceLabel(sighting.distance)}</td>
						<td>{sighting.totalCount}</td>
						<td>{sighting.juvenileCount}</td>
						<td>{getDistributionLabel(sighting.distribution)}</td>
						<td class="items-center justify-center"
							><BooleanStatus value={!!sighting.mediaUpload} trueLabel="Ja" falseLabel="Nein" /></td
						>
						<td class="items-center justify-center"
							><BooleanStatus value={!!sighting.isDead} trueLabel="Ja" falseLabel="Nein" /></td
						>
						<td class="items-center justify-center"
							><BooleanStatus
								value={!!sighting.inBalticSeaGeo}
								trueLabel="Ja"
								falseLabel="Nein"
							/></td
						>
						<td>
							<Checkbox
								label=""
								name={`verified-${sighting.id}`}
								checked={!!sighting.verified}
								onclick={(e: MouseEvent) => {
									e.preventDefault();
									toggleVerifiedStatus(sighting.id, !!sighting.verified);
								}}
							/>
						</td>
						<td class="space-x-1">
							<button
								class="btn btn-ghost btn-xs"
								onclick={() => viewSightingDetails(sighting)}
								title="Details anzeigen"
								aria-label="Details anzeigen"
							>
								<EyeOutline class="h-4 w-4" />
							</button>
							<button
								class="btn text-error btn-ghost btn-xs"
								onclick={() => {
									sightingToDelete = sighting;
									showDeleteDialog = true;
								}}
								title="Eintrag löschen"
								aria-label="Eintrag löschen"
							>
								<TrashBinOutline class="h-4 w-4" />
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
		<div class="flex items-center gap-2">
			<span class="text-sm font-medium">Einträge pro Seite:</span>
			<select
				class="select-bordered select select-sm"
				onchange={(e) => changeItemsPerPage(Number(e.currentTarget.value))}
			>
				<option value="10" selected={data.pagination.perPage === 10}>10</option>
				<option value="20" selected={data.pagination.perPage === 20}>20</option>
				<option value="50" selected={data.pagination.perPage === 50}>50</option>
				<option value="100" selected={data.pagination.perPage === 100}>100</option>
			</select>
		</div>

		<div class="join">
			<button
				class="btn join-item btn-sm"
				onclick={() => changePage(1)}
				disabled={data.pagination.page === 1}
			>
				«
			</button>
			<button
				class="btn join-item btn-sm"
				onclick={() => changePage(data.pagination.page - 1)}
				disabled={data.pagination.page === 1}
			>
				‹
			</button>

			<button class="btn btn-active join-item btn-sm">
				Seite {data.pagination.page} von {data.pagination.totalPages}
			</button>

			<button
				class="btn join-item btn-sm"
				onclick={() => changePage(data.pagination.page + 1)}
				disabled={data.pagination.page === data.pagination.totalPages}
			>
				›
			</button>
			<button
				class="btn join-item btn-sm"
				onclick={() => changePage(data.pagination.totalPages)}
				disabled={data.pagination.page === data.pagination.totalPages}
			>
				»
			</button>
		</div>

		<div class="text-base-content/70 text-sm">
			Insgesamt {data.pagination.total} Einträge
		</div>
	</div>

	<DeleteDialog
		bind:show={showDeleteDialog}
		onConfirm={() => {
			if (sightingToDelete) {
				deleteSighting(sightingToDelete.id);
			}
		}}
		onCancel={() => {
			showDeleteDialog = false;
			sightingToDelete = null;
		}}
	/>
</div>

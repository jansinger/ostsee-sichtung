<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import ExportModal from '$lib/components/admin/ExportModal.svelte';
	import DeleteDialog from '$lib/components/ui/Dialog/DeleteDialog.svelte';
	import { createLogger } from '$lib/logger';
	import BaseToggle from '$lib/report/components/form/fields/BaseToggle.svelte';
	import { getAnimalBehaviorLabel } from '$lib/report/formOptions/animalBehavior';
	import { getDistanceLabel } from '$lib/report/formOptions/distance';
	import { getDistributionLabel } from '$lib/report/formOptions/distribution';
	import { getEntryChannelOptions } from '$lib/report/formOptions/entryChannel';
	import { getSeaStateLabel } from '$lib/report/formOptions/seaState';
	import { getSpeciesLabel } from '$lib/report/formOptions/species';
	import { getVisibilityLabel } from '$lib/report/formOptions/visibility';
	import { getWindStrengthLabel } from '$lib/report/formOptions/windStrength';
	import { toast } from '$lib/stores/toastState';
	import type { FrontendSighting, PageData } from '$lib/types';
	import { formatLocalDateTime } from '$lib/utils/format/dateTime';
	import {
		CloseOutline,
		DownloadOutline,
		EnvelopeOutline,
		EyeOutline,
		FilterOutline,
		TableColumnOutline,
		TrashBinOutline
	} from 'flowbite-svelte-icons';

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
	let sightingToDelete = $state<FrontendSighting | null>(null);
	let isFilterPanelOpen = $state(false);
	let showExportModal = $state(false);
	let showColumnDropdown = $state(false);

	// Column visibility configuration
	let columnVisibility = $state({
		referenceId: true,
		sightingDate: true,
		created: true,
		email: true,
		species: true,
		distance: true,
		totalCount: true,
		juvenileCount: true,
		distribution: true,
		behavior: false,
		seaState: false,
		wind: false,
		visibility: false,
		mediaUpload: true,
		isDead: true,
		inBalticSeaGeo: true,
		verified: true,
		actions: true
	});

	// Available columns configuration
	const availableColumns = [
		{ key: 'referenceId', label: 'Referenz-ID', sortKey: null },
		{ key: 'sightingDate', label: 'Sichtungsdatum', sortKey: 'sightingDate' },
		{ key: 'created', label: 'Meldedatum', sortKey: 'created' },
		{ key: 'email', label: 'Email', sortKey: 'email' },
		{ key: 'species', label: 'Tierart', sortKey: 'species' },
		{ key: 'distance', label: 'Entfernung', sortKey: 'distance' },
		{ key: 'totalCount', label: 'Anzahl', sortKey: 'totalCount' },
		{ key: 'juvenileCount', label: 'Jung', sortKey: 'juvenileCount' },
		{ key: 'distribution', label: 'Verteilung', sortKey: 'distribution' },
		{ key: 'behavior', label: 'Verhalten', sortKey: 'behavior' },
		{ key: 'seaState', label: 'Seegang', sortKey: 'seaState' },
		{ key: 'wind', label: 'Wind', sortKey: 'wind' },
		{ key: 'visibility', label: 'Sichtweite', sortKey: 'visibility' },
		{ key: 'mediaUpload', label: 'Aufnahme', sortKey: null },
		{ key: 'isDead', label: 'Totfund', sortKey: null },
		{ key: 'inBalticSeaGeo', label: 'Ostsee', sortKey: null },
		{ key: 'verified', label: 'Verifiziert', sortKey: null },
		{ key: 'actions', label: 'Aktionen', sortKey: null }
	];

	// Prüft ob irgendwelche Filter aktiv sind
	let hasActiveFilters = $derived(() => {
		return !!(
			dateFrom ||
			dateTo ||
			verified ||
			(selectedChannel && selectedChannel !== 'all') ||
			mediaUpload
		);
	});

	// Aktuelle Filter für Export-Modal
	let currentFilters = $derived(() => {
		return {
			dateFrom: dateFrom || '',
			dateTo: dateTo || '',
			verified: verified || '',
			entryChannel: selectedChannel !== 'all' ? selectedChannel : '',
			mediaUpload: mediaUpload || ''
		};
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

	// Close dropdown when clicking outside
	function handleClickOutside(event: MouseEvent) {
		if (showColumnDropdown && !(event.target as Element).closest('.dropdown')) {
			showColumnDropdown = false;
		}
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

	function viewSightingDetails(sighting: FrontendSighting): void {
		// Preserve current filter parameters when navigating to detail view
		const currentParams = $page.url.searchParams;
		const detailUrl = new URL(`/admin/${sighting.id}`, $page.url.origin);

		// Copy current search parameters to maintain filters
		for (const [key, value] of currentParams.entries()) {
			detailUrl.searchParams.set(key, value);
		}

		goto(detailUrl.toString());
	}

	async function sendTestEmail(sightingId: number) {
		try {
			// Show loading toast
			const loadingToastId = toast.info('E-Mail wird gesendet...', { duration: 0 });
			
			const response = await fetch('/api/admin/test-email', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					sightingId,
					testType: 'sighting'
				})
			});

			// Remove loading toast
			toast.remove(loadingToastId);

			const result = await response.json();

			if (result.success) {
				toast.success(result.message || 'Test-E-Mail wurde erfolgreich gesendet', {
					title: 'E-Mail gesendet',
					duration: 5000
				});
			} else {
				toast.error(result.error || 'Fehler beim Senden der Test-E-Mail', {
					title: 'Fehler',
					dismissible: true
				});
			}
		} catch (error) {
			logger.error({ error }, 'Error sending test email');
			toast.error('Netzwerkfehler beim Senden der Test-E-Mail', {
				title: 'Verbindungsfehler',
				dismissible: true
			});
		}
	}

	async function deleteSighting(id: number): Promise<void> {
		try {
			const response = await fetch(`/api/sightings/${id}`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (response.ok) {
				const result = await response.json();
				logger.info({ id, result }, 'Sichtung erfolgreich gelöscht');
				// Reload data via SvelteKit's invalidation instead of full page reload
				await invalidateAll();
			} else {
				const error = await response.json();
				logger.error({ id, error }, 'Fehler beim Löschen der Sichtung');
			}
		} catch (error) {
			logger.error({ id, error }, 'Netzwerkfehler beim Löschen');
		}
	}

	async function toggleVerifiedStatus(id: number, currentState: boolean): Promise<void> {
		const newState = currentState ? 0 : 1; // Toggle the state

		logger.debug(
			{
				id,
				currentState,
				newState
			},
			`Toggling verified status for sighting with ID: ${id}`
		);

		try {
			const response = await fetch(`/api/sightings/${id}/verify`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ verified: newState })
			});

			if (response.ok) {
				const result = await response.json();
				logger.info({ id, result }, 'Verifizierungsstatus erfolgreich geändert');

				// Lokalen State aktualisieren
				const sightingIndex = sightings.findIndex((s) => s.id === id);
				if (sightingIndex >= 0 && sightings[sightingIndex]) {
					sightings[sightingIndex].verified = newState;
				}
			} else {
				const error = await response.json();
				logger.error({ id, error }, 'Fehler beim Ändern des Verifizierungsstatus');
			}
		} catch (error) {
			logger.error({ id, error }, 'Netzwerkfehler beim Ändern des Verifizierungsstatus');
		}
	}
</script>

<svelte:head>
	<title>Sichtungen - Admin - Ostsee-Tiere</title>
	<meta
		name="description"
		content="Admin-Dashboard zur Verwaltung aller Meerestier-Sichtungen. Überprüfung, Bearbeitung und Verwaltung der gemeldeten Sichtungen in der Ostsee."
	/>
	<meta
		name="keywords"
		content="Admin, Dashboard, Sichtungen, Verwaltung, Meerestiere, Ostsee, Moderation"
	/>

	<!-- Open Graph -->
	<meta property="og:title" content="Sichtungsverwaltung - Admin - Ostsee-Tiere" />
	<meta
		property="og:description"
		content="Administrationsbereich zur Verwaltung und Überprüfung von Meerestier-Sichtungen"
	/>
	<meta property="og:type" content="website" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Sichtungsverwaltung - Admin - Ostsee-Tiere" />
	<meta
		name="twitter:description"
		content="Administrationsbereich zur Verwaltung und Überprüfung von Meerestier-Sichtungen"
	/>
</svelte:head>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="pt-6" onclick={handleClickOutside}>
	<!-- Page Header -->
	<div class="mb-6 container mx-auto px-4 sm:px-6">
		<!-- Mobile Layout -->
		<div class="block space-y-3 sm:hidden">
			<h1 class="text-2xl font-bold">Sichtungen</h1>
			<div class="flex flex-col gap-2">
				<div class="flex items-center gap-2">
					<button
						class="btn btn-sm flex-1 {isFilterPanelOpen
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
					<button
						class="btn btn-sm btn-primary flex-1"
						onclick={() => (showExportModal = true)}
						title="Sichtungen exportieren"
						disabled={!data.pagination?.total}
					>
						<DownloadOutline class="mr-1 h-4 w-4" />
						Export
					</button>
				</div>
				{#if data.pagination && data.pagination.total}
					<div class="text-center">
						<span class="badge badge-outline text-sm">{data.pagination.total} Ergebnisse</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Desktop Layout -->
		<div class="hidden items-center justify-between sm:flex">
			<h1 class="text-2xl font-bold">Sichtungen</h1>
			<div class="flex items-center gap-2">
				<div class="dropdown dropdown-end">
					<button
						class="btn btn-sm btn-outline"
						onclick={() => (showColumnDropdown = !showColumnDropdown)}
						title="Spalten ein-/ausblenden"
					>
						<TableColumnOutline class="mr-1 h-4 w-4" />
						Spalten
					</button>
					{#if showColumnDropdown}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="dropdown-content menu bg-base-100 rounded-box border-base-300 z-[1] mt-1 w-64 border p-2 shadow-lg"
							onclick={(e) => e.stopPropagation()}
						>
							<div class="menu-title pb-2 flex items-center justify-between">
								<span class="text-sm font-semibold">Spalten anzeigen</span>
								<button
									class="btn btn-ghost btn-xs"
									onclick={() => (showColumnDropdown = false)}
								>
									<CloseOutline class="h-3 w-3" />
								</button>
							</div>
							<div class="max-h-80 overflow-y-auto">
								{#each availableColumns as column (column.key)}
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
									<label
										class="hover:bg-base-200 flex cursor-pointer items-center gap-2 rounded p-1"
										onclick={(e) => e.stopPropagation()}
									>
										<input
											type="checkbox"
											class="checkbox checkbox-sm"
											bind:checked={columnVisibility[column.key as keyof typeof columnVisibility]}
											onclick={(e) => e.stopPropagation()}
										/>
										<span class="flex-1 text-sm">{column.label}</span>
									</label>
								{/each}
							</div>
						</div>
					{/if}
				</div>
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
				<button
					class="btn btn-sm btn-primary"
					onclick={() => (showExportModal = true)}
					title="Sichtungen exportieren"
					disabled={!data.pagination?.total}
				>
					<DownloadOutline class="mr-1 h-4 w-4" />
					Export
				</button>
				{#if data.pagination && data.pagination.total}
					<span class="badge badge-outline whitespace-nowrap"
						>{data.pagination.total} Ergebnisse</span
					>
				{/if}
			</div>
		</div>
	</div>

	<!-- Filter Panel -->
	{#if isFilterPanelOpen}
		<div class="bg-base-200 mb-4 rounded-lg p-3 shadow-sm transition-all duration-300 container mx-auto px-4 sm:px-6">
			<div class="mb-2 flex items-center justify-between">
				<h2 class="text-base font-semibold">Filter</h2>
				<button
					class="btn btn-ghost btn-xs"
					onclick={() => (isFilterPanelOpen = false)}
					title="Filter ausblenden"
					aria-label="Filter ausblenden"
				>
					<CloseOutline class="h-4 w-4" />
				</button>
			</div>
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
				<div class="form-control w-full">
					<label for="dateFrom" class="label py-0">
						<span class="label-text text-xs">Von</span>
					</label>
					<input
						type="date"
						id="dateFrom"
						name="dateFrom"
						class="input-bordered input input-sm w-full"
						bind:value={dateFrom}
					/>
				</div>
				<div class="form-control w-full">
					<label for="dateTo" class="label py-0">
						<span class="label-text text-xs">Bis</span>
					</label>
					<input
						type="date"
						id="dateTo"
						name="dateTo"
						class="input-bordered input input-sm w-full"
						bind:value={dateTo}
					/>
				</div>
				<div class="form-control w-full">
					<label for="verified" class="label py-0">
						<span class="label-text text-xs">Status</span>
					</label>
					<select
						id="verified"
						name="verified"
						class="select-bordered select select-sm w-full text-sm"
						bind:value={verified}
					>
						<option value="">Alle</option>
						<option value="1">Geprüft</option>
						<option value="0">Ungeprüft</option>
					</select>
				</div>
				<div class="form-control w-full">
					<label for="entryChannel" class="label py-0">
						<span class="label-text text-xs">Kanal</span>
					</label>
					<select
						id="entryChannel"
						name="entryChannel"
						class="select-bordered select select-sm w-full text-sm"
						bind:value={selectedChannel}
					>
						<option value="all">Alle</option>
						{#each getEntryChannelOptions() as { value, label } (value)}
							<option value={String(value)}>{label}</option>
						{/each}
					</select>
				</div>
				<div class="form-control w-full">
					<label for="mediaUpload" class="label py-0">
						<span class="label-text text-xs">Aufnahme</span>
					</label>
					<select
						id="mediaUpload"
						name="mediaUpload"
						class="select-bordered select select-sm w-full text-sm"
						bind:value={mediaUpload}
					>
						<option value="">Alle</option>
						<option value="1">Mit</option>
						<option value="0">Ohne</option>
					</select>
				</div>
			</div>
			<div class="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
				<button class="btn btn-outline btn-sm sm:btn-xs" onclick={resetFilters}>Zurücksetzen</button
				>
				<button class="btn btn-primary btn-sm sm:btn-xs" onclick={applyFilters}>Anwenden</button>
			</div>
		</div>
	{/if}

	<!-- Mobile Card Layout -->
	<div class="block space-y-3 md:hidden container mx-auto px-4 sm:px-6">
		{#each sightings as sighting (sighting.id)}
			<div class="bg-base-100 border-base-300 rounded-lg border p-4 shadow-sm">
				<div class="mb-3 flex items-start justify-between">
					<div class="flex-1">
						{#if sighting.referenceId}
							<a
								href="/admin/ref/{sighting.referenceId}"
								class="link link-primary link-hover font-mono text-sm"
							>
								{sighting.referenceId}
							</a>
						{:else}
							<span class="text-base-content/50 text-sm">Keine Referenz</span>
						{/if}
						<h3 class="mt-1 text-base font-semibold">{getSpeciesLabel(sighting.species)}</h3>
					</div>
					<div class="ml-2 flex gap-1">
						<button
							class="btn btn-ghost btn-sm"
							onclick={() => viewSightingDetails(sighting)}
							title="Details anzeigen"
							aria-label="Details anzeigen"
						>
							<EyeOutline class="h-4 w-4" />
						</button>
						<button
							class="btn btn-ghost btn-sm"
							onclick={() => sendTestEmail(sighting.id)}
							title="Test-E-Mail senden"
							aria-label="Test-E-Mail senden"
						>
							<EnvelopeOutline class="h-4 w-4" />
						</button>
						<button
							class="btn text-error btn-ghost btn-sm"
							onclick={() => {
								sightingToDelete = sighting;
								showDeleteDialog = true;
							}}
							title="Eintrag löschen"
							aria-label="Eintrag löschen"
						>
							<TrashBinOutline class="h-4 w-4" />
						</button>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
					<div>
						<span class="text-base-content/70">Sichtung:</span>
						<span class="block">{formatLocalDateTime(sighting.sightingDate)}</span>
					</div>
					<div>
						<span class="text-base-content/70">Anzahl:</span>
						<span class="block">{sighting.totalCount}</span>
					</div>
					<div class="col-span-2">
						<span class="text-base-content/70">Email:</span>
						<a href="mailto:{sighting.email}" class="link link-primary link-hover block text-sm">
							{sighting.email}
						</a>
					</div>
				</div>

				<div class="mt-3 flex flex-wrap gap-2">
					{#if sighting.mediaUpload}
						<span class="badge badge-success badge-sm">Mit Aufnahme</span>
					{/if}
					{#if sighting.isDead}
						<span class="badge badge-error badge-sm">Totfund</span>
					{/if}
					{#if sighting.inBalticSeaGeo}
						<span class="badge badge-info badge-sm">Ostsee</span>
					{/if}
				</div>

				<div class="mt-3 flex items-center justify-between">
					<span class="text-base-content/70 text-xs">
						Gemeldet: {formatLocalDateTime(sighting.created)}
					</span>
					<BaseToggle
						label="Verifiziert"
						name={`verified-mobile-${sighting.id}`}
						checked={!!sighting.verified}
						onchange={() => {
							toggleVerifiedStatus(sighting.id, !!sighting.verified);
						}}
					/>
				</div>
			</div>
		{/each}
	</div>

	<!-- Desktop Table Layout -->
	<div class="hidden md:block px-2 sm:px-4">
		<div class="border-base-300 bg-base-100 overflow-x-auto rounded-lg border shadow-sm w-full">
			<table class="table-zebra table w-full">
				<thead class="bg-base-200 text-base-content">
					<tr>
						{#if columnVisibility.referenceId}
							<th class="hover:bg-base-300">Referenz-ID</th>
						{/if}
						{#if columnVisibility.sightingDate}
							<th
								class="hover:bg-base-300 cursor-pointer"
								onclick={() => updateSort('sightingDate')}
							>
								Sichtungsdatum
								{#if $page.url.searchParams.get('sort') === 'sightingDate'}
									<span class="ml-1"
										>{$page.url.searchParams.get('order') === 'desc' ? '↓' : '↑'}</span
									>
								{/if}
							</th>
						{/if}
						{#if columnVisibility.created}
							<th class="hover:bg-base-300 cursor-pointer" onclick={() => updateSort('created')}>
								Meldedatum
								{#if $page.url.searchParams.get('sort') === 'created'}
									<span class="ml-1"
										>{$page.url.searchParams.get('order') === 'desc' ? '↓' : '↑'}</span
									>
								{/if}
							</th>
						{/if}
						{#if columnVisibility.email}
							<th class="hover:bg-base-300 cursor-pointer" onclick={() => updateSort('email')}>
								Email
								{#if $page.url.searchParams.get('sort') === 'email'}
									<span class="ml-1"
										>{$page.url.searchParams.get('order') === 'desc' ? '↓' : '↑'}</span
									>
								{/if}
							</th>
						{/if}
						{#if columnVisibility.species}
							<th class="hover:bg-base-300 cursor-pointer" onclick={() => updateSort('species')}>
								Tierart
								{#if $page.url.searchParams.get('sort') === 'species'}
									<span class="ml-1"
										>{$page.url.searchParams.get('order') === 'desc' ? '↓' : '↑'}</span
									>
								{/if}
							</th>
						{/if}
						{#if columnVisibility.distance}
							<th class="hover:bg-base-300 cursor-pointer" onclick={() => updateSort('distance')}>
								Entfernung
								{#if $page.url.searchParams.get('sort') === 'distance'}
									<span class="ml-1"
										>{$page.url.searchParams.get('order') === 'desc' ? '↓' : '↑'}</span
									>
								{/if}
							</th>
						{/if}
						{#if columnVisibility.totalCount}
							<th class="hover:bg-base-300 cursor-pointer" onclick={() => updateSort('totalCount')}>
								Anzahl
								{#if $page.url.searchParams.get('sort') === 'totalCount'}
									<span class="ml-1"
										>{$page.url.searchParams.get('order') === 'desc' ? '↓' : '↑'}</span
									>
								{/if}
							</th>
						{/if}
						{#if columnVisibility.juvenileCount}
							<th
								class="hover:bg-base-300 cursor-pointer"
								onclick={() => updateSort('juvenileCount')}
							>
								Jung
								{#if $page.url.searchParams.get('sort') === 'juvenileCount'}
									<span class="ml-1"
										>{$page.url.searchParams.get('order') === 'desc' ? '↓' : '↑'}</span
									>
								{/if}
							</th>
						{/if}
						{#if columnVisibility.distribution}
							<th
								class="hover:bg-base-300 cursor-pointer"
								onclick={() => updateSort('distribution')}
							>
								Verteilung
								{#if $page.url.searchParams.get('sort') === 'distribution'}
									<span class="ml-1"
										>{$page.url.searchParams.get('order') === 'desc' ? '↓' : '↑'}</span
									>
								{/if}
							</th>
						{/if}
						{#if columnVisibility.behavior}
							<th class="hover:bg-base-300 cursor-pointer" onclick={() => updateSort('behavior')}>
								Verhalten
								{#if $page.url.searchParams.get('sort') === 'behavior'}
									<span class="ml-1"
										>{$page.url.searchParams.get('order') === 'desc' ? '↓' : '↑'}</span
									>
								{/if}
							</th>
						{/if}
						{#if columnVisibility.seaState}
							<th class="hover:bg-base-300 cursor-pointer" onclick={() => updateSort('seaState')}>
								Seegang
								{#if $page.url.searchParams.get('sort') === 'seaState'}
									<span class="ml-1"
										>{$page.url.searchParams.get('order') === 'desc' ? '↓' : '↑'}</span
									>
								{/if}
							</th>
						{/if}
						{#if columnVisibility.wind}
							<th class="hover:bg-base-300 cursor-pointer" onclick={() => updateSort('wind')}>
								Wind
								{#if $page.url.searchParams.get('sort') === 'wind'}
									<span class="ml-1"
										>{$page.url.searchParams.get('order') === 'desc' ? '↓' : '↑'}</span
									>
								{/if}
							</th>
						{/if}
						{#if columnVisibility.visibility}
							<th class="hover:bg-base-300 cursor-pointer" onclick={() => updateSort('visibility')}>
								Sichtweite
								{#if $page.url.searchParams.get('sort') === 'visibility'}
									<span class="ml-1"
										>{$page.url.searchParams.get('order') === 'desc' ? '↓' : '↑'}</span
									>
								{/if}
							</th>
						{/if}
						{#if columnVisibility.mediaUpload}
							<th class="hover:bg-base-300">Aufnahme</th>
						{/if}
						{#if columnVisibility.isDead}
							<th class="hover:bg-base-300">Totfund</th>
						{/if}
						{#if columnVisibility.inBalticSeaGeo}
							<th class="hover:bg-base-300">Ostsee</th>
						{/if}
						{#if columnVisibility.verified}
							<th class="hover:bg-base-300">Verifiziert</th>
						{/if}
						{#if columnVisibility.actions}
							<th class="hover:bg-base-300">Aktionen</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#each sightings as sighting (sighting.id)}
						<tr class="hover:bg-base-200">
							{#if columnVisibility.referenceId}
								<td>
									{#if sighting.referenceId}
										<a
											href="/admin/ref/{sighting.referenceId}"
											class="link link-primary link-hover font-mono"
										>
											{sighting.referenceId}
										</a>
									{:else}
										<span class="text-base-content/50">—</span>
									{/if}
								</td>
							{/if}
							{#if columnVisibility.sightingDate}
								<td>{formatLocalDateTime(sighting.sightingDate)}</td>
							{/if}
							{#if columnVisibility.created}
								<td>{formatLocalDateTime(sighting.created)}</td>
							{/if}
							{#if columnVisibility.email}
								<td>
									<a
										href="mailto:{sighting.email}"
										class="link link-primary link-hover block max-w-32 truncate"
									>
										{sighting.email}
									</a>
								</td>
							{/if}
							{#if columnVisibility.species}
								<td>{getSpeciesLabel(sighting.species)}</td>
							{/if}
							{#if columnVisibility.distance}
								<td>{getDistanceLabel(sighting.distance)}</td>
							{/if}
							{#if columnVisibility.totalCount}
								<td>{sighting.totalCount}</td>
							{/if}
							{#if columnVisibility.juvenileCount}
								<td>{sighting.juvenileCount || '—'}</td>
							{/if}
							{#if columnVisibility.distribution}
								<td>{getDistributionLabel(sighting.distribution)}</td>
							{/if}
							{#if columnVisibility.behavior}
								<td>{getAnimalBehaviorLabel(sighting.behavior) || '—'}</td>
							{/if}
							{#if columnVisibility.seaState}
								<td>{getSeaStateLabel(sighting.seaState) || '—'}</td>
							{/if}
							{#if columnVisibility.wind}
								<td>{getWindStrengthLabel(sighting.windForce ? Number(sighting.windForce) : undefined) || '—'}</td>
							{/if}
							{#if columnVisibility.visibility}
								<td>{getVisibilityLabel(sighting.visibility) || '—'}</td>
							{/if}
							{#if columnVisibility.mediaUpload}
								<td class="text-center">
									{#if sighting.mediaUpload}
										<span class="badge badge-success badge-sm">Ja</span>
									{:else}
										<span class="badge badge-ghost badge-sm">Nein</span>
									{/if}
								</td>
							{/if}
							{#if columnVisibility.isDead}
								<td class="text-center">
									{#if sighting.isDead}
										<span class="badge badge-error badge-sm">Ja</span>
									{:else}
										<span class="badge badge-ghost badge-sm">Nein</span>
									{/if}
								</td>
							{/if}
							{#if columnVisibility.inBalticSeaGeo}
								<td class="text-center">
									{#if sighting.inBalticSeaGeo}
										<span class="badge badge-info badge-sm">Ja</span>
									{:else}
										<span class="badge badge-ghost badge-sm">Nein</span>
									{/if}
								</td>
							{/if}
							{#if columnVisibility.verified}
								<td>
									<BaseToggle
										label="Verifiziert"
										name={`verified-${sighting.id}`}
										checked={!!sighting.verified}
										onchange={() => {
											toggleVerifiedStatus(sighting.id, !!sighting.verified);
										}}
									/>
								</td>
							{/if}
							{#if columnVisibility.actions}
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
										class="btn btn-ghost btn-xs"
										onclick={() => sendTestEmail(sighting.id)}
										title="Test-E-Mail senden"
										aria-label="Test-E-Mail senden"
									>
										<EnvelopeOutline class="h-4 w-4" />
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
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<div class="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row container mx-auto px-4 sm:px-6">
		<div class="flex items-center gap-2 text-center sm:text-left">
			<span class="text-sm font-medium">Einträge pro Seite:</span>
			<select
				class="select-bordered select select-sm min-h-8 text-sm"
				onchange={(e) => changeItemsPerPage(Number(e.currentTarget.value))}
			>
				{#each [10, 20, 50, 100].filter(size => size <= (data.pagination?.maxPerPage || 50)) as size (size)}
					<option value={size} selected={data.pagination.perPage === size}>{size}</option>
				{/each}
			</select>
		</div>

		<div class="join">
			<button
				class="btn join-item btn-sm min-h-10"
				onclick={() => changePage(1)}
				disabled={data.pagination.page === 1}
				title="Erste Seite"
			>
				«
			</button>
			<button
				class="btn join-item btn-sm min-h-10"
				onclick={() => changePage(data.pagination.page - 1)}
				disabled={data.pagination.page === 1}
				title="Vorherige Seite"
			>
				‹
			</button>

			<button class="btn btn-active join-item btn-sm min-h-10 min-w-32 text-xs sm:text-sm">
				{data.pagination.page} / {data.pagination.totalPages}
			</button>

			<button
				class="btn join-item btn-sm min-h-10"
				onclick={() => changePage(data.pagination.page + 1)}
				disabled={data.pagination.page === data.pagination.totalPages}
				title="Nächste Seite"
			>
				›
			</button>
			<button
				class="btn join-item btn-sm min-h-10"
				onclick={() => changePage(data.pagination.totalPages)}
				disabled={data.pagination.page === data.pagination.totalPages}
				title="Letzte Seite"
			>
				»
			</button>
		</div>

		<div class="text-base-content/70 text-center text-sm sm:text-right">
			{data.pagination.total} Einträge
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

	<ExportModal
		bind:show={showExportModal}
		currentFilters={currentFilters()}
		totalRecords={data.pagination?.total || 0}
	/>
</div>

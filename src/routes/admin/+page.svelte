<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import ExportModal from '$lib/components/admin/ExportModal.svelte';
	import {
		deleteSighting,
		sendTestEmail,
		TEST_EMAIL_HINT
	} from '$lib/components/admin/sightingActions';
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
	import { toast } from '$lib/stores/toastState.svelte';
	import type { FrontendSighting, PageData } from '$lib/types';
	import type { SpamCheckResult } from '$lib/types/spam';
	import { formatLocalDateTime } from '$lib/utils/format/dateTime';
	import Icon from '$lib/components/Icon.svelte';
	import {
		BALTIC_SEA_STATUS_PRESENTATION,
		getBalticSeaStatus
	} from '$lib/utils/geo/balticSeaStatus';
	import { MEDIA_UPLOAD_ANNOUNCED_MISSING } from '$lib/utils/media/photoAnnouncement';

	const logger = createLogger('SichtungenPage');

	let { data }: { data: PageData } = $props();

	// Reaktive States mit Runes
	let sightings = $derived(data.sightings);
	let fromDate = $state(page.url.searchParams.get('fromDate') || '');
	let toDate = $state(page.url.searchParams.get('toDate') || '');
	let verified = $state(page.url.searchParams.get('verified') || '');
	let selectedChannel = $state(page.url.searchParams.get('entryChannel') || 'all');
	let mediaUpload = $state(page.url.searchParams.get('mediaUpload') || '');
	let balticSea = $state(page.url.searchParams.get('balticSea') || '');
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
		balticSea: true,
		verified: true,
		actions: true
	});

	// Available columns configuration
	const availableColumns = [
		{ key: 'referenceId', label: 'Referenz-ID', sortKey: null },
		{ key: 'sightingDate', label: 'Sichtungsdatum', sortKey: 'sightingDate' },
		{ key: 'created', label: 'Meldedatum', sortKey: 'created' },
		{ key: 'email', label: 'E-Mail', sortKey: 'email' },
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
		{ key: 'balticSea', label: 'Ostsee', sortKey: null },
		{ key: 'verified', label: 'Geprüft', sortKey: null },
		{ key: 'actions', label: 'Aktionen', sortKey: null }
	];

	// Prüft ob irgendwelche Filter aktiv sind
	let hasActiveFilters = $derived(
		!!(
			fromDate ||
			toDate ||
			verified ||
			(selectedChannel && selectedChannel !== 'all') ||
			mediaUpload ||
			balticSea
		)
	);

	// Aktuelle Filter für Export-Modal
	let currentFilters = $derived.by(() => ({
		fromDate: fromDate || '',
		toDate: toDate || '',
		verified: verified || '',
		entryChannel: selectedChannel !== 'all' ? selectedChannel : '',
		mediaUpload: mediaUpload || '',
		balticSea: balticSea || ''
	}));

	function updateSort(column: string): void {
		const currentSort = page.url.searchParams.get('sort');
		const currentOrder = page.url.searchParams.get('order');

		const newOrder = currentSort === column && currentOrder === 'asc' ? 'desc' : 'asc';

		const url = new URL(page.url);
		url.searchParams.set('sort', column);
		url.searchParams.set('order', newOrder);
		goto(url);
	}

	function applyFilters(): void {
		const url = new URL(page.url);

		// Datum-Filter
		if (fromDate) url.searchParams.set('fromDate', fromDate);
		else url.searchParams.delete('fromDate');

		if (toDate) url.searchParams.set('toDate', toDate);
		else url.searchParams.delete('toDate');

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

		// Ostsee-Status-Filter
		if (balticSea) url.searchParams.set('balticSea', balticSea);
		else url.searchParams.delete('balticSea');

		url.searchParams.set('page', '1');
		goto(url);
	}

	/**
	 * Springt direkt zur Arbeitsliste „Foto angekündigt, fehlt noch"
	 * (siehe `$lib/utils/media/photoAnnouncement.ts`). Setzt nur den
	 * Aufnahme-Filter — andere aktive Filter bleiben erhalten, damit z. B. ein
	 * bereits gesetzter Datumsbereich nicht verloren geht.
	 */
	function showPendingPhotoAnnouncements(): void {
		mediaUpload = MEDIA_UPLOAD_ANNOUNCED_MISSING;
		isFilterPanelOpen = true;
		applyFilters();
	}

	function resetFilters(): void {
		fromDate = '';
		toDate = '';
		verified = '';
		selectedChannel = 'all';
		mediaUpload = '';
		balticSea = '';

		const url = new URL(page.url);
		url.searchParams.delete('fromDate');
		url.searchParams.delete('toDate');
		url.searchParams.delete('verified');
		url.searchParams.delete('entryChannel');
		url.searchParams.delete('mediaUpload');
		url.searchParams.delete('balticSea');
		url.searchParams.set('page', '1');
		goto(url);
	}

	function changePage(newPage: number): void {
		const url = new URL(page.url);
		url.searchParams.set('page', newPage.toString());
		goto(url);
	}

	function changeItemsPerPage(newPerPage: number): void {
		const url = new URL(page.url);
		url.searchParams.set('perPage', newPerPage.toString());
		url.searchParams.set('page', '1');
		goto(url);
	}

	function viewSightingDetails(sighting: FrontendSighting): void {
		// Preserve current filter parameters when navigating to detail view
		const currentParams = page.url.searchParams;
		const detailUrl = new URL(`/admin/${sighting.id}`, page.url.origin);

		// Copy current search parameters to maintain filters
		for (const [key, value] of currentParams.entries()) {
			detailUrl.searchParams.set(key, value);
		}

		goto(detailUrl.toString());
	}

	async function removeSighting(id: number): Promise<void> {
		if (await deleteSighting(id)) {
			// Reload data via SvelteKit's invalidation instead of full page reload
			await invalidateAll();
		}
	}

	let spamCheckModal = $state({
		open: false,
		loading: false,
		sightingId: null as number | null,
		result: null as SpamCheckResult | null,
		error: null as string | null
	});

	let spamCheckDialogElement = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		if (!spamCheckDialogElement) return;
		if (spamCheckModal.open && !spamCheckDialogElement.open) {
			spamCheckDialogElement.showModal();
		} else if (!spamCheckModal.open && spamCheckDialogElement.open) {
			spamCheckDialogElement.close();
		}
	});

	async function checkSpam(sightingId: number): Promise<void> {
		spamCheckModal.open = true;
		spamCheckModal.loading = true;
		spamCheckModal.sightingId = sightingId;
		spamCheckModal.result = null;
		spamCheckModal.error = null;
		try {
			const response = await fetch(`/api/sightings/${sightingId}/spam-check`);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			// Guard against race: discard response if user switched to a different sighting
			if (spamCheckModal.sightingId !== sightingId) return;
			const result = await response.json();
			// Second check: another switch may have occurred during json() parsing
			if (spamCheckModal.sightingId !== sightingId) return;
			spamCheckModal.result = result;
		} catch (err) {
			if (spamCheckModal.sightingId !== sightingId) return;
			logger.error({ err, sightingId }, 'Spam-Check fehlgeschlagen');
			spamCheckModal.error = 'Spam-Check fehlgeschlagen';
		} finally {
			if (spamCheckModal.sightingId === sightingId) {
				spamCheckModal.loading = false;
			}
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
				logger.info({ id, result }, 'Prüfstatus erfolgreich geändert');

				// Daten vom Server neu laden
				await invalidateAll();
			} else {
				const error = await response.json();
				logger.error({ id, error }, 'Fehler beim Ändern des Prüfstatus');
				toast.error(error.error || 'Prüfstatus konnte nicht geändert werden', {
					title: 'Fehler',
					dismissible: true
				});
				// Toggle springt zurück: Daten neu laden, damit UI den echten Serverzustand zeigt
				await invalidateAll();
			}
		} catch (error) {
			logger.error({ id, error }, 'Netzwerkfehler beim Ändern des Prüfstatus');
			toast.error('Netzwerkfehler beim Ändern des Prüfstatus', {
				title: 'Verbindungsfehler',
				dismissible: true
			});
			await invalidateAll();
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

<div class="pt-6">
	<!-- Page Header -->
	<div class="container mx-auto mb-6 px-4 sm:px-6">
		<!--
			Arbeitslisten-Hinweis „Foto angekündigt, fehlt noch"
			(siehe $lib/utils/media/photoAnnouncement.ts). Echter `btn btn-outline`
			statt eines mit `onclick` klickbar gemachten `badge`: Nur `.btn` bzw.
			`summary.btn` bekommen über app.css automatisch die 44px-Touch-Target-
			Mindestgröße (design-system.md „Feldmodus und Touch-Targets") — ein
			`badge` bleibt bei ~24px hoch und wäre auf der Mobile-Kartenansicht
			dieser Seite nicht zuverlässig zu treffen. `btn-outline` statt eines
			vollton-farbigen `btn-info`, weil Vollton-Sekundärbuttons neben der
			Primäraktion „Export" optisch mit ihr konkurrieren würden (Button-
			Hierarchie-Regel); die Statusfarbe trägt stattdessen nur das Icon
			(`text-info-strong`, AA-geprüft laut tokens.css).
		-->
		{#snippet pendingPhotoBadge()}
			<button
				type="button"
				class="btn btn-sm btn-outline"
				onclick={showPendingPhotoAnnouncements}
				title="Sichtungen mit angekündigtem, aber noch nicht eingetroffenem Foto anzeigen"
			>
				<Icon icon="lucide:camera" class="text-info-strong mr-1 h-4 w-4" aria-hidden="true" />
				{data.pendingPhotoAnnouncements} Foto{data.pendingPhotoAnnouncements === 1 ? '' : 's'} ausstehend
			</button>
		{/snippet}

		<!-- Mobile Layout -->
		<div class="block space-y-3 sm:hidden">
			<h1 class="text-2xl font-bold">Sichtungen</h1>
			<div class="flex flex-col gap-2">
				<div class="flex items-center gap-2">
					<button
						class="btn btn-sm flex-1 {isFilterPanelOpen
							? 'btn-accent'
							: hasActiveFilters
								? 'btn-primary'
								: 'btn-outline'}"
						onclick={() => (isFilterPanelOpen = !isFilterPanelOpen)}
						title="Filter ein-/ausblenden"
					>
						<Icon icon="lucide:filter" class="mr-1 h-4 w-4" />
						Filter
						{#if hasActiveFilters}
							<span class="badge badge-accent badge-sm ml-1">•</span>
						{/if}
					</button>
					<button
						class="btn btn-sm btn-primary flex-1"
						onclick={() => (showExportModal = true)}
						title="Sichtungen exportieren"
						disabled={!data.pagination?.total}
					>
						<Icon icon="lucide:download" class="mr-1 h-4 w-4" />
						Export
					</button>
				</div>
				{#if (data.pagination && data.pagination.total) || data.pendingPhotoAnnouncements}
					<div class="flex flex-wrap items-center justify-center gap-2">
						{#if data.pagination && data.pagination.total}
							<span class="badge badge-outline text-sm">{data.pagination.total} Ergebnisse</span>
						{/if}
						{#if data.pendingPhotoAnnouncements}
							{@render pendingPhotoBadge()}
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Desktop Layout -->
		<div class="hidden items-center justify-between sm:flex">
			<h1 class="text-2xl font-bold">Sichtungen</h1>
			<div class="flex items-center gap-2">
				<details
					class="dropdown dropdown-end"
					bind:open={showColumnDropdown}
					onblur={(e) => {
						// Close when focus leaves the details element entirely
						const related = (e as FocusEvent).relatedTarget as Element | null;
						if (related && !(e.currentTarget as Element).contains(related)) {
							showColumnDropdown = false;
						}
					}}
				>
					<summary class="btn btn-sm btn-outline" title="Spalten ein-/ausblenden">
						<Icon icon="lucide:columns" class="mr-1 h-4 w-4" />
						Spalten
					</summary>
					<div
						class="dropdown-content menu bg-base-100 rounded-box border-base-300 z-[1] mt-1 w-64 border p-2 shadow-lg"
					>
						<div class="menu-title flex items-center justify-between pb-2">
							<span class="text-sm font-semibold">Spalten anzeigen</span>
							<button
								class="btn btn-ghost btn-xs"
								onclick={() => (showColumnDropdown = false)}
								aria-label="Spalten-Dropdown schließen"
								title="Schließen"
							>
								<Icon icon="lucide:x" class="h-3 w-3" />
							</button>
						</div>
						<div class="max-h-80 overflow-y-auto">
							{#each availableColumns as column (column.key)}
								<label class="hover:bg-base-200 flex cursor-pointer items-center gap-2 rounded p-1">
									<input
										type="checkbox"
										class="checkbox checkbox-sm"
										bind:checked={columnVisibility[column.key as keyof typeof columnVisibility]}
									/>
									<span class="flex-1 text-sm">{column.label}</span>
								</label>
							{/each}
						</div>
					</div>
				</details>
				<button
					class="btn btn-sm {isFilterPanelOpen
						? 'btn-accent'
						: hasActiveFilters
							? 'btn-primary'
							: 'btn-outline'}"
					onclick={() => (isFilterPanelOpen = !isFilterPanelOpen)}
					title="Filter ein-/ausblenden"
				>
					<Icon icon="lucide:filter" class="mr-1 h-4 w-4" />
					Filter
					{#if hasActiveFilters}
						<span class="badge badge-accent badge-sm ml-1">•</span>
					{/if}
				</button>
				<button
					class="btn btn-sm btn-primary"
					onclick={() => (showExportModal = true)}
					title="Sichtungen exportieren"
					disabled={!data.pagination?.total}
				>
					<Icon icon="lucide:download" class="mr-1 h-4 w-4" />
					Export
				</button>
				{#if data.pendingPhotoAnnouncements}
					{@render pendingPhotoBadge()}
				{/if}
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
		<div
			class="bg-base-200 container mx-auto mb-4 rounded-lg p-3 px-4 shadow-sm transition-all duration-300 sm:px-6"
		>
			<div class="mb-2 flex items-center justify-between">
				<h2 class="text-base font-semibold">Filter</h2>
				<button
					class="btn btn-ghost btn-xs"
					onclick={() => (isFilterPanelOpen = false)}
					title="Filter ausblenden"
					aria-label="Filter ausblenden"
				>
					<Icon icon="lucide:x" class="h-4 w-4" />
				</button>
			</div>
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
				<div class="fieldset w-full">
					<label for="fromDate" class="label py-0">
						<span class="text-xs">Von</span>
					</label>
					<input
						type="date"
						id="fromDate"
						name="fromDate"
						class="input input-sm w-full"
						bind:value={fromDate}
					/>
				</div>
				<div class="fieldset w-full">
					<label for="toDate" class="label py-0">
						<span class="text-xs">Bis</span>
					</label>
					<input
						type="date"
						id="toDate"
						name="toDate"
						class="input input-sm w-full"
						bind:value={toDate}
					/>
				</div>
				<div class="fieldset w-full">
					<label for="verified" class="label py-0">
						<span class="text-xs">Status</span>
					</label>
					<select
						id="verified"
						name="verified"
						class="select select-sm w-full text-sm"
						bind:value={verified}
					>
						<option value="">Alle</option>
						<option value="1">Geprüft</option>
						<option value="0">Ungeprüft</option>
					</select>
				</div>
				<div class="fieldset w-full">
					<label for="entryChannel" class="label py-0">
						<span class="text-xs">Kanal</span>
					</label>
					<select
						id="entryChannel"
						name="entryChannel"
						class="select select-sm w-full text-sm"
						bind:value={selectedChannel}
					>
						<option value="all">Alle</option>
						{#each getEntryChannelOptions() as { value, label } (value)}
							<option value={String(value)}>{label}</option>
						{/each}
					</select>
				</div>
				<div class="fieldset w-full">
					<label for="mediaUpload" class="label py-0">
						<span class="text-xs">Aufnahme</span>
					</label>
					<select
						id="mediaUpload"
						name="mediaUpload"
						class="select select-sm w-full text-sm"
						bind:value={mediaUpload}
					>
						<option value="">Alle</option>
						<option value="1">Mit</option>
						<option value="0">Ohne</option>
						<option value={MEDIA_UPLOAD_ANNOUNCED_MISSING}>Angekündigt, fehlt noch</option>
					</select>
				</div>
				<div class="fieldset w-full">
					<label for="balticSea" class="label py-0">
						<span class="text-xs">Ostsee</span>
					</label>
					<select
						id="balticSea"
						name="balticSea"
						class="select select-sm w-full text-sm"
						bind:value={balticSea}
					>
						<option value="">Alle</option>
						{#each Object.entries(BALTIC_SEA_STATUS_PRESENTATION) as [value, presentation] (value)}
							<option {value}>{presentation.label}</option>
						{/each}
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
	<div class="container mx-auto block space-y-3 px-4 sm:px-6 md:hidden">
		{#each sightings as sighting (sighting.id)}
			{@const balticSea = BALTIC_SEA_STATUS_PRESENTATION[getBalticSeaStatus(sighting)]}
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
							<span class="text-base-content/70 text-sm">Keine Referenz</span>
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
							<Icon icon="lucide:eye" class="h-4 w-4" />
						</button>
						<!-- Nur Superadmins: Der Klick erzeugt im Team-Postfach eine Mail, die
						     von einer echten Neu-Meldung nicht zu unterscheiden ist. Das Gate
						     steht zusätzlich am Endpunkt — hier verschwindet nur das Bedienelement. -->
						{#if data.isSuperAdmin}
							<button
								class="btn btn-ghost btn-sm"
								onclick={() => sendTestEmail(sighting.id)}
								title={TEST_EMAIL_HINT}
								aria-label="Benachrichtigung zu dieser Sichtung an das Team senden"
							>
								<Icon icon="lucide:mail" class="h-4 w-4" />
							</button>
						{/if}
						<button
							class="btn btn-ghost btn-sm"
							onclick={() => checkSpam(sighting.id)}
							title="Spam-Check"
							aria-label="Spam-Check durchführen"
						>
							<Icon icon="lucide:shield-alert" class="h-4 w-4" />
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
							<Icon icon="lucide:trash-2" class="h-4 w-4" />
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
					<!-- Anders als Aufnahme/Totfund immer sichtbar: „außerhalb" und „ohne
					     Position" sind für die Triage genauso relevant wie „Ostsee", ein
					     fehlendes Badge wäre hier also keine Aussage. -->
					<span
						class="badge badge-sm {balticSea.badgeClass} whitespace-nowrap"
						title={balticSea.title}
					>
						{balticSea.label}
					</span>
				</div>

				<div class="mt-3 flex items-center justify-between">
					<span class="text-base-content/70 text-xs">
						Gemeldet: {formatLocalDateTime(sighting.created)}
					</span>
					<BaseToggle
						label="Geprüft"
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

	<!-- Sortierbarer Spaltenkopf: <button> im <th> mit aria-sort für Screenreader -->
	{#snippet sortableTh(label: string, key: string)}
		{@const isActive = page.url.searchParams.get('sort') === key}
		{@const isDesc = page.url.searchParams.get('order') === 'desc'}
		<th class="p-0" aria-sort={isActive ? (isDesc ? 'descending' : 'ascending') : 'none'}>
			<button
				type="button"
				class="hover:bg-base-300 flex w-full items-center gap-1 px-4 py-3 text-left font-semibold"
				onclick={() => updateSort(key)}
			>
				{label}
				{#if isActive}
					<span aria-hidden="true">{isDesc ? '↓' : '↑'}</span>
				{/if}
			</button>
		</th>
	{/snippet}

	<!-- Desktop Table Layout -->
	<div class="hidden px-2 sm:px-4 md:block">
		<div class="border-base-300 bg-base-100 w-full overflow-x-auto rounded-lg border shadow-sm">
			<table class="table-zebra table w-full">
				<thead class="bg-base-200 text-base-content">
					<tr>
						{#if columnVisibility.referenceId}
							<th class="hover:bg-base-300">Referenz-ID</th>
						{/if}
						{#if columnVisibility.sightingDate}
							{@render sortableTh('Sichtungsdatum', 'sightingDate')}
						{/if}
						{#if columnVisibility.created}
							{@render sortableTh('Meldedatum', 'created')}
						{/if}
						{#if columnVisibility.email}
							{@render sortableTh('E-Mail', 'email')}
						{/if}
						{#if columnVisibility.species}
							{@render sortableTh('Tierart', 'species')}
						{/if}
						{#if columnVisibility.distance}
							{@render sortableTh('Entfernung', 'distance')}
						{/if}
						{#if columnVisibility.totalCount}
							{@render sortableTh('Anzahl', 'totalCount')}
						{/if}
						{#if columnVisibility.juvenileCount}
							{@render sortableTh('Jung', 'juvenileCount')}
						{/if}
						{#if columnVisibility.distribution}
							{@render sortableTh('Verteilung', 'distribution')}
						{/if}
						{#if columnVisibility.behavior}
							{@render sortableTh('Verhalten', 'behavior')}
						{/if}
						{#if columnVisibility.seaState}
							{@render sortableTh('Seegang', 'seaState')}
						{/if}
						{#if columnVisibility.wind}
							{@render sortableTh('Wind', 'wind')}
						{/if}
						{#if columnVisibility.visibility}
							{@render sortableTh('Sichtweite', 'visibility')}
						{/if}
						{#if columnVisibility.mediaUpload}
							<th class="hover:bg-base-300">Aufnahme</th>
						{/if}
						{#if columnVisibility.isDead}
							<th class="hover:bg-base-300">Totfund</th>
						{/if}
						{#if columnVisibility.balticSea}
							<th class="hover:bg-base-300">Ostsee</th>
						{/if}
						{#if columnVisibility.verified}
							<th class="hover:bg-base-300">Geprüft</th>
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
										<span class="text-base-content/70">—</span>
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
								<td
									>{getWindStrengthLabel(
										sighting.windForce ? Number(sighting.windForce) : undefined
									) || '—'}</td
								>
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
							{#if columnVisibility.balticSea}
								{@const balticSea = BALTIC_SEA_STATUS_PRESENTATION[getBalticSeaStatus(sighting)]}
								<td class="text-center">
									<!-- whitespace-nowrap: „ohne Position" bricht in der schmalen Spalte sonst
									     um und läuft aus dem Badge heraus, der Rahmen schneidet durch den Text. -->
									<span
										class="badge badge-sm {balticSea.badgeClass} whitespace-nowrap"
										title={balticSea.title}
									>
										{balticSea.label}
									</span>
								</td>
							{/if}
							{#if columnVisibility.verified}
								<!-- whitespace-nowrap: BaseToggle gibt seinem Label `overflow-wrap: anywhere`
								     und `hyphens: auto` mit (bis 2026-08-04 `break-word`) — im Formular
								     richtig, hier nicht: Die Tabelle staucht die Spalte damit unter die
								     Wortbreite und trennt „Ge-/prüft".
								     Die Sperre steht an der Zelle und nicht in der Komponente, damit lange
								     Labels in der Bearbeitungsmaske weiter umbrechen dürfen. -->
								<td class="whitespace-nowrap">
									<BaseToggle
										label="Geprüft"
										name={`verified-${sighting.id}`}
										checked={!!sighting.verified}
										onchange={() => {
											toggleVerifiedStatus(sighting.id, !!sighting.verified);
										}}
									/>
								</td>
							{/if}
							{#if columnVisibility.actions}
								<td class="w-px whitespace-nowrap">
									<!-- flex-nowrap: sonst brechen die 44px hohen Buttons um und ziehen die Zeile auf -->
									<div class="flex flex-nowrap items-center gap-1">
										<button
											class="btn btn-ghost btn-xs"
											onclick={() => viewSightingDetails(sighting)}
											title="Details anzeigen"
											aria-label="Details anzeigen"
										>
											<Icon icon="lucide:eye" class="h-4 w-4" />
										</button>
										<!-- Nur Superadmins — Begründung an der Kartenansicht weiter oben. -->
										{#if data.isSuperAdmin}
											<button
												class="btn btn-ghost btn-xs"
												onclick={() => sendTestEmail(sighting.id)}
												title={TEST_EMAIL_HINT}
												aria-label="Benachrichtigung zu dieser Sichtung an das Team senden"
											>
												<Icon icon="lucide:mail" class="h-4 w-4" />
											</button>
										{/if}
										<button
											class="btn btn-ghost btn-xs"
											onclick={() => checkSpam(sighting.id)}
											title="Spam-Check"
											aria-label="Spam-Check durchführen"
										>
											<Icon icon="lucide:shield-alert" class="h-4 w-4" />
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
											<Icon icon="lucide:trash-2" class="h-4 w-4" />
										</button>
									</div>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<div
		class="container mx-auto mt-6 flex flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6"
	>
		<div class="flex items-center gap-2 text-center sm:text-left">
			<span class="text-sm font-medium">Einträge pro Seite:</span>
			<select
				class="select select-sm min-h-8 text-sm"
				onchange={(e) => changeItemsPerPage(Number(e.currentTarget.value))}
			>
				{#each [10, 20, 50, 100].filter((size) => size <= (data.pagination?.maxPerPage || 50)) as size (size)}
					<option value={size} selected={data.pagination.perPage === size}>{size}</option>
				{/each}
			</select>
		</div>

		<div class="join">
			<button
				class="btn join-item btn-sm"
				onclick={() => changePage(1)}
				disabled={data.pagination.page === 1}
				title="Erste Seite"
			>
				«
			</button>
			<button
				class="btn join-item btn-sm"
				onclick={() => changePage(data.pagination.page - 1)}
				disabled={data.pagination.page === 1}
				title="Vorherige Seite"
			>
				‹
			</button>

			<button class="btn btn-active join-item btn-sm min-w-32 text-xs sm:text-sm">
				{data.pagination.page} / {data.pagination.totalPages}
			</button>

			<button
				class="btn join-item btn-sm"
				onclick={() => changePage(data.pagination.page + 1)}
				disabled={data.pagination.page === data.pagination.totalPages}
				title="Nächste Seite"
			>
				›
			</button>
			<button
				class="btn join-item btn-sm"
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
				removeSighting(sightingToDelete.id);
			}
		}}
		onCancel={() => {
			showDeleteDialog = false;
			sightingToDelete = null;
		}}
	/>

	<ExportModal
		bind:show={showExportModal}
		{currentFilters}
		totalRecords={data.pagination?.total || 0}
	/>
</div>

<!-- Native dialog element with showModal()/close() for proper focus management and ESC handling -->
<dialog
	bind:this={spamCheckDialogElement}
	class="modal"
	aria-labelledby="spam-check-modal-title"
	onclose={() => (spamCheckModal.open = false)}
>
	<div class="modal-box max-w-lg">
		<h3 id="spam-check-modal-title" class="text-lg font-bold">Spam-Analyse</h3>

		{#if spamCheckModal.loading}
			<div class="flex justify-center py-8">
				<span class="loading loading-spinner loading-md"></span>
			</div>
		{:else if spamCheckModal.error}
			<div class="alert alert-error mt-4" role="alert">
				<Icon icon="lucide:circle-alert" class="shrink-0" aria-hidden="true" />
				<span>{spamCheckModal.error}</span>
			</div>
		{:else if spamCheckModal.result}
			<!-- Score badges -->
			<div class="mt-4 flex flex-wrap gap-2">
				<span
					class="badge {spamCheckModal.result.isHighRisk
						? 'badge-error'
						: spamCheckModal.result.score >= 2
							? 'badge-warning'
							: 'badge-success'}"
				>
					Heuristik-Score: {spamCheckModal.result.score}
				</span>
				{#if spamCheckModal.result.isHighRisk}
					<span class="badge badge-error">Hochrisiko</span>
				{:else}
					<span class="badge badge-success">Kein Hochrisiko</span>
				{/if}
			</div>
			<!-- Indicators list -->
			{#if spamCheckModal.result.indicators.length > 0}
				<p class="mt-4 font-semibold">Indikatoren:</p>
				<ul class="mt-1 list-inside list-disc text-sm">
					{#each spamCheckModal.result.indicators as indicator (indicator)}
						<li>{indicator}</li>
					{/each}
				</ul>
			{:else}
				<p class="text-success-strong mt-4 text-sm">Keine Indikatoren gefunden.</p>
			{/if}
		{/if}

		<div class="modal-action">
			<button class="btn" onclick={() => (spamCheckModal.open = false)}>Schließen</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button aria-label="Modal schließen" onclick={() => (spamCheckModal.open = false)}>
			<span class="sr-only">Modal schließen</span>
		</button>
	</form>
</dialog>

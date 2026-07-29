<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { getDaysInYear } from '$lib/map/dateUtils';
	import MapPanel from './MapPanel.svelte';

	let {
		years = [],
		defaultYear,
		yearCounts = {},
		isLoading = false,
		// H6: Parent blendet die Toggle-Tabs auf Mobile aus, solange ein Sheet offen ist
		toggleHidden = false,
		// H5: bindable, damit Tastaturkürzel im Parent das Panel direkt über
		// den State steuern können statt über DOM-Queries.
		isOpen = $bindable(false)
	} = $props<{
		years?: number[];
		defaultYear?: number;
		yearCounts?: Record<number, number>;
		isLoading?: boolean;
		toggleHidden?: boolean;
		isOpen?: boolean;
	}>();

	// Explizite User-Auswahl (undefined = noch keine manuelle Wahl getroffen)
	let userSelectedYear: number | undefined = $state(undefined);
	// Effektiv gewähltes Jahr: User-Auswahl hat Vorrang, sonst Prop-Default
	let selectedYear = $derived(
		userSelectedYear ?? defaultYear ?? years.at(-1) ?? new Date().getFullYear()
	);
	let searchValue = $state('');

	let daysInYear = $derived(getDaysInYear(selectedYear));

	function handleYearChange(e: Event) {
		const year = parseInt((e.target as HTMLSelectElement).value, 10);
		if (!isNaN(year)) userSelectedYear = year;
	}
</script>

<MapPanel
	panelId="filter-panel"
	titleId="filter-title"
	title="Filter"
	toggleText="FILTER"
	icon="lucide:filter"
	togglePositionClass="top-20"
	accentBorderClass="border-primary/20"
	{isLoading}
	{toggleHidden}
	bind:isOpen
>
	<div class="space-y-4">
		<div class="fieldset w-full">
			<label for="year-select" class="label py-1">
				<span class="text-sm font-medium">Jahr</span>
				{#if isLoading}
					<Icon icon="lucide:loader-2" class="text-primary ml-2 h-3 w-3 animate-spin" />
				{/if}
			</label>
			<select
				id="year-select"
				class="select select-sm focus:select-primary w-full text-sm {isLoading ? 'loading' : ''}"
				title="Wählen Sie das Jahr aus, für das Sichtungen angezeigt werden sollen"
				onchange={handleYearChange}
			>
				{#each years.toReversed() as year (year)}
					<option value={year} selected={year === selectedYear}>
						{yearCounts[year] ? `${year} (${yearCounts[year]})` : year}
					</option>
				{/each}
			</select>
		</div>

		<div class="fieldset w-full">
			<label for="filter-input" class="label py-1">
				<span class="text-sm font-medium">Suchen</span>
			</label>
			<div class="relative">
				<input
					id="filter-input"
					type="text"
					bind:value={searchValue}
					placeholder="Fahrwasser, Schiffsname, Name…"
					class="input input-sm focus:input-primary w-full pr-10"
					title="Nach Fahrwasser, Seezeichen, Schiffsname oder Name filtern. Filtert automatisch beim Tippen."
					aria-describedby="filter-help"
				/>
				{#if isLoading}
					<div class="absolute top-1/2 right-3 -translate-y-1/2 transform">
						<Icon icon="lucide:loader-2" class="text-primary h-4 w-4 animate-spin" />
					</div>
				{/if}
			</div>
			<!-- Hilfetext ist über aria-describedby verknüpft — bewusst kein zweites
			     <label>, sonst würde er zusätzlich in den Accessible Name einfließen -->
			<div class="label py-0">
				<span id="filter-help" class="text-base-content/60 text-xs">
					{isLoading ? 'Filter wird angewendet...' : 'Filtert automatisch beim Tippen'}
				</span>
			</div>
		</div>

		<div class="space-y-3">
			<div class="label py-1">
				<span class="text-sm font-medium">Zeitraum</span>
			</div>

			<div class="space-y-3">
				<div>
					<label class="label py-0" for="time-range-start">
						<span class="text-xs">Start</span>
					</label>
					<input
						type="range"
						id="time-range-start"
						class="range range-primary range-xs"
						min="0"
						max={daysInYear - 1}
						value="0"
					/>
					<div class="mt-1">
						<div
							id="time-start"
							class="bg-base-200 rounded px-2 py-1 text-center text-xs font-medium"
						></div>
					</div>
				</div>

				<div>
					<label class="label py-0" for="time-range-end">
						<span class="text-xs">Ende</span>
					</label>
					<input
						type="range"
						id="time-range-end"
						class="range range-primary range-xs"
						min="0"
						max={daysInYear - 1}
						value={daysInYear - 1}
					/>
					<div class="mt-1">
						<div
							id="time-end"
							class="bg-base-200 rounded px-2 py-1 text-center text-xs font-medium"
						></div>
					</div>
				</div>
			</div>
		</div>
	</div>
</MapPanel>

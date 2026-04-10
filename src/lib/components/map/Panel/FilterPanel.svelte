<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { getDaysInYear } from '$lib/map/dateUtils';

	let { years = [], defaultYear } = $props<{
		years?: number[];
		defaultYear?: number;
	}>();

	// Reactive state für Panel-Sichtbarkeit (Svelte 5 runes)
	let isOpen = $state(false);
	let isApplyingFilter = $state(false);
	// Explizite User-Auswahl (undefined = noch keine manuelle Wahl getroffen)
	let userSelectedYear: number | undefined = $state(undefined);
	// Effektiv gewähltes Jahr: User-Auswahl hat Vorrang, sonst Prop-Default
	let selectedYear = $derived(
		userSelectedYear ?? defaultYear ?? years.at(-1) ?? new Date().getFullYear()
	);
	let searchValue = $state('');

	let daysInYear = $derived(getDaysInYear(selectedYear));

	// Toggle-Funktion für das Panel
	function togglePanel() {
		isOpen = !isOpen;
	}

	// Schließe Panel
	function closePanel() {
		isOpen = false;
	}

	// Kurze visuelle Rückmeldung bei Filter-Änderung
	let filterFeedbackTimeout: ReturnType<typeof setTimeout> | null = null;
	function handleFilterApply() {
		isApplyingFilter = true;
		if (filterFeedbackTimeout) clearTimeout(filterFeedbackTimeout);
		filterFeedbackTimeout = setTimeout(() => {
			isApplyingFilter = false;
			filterFeedbackTimeout = null;
		}, 800);
	}

	function handleYearChange(e: Event) {
		const year = parseInt((e.target as HTMLSelectElement).value, 10);
		if (!isNaN(year)) userSelectedYear = year;
		handleFilterApply();
	}
</script>

<!-- Toggle Button (always visible) -->
<button
	onclick={togglePanel}
	class="glass text-base-content hover:bg-base-200 border-primary/20 fixed top-20 right-0 z-50 flex h-32 w-8 cursor-pointer flex-col items-center justify-center rounded-l-lg border-2 border-r-0 shadow-xl backdrop-blur-sm transition-all duration-300 sm:w-12 md:w-8"
	style="transform: translateX({isOpen ? '-400px' : '0px'});"
	aria-label="Filter {isOpen ? 'schließen' : 'öffnen'}"
>
	<Icon
		icon={isApplyingFilter ? 'lucide:loader-2' : 'lucide:filter'}
		class="mb-1 h-4 w-4 {isApplyingFilter ? 'animate-spin' : ''}"
	/>
	<div
		class="text-xs whitespace-nowrap"
		style="writing-mode: vertical-rl; text-orientation: mixed;"
	>
		FILTER
	</div>
</button>

<!-- Panel Container -->
<div
	class="glass border-primary/20 fixed top-20 right-0 z-40 h-full w-100 overflow-hidden border-l-2 pr-8 shadow-2xl backdrop-blur-sm transition-transform duration-300 ease-in-out"
	style="transform: translateX({isOpen ? '0px' : '100%'});"
	role="dialog"
	aria-modal="true"
	aria-labelledby="filter-title"
	aria-hidden={!isOpen}
>
	<div class="scroll-styled h-full overflow-y-auto">
		<div class="p-4">
			<div class="mb-3 flex items-center justify-between">
				<h2 id="filter-title" class="text-lg font-bold">Filter</h2>
				<button
					onclick={closePanel}
					class="btn btn-ghost btn-xs hover:bg-base-200"
					aria-label="Filter schließen"
				>
					<Icon icon="lucide:square-x" class="h-4 w-4" />
				</button>
			</div>

			<div class="space-y-4">
				<div class="form-control w-full">
					<label for="year-select" class="label py-1">
						<span class="label-text text-sm font-medium">Jahr</span>
						{#if isApplyingFilter}
							<Icon icon="lucide:loader-2" class="text-primary ml-2 h-3 w-3 animate-spin" />
						{/if}
					</label>
					<select
						id="year-select"
						class="select select-bordered select-sm focus:select-primary w-full text-sm {isApplyingFilter
							? 'loading'
							: ''}"
						title="Wählen Sie das Jahr aus, für das Sichtungen angezeigt werden sollen"
						onchange={handleYearChange}
						disabled={isApplyingFilter}
					>
						{#each years.toReversed() as year (year)}
							<option value={year} selected={year === selectedYear}>{year}</option>
						{/each}
					</select>
				</div>

				<div class="form-control w-full">
					<label for="filter-input" class="label py-1">
						<span class="label-text text-sm font-medium">Suchen</span>
					</label>
					<div class="relative">
						<input
							id="filter-input"
							type="text"
							bind:value={searchValue}
							placeholder="E-Mail, Name, Schiff..."
							class="input input-bordered input-sm focus:input-primary w-full pr-10"
							title="Nach E-Mail, Schiffsname, Name oder Vorname filtern (Return zum filtern)."
							aria-describedby="filter-help"
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									handleFilterApply();
								}
							}}
						/>
						{#if isApplyingFilter}
							<div class="absolute top-1/2 right-3 -translate-y-1/2 transform">
								<Icon icon="lucide:loader-2" class="text-primary h-4 w-4 animate-spin" />
							</div>
						{/if}
					</div>
					<label class="label py-0" for="filter-input">
						<span id="filter-help" class="label-text-alt text-base-content/60 text-xs">
							{isApplyingFilter ? 'Filter wird angewendet...' : 'Enter-Taste zum Filtern drücken'}
						</span>
					</label>
				</div>

				<div class="space-y-3">
					<div class="label py-1">
						<span class="label-text text-sm font-medium">Zeitraum</span>
					</div>

					<div class="space-y-3">
						<div>
							<label class="label py-0" for="time-range-start">
								<span class="label-text-alt text-xs">Start</span>
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
								<span class="label-text-alt text-xs">Ende</span>
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
		</div>
	</div>
</div>

<!-- Scrollbar styles sind jetzt global in app.css definiert -->

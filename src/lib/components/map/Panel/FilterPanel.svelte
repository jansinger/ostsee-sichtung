<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { getDaysInYear } from '$lib/map/dateUtils';
	import { focusPanelHeading, returnFocusToToggle } from '$lib/map/panelFocus';

	let {
		years = [],
		defaultYear,
		yearCounts = {},
		isLoading = false,
		// H5: bindable, damit Tastaturkürzel im Parent das Panel direkt über
		// den State steuern können statt über DOM-Queries.
		isOpen = $bindable(false)
	} = $props<{
		years?: number[];
		defaultYear?: number;
		yearCounts?: Record<number, number>;
		isLoading?: boolean;
		isOpen?: boolean;
	}>();

	// Element-Referenzen für das Fokus-Management (H5)
	let panelEl = $state<HTMLDivElement>();
	let toggleEl = $state<HTMLButtonElement>();
	let headingEl = $state<HTMLHeadingElement>();

	// H5: Fokus folgt dem Panel-Zustand — beim Öffnen auf die Überschrift,
	// beim Schließen zurück zum Toggle. Läuft auch, wenn der Zustand von
	// außen (Tastaturkürzel im Parent) geändert wird.
	let wasOpen = false;
	$effect(() => {
		if (isOpen === wasOpen) return;
		wasOpen = isOpen;
		if (isOpen) {
			focusPanelHeading(headingEl);
		} else {
			returnFocusToToggle(panelEl, toggleEl);
		}
	});
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

	function handleYearChange(e: Event) {
		const year = parseInt((e.target as HTMLSelectElement).value, 10);
		if (!isNaN(year)) userSelectedYear = year;
	}
</script>

<!-- Toggle Button (always visible) -->
<button
	bind:this={toggleEl}
	onclick={togglePanel}
	class="glass text-base-content hover:bg-base-200 border-primary/20 fixed top-20 right-0 z-50 flex h-32 w-8 cursor-pointer flex-col items-center justify-center rounded-l-lg border-2 border-r-0 shadow-xl backdrop-blur-sm transition-all duration-300 sm:w-12 md:w-8"
	style="transform: translateX({isOpen ? 'calc(-1 * min(400px, 100vw))' : '0px'});"
	aria-label="Filter"
	aria-expanded={isOpen}
	aria-controls="filter-panel"
>
	<Icon
		icon={isLoading ? 'lucide:loader-2' : 'lucide:filter'}
		class="mb-1 h-4 w-4 {isLoading ? 'animate-spin' : ''}"
	/>
	<div
		class="text-xs whitespace-nowrap"
		style="writing-mode: vertical-rl; text-orientation: mixed;"
	>
		FILTER
	</div>
</button>

<!-- Panel Container: nicht-modales Seitenpanel (H5) — role="region" statt
     Fake-Dialog; inert nimmt das geschlossene (nur verschobene) Panel samt
     seiner 18 fokussierbaren Elemente aus Tab-Zyklus und Accessibility-Tree. -->
<div
	bind:this={panelEl}
	id="filter-panel"
	class="glass border-primary/20 fixed top-20 right-0 z-40 h-full w-100 max-w-[100vw] overflow-hidden border-l-2 pr-8 shadow-2xl backdrop-blur-sm transition-transform duration-300 ease-in-out"
	style="transform: translateX({isOpen ? '0px' : '100%'});"
	role="region"
	aria-labelledby="filter-title"
	inert={!isOpen}
>
	<div class="scroll-styled h-full overflow-y-auto">
		<div class="p-4">
			<div class="mb-3 flex items-center justify-between">
				<!-- tabindex="-1": Fokusziel beim Öffnen des Panels (H5) -->
				<h2 id="filter-title" tabindex="-1" bind:this={headingEl} class="text-lg font-bold">
					Filter
				</h2>
				<button
					onclick={closePanel}
					class="btn btn-ghost btn-xs hover:bg-base-200"
					aria-label="Filter schließen"
				>
					<Icon icon="lucide:square-x" class="h-4 w-4" />
				</button>
			</div>

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
						class="select select-sm focus:select-primary w-full text-sm {isLoading
							? 'loading'
							: ''}"
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
					<label class="label py-0" for="filter-input">
						<span id="filter-help" class="text-base-content/60 text-xs">
							{isLoading ? 'Filter wird angewendet...' : 'Filtert automatisch beim Tippen'}
						</span>
					</label>
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
		</div>
	</div>
</div>

<!-- Scrollbar styles sind jetzt global in app.css definiert -->

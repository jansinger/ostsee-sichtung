<script lang="ts">
	import { Filter, SquareX } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';

	let { years = [] } = $props<{
		years?: number[];
	}>();

	// Reactive state für Panel-Sichtbarkeit (Svelte 5 runes)
	let isOpen = $state(false);

	// Toggle-Funktion für das Panel
	function togglePanel() {
		isOpen = !isOpen;
	}

	// Schließe Panel
	function closePanel() {
		isOpen = false;
	}
</script>

<!-- Toggle Button (always visible) -->
<button
	onclick={togglePanel}
	class="bg-primary text-primary-content hover:bg-primary-focus fixed top-20 right-0 z-50 flex h-32 w-8 cursor-pointer flex-col items-center justify-center rounded-l-lg shadow-lg transition-transform duration-300 sm:w-12 md:w-8"
	style="transform: translateX({isOpen ? '-360px' : '0px'});"
	aria-label="Filter {isOpen ? 'schließen' : 'öffnen'}"
>
	<Icon src={Filter} class="mb-1 h-4 w-4" />
	<div
		class="text-xs whitespace-nowrap"
		style="writing-mode: vertical-rl; text-orientation: mixed;"
	>
		FILTER
	</div>
</button>

<!-- Panel Container -->
<div
	class="bg-base-100 fixed top-0 right-0 z-40 h-full w-90 overflow-hidden pr-8 shadow-2xl transition-transform duration-300 ease-in-out"
	style="transform: translateX({isOpen ? '0px' : '100%'});"
	role="dialog"
	aria-modal="true"
	aria-labelledby="filter-title"
	aria-hidden={!isOpen}
>
	<div class="h-full overflow-y-auto">
		<div class="p-4">
			<div class="mb-3 flex items-center justify-between">
				<h2 id="filter-title" class="text-lg font-bold">Filter</h2>
				<button
					onclick={closePanel}
					class="btn btn-ghost btn-xs hover:bg-base-200"
					aria-label="Filter schließen"
				>
					<Icon src={SquareX} class="h-4 w-4" />
				</button>
			</div>

			<div class="space-y-4">
				<div class="form-control w-full">
					<label for="year-select" class="label py-1">
						<span class="label-text text-sm font-medium">Jahr</span>
					</label>
					<select
						id="year-select"
						class="select select-bordered select-sm focus:select-primary w-full text-sm"
						title="Wählen Sie das Jahr aus, für das Sichtungen angezeigt werden sollen"
					>
						{#each years.toReversed() as year (year)}
							<option value={year}>{year}</option>
						{/each}
					</select>
				</div>

				<div class="form-control w-full">
					<label for="filter-input" class="label py-1">
						<span class="label-text text-sm font-medium">Suchen</span>
					</label>
					<input
						id="filter-input"
						type="text"
						placeholder="E-Mail, Name, Schiff..."
						class="input input-bordered input-sm focus:input-primary w-full"
						title="Nach E-Mail, Schiffsname, Name oder Vorname filtern (Return zum filtern)."
						aria-describedby="filter-help"
					/>
					<label class="label py-0" for="filter-input">
						<span id="filter-help" class="label-text-alt text-base-content/60 text-xs">
							Enter-Taste zum Filtern drücken
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
								max="365"
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
								max="365"
								value="365"
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

<style>
	/* Smooth scrolling für das Panel */
	.overflow-y-auto {
		scrollbar-width: thin;
		scrollbar-color: oklch(var(--b3)) oklch(var(--b1));
	}

	.overflow-y-auto::-webkit-scrollbar {
		width: 6px;
	}

	.overflow-y-auto::-webkit-scrollbar-track {
		background: oklch(var(--b1));
	}

	.overflow-y-auto::-webkit-scrollbar-thumb {
		background: oklch(var(--b3));
		border-radius: 3px;
	}

	.overflow-y-auto::-webkit-scrollbar-thumb:hover {
		background: oklch(var(--bc) / 0.2);
	}

	/* Range-Slider Styling */
	.range {
		width: 100%;
		cursor: pointer;
	}
</style>

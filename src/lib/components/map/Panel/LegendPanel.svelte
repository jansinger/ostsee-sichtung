<script lang="ts">
	import type { CountData, MapCountManager } from '$lib/map/countManager';
	import type { MapTranslations } from '$lib/map/mapUtils';
	import { backgroundColors, speciesSymbols } from '$lib/map/styleUtils';
	import Icon from '$lib/components/Icon.svelte';
	import { getContext } from 'svelte';

	let { translations, counts } = $props<{
		translations: MapTranslations;
		counts: CountData;
	}>();

	// CountManager via Svelte Context API statt Window Global
	const countManager = getContext<MapCountManager>('mapCountManager');

	// Reactive state für Panel-Sichtbarkeit (Svelte 5 runes)
	let isOpen = $state(false);

	// Zustand der Sichtbarkeitsfilter
	let speciesVisibility = $state<Record<string, boolean>>({});
	let colorVisibility = $state<Record<string, boolean>>({});

	// Toggle-Funktion für das Panel
	function togglePanel() {
		isOpen = !isOpen;
	}

	// Schließe Panel
	function closePanel() {
		isOpen = false;
	}

	// Initialisiere Visibility-States (alle sichtbar)
	$effect(() => {
		if (translations && translations.speciesMap) {
			// Initialisiere alle Arten als sichtbar
			Object.keys(translations.speciesMap).forEach((key) => {
				speciesVisibility[key] = true;
			});

			// Initialisiere alle Farb-Gruppen als sichtbar
			['ct0', 'ct1', 'ct2', 'ct6', 'ct11', 'ct15'].forEach((colorGroup) => {
				colorVisibility[colorGroup] = true;
			});
		}
	});

	// Event Handler für Species-Checkboxes
	function handleSpeciesToggle(speciesId: string, visible: boolean) {
		speciesVisibility[speciesId] = visible;
		countManager?.setSpeciesVisibility(speciesId, visible);
	}

	// Event Handler für Color-Checkboxes
	function handleColorToggle(colorGroup: string, visible: boolean) {
		colorVisibility[colorGroup] = visible;
		countManager?.setColorVisibility(colorGroup, visible);
	}
</script>

<!-- Toggle Button (always visible) -->
<button
	onclick={togglePanel}
	class="glass text-base-content hover:bg-base-200 border-secondary/20 fixed top-52 right-0 z-50 flex h-32 w-8 cursor-pointer flex-col items-center justify-center rounded-l-lg border-2 border-r-0 shadow-xl backdrop-blur-sm transition-all duration-300 sm:w-12 md:w-8"
	style="transform: translateX({isOpen ? '-400px' : '0px'});"
	aria-label="Legende {isOpen ? 'schließen' : 'öffnen'}"
>
	<Icon icon="lucide:list" class="mb-1 h-4 w-4" />
	<div
		class="text-xs whitespace-nowrap"
		style="writing-mode: vertical-rl; text-orientation: mixed;"
	>
		LEGENDE
	</div>
</button>

<!-- Panel Container -->
<div
	class="glass border-secondary/20 fixed top-20 right-0 z-40 h-full w-100 overflow-hidden border-l-2 pr-8 shadow-2xl backdrop-blur-sm transition-transform duration-300 ease-in-out"
	style="transform: translateX({isOpen ? '0px' : '100%'});"
	role="dialog"
	aria-modal="true"
	aria-labelledby="legend-title"
	aria-hidden={!isOpen}
>
	<div class="scroll-styled h-full overflow-y-auto">
		<div class="p-6">
			<div class="mb-4 flex items-center justify-between">
				<h2 id="legend-title" class="text-xl font-bold">Legende</h2>
				<button
					onclick={closePanel}
					class="btn btn-ghost btn-sm hover:bg-base-200"
					aria-label="Legende schließen"
				>
					<Icon icon="lucide:square-x" class="h-4 w-4" />
				</button>
			</div>

			<div class="divider">{translations.species_legend}</div>

			<!-- Info-Box über die Bedienung -->
			<div class="bg-base-300/50 mb-4 rounded-lg p-3 text-sm">
				<div class="flex items-start gap-2">
					<span class="text-info">ℹ️</span>
					<div>
						<strong>Verwendung:</strong> Deaktivieren Sie Checkboxen, um bestimmte Arten oder Gruppengrößen
						auszublenden. Die Zahlen zeigen sichtbare/gesamt Sichtungen an.
					</div>
				</div>
			</div>

			<div class="mb-6 space-y-3">
				{#each Object.entries(translations.speciesMap) as [key, value] (key)}
					{@const symbol = speciesSymbols[key]}
					<div class="hover:bg-base-200 flex items-center gap-3 rounded-lg p-2 transition-colors">
						<div
							class="flex h-8 w-8 items-center justify-center rounded-full border shadow-sm"
							style="background-color: {symbol
								? backgroundColors[symbol.category] + 'CC'
								: '#F0F0F0'}; border-color: {symbol ? symbol.baseColor : '#333'};"
						>
							{#if symbol}
								<span class="text-xl" style="color: {symbol.baseColor};" title={String(value)}>
									{symbol.symbol}
								</span>
							{:else}
								<div class="h-4 w-4 rounded-full bg-gray-400"></div>
							{/if}
						</div>

						<div class="flex-1">
							<div class="flex items-center gap-2">
								<span class="text-sm font-medium">{value}</span>
								{#if symbol}
									<span
										class="rounded-full px-2 py-1 text-xs font-medium text-white"
										style="background-color: {symbol.baseColor};"
									>
										{symbol.category === 'kleinwal'
											? 'Kleinwal'
											: symbol.category === 'grosswal'
												? 'Großwal'
												: 'Robbe'}
									</span>
								{/if}
							</div>
						</div>

						<div class="flex items-center gap-2">
							<span class="text-base-content/70 font-mono text-xs">
								{counts.speciesCounts[key]?.visible || 0}/{counts.speciesCounts[key]?.total || 0}
							</span>
							<input
								type="checkbox"
								class="species-checkbox checkbox checkbox-sm"
								value={key}
								checked={speciesVisibility[key] ?? true}
								onchange={(e) => handleSpeciesToggle(key, (e.target as HTMLInputElement).checked)}
								aria-label="Sichtbarkeit für {value} umschalten. Aktuell {counts.speciesCounts[key]
									?.visible || 0} von {counts.speciesCounts[key]?.total || 0} Sichtungen sichtbar."
							/>
						</div>
					</div>
				{/each}
			</div>

			<div class="divider">{translations.count}</div>

			<div class="space-y-3">
				<div class="hover:bg-base-200 flex items-center gap-3 rounded-lg p-2 transition-colors">
					<div class="h-5 w-5 rounded border shadow-sm" style="background-color: #FFD700;"></div>
					<span class="flex-1 text-sm">1</span>
					<span class="text-base-content/70 font-mono text-xs"
						>{counts.colorCounts['ct1'] || 0}</span
					>
					<input
						type="checkbox"
						class="color-checkbox checkbox checkbox-sm"
						value="ct1"
						checked={colorVisibility['ct1'] ?? true}
						onchange={(e) => handleColorToggle('ct1', (e.target as HTMLInputElement).checked)}
						aria-label="Sichtungen mit 1 Tier anzeigen/ausblenden"
					/>
				</div>
				<div class="hover:bg-base-200 flex items-center gap-3 rounded-lg p-2 transition-colors">
					<div class="h-5 w-5 rounded border shadow-sm" style="background-color: #FF8C00;"></div>
					<span class="flex-1 text-sm">2-5</span>
					<span class="text-base-content/70 font-mono text-xs"
						>{counts.colorCounts['ct2'] || 0}</span
					>
					<input
						type="checkbox"
						class="color-checkbox checkbox checkbox-sm"
						value="ct2"
						checked={colorVisibility['ct2'] ?? true}
						onchange={(e) => handleColorToggle('ct2', (e.target as HTMLInputElement).checked)}
						aria-label="Sichtungen mit 2-5 Tieren anzeigen/ausblenden"
					/>
				</div>
				<div class="hover:bg-base-200 flex items-center gap-3 rounded-lg p-2 transition-colors">
					<div class="h-5 w-5 rounded border shadow-sm" style="background-color: #DC143C;"></div>
					<span class="flex-1 text-sm">6-10</span>
					<span class="text-base-content/70 font-mono text-xs"
						>{counts.colorCounts['ct6'] || 0}</span
					>
					<input
						type="checkbox"
						class="color-checkbox checkbox checkbox-sm"
						value="ct6"
						checked={colorVisibility['ct6'] ?? true}
						onchange={(e) => handleColorToggle('ct6', (e.target as HTMLInputElement).checked)}
						aria-label="Sichtungen mit 6-10 Tieren anzeigen/ausblenden"
					/>
				</div>
				<div class="hover:bg-base-200 flex items-center gap-3 rounded-lg p-2 transition-colors">
					<div class="h-5 w-5 rounded border shadow-sm" style="background-color: #8B008B;"></div>
					<span class="flex-1 text-sm">11-15</span>
					<span class="text-base-content/70 font-mono text-xs"
						>{counts.colorCounts['ct11'] || 0}</span
					>
					<input
						type="checkbox"
						class="color-checkbox checkbox checkbox-sm"
						value="ct11"
						checked={colorVisibility['ct11'] ?? true}
						onchange={(e) => handleColorToggle('ct11', (e.target as HTMLInputElement).checked)}
						aria-label="Sichtungen mit 11-15 Tieren anzeigen/ausblenden"
					/>
				</div>
				<div class="hover:bg-base-200 flex items-center gap-3 rounded-lg p-2 transition-colors">
					<div class="h-5 w-5 rounded border shadow-sm" style="background-color: #0066CC;"></div>
					<span class="flex-1 text-sm">&gt; 15</span>
					<span class="text-base-content/70 font-mono text-xs"
						>{counts.colorCounts['ct15'] || 0}</span
					>
					<input
						type="checkbox"
						class="color-checkbox checkbox checkbox-sm"
						value="ct15"
						checked={colorVisibility['ct15'] ?? true}
						onchange={(e) => handleColorToggle('ct15', (e.target as HTMLInputElement).checked)}
						aria-label="Sichtungen mit mehr als 15 Tieren anzeigen/ausblenden"
					/>
				</div>
				<div class="hover:bg-base-200 flex items-center gap-3 rounded-lg p-2 transition-colors">
					<div class="h-5 w-5 rounded border bg-black shadow-sm"></div>
					<span class="flex-1 text-sm">{translations.found_dead}</span>
					<span class="text-base-content/70 font-mono text-xs"
						>{counts.colorCounts['ct0'] || 0}</span
					>
					<input
						type="checkbox"
						class="color-checkbox checkbox checkbox-sm"
						value="ct0"
						checked={colorVisibility['ct0'] ?? true}
						onchange={(e) => handleColorToggle('ct0', (e.target as HTMLInputElement).checked)}
						aria-label="Totfunde anzeigen/ausblenden"
					/>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Scrollbar styles sind jetzt global in app.css definiert -->

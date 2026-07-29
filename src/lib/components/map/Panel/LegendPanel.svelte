<script lang="ts">
	import type { CountData } from '$lib/map/countManager';
	import { getMapCountManager } from '$lib/map/mapContext';
	import type { MapTranslations } from '$lib/map/mapUtils';
	import {
		clusterStyleSteps,
		legendGroups,
		speciesGroupStyles,
		speciesSymbols,
		MARKER_BACKGROUND_COLOR,
		TOTFUND_RING_COLOR
	} from '$lib/map/styleUtils';
	import Icon from '$lib/components/Icon.svelte';

	let { translations, counts } = $props<{
		translations: MapTranslations;
		counts: CountData;
	}>();

	// CountManager via typisiertem Svelte Context (Symbol-Key, siehe mapContext.ts)
	const countManager = getMapCountManager();

	// Reactive state für Panel-Sichtbarkeit (Svelte 5 runes)
	let isOpen = $state(false);

	// Zustand der Sichtbarkeitsfilter
	let speciesVisibility = $state<Record<string, boolean>>({});
	let colorVisibility = $state<Record<string, boolean>>({});

	// Anzahl-Filtergruppen in Anzeige-Reihenfolge (Totfund zuletzt) — aus styleUtils
	const countGroups = $derived(
		Object.entries(legendGroups).map(([key, group]) => ({
			key,
			label: key === 'ct0' ? String(translations.found_dead) : group.name
		}))
	);

	// Farbschlüssel: Tiergruppen-Ringe plus Totfund-Ring (gleiche Swatch-Darstellung)
	const ringLegendEntries = $derived([
		...Object.values(speciesGroupStyles).map(({ label, color }) => ({ label, color })),
		{ label: String(translations.found_dead), color: TOTFUND_RING_COLOR }
	]);

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

			// Initialisiere alle Anzahl-Gruppen als sichtbar
			Object.keys(legendGroups).forEach((colorGroup) => {
				colorVisibility[colorGroup] = true;
			});
		}
	});

	// Event Handler für Species-Checkboxes
	function handleSpeciesToggle(speciesId: string, visible: boolean) {
		speciesVisibility[speciesId] = visible;
		countManager.setSpeciesVisibility(speciesId, visible);
	}

	// Event Handler für Color-Checkboxes
	function handleColorToggle(colorGroup: string, visible: boolean) {
		colorVisibility[colorGroup] = visible;
		countManager.setColorVisibility(colorGroup, visible);
	}
</script>

<!-- Toggle Button (always visible) -->
<button
	onclick={togglePanel}
	class="glass text-base-content hover:bg-base-200 border-secondary/20 fixed top-52 right-0 z-50 flex h-32 w-8 cursor-pointer flex-col items-center justify-center rounded-l-lg border-2 border-r-0 shadow-xl backdrop-blur-sm transition-all duration-300 sm:w-12 md:w-8"
	style="transform: translateX({isOpen ? 'calc(-1 * min(400px, 100vw))' : '0px'});"
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
	class="glass border-secondary/20 fixed top-20 right-0 z-40 h-full w-100 max-w-[100vw] overflow-hidden border-l-2 pr-8 shadow-2xl backdrop-blur-sm transition-transform duration-300 ease-in-out"
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

			<!-- Info-Box: wie die Marker codiert sind -->
			<div class="bg-base-300/50 mb-4 rounded-lg p-3 text-sm">
				<div class="flex items-start gap-2">
					<Icon icon="lucide:info" class="text-info mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
					<div>
						<strong>So lesen Sie die Karte:</strong> Die Ringfarbe zeigt die Tiergruppe, das Symbol die
						Gruppe als zweites Merkmal. Ab zwei Tieren steht die Anzahl unter dem Marker. Ein schwarzer
						Ring bedeutet Totfund. Deaktivieren Sie Checkboxen, um Arten oder Gruppengrößen auszublenden
						— die Zahlen zeigen sichtbare/gesamt Sichtungen.
					</div>
				</div>
			</div>

			<!-- Tiergruppen-Farbschlüssel -->
			<div class="mb-4 flex flex-wrap gap-3">
				{#each ringLegendEntries as entry (entry.label)}
					<span class="flex items-center gap-1.5 text-xs">
						<span
							class="inline-block h-4 w-4 rounded-full"
							style="background-color: {MARKER_BACKGROUND_COLOR}; border: 3px solid {entry.color};"
							aria-hidden="true"
						></span>
						{entry.label}
					</span>
				{/each}
			</div>

			<div class="divider">{translations.species_legend}</div>

			<div class="mb-6 space-y-3">
				{#each Object.entries(translations.speciesMap) as [key, value] (key)}
					{@const symbol = speciesSymbols[key]}
					{@const total = counts.speciesCounts[key]?.total || 0}
					<div
						class="hover:bg-base-200 flex items-center gap-3 rounded-lg p-2 transition-colors"
						data-species-row={key}
					>
						<!-- 0/0-Arten ausgrauen: visuelle Teile abschwächen, Checkbox bleibt bedienbar -->
						<div class="flex flex-1 items-center gap-3 {total === 0 ? 'opacity-40 grayscale' : ''}">
							<div
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm"
								style="background-color: {MARKER_BACKGROUND_COLOR}; border: 3px solid {symbol
									? symbol.baseColor
									: TOTFUND_RING_COLOR};"
							>
								{#if symbol}
									<span class="text-base" title={String(value)}>{symbol.symbol}</span>
								{:else}
									<div class="bg-base-content/40 h-4 w-4 rounded-full"></div>
								{/if}
							</div>

							<div class="flex items-center gap-2">
								<span class="text-sm font-medium">{value}</span>
								{#if symbol}
									<span
										class="text-base-content rounded-full border-2 px-2 py-0.5 text-xs font-medium"
										style="border-color: {symbol.baseColor};"
									>
										{speciesGroupStyles[symbol.category].label}
									</span>
								{/if}
							</div>
						</div>

						<div class="flex items-center gap-2">
							<span class="text-base-content/70 font-mono text-xs">
								{counts.speciesCounts[key]?.visible || 0}/{total}
							</span>
							<input
								type="checkbox"
								class="species-checkbox checkbox checkbox-sm"
								value={key}
								checked={speciesVisibility[key] ?? true}
								onchange={(e) => handleSpeciesToggle(key, (e.target as HTMLInputElement).checked)}
								aria-label="Sichtbarkeit für {value} umschalten. Aktuell {counts.speciesCounts[key]
									?.visible || 0} von {total} Sichtungen sichtbar."
							/>
						</div>
					</div>
				{/each}
			</div>

			<div class="divider">{translations.count}</div>

			<div class="space-y-3">
				{#each countGroups as group (group.key)}
					<div class="hover:bg-base-200 flex items-center gap-3 rounded-lg p-2 transition-colors">
						{#if group.key === 'ct0'}
							<span
								class="h-5 w-5 shrink-0 rounded-full shadow-sm"
								style="background-color: {MARKER_BACKGROUND_COLOR}; border: 3px solid {TOTFUND_RING_COLOR};"
								aria-hidden="true"
							></span>
						{:else}
							<span
								class="text-base-content/70 w-5 shrink-0 text-center font-mono text-xs"
								aria-hidden="true">#</span
							>
						{/if}
						<span class="flex-1 text-sm">{group.label}</span>
						<span class="text-base-content/70 font-mono text-xs"
							>{counts.colorCounts[group.key] || 0}</span
						>
						<input
							type="checkbox"
							class="color-checkbox checkbox checkbox-sm"
							value={group.key}
							checked={colorVisibility[group.key] ?? true}
							onchange={(e) => handleColorToggle(group.key, (e.target as HTMLInputElement).checked)}
							aria-label="Sichtungen der Gruppe {group.label} anzeigen/ausblenden"
						/>
					</div>
				{/each}
			</div>

			<div class="divider">Cluster</div>

			<!-- Cluster-Farbskala erklären (M1) — aus derselben Konstante wie die Karte -->
			<div class="mb-8">
				<div class="mb-2 flex items-center gap-1" aria-hidden="true">
					{#each clusterStyleSteps as step (step.color)}
						<span
							class="inline-flex items-center justify-center rounded-full text-[10px] font-bold text-white"
							style="background-color: {step.color}; width: {step.radius}px; height: {step.radius}px;"
						></span>
					{/each}
				</div>
				<p class="text-base-content/80 text-sm">
					Blaue Kreise fassen mehrere Sichtungen an nahe beieinanderliegenden Orten zusammen. Die
					Zahl nennt die Anzahl der Sichtungen; je dunkler und größer der Kreis, desto mehr sind es.
					Beim Hineinzoomen teilt sich ein Cluster in einzelne Marker auf.
				</p>
			</div>
		</div>
	</div>
</div>

<!-- Scrollbar styles sind jetzt global in app.css definiert -->

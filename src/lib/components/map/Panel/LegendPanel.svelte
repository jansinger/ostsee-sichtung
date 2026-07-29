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
	import MapPanel from './MapPanel.svelte';

	let {
		translations,
		counts,
		// H6: Parent blendet die Toggle-Tabs auf Mobile aus, solange ein Sheet offen ist
		toggleHidden = false,
		// H5: bindable, damit Tastaturkürzel im Parent das Panel direkt über
		// den State steuern können statt über DOM-Queries.
		isOpen = $bindable(false),
		// M4/N6: Sichtbarkeits-States sind bindable, damit der Parent sie aus
		// der URL initialisieren und über die Filter-Chips zurücksetzen kann —
		// Checkboxen hier und Chips dort bleiben so eine einzige Wahrheit.
		speciesVisibility = $bindable({}),
		colorVisibility = $bindable({}),
		// M3: Seezeichen-Ebene (OpenSeaMap) umschaltbar — der Parent reicht die
		// Sichtbarkeit an den Map-Controller weiter.
		onSeamarkToggle = undefined
	} = $props<{
		translations: MapTranslations;
		counts: CountData;
		toggleHidden?: boolean;
		isOpen?: boolean;
		speciesVisibility?: Record<string, boolean>;
		colorVisibility?: Record<string, boolean>;
		onSeamarkToggle?: (visible: boolean) => void;
	}>();

	// CountManager via typisiertem Svelte Context (Symbol-Key, siehe mapContext.ts)
	const countManager = getMapCountManager();

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

	// Initialisiere Visibility-States (alle sichtbar). Nur fehlende Keys
	// auffüllen — bereits gesetzte Werte (z. B. aus der URL wiederhergestellte
	// ausgeblendete Arten, M4) dürfen nicht überschrieben werden.
	$effect(() => {
		if (translations && translations.speciesMap) {
			Object.keys(translations.speciesMap).forEach((key) => {
				if (!(key in speciesVisibility)) speciesVisibility[key] = true;
			});

			Object.keys(legendGroups).forEach((colorGroup) => {
				if (!(colorGroup in colorVisibility)) colorVisibility[colorGroup] = true;
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

	// M3: Sichtbarkeit der Seezeichen-Ebene — Default an (wie bisher)
	let seamarkVisible = $state(true);
	function handleSeamarkToggle(visible: boolean) {
		seamarkVisible = visible;
		onSeamarkToggle?.(visible);
	}
</script>

<MapPanel
	panelId="legend-panel"
	titleId="legend-title"
	title="Legende"
	toggleText="LEGENDE"
	icon="lucide:list"
	togglePositionClass="top-52"
	accentBorderClass="border-secondary/20"
	{toggleHidden}
	bind:isOpen
>
	<!-- Info-Box: wie die Marker codiert sind -->
	<div class="bg-base-300/50 mb-4 rounded-lg p-3 text-sm">
		<div class="flex items-start gap-2">
			<Icon icon="lucide:info" class="text-info-strong mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
			<div>
				<strong>So lesen Sie die Karte:</strong> Die Ringfarbe zeigt die Tiergruppe, das Symbol die Gruppe
				als zweites Merkmal. Ab zwei Tieren steht die Anzahl unter dem Marker. Ein schwarzer Ring bedeutet
				Totfund. Deaktivieren Sie Checkboxen, um Arten oder Gruppengrößen auszublenden — die Zahlen zeigen
				sichtbare/gesamt Sichtungen.
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
				<div class="flex flex-1 items-center gap-3 {total === 0 ? 'opacity-60 grayscale' : ''}">
					<div
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm"
						style="background-color: {MARKER_BACKGROUND_COLOR}; border: 3px solid {symbol
							? symbol.baseColor
							: speciesGroupStyles.unbekannt.color};"
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

	<div class="divider">Kartenebenen</div>

	<!-- M3: Seezeichen-Ebene (OpenSeaMap) umschaltbar — sie dominiert ab
	     mittleren Zoomstufen und ist für die Kernaufgabe sekundär -->
	<div class="hover:bg-base-200 flex items-center gap-3 rounded-lg p-2 transition-colors">
		<Icon icon="lucide:anchor" class="text-base-content/70 h-4 w-4 shrink-0" aria-hidden="true" />
		<span class="flex-1 text-sm">Seezeichen &amp; Tonnen (OpenSeaMap)</span>
		<input
			type="checkbox"
			class="seamark-checkbox checkbox checkbox-sm"
			checked={seamarkVisible}
			onchange={(e) => handleSeamarkToggle((e.target as HTMLInputElement).checked)}
			aria-label="Seezeichen-Ebene (OpenSeaMap) anzeigen/ausblenden"
		/>
	</div>

	<div class="divider">Cluster</div>

	<!-- Cluster-Farbskala erklären (M1) — aus derselben Konstante wie die Karte -->
	<div class="mb-8">
		<div class="mb-2 flex items-center gap-1" aria-hidden="true">
			{#each clusterStyleSteps as step (step.color)}
				<span
					class="inline-block rounded-full"
					style="background-color: {step.color}; width: {step.radius}px; height: {step.radius}px;"
				></span>
			{/each}
		</div>
		<p class="text-base-content/80 text-sm">
			Blaue Kreise fassen mehrere Sichtungen an nahe beieinanderliegenden Orten zusammen. Die Zahl
			nennt die Anzahl der Sichtungen; je dunkler und größer der Kreis, desto mehr sind es. Beim
			Hineinzoomen teilt sich ein Cluster in einzelne Marker auf.
		</p>
	</div>
</MapPanel>

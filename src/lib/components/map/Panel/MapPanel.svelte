<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { focusPanelHeading, returnFocusToToggle } from '$lib/map/panelFocus';

	let {
		panelId,
		titleId,
		title,
		toggleText,
		icon,
		togglePositionClass,
		accentBorderClass,
		isLoading = false,
		// H6: Auf Mobile verdecken die fixen Toggle-Tabs den Sheet-Header —
		// der Parent blendet deshalb beide Tabs aus, solange ein Sheet offen ist.
		toggleHidden = false,
		// H5: bindable, damit Tastaturkürzel im Parent das Panel direkt über
		// den State steuern können statt über DOM-Queries.
		isOpen = $bindable(false),
		children
	} = $props<{
		panelId: string;
		titleId: string;
		title: string;
		toggleText: string;
		icon: string;
		togglePositionClass: string;
		accentBorderClass: string;
		isLoading?: boolean;
		toggleHidden?: boolean;
		isOpen?: boolean;
		children: Snippet;
	}>();

	// Element-Referenzen für das Fokus-Management (H5)
	let panelEl = $state<HTMLDivElement>();
	let toggleEl = $state<HTMLButtonElement>();
	let headingEl = $state<HTMLHeadingElement>();

	// H6: Unterhalb von md ist das Panel ein Bottom-Sheet mit zwei Höhen —
	// Peek (Karte bleibt sichtbar) und Expanded. Auf md+ ohne Wirkung.
	let sheetExpanded = $state(false);

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
			// H6: Sheet startet beim nächsten Öffnen wieder im Peek-Zustand
			sheetExpanded = false;
			returnFocusToToggle(panelEl, toggleEl);
		}
	});

	function togglePanel() {
		isOpen = !isOpen;
	}

	function closePanel() {
		isOpen = false;
	}
</script>

<!-- Toggle Button (always visible) — H6: auf Mobile 44px breit (Touch-Target)
     und ortsfest; nur auf md+ wandert er mit dem Panel nach links. -->
<button
	bind:this={toggleEl}
	onclick={togglePanel}
	class="glass text-base-content hover:bg-base-200 {accentBorderClass} {togglePositionClass} z-nav shadow-floating duration-panel fixed right-0 flex h-32 w-11 cursor-pointer flex-col items-center justify-center rounded-l-lg border-2 border-r-0 backdrop-blur-sm transition-all md:w-8 {isOpen
		? 'md:-translate-x-80'
		: ''} {toggleHidden ? 'max-md:hidden' : ''}"
	aria-label={title}
	aria-expanded={isOpen}
	aria-controls={panelId}
>
	<Icon
		icon={isLoading ? 'lucide:loader-2' : icon}
		class="mb-1 h-4 w-4 {isLoading ? 'animate-spin' : ''}"
	/>
	<div
		class="text-xs whitespace-nowrap"
		style="writing-mode: vertical-rl; text-orientation: mixed;"
	>
		{toggleText}
	</div>
</button>

<!-- Panel Container: nicht-modales Seitenpanel (H5) — role="region" statt
     Fake-Dialog; inert nimmt das geschlossene (nur verschobene) Panel samt
     seiner fokussierbaren Elemente aus Tab-Zyklus und Accessibility-Tree.
     H6: < md als Bottom-Sheet (Peek/Expanded), ab md als 320px-Seitenpanel,
     dessen Höhe den top-20-Versatz berücksichtigt. -->
<div
	bind:this={panelEl}
	id={panelId}
	data-sheet-state={sheetExpanded ? 'expanded' : 'peek'}
	class="glass {accentBorderClass} z-panel shadow-floating duration-panel fixed overflow-hidden backdrop-blur-sm transition-[transform,height] max-md:inset-x-0 max-md:bottom-0 max-md:rounded-t-2xl max-md:border-t-2 md:top-20 md:right-0 md:h-[calc(100%-5rem)] md:w-80 md:border-l-2 {sheetExpanded
		? 'max-md:h-[85dvh]'
		: 'max-md:h-[45dvh]'} {isOpen
		? 'translate-x-0 translate-y-0'
		: 'max-md:translate-y-full md:translate-x-full'}"
	role="region"
	aria-labelledby={titleId}
	inert={!isOpen}
>
	<div class="flex h-full flex-col">
		<!-- Drag-Handle-Optik des Bottom-Sheets (nur Mobile, rein dekorativ) -->
		<div class="flex justify-center pt-2 md:hidden" aria-hidden="true">
			<div class="bg-base-content/20 h-1.5 w-10 rounded-full"></div>
		</div>

		<div class="flex shrink-0 items-center justify-between gap-2 px-4 pt-2 md:pt-4">
			<!-- tabindex="-1": Fokusziel beim Öffnen des Panels (H5) -->
			<h2 id={titleId} tabindex="-1" bind:this={headingEl} class="text-lg font-bold">
				{title}
			</h2>
			<div class="flex items-center gap-1">
				<!-- H6: Peek/Expanded-Umschalter des Bottom-Sheets (nur < md) -->
				<button
					onclick={() => (sheetExpanded = !sheetExpanded)}
					class="btn btn-ghost btn-sm hover:bg-base-200 min-h-11 min-w-11 md:hidden"
					aria-expanded={sheetExpanded}
					aria-label={sheetExpanded
						? m.components_map_panel_mappanel_aria_label_title_verkleinern({ title })
						: m.components_map_panel_mappanel_aria_label_title_vergroessern({ title })}
				>
					<Icon
						icon={sheetExpanded ? 'lucide:chevron-down' : 'lucide:chevron-up'}
						class="h-4 w-4"
					/>
				</button>
				<button
					onclick={closePanel}
					class="btn btn-ghost btn-sm hover:bg-base-200 min-h-11 min-w-11"
					aria-label={m.components_map_panel_mappanel_aria_label_title_schliessen({ title: title })}
				>
					<Icon icon="lucide:square-x" class="h-4 w-4" />
				</button>
			</div>
		</div>

		<div class="scroll-styled min-h-0 flex-1 overflow-y-auto px-4 pb-4">
			{@render children()}
		</div>
	</div>
</div>

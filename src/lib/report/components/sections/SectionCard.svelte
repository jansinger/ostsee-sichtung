<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';

	/**
	 * Zwei Varianten, ein Abschnittsmuster (siehe /styleguide → „Abschnitt").
	 *
	 * - `card`  — eigenständiger Abschnitt auf Seitenebene (DaisyUI-Karte).
	 * - `inset` — untergeordneter Block innerhalb eines Schritts. Genau die Box,
	 *   die `PositionAndTime.svelte` und `PositionPanel.svelte` bisher jeweils
	 *   selbst zusammengesetzt haben.
	 *
	 * Der Hover-Zustand steht nicht mehr hier: `.card:hover` in `app.css` gilt
	 * für alle Karten. Der frühere lokale `<style>`-Block hat ihn ein zweites Mal
	 * definiert — mit `transition: all` und einem handgeschriebenen `box-shadow`
	 * statt eines Elevation-Tokens.
	 */
	interface Props {
		title: string;
		icon: string;
		variant?: 'card' | 'inset';
		children: Snippet;
	}

	let { title, icon, variant = 'card', children }: Props = $props();
</script>

{#if variant === 'card'}
	<div class="card bg-base-200 shadow-raised">
		<div class="card-body">
			<h3 class="card-title text-section flex items-center gap-2">
				<Icon {icon} width="20" class="text-primary" aria-hidden="true" />
				{title}
			</h3>
			{@render children()}
		</div>
	</div>
{:else}
	<div class="border-base-300 bg-base-200/50 rounded-box border p-3 md:p-4">
		<h3 class="text-section mb-3 flex items-center gap-2 font-semibold">
			<Icon {icon} width="20" class="text-primary" aria-hidden="true" />
			{title}
		</h3>
		{@render children()}
	</div>
{/if}

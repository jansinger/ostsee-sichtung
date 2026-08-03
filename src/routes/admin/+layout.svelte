<script lang="ts">
	import { page } from '$app/state';
	import { ADMIN_BEREICHE, aktiverAdminBereich } from '$lib/config/adminNav';
	import AdminFooter from '$lib/components/admin/AdminFooter.svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	/* Liste und Zuordnung liegen in `$lib/config/adminNav` — dieselbe Quelle,
	   aus der die Gruppe „Verwaltung" in der TopBar entsteht. Zwei Listen von
	   Hand zu pflegen hieße, dass eine neue Sektion an einer der beiden
	   Stellen fehlt, ohne dass es auffällt. */
	const aktiv = $derived(aktiverAdminBereich(page.url.pathname));
</script>

<!-- Kein eigenes <main>: Root-Layout stellt bereits <main id="main-content"> bereit -->
<div class="w-full">
	<div class="flex min-h-screen flex-col">
		<!--
			Unternavigation der Verwaltung. In der TopBar liegen dieselben drei Ziele
			hinter einem Aufklapper — der ist der Einstieg von außen, taugt aber nicht
			zum Wechseln innerhalb des Bereichs (zwei Klicks pro Wechsel).

			`<nav>` mit `aria-current` statt `role="tablist"`/`role="tab"`: Das sind
			Links auf eigene Seiten, keine Reiter über gemeinsamem Inhalt. Die
			`tabs`-Klassen sind reine Optik und brauchen die Rollen nicht — DaisyUI
			stylt über `.tabs > .tab`.

			Bewusst nicht `sticky top-16`: Das wäre wieder eine geratene Header-Höhe,
			genau der Fehler, den `e2e/app-shell-height.spec.ts` seit 2026-08-03
			absichert. Der Header misst 66px, nicht 64px.
		-->
		<nav aria-label="Verwaltung" class="border-base-300 bg-base-100 tabs tabs-border border-b px-4">
			{#each ADMIN_BEREICHE as bereich (bereich.href)}
				<a
					href={bereich.href}
					class="tab {bereich.href === aktiv ? 'tab-active font-medium' : ''}"
					aria-current={bereich.href === aktiv ? 'page' : undefined}
				>
					{bereich.label}
				</a>
			{/each}
		</nav>

		<div class="w-full flex-1">
			{@render children()}
		</div>
		<AdminFooter buildInfo={data.buildInfo} />
	</div>
</div>

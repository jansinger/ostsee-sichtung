<script lang="ts">
	// Documentation layout
</script>

<!--
	Kein `<svelte:head>`: Alle drei Seiten unter /docs (`+page`, `api/+page`,
	`api/fallback/+page`) setzen Titel und Description selbst. Ein Layout-Head
	käme zusätzlich statt stattdessen — SvelteKit dedupliziert Meta-Tags nicht.
	Abgesichert durch `e2e/seo-meta.spec.ts`.
-->
<div class="container mx-auto p-4">
	<slot />
</div>

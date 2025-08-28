<!--
  Fallback page for reference ID lookup - should normally not be reached
  due to redirect in page.server.ts
-->
<script lang="ts">
	import { page } from '$app/state';

	let refId = $derived(page.params.refId);
</script>

<svelte:head>
	<title>Weiterleitung - Sichtung ReferenzID {refId} - Admin - Ostsee-Tiere</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="flex min-h-96 flex-col items-center justify-center text-center">
		<div class="loading loading-spinner loading-lg mb-4"></div>
		<h1 class="mb-2 text-2xl font-bold">Suche Sichtung...</h1>
		<p class="text-base-content/70 mb-4">
			Suche nach Sichtung mit ReferenzID: <code class="bg-base-200 rounded px-2 py-1">{refId}</code>
		</p>
		<p class="text-base-content/60 text-sm">
			Sie werden automatisch zur Sichtungsansicht weitergeleitet.
		</p>
	</div>
</div>

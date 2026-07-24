<script lang="ts">
	let { children }: { children: import('svelte').Snippet } = $props();
</script>

<!-- Kein eigenes <main>: Root-Layout stellt bereits <main id="main-content"> bereit -->
<div class="w-full">
	<div class="flex min-h-screen flex-col">
		<!-- Page content with top padding for fixed navbar -->
		<div class="w-full">
			{@render children()}
		</div>
	</div>
</div>

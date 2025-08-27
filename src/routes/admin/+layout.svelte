<script lang="ts">
	let { children }: { children: import('svelte').Snippet } = $props();
</script>

<main class="container mx-auto p-4">
	<div class="flex min-h-screen flex-col">
		<!-- Page content with top padding for fixed navbar -->
		<main>
			{@render children()}
		</main>
	</div>
</main>

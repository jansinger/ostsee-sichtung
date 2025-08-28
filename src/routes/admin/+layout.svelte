<script lang="ts">
	let { children }: { children: import('svelte').Snippet } = $props();
</script>

<main class="w-full">
	<div class="flex min-h-screen flex-col">
		<!-- Page content with top padding for fixed navbar -->
		<main class="w-full">
			{@render children()}
		</main>
	</div>
</main>

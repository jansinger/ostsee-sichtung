<script lang="ts">
	import AdminFooter from '$lib/components/admin/AdminFooter.svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();
</script>

<!-- Kein eigenes <main>: Root-Layout stellt bereits <main id="main-content"> bereit -->
<div class="w-full">
	<div class="flex min-h-screen flex-col">
		<!-- Page content with top padding for fixed navbar -->
		<div class="w-full flex-1">
			{@render children()}
		</div>
		<AdminFooter buildInfo={data.buildInfo} />
	</div>
</div>

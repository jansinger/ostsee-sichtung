<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';

	interface Props {
		title: string;
		icon: string;
		children: Snippet;
	}

	let { title, icon, children }: Props = $props();
</script>

<div class="card bg-base-200 shadow-sm">
	<div class="card-body">
		<h3 class="card-title flex items-center gap-2 text-lg">
			<Icon {icon} width="20" class="text-primary" aria-hidden="true" />
			{title}
		</h3>
		{@render children()}
	</div>
</div>

<style>
	.card {
		transition: all 0.2s ease;
	}
	.card:hover {
		transform: translateY(-1px);
		box-shadow: 0 8px 25px -8px var(--color-base-300);
	}
</style>

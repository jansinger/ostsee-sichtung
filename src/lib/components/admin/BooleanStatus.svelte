<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';

	interface Props {
		value: boolean | null | undefined | number;
		trueLabel?: string;
		falseLabel?: string;
		size?: 'xs' | 'sm' | 'md' | 'lg';
		showIcon?: boolean;
	}

	let {
		value,
		trueLabel = 'Ja',
		falseLabel = 'Nein',
		size = 'sm',
		showIcon = true
	}: Props = $props();

	const isTrue = $derived(Boolean(value));

	// Icon size based on badge size
	const iconSize = $derived.by(() => {
		switch (size) {
			case 'xs':
				return '12';
			case 'sm':
				return '14';
			case 'md':
				return '16';
			case 'lg':
				return '18';
			default:
				return '14';
		}
	});

	// Custom classes for better styling
	const badgeClasses = $derived.by(() => {
		const baseClasses = `badge badge-${size} inline-flex items-center gap-1 font-medium`;
		if (isTrue) {
			return `${baseClasses} bg-green-100 text-green-800 border-green-200`;
		} else {
			return `${baseClasses} bg-gray-100 text-gray-600 border-gray-200`;
		}
	});
</script>

<div class={badgeClasses}>
	{#if showIcon}
		{#if isTrue}
			<Icon icon="lucide:circle-check" class="flex-shrink-0" style="width: {iconSize}px; height: {iconSize}px;" />
		{:else}
			<Icon icon="lucide:circle-x" class="flex-shrink-0" style="width: {iconSize}px; height: {iconSize}px;" />
		{/if}
	{/if}
	<span>{isTrue ? trueLabel : falseLabel}</span>
</div>

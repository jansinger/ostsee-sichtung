<script lang="ts">
	import { CircleCheck, CircleX } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';

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
			<Icon src={CircleCheck} size={iconSize} class="flex-shrink-0" />
		{:else}
			<Icon src={CircleX} size={iconSize} class="flex-shrink-0" />
		{/if}
	{/if}
	<span>{isTrue ? trueLabel : falseLabel}</span>
</div>

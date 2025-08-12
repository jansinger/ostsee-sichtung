<script lang="ts">
	interface Props {
		value: boolean | null | undefined | number;
		trueLabel?: string;
		falseLabel?: string;
		size?: 'xs' | 'sm' | 'md' | 'lg';
	}

	let { value, trueLabel = 'Ja', falseLabel = 'Nein', size = 'sm' }: Props = $props();

	const isTrue = $derived(Boolean(value));
</script>

<div class="badge badge-outline {isTrue ? 'badge-success' : 'badge-neutral'} badge-{size}">
	{isTrue ? trueLabel : falseLabel}
</div>

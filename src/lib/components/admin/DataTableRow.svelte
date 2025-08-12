<script lang="ts">
	import BooleanStatus from './BooleanStatus.svelte';

	interface Props {
		label: string;
		value?: string;
		isBoolean?: boolean;
		booleanValue?: boolean;
		isPreformatted?: boolean;
	}

	let {
		label,
		value = '',
		isBoolean = false,
		booleanValue = false,
		isPreformatted = false
	}: Props = $props();
</script>

<tr>
	<td class="w-40 font-medium">{label}</td>
	<td class:whitespace-pre-wrap={isPreformatted}>
		{#if isBoolean}
			<BooleanStatus value={booleanValue} />
		{:else}
			{value}
		{/if}
	</td>
</tr>

<!--
  Base checkbox component
  Independent of form context, accepts all props directly
-->
<script lang="ts">
	import type { FieldSize } from '$lib/types';
	import Icon from '$lib/components/Icon.svelte';

	interface Props {
		checked?: boolean;
		label?: string;
		size?: FieldSize;
		icon?: string;
		onchange?: (event: Event) => void;
		// Common input attributes
		id?: string;
		name?: string;
		value?: string | number;
		disabled?: boolean;
		required?: boolean;
		'aria-describedby'?: string;
		'aria-invalid'?: boolean;
		'aria-required'?: boolean;
		'data-testid'?: string;
	}

	let {
		checked = $bindable(),
		label = '',
		size = 'md',
		icon = undefined,
		onchange = undefined,
		id,
		name,
		value,
		disabled = false,
		required = false,
		'aria-describedby': ariaDescribedBy,
		'aria-invalid': ariaInvalid,
		'aria-required': ariaRequired,
		'data-testid': dataTestId
	}: Props = $props();

	// Dynamic CSS classes - pure DaisyUI
	let checkboxClasses = $derived.by(() => {
		const base = 'checkbox checkbox-primary';
		const sizeClass = size === 'sm' ? 'checkbox-sm' : size === 'lg' ? 'checkbox-lg' : '';
		return [base, sizeClass].filter(Boolean).join(' ');
	});
</script>

<div class="w-full items-start">
	<label class="flex w-full cursor-pointer justify-start gap-3 py-2">
		{#if icon !== undefined}
			<Icon {icon} width="16" class="text-base-content/60 flex-shrink-0" />
		{/if}
		<input
			type="checkbox"
			class={checkboxClasses + ' flex-shrink-0'}
			bind:checked
			{onchange}
			{disabled}
			{required}
			{id}
			{name}
			{value}
			aria-describedby={ariaDescribedBy}
			aria-invalid={ariaInvalid}
			aria-required={ariaRequired}
			data-testid={dataTestId}
		/>
		<span
			class="min-w-0 flex-1 text-left font-medium"
			style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
		>
			{label}
		</span>
	</label>
</div>

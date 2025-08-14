<!--
  Base toggle switch component
  Independent of form context, accepts all props directly
-->
<script lang="ts">
	import type { FieldSize } from '$lib/types';
	import { Icon, type IconSource } from '@steeze-ui/svelte-icon';

	interface Props {
		checked?: boolean;
		label?: string;
		size?: FieldSize;
		icon?: IconSource;
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

	// Dynamic CSS classes
	let toggleClasses = $derived.by(() => {
		const base = 'toggle toggle-primary';
		const sizeClass = size === 'sm' ? 'toggle-sm' : size === 'lg' ? 'toggle-lg' : '';
		return [base, sizeClass].filter(Boolean).join(' ');
	});
</script>

<div class="form-control w-full items-start">
	<label class="label w-full cursor-pointer justify-start gap-3 py-2">
		{#if icon !== undefined}
			<Icon src={icon} size="16" class="text-base-content/60 flex-shrink-0" />
		{/if}
		<input
			type="checkbox"
			class={toggleClasses + ' flex-shrink-0'}
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
			class="label-text min-w-0 flex-1 text-left font-medium"
			style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
		>
			{label}
		</span>
	</label>
</div>

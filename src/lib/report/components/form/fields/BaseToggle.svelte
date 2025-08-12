<!--
  Base toggle switch component
  Independent of form context, accepts all props directly
-->
<script lang="ts">
	import { Icon } from '@steeze-ui/svelte-icon';
	import type { FieldSize, IconType } from '../types';

	interface Props {
		checked?: boolean;
		label?: string;
		size?: FieldSize;
		icon?: IconType;
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

	let hasIcon = $derived(!!icon);

	// Dynamic CSS classes
	let toggleClasses = $derived.by(() => {
		const base = 'toggle toggle-primary';
		const sizeClass = size === 'sm' ? 'toggle-sm' : size === 'lg' ? 'toggle-lg' : '';
		return [base, sizeClass].filter(Boolean).join(' ');
	});
</script>

<div class="form-control">
	<label class="label cursor-pointer justify-start gap-3 py-2">
		{#if hasIcon}
			<Icon src={icon} size="16" class="text-base-content/60 flex-shrink-0" />
		{/if}
		<input
			type="checkbox"
			class={toggleClasses}
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
		<span class="label-text font-medium">{label}</span>
	</label>
</div>
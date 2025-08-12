<!--
  Base input component for text-like inputs (text, email, tel, number, url, password)
  Independent of form context, accepts all props directly
-->
<script lang="ts">
	import { ChevronDown } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import type { FieldOption, FieldSize, IconType } from '../types';

	type InputType = 'text' | 'email' | 'tel' | 'number' | 'url' | 'password' | 'date' | 'time';

	interface Props extends Omit<HTMLInputAttributes, 'type' | 'size'> {
		type?: InputType;
		value?: string | number;
		size?: FieldSize;
		hasError?: boolean;
		isValid?: boolean;
		icon?: IconType;
		options?: FieldOption[];
		onchange?: (event: Event) => void;
	}

	let {
		type = 'text',
		value = $bindable(),
		size = 'md',
		hasError = false,
		isValid = false,
		icon = undefined,
		options = [],
		onchange = undefined,
		placeholder,
		...restProps
	}: Props = $props();

	let hasIcon = $derived(!!icon);
	let hasOptions = $derived(options && options.length > 0);
	let datalistId = $derived(hasOptions ? `${restProps.id || restProps.name || ''}-datalist` : undefined);

	// Dynamic CSS classes
	let inputClasses = $derived.by(() => {
		const base = 'input input-bordered w-full transition-all duration-200';
		const stateClass = hasError ? 'input-error' : isValid ? 'input-success' : '';
		const sizeClass = size === 'sm' ? 'input-sm' : size === 'lg' ? 'input-lg' : '';
		const focusClass = 'focus:ring-2 focus:ring-primary/20 focus:border-primary';
		const iconPadding = hasIcon ? 'pl-10' : '';
		return [base, stateClass, sizeClass, focusClass, iconPadding].filter(Boolean).join(' ');
	});

	// Enhanced placeholder text
	let placeholderText = $derived.by(() => {
		if (placeholder) return placeholder;
		if (type === 'email') return 'name@example.com';
		if (type === 'tel') return '+49 123 456789';
		if (type === 'url') return 'https://example.com';
		return '';
	});

	// Input props
	let inputProps = $derived.by(() => {
		const props: HTMLInputAttributes = {
			...restProps,
			list: datalistId,
			'aria-invalid': hasError || undefined,
			'aria-required': restProps.required || undefined
		};

		// Filter out undefined values
		return Object.fromEntries(
			Object.entries(props).filter(([, val]) => val !== undefined)
		);
	});
</script>

<div class="relative">
	<!-- Icon (if available) -->
	{#if hasIcon}
		<div class="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-10 items-center justify-center">
			<Icon src={icon} size="16" class="text-base-content/60" />
		</div>
	{/if}

	<input
		{...inputProps}
		{type}
		class={inputClasses}
		placeholder={placeholderText}
		bind:value
		{onchange}
	/>

	{#if hasOptions}
		<!-- Dropdown icon -->
		<div class="pointer-events-none absolute inset-y-0 right-3 flex items-center">
			<Icon src={ChevronDown} size="16" class="text-base-content/60" />
		</div>

		<datalist id={datalistId}>
			{#each options as option (option.value)}
				<option value={String(option.label)}></option>
			{/each}
		</datalist>
	{/if}
</div>
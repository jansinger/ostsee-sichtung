<!--
  Base select component for dropdown selections
  Independent of form context, accepts all props directly
-->
<script lang="ts">
	import type { FieldOption, FieldSize } from '$lib/types';
	import { Icon, type IconSource } from '@steeze-ui/svelte-icon';
	import type { HTMLSelectAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLSelectAttributes, 'size'> {
		value?: string | number;
		options?: FieldOption[];
		placeholder?: string;
		size?: FieldSize;
		hasError?: boolean;
		isValid?: boolean;
		icon?: IconSource;
		onchange?: (event: Event) => void;
	}

	let {
		value = $bindable(),
		options = [],
		placeholder = 'Bitte wählen...',
		size = 'md',
		hasError = false,
		isValid = false,
		icon = undefined,
		onchange = undefined,
		...restProps
	}: Props = $props();

	let hasOptions = $derived(options && options.length > 0);

	// Dynamic CSS classes
	let selectClasses = $derived.by(() => {
		const base = 'select select-bordered w-full transition-all duration-200';
		const stateClass = hasError ? 'select-error' : isValid ? 'select-success' : '';
		const sizeClass = size === 'sm' ? 'select-sm' : size === 'lg' ? 'select-lg' : '';
		const focusClass = 'focus:ring-2 focus:ring-primary/20 focus:border-primary';
		const iconPadding = icon !== undefined ? 'pl-10' : '';
		return [base, stateClass, sizeClass, focusClass, iconPadding].filter(Boolean).join(' ');
	});

	// Select props
	let selectProps = $derived.by(() => {
		const props: HTMLSelectAttributes = {
			...restProps,
			'aria-invalid': hasError || undefined,
			'aria-required': restProps.required || undefined
		};

		// Filter out undefined values
		return Object.fromEntries(Object.entries(props).filter(([, val]) => val !== undefined));
	});
</script>

<div class="relative">
	<!-- Icon (if available) -->
	{#if icon !== undefined}
		<div
			class="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-10 items-center justify-center"
		>
			<Icon src={icon} size="16" class="text-base-content/60" />
		</div>
	{/if}

	<select {...selectProps} class={selectClasses} {onchange}>
		<option value="" disabled selected={value === undefined || value === ''}>
			{placeholder}
		</option>
		{#if hasOptions}
			{@const groups = [...new Set(options.filter((o) => o.group).map((o) => o.group))]}

			<!-- Ungrouped options first -->
			{#each options.filter((o) => !o.group) as option (option.value)}
				<option value={String(option.value)} selected={String(value) === String(option.value)}>
					{option.label}
				</option>
			{/each}

			<!-- Grouped options -->
			{#each groups as group (group)}
				<optgroup label={group}>
					{#each options.filter((o) => o.group === group) as option (option.value)}
						<option value={String(option.value)} selected={String(value) === String(option.value)}>
							{option.label}
						</option>
					{/each}
				</optgroup>
			{/each}
		{/if}
	</select>
</div>

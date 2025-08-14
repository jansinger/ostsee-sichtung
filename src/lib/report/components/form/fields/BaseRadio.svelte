<!--
  Base radio button group component
  Independent of form context, accepts all props directly
-->
<script lang="ts">
	import type { FieldOption, FieldSize } from '$lib/types';
	import { type IconSource } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';

	interface Props {
		value?: string | number;
		options?: FieldOption[];
		size?: FieldSize;
		icon?: IconSource;
		onchange?: (event: Event) => void;
		// Common input attributes
		id?: string;
		name?: string;
		disabled?: boolean;
		required?: boolean;
		'aria-describedby'?: string;
		'data-testid'?: string;
	}

	let {
		value = $bindable(),
		options = [],
		size = 'md',
		icon = undefined,
		onchange = undefined,
		id,
		name,
		disabled = false,
		required = false,
		'aria-describedby': ariaDescribedBy,
		'data-testid': dataTestId
	}: Props = $props();

	let hasOptions = $derived(options && options.length > 0);

	// Dynamic CSS classes
	let radioClasses = $derived.by(() => {
		const base = 'radio radio-primary';
		const sizeClass = size === 'sm' ? 'radio-sm' : size === 'lg' ? 'radio-lg' : '';
		return [base, sizeClass].filter(Boolean).join(' ');
	});
</script>

{#if hasOptions}
	<div class="mt-2 space-y-2">
		{#each options as option, index (option.value)}
			<label
				class="label hover:bg-base-200/50 cursor-pointer justify-start gap-3 rounded-lg py-2 transition-colors"
			>
				{#if icon !== undefined}
					<Icon src={icon} size="16" class="text-base-content/60 flex-shrink-0" />
				{/if}
				<input
					type="radio"
					name={name || id || `radio-group-${index}`}
					value={option.value}
					class={radioClasses}
					bind:group={value}
					{onchange}
					{disabled}
					{required}
					aria-describedby={ariaDescribedBy}
					data-testid={dataTestId ? `${dataTestId}-${option.value}` : undefined}
				/>
				<span class="label-text font-medium">{option.label}</span>
				{#if option?.description}
					<span class="text-base-content/60 ml-auto text-sm">{option.description}</span>
				{/if}
			</label>
		{/each}
	</div>
{/if}

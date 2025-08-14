<!--
  Base textarea component for multiline text input
  Independent of form context, accepts all props directly
-->
<script lang="ts">
	import type { FieldSize } from '$lib/types';
	import { Icon, type IconSource } from '@steeze-ui/svelte-icon';
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	interface Props extends HTMLTextareaAttributes {
		value?: string;
		size?: FieldSize;
		hasError?: boolean;
		isValid?: boolean;
		icon?: IconSource;
		onchange?: (event: Event) => void;
	}

	let {
		value = $bindable(),
		size = 'md',
		hasError = false,
		isValid = false,
		icon = undefined,
		onchange = undefined,
		placeholder = '',
		rows = 4,
		...restProps
	}: Props = $props();

	// Dynamic CSS classes
	let textareaClasses = $derived.by(() => {
		const base = 'textarea textarea-bordered w-full transition-all duration-200 resize-y';
		const stateClass = hasError ? 'textarea-error' : isValid ? 'textarea-success' : '';
		const sizeClass = size === 'sm' ? 'textarea-sm' : size === 'lg' ? 'textarea-lg' : '';
		const focusClass = 'focus:ring-2 focus:ring-primary/20 focus:border-primary';
		const iconPadding = icon !== undefined ? 'pl-10' : '';
		return [base, stateClass, sizeClass, focusClass, iconPadding].filter(Boolean).join(' ');
	});

	// Textarea props
	let textareaProps = $derived.by(() => {
		const props: HTMLTextareaAttributes = {
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
		<div class="pointer-events-none absolute top-3 left-3 z-10">
			<Icon src={icon} size="16" class="text-base-content/60" />
		</div>
	{/if}

	<textarea {...textareaProps} class={textareaClasses} {placeholder} {rows} bind:value {onchange}
	></textarea>
</div>

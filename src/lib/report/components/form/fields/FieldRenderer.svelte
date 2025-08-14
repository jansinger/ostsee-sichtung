<!--
  Field renderer component that uses fieldConfig to route to the correct field component
  Independent of form context, accepts fieldConfig and value props
-->
<script lang="ts">
	import type { FieldSize, FieldVariant } from '$lib/types';
	import { Check, Info, TriangleAlert, X } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import * as yup from 'yup';
	import BaseCheckbox from './BaseCheckbox.svelte';
	import BaseInput from './BaseInput.svelte';
	import BaseRadio from './BaseRadio.svelte';
	import BaseSelect from './BaseSelect.svelte';
	import BaseTextarea from './BaseTextarea.svelte';
	import BaseToggle from './BaseToggle.svelte';
	import SpeciesIdentificationHelp from './SpeciesIdentificationHelp.svelte';

	let {
		fieldConfig,
		name = '',
		value = $bindable(),
		error = undefined,
		disabled = false,
		size = 'md',
		variant = 'default',
		onchange = undefined
	}: {
		fieldConfig: yup.SchemaDescription;
		name?: string;
		value?: string | number | boolean;
		error?: string | undefined;
		disabled?: boolean;
		size?: FieldSize;
		variant?: FieldVariant;
		onchange?: (event: Event) => void;
	} = $props();

	// Bindable values for different component types
	let booleanValue = $state(false);
	let stringValue = $state('');
	let numberValue = $state<string | number>('');

	// Sync boolean value with main value prop
	$effect(() => {
		if (normalizedType === 'checkbox' || normalizedType === 'toggle') {
			booleanValue = typeof value === 'boolean' ? value : value === undefined ? false : !!value;
		} else if (normalizedType === 'textarea') {
			stringValue = typeof value === 'string' ? value : '';
		} else if (
			[
				'text',
				'email',
				'tel',
				'number',
				'url',
				'password',
				'date',
				'time',
				'select',
				'radio'
			].includes(normalizedType)
		) {
			numberValue = typeof value === 'boolean' ? '' : (value ?? '');
		}
	});

	// Update main value when type-specific values change
	function handleBooleanChange(event?: Event) {
		if (normalizedType === 'checkbox' || normalizedType === 'toggle') {
			value = booleanValue;
			if (onchange && event) onchange(event);
		}
	}

	function handleStringChange(event?: Event) {
		if (normalizedType === 'textarea') {
			value = stringValue;
			if (onchange && event) onchange(event);
		}
	}

	function handleNumberChange(event?: Event) {
		if (
			[
				'text',
				'email',
				'tel',
				'number',
				'url',
				'password',
				'date',
				'time',
				'select',
				'radio'
			].includes(normalizedType)
		) {
			value = numberValue;
			if (onchange && event) onchange(event);
		}
	}

	// Extract field configuration
	const required = fieldConfig.optional === false;
	const {
		options,
		helpText,
		valueText,
		type = fieldConfig.type,
		icon,
		rows,
		placeholder,
		selectPlaceholder,
		description
	} = fieldConfig.meta || {};
	const hasOptions = options && options.length > 0;
	const { label } = fieldConfig;

	// State computations
	let hasError = $derived(!!error && error.length > 0);
	let hasValue = $derived(value !== undefined && value !== '' && value !== null);
	let isValid = $derived(hasValue && !hasError);

	// Type normalization
	let normalizedType = $derived(type === 'string' ? 'text' : type === 'boolean' ? 'toggle' : type);

	// Dynamic CSS classes
	let containerClasses = $derived.by(() => {
		const base = 'form-control w-full';
		const sizeClass = size === 'sm' ? 'form-control-sm' : size === 'lg' ? 'form-control-lg' : '';
		const variantClass = variant === 'compact' ? 'compact' : variant === 'full' ? 'full-width' : '';
		return [base, sizeClass, variantClass].filter(Boolean).join(' ');
	});

	// Field IDs for accessibility
	let fieldId = `field-${name}`;
	let helpId = `${fieldId}-help`;
	let errorId = `${fieldId}-error`;
	let descriptionId = `${fieldId}-desc`;

	// ARIA attributes
	let ariaDescribedBy = $derived.by(() => {
		const ids = [];
		if (helpText) ids.push(helpId);
		if (description && description !== helpText) ids.push(descriptionId);
		if (error) ids.push(errorId);
		return ids.length > 0 ? ids.join(' ') : undefined;
	});

	// Common field props
	let commonFieldProps = $derived.by(() => ({
		id: fieldId,
		name,
		disabled,
		required,
		size,
		hasError,
		isValid,
		icon,
		...(ariaDescribedBy && { 'aria-describedby': ariaDescribedBy }),
		'aria-invalid': hasError,
		'aria-required': required,
		'data-testid': `field-${name}`
	}));

	// Type-specific props
	let inputProps = $derived.by(() => {
		const props = {
			...commonFieldProps,
			type: normalizedType as
				| 'text'
				| 'email'
				| 'tel'
				| 'number'
				| 'url'
				| 'password'
				| 'date'
				| 'time',
			placeholder: placeholder || '',
			options: hasOptions ? options : []
		};
		return props;
	});

	let selectProps = $derived.by(() => {
		const props = {
			...commonFieldProps,
			options: hasOptions ? options : [],
			placeholder: selectPlaceholder || 'Bitte wählen...'
		};
		return props;
	});

	let textareaProps = $derived.by(() => {
		const props = {
			...commonFieldProps,
			placeholder: placeholder || '',
			rows: rows || 4
		};
		return props;
	});

	let radioProps = $derived.by(() => {
		const props = {
			...commonFieldProps,
			options: hasOptions ? options : []
		};
		return props;
	});

	let checkboxProps = $derived.by(() => {
		const props = {
			...commonFieldProps,
			label: label || ''
		};
		return props;
	});

	let toggleProps = $derived.by(() => {
		const props = {
			...commonFieldProps,
			label: label || ''
		};
		return props;
	});
</script>

<div class={containerClasses}>
	<!-- Enhanced Label with Status Indicators -->
	<label for={fieldId} class="label w-full overflow-hidden pb-1">
		<span
			class="label-text text-base-content block font-medium"
			style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
		>
			{label}
			{#if required}
				<span class="text-error ml-1 text-sm" aria-label="Pflichtfeld">*</span>
			{/if}

			<!-- Status Indicator -->
			{#if hasValue}
				<span class="ml-2 inline-block" aria-hidden="true">
					{#if hasError}
						<Icon src={X} size="14" class="text-error inline" />
					{:else if isValid}
						<Icon src={Check} size="14" class="text-success inline" />
					{/if}
				</span>
			{/if}

			<!-- Value Information Tooltip -->
			{#if valueText}
				<span class="tooltip tooltip-left ml-2 inline-block" data-tip={valueText}>
					<button
						type="button"
						class="btn btn-ghost btn-xs btn-circle"
						aria-label="Warum ist diese Information wichtig?"
						tabindex="-1"
					>
						<Icon src={Info} size="14" class="text-base-content/60" />
					</button>
				</span>
			{/if}
		</span>
	</label>

	<!-- Field Description (if different from help text) -->
	{#if description && description !== helpText}
		<div id={descriptionId} class="text-base-content/70 mb-2 text-left text-sm">
			{description}
		</div>
	{/if}

	<!-- Field Components -->
	{#if ['text', 'email', 'tel', 'number', 'url', 'password', 'date', 'time'].includes(normalizedType)}
		<BaseInput {...inputProps} bind:value={numberValue} onchange={handleNumberChange} />
	{:else if normalizedType === 'textarea'}
		<BaseTextarea {...textareaProps} bind:value={stringValue} onchange={handleStringChange} />
	{:else if normalizedType === 'select'}
		<BaseSelect {...selectProps} bind:value={numberValue} onchange={handleNumberChange} />
	{:else if normalizedType === 'radio' && hasOptions}
		<BaseRadio {...radioProps} bind:value={numberValue} onchange={handleNumberChange} />
	{:else if normalizedType === 'checkbox'}
		<BaseCheckbox {...checkboxProps} bind:checked={booleanValue} onchange={handleBooleanChange} />
	{:else if normalizedType === 'toggle'}
		<BaseToggle {...toggleProps} bind:checked={booleanValue} onchange={handleBooleanChange} />
	{/if}

	<!-- Help Text -->
	{#if helpText}
		<div id={helpId} class="mt-1 text-left">
			<span class="text-base-content/60 text-xs leading-relaxed">
				{helpText}
			</span>
		</div>
	{/if}

	<!-- Error Message with Animation -->
	{#if error}
		<div
			id={errorId}
			class="animate-in slide-in-from-top-1 mt-1 text-left duration-200"
			role="alert"
			aria-live="polite"
		>
			<span class="text-error flex items-center gap-1 text-xs font-medium">
				<Icon src={TriangleAlert} size="14" class="text-error flex-shrink-0" />
				{error}
			</span>
		</div>
	{/if}

	<!-- Species Identification Help (only for species field) -->
	{#if name === 'species' && normalizedType === 'select'}
		<SpeciesIdentificationHelp currentValue={value} />
	{/if}
</div>

<style>
	/* Enhanced focus indicators for accessibility */
	:global(
		.input:focus-visible,
		.select:focus-visible,
		.textarea:focus-visible,
		.checkbox:focus-visible,
		.radio:focus-visible,
		.toggle:focus-visible
	) {
		outline: 2px solid oklch(var(--p));
		outline-offset: 2px;
		border-color: oklch(var(--p));
	}

	/* Improved touch targets for mobile accessibility (48x48 DP minimum) */
	:global(.form-control input, .form-control select, .form-control textarea) {
		min-height: 48px;
	}

	:global(.form-control .checkbox, .form-control .radio, .form-control .toggle) {
		min-width: 20px;
		min-height: 20px;
	}

	:global(.form-control .btn-circle) {
		min-width: 32px;
		min-height: 32px;
	}

	/* Smooth transitions for better UX */
	:global(.input, .select, .textarea, .checkbox, .radio, .toggle) {
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease,
			background-color 0.2s ease;
	}

	/* Enhanced hover states */
	:global(.label:hover .input, .label:hover .select, .label:hover .textarea) {
		border-color: oklch(var(--p) / 0.5);
	}

	/* Better visual hierarchy in cards */
	:global(.card .form-control) {
		margin-bottom: 1rem;
	}

	/* Ensure labels wrap properly on mobile */
	:global(.label-text) {
		hyphens: auto;
		max-width: 100%;
	}

	/* Prevent overflow on small screens */
	@media (max-width: 640px) {
		:global(.form-control) {
			max-width: 100%;
		}

		:global(.label) {
			max-width: 100%;
		}
	}

	:global(.card .form-control:last-child) {
		margin-bottom: 0;
	}

	/* Compact variant styles */
	:global(.form-control.compact) {
		margin-bottom: 0.5rem;
	}

	:global(.form-control.compact .label) {
		padding-bottom: 0.25rem;
	}

	/* Full-width variant for container optimization */
	:global(.form-control.full-width) {
		width: 100%;
		max-width: none;
	}

	/* Small form controls for dense layouts */
	:global(.form-control-sm .input, .form-control-sm .select, .form-control-sm .textarea) {
		min-height: 36px;
		font-size: 0.875rem;
	}

	:global(.form-control-sm .label-text) {
		font-size: 0.875rem;
	}

	/* Large form controls for prominent fields */
	:global(.form-control-lg .input, .form-control-lg .select, .form-control-lg .textarea) {
		min-height: 56px;
		font-size: 1.125rem;
	}

	:global(.form-control-lg .label-text) {
		font-size: 1rem;
		font-weight: 600;
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		:global(.form-control .tooltip) {
			display: none; /* Hide tooltips on mobile to prevent accessibility issues */
		}

		:global(.form-control .input, .form-control .select, .form-control .textarea) {
			font-size: 16px; /* Prevent zoom on iOS */
		}
	}

	/* High contrast mode support */
	@media (prefers-contrast: high) {
		:global(.input, .select, .textarea) {
			border-width: 2px;
		}

		:global(.input:focus, .select:focus, .textarea:focus) {
			outline-width: 3px;
		}
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		:global(.input, .select, .textarea, .checkbox, .radio, .toggle) {
			transition: none;
		}

		:global(.animate-in) {
			animation: none;
		}
	}

	/* Print styles */
	@media print {
		:global(.form-control) {
			break-inside: avoid;
		}

		:global(.tooltip, .btn-circle) {
			display: none;
		}
	}
</style>

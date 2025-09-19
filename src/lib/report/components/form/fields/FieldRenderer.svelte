<!--
  Field renderer component that uses fieldConfig to route to the correct field component
  Independent of form context, accepts fieldConfig and value props
-->
<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { FieldSize, FieldVariant } from '$lib/types';
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
		value?: string | number | boolean | undefined | null;
		error?: string | undefined;
		disabled?: boolean;
		size?: FieldSize;
		variant?: FieldVariant;
		onchange?: (event: Event) => void;
	} = $props();

	// Bindable values for different component types
	let booleanValue = $state(false);
	let stringValue = $state('');
	let numberValue = $state<number | string>('');

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
			value = numberValue === null ? undefined : Number(numberValue);
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
						<Icon icon="lucide:x" width="14" class="text-error inline" />
					{:else if isValid}
						<Icon icon="lucide:check" width="14" class="text-success inline" />
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
						<Icon icon="lucide:info" width="14" class="text-base-content/60" />
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
				<Icon icon="lucide:triangle-alert" width="14" class="text-error flex-shrink-0" />
				{error}
			</span>
		</div>
	{/if}

	<!-- Species Identification Help (only for species field) -->
	{#if name === 'species' && normalizedType === 'select'}
		<SpeciesIdentificationHelp currentValue={value} />
	{/if}
</div>

<!--
  Form field component with form context integration
  Uses FieldRenderer for actual field rendering, handles form context integration
-->
<script lang="ts">
	import { createLogger } from '$lib/logger';
	import { sightingSchemaFields } from '$lib/report/formConfig';
	import { getFormContext } from '$lib/report/formContext';
	import type { SightingFormData } from '$lib/types/Form';
	import { untrack } from 'svelte';
	import * as yup from 'yup';
	import FieldRenderer from './FieldRenderer.svelte';

	const logger = createLogger('report:FormField');

	let {
		name,
		disabled = false,
		size = 'md',
		variant = 'default',
		required = undefined
	}: {
		name: keyof Omit<SightingFormData, 'uploadedFiles'>;
		disabled?: boolean;
		size?: 'sm' | 'md' | 'lg';
		variant?: 'default' | 'compact' | 'full';
		/**
		 * Optionaler Override der Pflichtfeld-Markierung für konditionale
		 * Schema-Regeln (`when()`), die aus `describe()` nicht ableitbar sind.
		 * Ohne Angabe gilt weiterhin die Ableitung aus dem Yup-Schema.
		 */
		required?: boolean | undefined;
	} = $props();

	const context = getFormContext();

	if (!context) {
		throw new Error('FormField must be used inside a Form component (context not found)');
	}

	const { form, errors, touched, handleChange } = context;

	let fieldConfig = $derived.by(() => {
		const config = sightingSchemaFields[name] as yup.SchemaDescription | undefined;
		if (!config || !config.meta) {
			logger.error(
				{ schema: sightingSchemaFields },
				`Field "${name}" not found in schema configuration.`
			);
			throw new Error(
				`Field "${name}" not found in schema configuration (${config ? 'meta configuration missing' : 'schema element missing'}).`
			);
		}
		return config;
	});

	let error = $derived($errors[name]);
	let fieldTouched = $derived($touched[name] ?? false);
	// Extract the value and ensure it's a compatible type for FieldRenderer
	let formValue = $derived($form[name]);
	let value: string | number | boolean | undefined | null = $derived(
		// Convert any complex types to their primitive representation
		typeof formValue === 'object' && formValue !== null
			? JSON.stringify(formValue)
			: (formValue as string | number | boolean | undefined | null)
	);

	// Only log during development (untrack to avoid re-running on every form change)
	$effect(() => {
		logger.debug(
			{ form: untrack(() => $form), config: untrack(() => fieldConfig) },
			`FormField "${name}" rendered`
		);
	});
</script>

<div data-field={name}>
	<FieldRenderer
		{fieldConfig}
		{name}
		bind:value
		{error}
		touched={fieldTouched}
		{disabled}
		{size}
		{variant}
		{required}
		onchange={handleChange}
	/>
</div>

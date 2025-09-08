<!--
  Form field component with form context integration
  Uses FieldRenderer for actual field rendering, handles form context integration
-->
<script lang="ts">
	import { createLogger } from '$lib/logger';
	import { sightingSchemaFields } from '$lib/report/formConfig';
	import { getFormContext } from '$lib/report/formContext';
	import type { SightingFormData } from '$lib/types/Form';
	import * as yup from 'yup';
	import FieldRenderer from './FieldRenderer.svelte';

	const logger = createLogger('report:FormField');

	let {
		name,
		disabled = false,
		size = 'md',
		variant = 'default'
	}: {
		name: keyof Omit<SightingFormData, 'uploadedFiles'>;
		disabled?: boolean;
		size?: 'sm' | 'md' | 'lg';
		variant?: 'default' | 'compact' | 'full';
	} = $props();

	let context = getFormContext();

	if (!context) {
		throw new Error(`Form context not found for field: ${name}`);
	}

	const { form, errors, handleChange } = context;

	let fieldConfig = sightingSchemaFields[name] as yup.SchemaDescription | undefined;

	if (!fieldConfig || !fieldConfig.meta) {
		logger.error(
			{ schema: sightingSchemaFields },
			`Field "${name}" not found in schema configuration.`
		);
		throw new Error(
			`Field "${name}" not found in schema configuration (${fieldConfig?.meta ? 'meta configuration missing' : 'schema element missing'}).`
		);
	}
	let error = $derived($errors[name]);
	// Extract the value and ensure it's a compatible type for FieldRenderer
	let formValue = $derived($form[name]);
	let value: string | number | boolean | undefined | null = $derived(
		// Convert any complex types to their primitive representation
		typeof formValue === 'object' && formValue !== null ? 
			JSON.stringify(formValue) : 
			formValue as string | number | boolean | undefined | null
	);

	// Only log during development
	logger.debug({ form: $form, config: fieldConfig }, `FormField "${name}" rendered`);
</script>

<div data-field={name}>
	<FieldRenderer
		{fieldConfig}
		{name}
		bind:value
		{error}
		{disabled}
		{size}
		{variant}
		onchange={handleChange}
	/>
</div>

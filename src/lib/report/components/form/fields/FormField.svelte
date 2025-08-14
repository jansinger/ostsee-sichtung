<!--
  Form field component with form context integration
  Uses FieldRenderer for actual field rendering, handles form context integration
-->
<script lang="ts">
	import { createLogger } from '$lib/logger';
	import { sightingSchemaFields } from '$lib/report/formConfig';
	import { getFormContext } from '$lib/report/formContext';
	import type { SightingFormValues } from '$lib/types/Form';
	import * as yup from 'yup';
	import FieldRenderer from './FieldRenderer.svelte';

	const logger = createLogger('report:FormField');

	let {
		name,
		disabled = false,
		size = 'md',
		variant = 'default'
	}: {
		name: keyof SightingFormValues;
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
	let value: SightingFormValues[typeof name] = $derived($form[name]);

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

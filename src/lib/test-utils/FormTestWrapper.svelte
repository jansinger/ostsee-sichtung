<script lang="ts">
	import type { Snippet } from 'svelte';
	import Form from '$lib/report/components/form/Form.svelte';
	import type { FormContext } from '$lib/report/types';
	import type { ObjectSchema, AnyObject } from 'yup';

	let {
		initialValues = {},
		validationSchema = undefined,
		onSubmit = async () => {},
		children
	}: {
		initialValues?: Record<string, unknown>;
		validationSchema?: ObjectSchema<AnyObject> | undefined;
		onSubmit?: (values: Record<string, unknown>) => Promise<void> | void;
		children: Snippet;
	} = $props();

	let context: FormContext = $state({} as FormContext);
</script>

<Form {initialValues} {validationSchema} {onSubmit} bind:context>
	{@render children()}
</Form>

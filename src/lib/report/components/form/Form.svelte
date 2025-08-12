<script lang="ts">
	import { setFormContext } from '$lib/report/formContext';
	import type { FormContext } from '$lib/report/types';
	import { type Snippet } from 'svelte';

	import { createForm, type FormProps } from 'svelte-forms-lib';
	import type { HTMLFormAttributes } from 'svelte/elements';

	const onSubmitDefault = () => {
		throw new Error('onSubmit is a required property in <Form /> when using the fallback context');
	};

	let {
		initialValues = {},
		validate = null,
		validationSchema = null,
		onSubmit = onSubmitDefault,
		children,
		context = $bindable({}),
		...restProps
	} = $props<
		FormProps & {
			children: Snippet;
			context: FormContext;
			restProps?: HTMLFormAttributes;
		}
	>();

	// Create form context
	context = createForm({
		initialValues,
		onSubmit,
		validate,
		validationSchema
	});

	// Set form context on the parent component
	// This allows the form context to be accessed by child components within the same component tree
	// without passing props down manually.
	setFormContext(context);
</script>

<form onsubmit={context.handleSubmit} {...restProps}>
	{@render children()}
</form>

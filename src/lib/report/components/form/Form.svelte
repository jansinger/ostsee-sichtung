<script lang="ts">
	import { setFormContext } from '$lib/report/formContext';
	import type { FormContext } from '$lib/report/types';
	import type { MediaStore } from '$lib/utils/media/MediaFile';
	import { type Snippet, untrack } from 'svelte';

	import { createForm, type FormProps } from '$lib/form/createForm';
	import type { HTMLFormAttributes } from 'svelte/elements';

	const onSubmitDefault = () => {
		throw new Error('onSubmit is a required property in <Form /> when using the fallback context');
	};

	let {
		children,
		context = $bindable({} as FormContext),
		...formAndRestProps
	} = $props<
		Omit<FormProps, 'onSubmit'> &
			HTMLFormAttributes & {
				children: Snippet;
				context?: FormContext;
				// Intentionally wide: callers pass typed onSubmit (e.g. (values: SightingFormData) => void).
				// TypeScript can't infer the T→SightingFormData chain without a generic component,
				// but at runtime createForm always calls onSubmit with the correctly-typed values.
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				onSubmit?: (...args: any[]) => unknown;
			}
	>();

	// Plain destructuring via untrack - avoids state_referenced_locally warnings
	const {
		initialValues = {},
		onSubmit = onSubmitDefault,
		validate = null,
		validationSchema = null,
		...restProps
	} = untrack(() => formAndRestProps);

	// Create form context
	context = createForm({
		initialValues,
		onSubmit: onSubmit as FormProps['onSubmit'],
		validate,
		validationSchema
	}) as unknown as FormContext;

	const mediaStore = $state<MediaStore>({ mediaFiles: [] });
	// Set form context on the parent component
	// This allows the form context to be accessed by child components within the same component tree
	// without passing props down manually.
	setFormContext({ ...context, mediaStore });
</script>

<form onsubmit={context.handleSubmit} {...restProps}>
	<!-- Honeypot field for spam protection - must be invisible to users -->
	<input
		type="text"
		name="_honeypot"
		value=""
		style="position: absolute; left: -9999px; opacity: 0; height: 0; width: 0;"
		tabindex="-1"
		autocomplete="off"
		aria-hidden="true"
	/>
	{@render children()}
</form>

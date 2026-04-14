import { derived, get, writable } from 'svelte/store';
import type { AnyObjectSchema, ValidationError } from 'yup';

export interface FormProps<T extends Record<string, unknown> = Record<string, unknown>> {
	initialValues: T;
	// Return type is unknown — callers may return values (e.g. admin form returns FrontendSighting)
	onSubmit: (values: T) => unknown;
	validationSchema?: AnyObjectSchema | null;
	validate?: ((values: T) => Record<string, string> | Promise<Record<string, string>>) | null;
}

export function createForm<T extends Record<string, unknown>>(options: FormProps<T>) {
	const { initialValues, onSubmit, validationSchema = null, validate = null } = options;

	const form = writable<T>({ ...initialValues });
	const errors = writable<Record<string, string>>({});
	const isSubmitting = writable(false);
	const isValid = derived(errors, ($errors) => Object.keys($errors).length === 0);

	function updateField(field: keyof T, value: unknown): void {
		form.update((current) => ({ ...current, [field]: value }));
	}

	function updateInitialValues(values: T): void {
		form.set({ ...values });
		errors.set({});
	}

	function handleChange(event: Event): void {
		const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
		const { name } = target;
		const isCheckbox = (target as HTMLInputElement).type === 'checkbox';
		const value = isCheckbox ? (target as HTMLInputElement).checked : target.value;
		updateField(name as keyof T, value);
	}

	async function handleSubmit(event: Event): Promise<void> {
		event.preventDefault();
		isSubmitting.set(true);
		errors.set({});

		try {
			const values = get(form);

			// Optional custom validate function (same API as svelte-forms-lib)
			if (validate) {
				const customErrors = await validate(values);
				if (Object.keys(customErrors).length > 0) {
					errors.set(customErrors);
					return;
				}
			}

			if (validationSchema) {
				// validate() with abortEarly: false returns all errors + applies .transform()
				const validated = await validationSchema.validate(values, { abortEarly: false });
				await onSubmit(validated as T);
			} else {
				await onSubmit(values);
			}
		} catch (err) {
			const yupErr = err as ValidationError;
			if (yupErr.name === 'ValidationError') {
				const newErrors: Record<string, string> = {};
				if (yupErr.inner && yupErr.inner.length > 0) {
					// Multiple errors (abortEarly: false)
					for (const ve of yupErr.inner) {
						if (ve.path) newErrors[ve.path] = ve.message;
					}
				} else if (yupErr.path) {
					// Single error (only one field invalid)
					newErrors[yupErr.path] = yupErr.message;
				}
				errors.set(newErrors);
			}
			// Non-Yup errors (e.g. onSubmit rejected): swallow, isSubmitting still resets in finally
		} finally {
			isSubmitting.set(false);
		}
	}

	return {
		form,
		errors,
		isSubmitting,
		isValid,
		handleSubmit,
		handleChange,
		updateField,
		updateInitialValues
	};
}

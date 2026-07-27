import { derived, get, writable } from 'svelte/store';
import { ValidationError } from 'yup';
import type { AnyObjectSchema } from 'yup';

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
	const touched = writable<Record<string, boolean>>({});
	const isSubmitting = writable(false);
	const isValid = derived(errors, ($errors) => Object.keys($errors).length === 0);

	function markTouched(field: keyof T): void {
		touched.update((current) =>
			current[field as string] ? current : { ...current, [field as string]: true }
		);
	}

	function updateField(field: keyof T, value: unknown): void {
		form.update((current) => ({ ...current, [field]: value }));
		markTouched(field);
		errors.update((current) => {
			const next = { ...current };
			delete next[field as string];
			return next;
		});
	}

	function updateInitialValues(values: T): void {
		form.set({ ...values });
		errors.set({});
		touched.set({});
	}

	function handleChange(event: Event): void {
		const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
		// Fall back to id when name is absent (e.g. LocationInput latitude/longitude inputs)
		const field = target.name || (target as HTMLElement).id;
		if (!field) return;
		const isCheckbox = (target as HTMLInputElement).type === 'checkbox';
		const value = isCheckbox ? (target as HTMLInputElement).checked : target.value;
		updateField(field as keyof T, value);
	}

	async function handleSubmit(event: Event): Promise<void> {
		event.preventDefault();
		isSubmitting.set(true);
		errors.set({});

		try {
			const values = get(form);

			// Optional custom validate function
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
			if (err instanceof ValidationError) {
				const newErrors: Record<string, string> = {};
				if (err.inner && err.inner.length > 0) {
					// Multiple errors (abortEarly: false)
					for (const ve of err.inner) {
						if (ve.path) newErrors[ve.path] = ve.message;
					}
				} else if (err.path) {
					// Single error (only one field invalid)
					newErrors[err.path] = err.message;
				}
				errors.set(newErrors);
			} else {
				// Non-Yup errors (e.g. rejected onSubmit): rethrow so callers can show error feedback
				throw err;
			}
		} finally {
			isSubmitting.set(false);
		}
	}

	return {
		form,
		errors,
		touched,
		isSubmitting,
		isValid,
		handleSubmit,
		handleChange,
		updateField,
		updateInitialValues
	};
}

/** Type of the object returned by `createForm<T>`. */
export type FormApi<T extends Record<string, unknown>> = ReturnType<typeof createForm<T>>;

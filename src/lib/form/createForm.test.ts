import { get } from 'svelte/store';
import { describe, expect, it, vi } from 'vitest';
import * as yup from 'yup';
import { createForm } from './createForm';

// Minimal schema for testing — mirrors real project patterns (required + transform)
const testSchema = yup.object({
	name: yup.string().required('Name ist erforderlich'),
	count: yup
		.number()
		.transform((v) => (isNaN(v) ? undefined : v))
		.nullable()
		.min(0, 'Muss mindestens 0 sein')
});

type TestValues = { name: string; count: number | null };

const defaultValues: TestValues = { name: '', count: null };

describe('createForm — initial state', () => {
	it('form store contains the provided initialValues', () => {
		const { form } = createForm({
			initialValues: { name: 'Max', count: 3 },
			onSubmit: vi.fn()
		});
		expect(get(form)).toEqual({ name: 'Max', count: 3 });
	});

	it('errors store starts as empty object', () => {
		const { errors } = createForm({ initialValues: defaultValues, onSubmit: vi.fn() });
		expect(get(errors)).toEqual({});
	});

	it('isSubmitting starts as false', () => {
		const { isSubmitting } = createForm({ initialValues: defaultValues, onSubmit: vi.fn() });
		expect(get(isSubmitting)).toBe(false);
	});
});

describe('createForm — updateField', () => {
	it('updates the specified field without affecting other fields', () => {
		const { form, updateField } = createForm({
			initialValues: { name: 'Max', count: 1 },
			onSubmit: vi.fn()
		});
		updateField('name', 'Moritz');
		expect(get(form)).toEqual({ name: 'Moritz', count: 1 });
	});

	it('updateField works for boolean values', () => {
		const { form, updateField } = createForm({
			initialValues: { active: false },
			onSubmit: vi.fn()
		});
		updateField('active', true);
		expect(get(form).active).toBe(true);
	});
});

describe('createForm — handleChange', () => {
	function makeInputEvent(name: string, value: string, type = 'text', id = ''): Event {
		const target = { name, id, value, type, tagName: 'INPUT' };
		return { target } as unknown as Event;
	}

	function makeCheckboxEvent(name: string, checked: boolean): Event {
		const target = {
			name,
			id: '',
			value: checked ? 'on' : '',
			type: 'checkbox',
			checked,
			tagName: 'INPUT'
		};
		return { target } as unknown as Event;
	}

	function makeSelectEvent(name: string, value: string): Event {
		const target = { name, id: '', value, tagName: 'SELECT' };
		return { target } as unknown as Event;
	}

	function makeIdOnlyEvent(id: string, value: string): Event {
		// Simulates LocationInput latitude/longitude: id present, name absent
		const target = { name: '', id, value, type: 'number', tagName: 'INPUT' };
		return { target } as unknown as Event;
	}

	it('updates the form field from a text input event', () => {
		const { form, handleChange } = createForm({
			initialValues: { name: '' },
			onSubmit: vi.fn()
		});
		handleChange(makeInputEvent('name', 'Elke'));
		expect(get(form).name).toBe('Elke');
	});

	it('reads checked (not value) from a checkbox input', () => {
		const { form, handleChange } = createForm({
			initialValues: { active: false },
			onSubmit: vi.fn()
		});
		handleChange(makeCheckboxEvent('active', true));
		expect(get(form).active).toBe(true);
	});

	it('updates the form field from a select element event', () => {
		const { form, handleChange } = createForm({
			initialValues: { species: '0' },
			onSubmit: vi.fn()
		});
		handleChange(makeSelectEvent('species', '2'));
		expect(get(form).species).toBe('2');
	});

	it('falls back to id when name is absent (LocationInput latitude/longitude pattern)', () => {
		const { form, handleChange } = createForm({
			initialValues: { latitude: 0, longitude: 0 },
			onSubmit: vi.fn()
		});
		handleChange(makeIdOnlyEvent('latitude', '54.5'));
		handleChange(makeIdOnlyEvent('longitude', '13.5'));
		expect(get(form).latitude).toBe('54.5');
		expect(get(form).longitude).toBe('13.5');
	});

	it('ignores events with neither name nor id', () => {
		const { form, handleChange } = createForm({
			initialValues: { count: 0 },
			onSubmit: vi.fn()
		});
		const emptyTarget = { name: '', id: '', value: '99', type: 'number', tagName: 'INPUT' };
		handleChange({ target: emptyTarget } as unknown as Event);
		expect(get(form).count).toBe(0); // unchanged
	});
});

describe('createForm — handleSubmit (success path)', () => {
	it('calls onSubmit with Yup-validated (and cast) values', async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined);
		const { handleSubmit } = createForm({
			initialValues: { name: 'Max', count: null },
			validationSchema: testSchema,
			onSubmit
		});
		const event = new Event('submit');
		vi.spyOn(event, 'preventDefault');
		await handleSubmit(event);
		expect(onSubmit).toHaveBeenCalledOnce();
		expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ name: 'Max' });
	});

	it('calls preventDefault on the submit event', async () => {
		const { handleSubmit } = createForm({
			initialValues: { name: 'Max', count: null },
			validationSchema: testSchema,
			onSubmit: vi.fn().mockResolvedValue(undefined)
		});
		const event = new Event('submit');
		const spy = vi.spyOn(event, 'preventDefault');
		await handleSubmit(event);
		expect(spy).toHaveBeenCalled();
	});

	it('sets isSubmitting to true during onSubmit and back to false after', async () => {
		const submittingValues: boolean[] = [];
		const { isSubmitting, handleSubmit } = createForm({
			initialValues: { name: 'Max', count: null },
			validationSchema: testSchema,
			onSubmit: vi.fn().mockImplementation(async () => {
				submittingValues.push(get(isSubmitting));
			})
		});
		await handleSubmit(new Event('submit'));
		expect(submittingValues).toEqual([true]);
		expect(get(isSubmitting)).toBe(false);
	});

	it('clears errors before each submission attempt', async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined);
		const { errors, handleSubmit } = createForm({
			initialValues: { name: 'Max', count: null },
			validationSchema: testSchema,
			onSubmit
		});
		// Seed a pre-existing error
		errors.set({ name: 'Old error' });
		await handleSubmit(new Event('submit'));
		expect(get(errors)).toEqual({});
	});

	it('calls onSubmit directly when no validationSchema is provided', async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined);
		const { handleSubmit } = createForm({
			initialValues: { name: 'Max', count: null },
			onSubmit
		});
		await handleSubmit(new Event('submit'));
		expect(onSubmit).toHaveBeenCalledWith({ name: 'Max', count: null });
	});
});

describe('createForm — handleSubmit (validation failure)', () => {
	it('sets errors from Yup ValidationError (abortEarly: false)', async () => {
		const onSubmit = vi.fn();
		const { errors, handleSubmit } = createForm({
			initialValues: { name: '', count: -1 },
			validationSchema: testSchema,
			onSubmit
		});
		await handleSubmit(new Event('submit'));
		const errs = get(errors);
		expect(errs['name']).toBe('Name ist erforderlich');
		expect(errs['count']).toBe('Muss mindestens 0 sein');
	});

	it('does NOT call onSubmit when validation fails', async () => {
		const onSubmit = vi.fn();
		const { handleSubmit } = createForm({
			initialValues: { name: '', count: null },
			validationSchema: testSchema,
			onSubmit
		});
		await handleSubmit(new Event('submit'));
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('sets isSubmitting back to false after validation failure', async () => {
		const { isSubmitting, handleSubmit } = createForm({
			initialValues: { name: '', count: null },
			validationSchema: testSchema,
			onSubmit: vi.fn()
		});
		await handleSubmit(new Event('submit'));
		expect(get(isSubmitting)).toBe(false);
	});

	it('handles single Yup error (no inner array) correctly', async () => {
		const singleFieldSchema = yup.object({
			code: yup.string().required('Code erforderlich')
		});
		const { errors, handleSubmit } = createForm({
			initialValues: { code: '' },
			validationSchema: singleFieldSchema,
			onSubmit: vi.fn()
		});
		await handleSubmit(new Event('submit'));
		expect(get(errors)['code']).toBe('Code erforderlich');
	});
});

describe('createForm — handleSubmit (onSubmit throws)', () => {
	it('rejects and resets isSubmitting when onSubmit rejects', async () => {
		const { isSubmitting, handleSubmit } = createForm({
			initialValues: { name: 'Max', count: null },
			validationSchema: testSchema,
			onSubmit: vi.fn().mockRejectedValue(new Error('Server error'))
		});
		await expect(handleSubmit(new Event('submit'))).rejects.toThrow('Server error');
		expect(get(isSubmitting)).toBe(false);
	});
});

describe('createForm — errors store compatibility', () => {
	it('errors.update() merges new errors with existing ones (for StepNavigation)', () => {
		const { errors } = createForm({ initialValues: defaultValues, onSubmit: vi.fn() });
		errors.set({ name: 'Existing error' });
		errors.update((current) => ({ ...current, count: 'Step error' }));
		expect(get(errors)).toEqual({ name: 'Existing error', count: 'Step error' });
	});
});

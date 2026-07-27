import { beforeEach, describe, expect, it, vi } from 'vitest';

const { clearUserContactData } = vi.hoisted(() => ({ clearUserContactData: vi.fn() }));
vi.mock('$lib/storage/localStorage', () => ({ clearUserContactData }));

const { createToast } = vi.hoisted(() => ({ createToast: vi.fn() }));
vi.mock('$lib/stores/toastState.svelte', () => ({ createToast }));

import { USER_CONTACT_FIELDS } from '$lib/report/formConfig';
import {
	CLEAR_CONTACT_DATA_CONFIRM_MESSAGE,
	CLEAR_CONTACT_DATA_SUCCESS_MESSAGE,
	confirmAndClearContactData,
	resetSavedContactData
} from './clearContactData';

describe('resetSavedContactData', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('löscht die gespeicherten Kontaktdaten im Storage', () => {
		const updateField = vi.fn();

		resetSavedContactData({}, updateField);

		expect(clearUserContactData).toHaveBeenCalledOnce();
	});

	it('setzt alle Kontaktfelder auf ihren jeweiligen Default zurück', () => {
		const updateField = vi.fn();
		const formValues: Record<string, unknown> = {
			firstName: 'Max',
			email: 'max@example.com',
			nameConsent: true,
			shipNameConsent: false
		};

		resetSavedContactData(formValues, updateField);

		expect(updateField).toHaveBeenCalledTimes(USER_CONTACT_FIELDS.length);
		expect(updateField).toHaveBeenCalledWith('firstName', '');
		expect(updateField).toHaveBeenCalledWith('email', '');
		expect(updateField).toHaveBeenCalledWith('nameConsent', false);
		expect(updateField).toHaveBeenCalledWith('shipNameConsent', false);
	});
});

describe('confirmAndClearContactData', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fragt den Nutzer mit dem einheitlichen Bestätigungstext', () => {
		const confirmSpy = vi.fn().mockReturnValue(false);
		vi.stubGlobal('confirm', confirmSpy);

		confirmAndClearContactData({}, vi.fn());

		expect(confirmSpy).toHaveBeenCalledWith(CLEAR_CONTACT_DATA_CONFIRM_MESSAGE);
		vi.unstubAllGlobals();
	});

	it('löscht Kontaktdaten und zeigt einen Erfolgs-Toast, wenn der Nutzer bestätigt', () => {
		vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
		const updateField = vi.fn();

		const result = confirmAndClearContactData({ firstName: 'Max' }, updateField);

		expect(result).toBe(true);
		expect(clearUserContactData).toHaveBeenCalledOnce();
		expect(updateField).toHaveBeenCalledWith('firstName', '');
		expect(createToast).toHaveBeenCalledWith('success', CLEAR_CONTACT_DATA_SUCCESS_MESSAGE);

		vi.unstubAllGlobals();
	});

	it('tut nichts und gibt false zurück, wenn der Nutzer den Dialog abbricht', () => {
		vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
		const updateField = vi.fn();

		const result = confirmAndClearContactData({}, updateField);

		expect(result).toBe(false);
		expect(clearUserContactData).not.toHaveBeenCalled();
		expect(updateField).not.toHaveBeenCalled();
		expect(createToast).not.toHaveBeenCalled();

		vi.unstubAllGlobals();
	});
});

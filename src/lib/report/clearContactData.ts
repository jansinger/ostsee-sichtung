/**
 * Konsolidierte "Kontaktdaten löschen"-Logik.
 *
 * Vorher gab es diese Aktion zweimal (FormActions.svelte + Step4Contact.svelte)
 * mit unterschiedlichem Bestätigungstext und unterschiedlichem Feedback
 * (Toast vs. nur Logger). Diese Datei bündelt beides zu einer Implementierung
 * mit einem Text und einem Feedback-Weg (Toast).
 */
import { USER_CONTACT_FIELDS } from '$lib/report/formConfig';
import { clearUserContactData } from '$lib/storage/localStorage';
import { createToast } from '$lib/stores/toastState.svelte';
import type { SightingFormData } from '$lib/types/Form';

/**
 * Signatur von `updateField` aus dem Form-Context (`FormApi<SightingFormData>`).
 * Bewusst gegen `SightingFormData` getippt (statt generisch), da `updateField`
 * nur echte Feldnamen des Sichtungsformulars akzeptiert — `formValues` bleibt
 * dagegen locker typisiert, damit die Funktion auch mit einfachen Test-Objekten
 * aufgerufen werden kann.
 */
type UpdateContactField = (field: keyof SightingFormData, value: unknown) => void;

export const CLEAR_CONTACT_DATA_CONFIRM_MESSAGE =
	'Möchten Sie wirklich alle gespeicherten Kontaktdaten löschen? Diese müssen dann bei der nächsten Sichtung erneut eingegeben werden.';

export const CLEAR_CONTACT_DATA_SUCCESS_MESSAGE = 'Gespeicherte Kontaktdaten wurden gelöscht';

/**
 * Setzt die Kontaktfelder im Formular-State auf ihren jeweiligen Default zurück
 * (leerer String bzw. `false` bei Boolean-Feldern) und löscht die im Local-/
 * Session-Storage gespeicherten Kontaktdaten.
 *
 * Reine Datenoperation ohne Confirm-Dialog oder Toast, damit sie isoliert
 * testbar ist und unabhängig von `window.confirm` verwendet werden kann.
 */
export function resetSavedContactData(
	formValues: Record<string, unknown>,
	updateField: UpdateContactField
): void {
	clearUserContactData();

	for (const field of USER_CONTACT_FIELDS) {
		const defaultValue = typeof formValues[field] === 'boolean' ? false : '';
		updateField(field, defaultValue);
	}
}

/**
 * Fragt den Nutzer über das native `confirm()` und löscht bei Bestätigung die
 * gespeicherten Kontaktdaten inklusive der zugehörigen Formularfelder. Zeigt
 * anschließend einen Erfolgs-Toast an.
 *
 * Einheitliche Implementierung für alle Aufrufer (aktuell: Step4Contact).
 *
 * @returns `true` wenn die Löschung durchgeführt wurde, `false` wenn der
 * Nutzer den Dialog abgebrochen hat.
 */
export function confirmAndClearContactData(
	formValues: Record<string, unknown>,
	updateField: UpdateContactField
): boolean {
	if (!confirm(CLEAR_CONTACT_DATA_CONFIRM_MESSAGE)) {
		return false;
	}

	resetSavedContactData(formValues, updateField);
	createToast('success', CLEAR_CONTACT_DATA_SUCCESS_MESSAGE);

	return true;
}

import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ConfirmDialog from './ConfirmDialog.svelte';

/**
 * `ConfirmDialog` ist der allgemeine Bestätigungsdialog, herausgezogen aus
 * `DeleteDialog.svelte`: natives `<dialog>` mit `showModal()`/`close()`, damit
 * Fokus-Trap, ESC und der Top-Layer vom Browser kommen und nicht nachgebaut
 * werden. Alles Fallspezifische — Überschrift, Text, Beschriftungen, Variante
 * des Bestätigen-Knopfs — kommt über Props herein; die Komponente kennt keine
 * Botschaftsschlüssel.
 *
 * Die drei Wege aus dem Dialog heraus sind bewusst getrennt getestet: Knopf,
 * ESC und `close()` (Backdrop) laufen über verschiedene Codepfade, und der
 * teuerste Fehler wäre, dass einer davon `onConfirm` auslöst. Der Backdrop-Klick
 * selbst ist im Test nicht nachstellbar — die Fläche liegt im Top-Layer über dem
 * Testcontainer —, seine Wirkung ist aber exakt das `close()` des
 * `form method="dialog"`, und genau das prüft der Test.
 */

/** Trigger außerhalb des Dialogs — Ausgangspunkt für die Fokus-Rückkehr. */
function triggerAnlegen(): HTMLButtonElement {
	const knopf = document.createElement('button');
	knopf.type = 'button';
	knopf.textContent = 'Dialog öffnen';
	document.body.appendChild(knopf);
	knopf.focus();
	return knopf;
}

const basisProps = {
	closeLabel: 'Dialog schließen',
	title: 'Wirklich zurücksetzen?',
	message: 'Alle bisher eingegebenen Daten gehen verloren.',
	confirmLabel: 'Endgültig zurücksetzen',
	cancelLabel: 'Abbrechen'
};

function dialogElement(): HTMLDialogElement {
	const dialog = document.querySelector('dialog');
	expect(dialog).not.toBeNull();
	return dialog as HTMLDialogElement;
}

afterEach(() => {
	document.querySelectorAll('body > button').forEach((knopf) => knopf.remove());
});

describe('ConfirmDialog — Anzeige', () => {
	it('bleibt geschlossen, solange show false ist', async () => {
		await render(ConfirmDialog, { ...basisProps, show: false, onConfirm: vi.fn() });

		expect(dialogElement().open).toBe(false);
	});

	it('öffnet sich modal, sobald show true ist', async () => {
		const screen = await render(ConfirmDialog, { ...basisProps, show: false, onConfirm: vi.fn() });

		await screen.rerender({ ...basisProps, show: true, onConfirm: vi.fn() });
		await vi.waitFor(() => expect(dialogElement().open).toBe(true));
	});

	it('zeigt Überschrift, Text und beide Beschriftungen', async () => {
		const screen = await render(ConfirmDialog, { ...basisProps, show: true, onConfirm: vi.fn() });

		await expect.element(screen.getByText('Wirklich zurücksetzen?')).toBeInTheDocument();
		await expect
			.element(screen.getByText('Alle bisher eingegebenen Daten gehen verloren.'))
			.toBeInTheDocument();
		await expect
			.element(screen.getByRole('button', { name: 'Endgültig zurücksetzen' }))
			.toBeInTheDocument();
		await expect.element(screen.getByRole('button', { name: 'Abbrechen' })).toBeInTheDocument();
	});

	it('zeigt den zweiten Absatz nur, wenn detail gesetzt ist', async () => {
		const screen = await render(ConfirmDialog, {
			...basisProps,
			show: true,
			detail: 'Das lässt sich nicht rückgängig machen.',
			onConfirm: vi.fn()
		});

		await expect
			.element(screen.getByText('Das lässt sich nicht rückgängig machen.'))
			.toBeInTheDocument();
	});

	it('lässt den zweiten Absatz ohne detail weg', async () => {
		await render(ConfirmDialog, { ...basisProps, show: true, onConfirm: vi.fn() });

		expect(dialogElement().querySelectorAll('.modal-box p')).toHaveLength(1);
	});

	/* Die Variante ist Prop und nicht fest verdrahtet: Der Dialog trägt auch
	   nicht-destruktive Bestätigungen. Default bleibt `btn-error`, weil das die
	   im Projekt vorgeschriebene destruktive Variante ist. */
	it('gibt dem Bestätigen-Knopf per Default die destruktive Variante', async () => {
		const screen = await render(ConfirmDialog, { ...basisProps, show: true, onConfirm: vi.fn() });

		const knopf = screen.getByRole('button', { name: 'Endgültig zurücksetzen' }).element();
		expect(knopf.classList.contains('btn-error')).toBe(true);
	});

	it('übernimmt eine abweichende Variante aus confirmClass', async () => {
		const screen = await render(ConfirmDialog, {
			...basisProps,
			show: true,
			confirmClass: 'btn-primary',
			onConfirm: vi.fn()
		});

		const knopf = screen.getByRole('button', { name: 'Endgültig zurücksetzen' }).element();
		expect(knopf.classList.contains('btn-primary')).toBe(true);
		expect(knopf.classList.contains('btn-error')).toBe(false);
	});
});

describe('ConfirmDialog — Wege aus dem Dialog', () => {
	it('ruft onConfirm beim Bestätigen und schließt', async () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		const screen = await render(ConfirmDialog, {
			...basisProps,
			show: true,
			onConfirm,
			onCancel
		});

		await screen.getByRole('button', { name: 'Endgültig zurücksetzen' }).click();

		expect(onConfirm).toHaveBeenCalledOnce();
		expect(onCancel).not.toHaveBeenCalled();
		await vi.waitFor(() => expect(dialogElement().open).toBe(false));
	});

	it('ruft beim Abbrechen onCancel und niemals onConfirm', async () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		const screen = await render(ConfirmDialog, {
			...basisProps,
			show: true,
			onConfirm,
			onCancel
		});

		await screen.getByRole('button', { name: 'Abbrechen' }).click();

		expect(onConfirm).not.toHaveBeenCalled();
		await vi.waitFor(() => expect(onCancel).toHaveBeenCalledOnce());
		await vi.waitFor(() => expect(dialogElement().open).toBe(false));
	});

	it('behandelt ESC wie Abbrechen — onCancel genau einmal', async () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		await render(ConfirmDialog, { ...basisProps, show: true, onConfirm, onCancel });
		await vi.waitFor(() => expect(dialogElement().open).toBe(true));

		await userEvent.keyboard('{Escape}');

		await vi.waitFor(() => expect(onCancel).toHaveBeenCalledOnce());
		expect(onConfirm).not.toHaveBeenCalled();
		expect(dialogElement().open).toBe(false);
	});

	/* Stellvertreter für den Backdrop-Klick: `form method="dialog"` schließt den
	   Dialog über genau dieses `close()`. */
	it('behandelt das Schließen über den Backdrop wie Abbrechen', async () => {
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		await render(ConfirmDialog, { ...basisProps, show: true, onConfirm, onCancel });
		await vi.waitFor(() => expect(dialogElement().open).toBe(true));

		dialogElement().close();

		await vi.waitFor(() => expect(onCancel).toHaveBeenCalledOnce());
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it('läuft ohne onCancel durch', async () => {
		const onConfirm = vi.fn();
		await render(ConfirmDialog, { ...basisProps, show: true, onConfirm });
		await vi.waitFor(() => expect(dialogElement().open).toBe(true));

		dialogElement().close();

		await vi.waitFor(() => expect(dialogElement().open).toBe(false));
		expect(onConfirm).not.toHaveBeenCalled();
	});
});

/**
 * Der Dialog wird auch INNERHALB eines `<form>` verwendet (`FormActions` liegt
 * im Meldeformular). DaisyUIs Backdrop-Idiom ist ein `<form method="dialog">`,
 * und verschachtelte Formulare verwirft der HTML-Parser: Das SSR-Markup enthält
 * sie, das geparste DOM nicht, die Hydration bricht ab und Svelte baut die Seite
 * clientseitig neu auf. Sichtbar wurde das nur als Folgeschaden — der
 * Wiederherstellungs-Toast erschien doppelt, und `e2e/form-autosave.spec.ts`
 * meldete eine Strict-Mode-Verletzung, die auf nichts davon hindeutet.
 *
 * Der Test steht deshalb hier und nicht dort: Er benennt die Ursache.
 */
describe('ConfirmDialog — verschachtelbar in ein Formular', () => {
	it('rendert kein eigenes form-Element', async () => {
		await render(ConfirmDialog, { ...basisProps, show: true, onConfirm: vi.fn() });

		expect(dialogElement().querySelectorAll('form')).toHaveLength(0);
	});

	it('behält den Backdrop als schließenden Knopf', async () => {
		const onCancel = vi.fn();
		const screen = await render(ConfirmDialog, {
			...basisProps,
			show: true,
			onConfirm: vi.fn(),
			onCancel
		});

		await screen.getByRole('button', { name: 'Dialog schließen' }).click();

		await vi.waitFor(() => expect(onCancel).toHaveBeenCalledOnce());
		await vi.waitFor(() => expect(dialogElement().open).toBe(false));
	});
});

describe('ConfirmDialog — Barrierefreiheit', () => {
	it('benennt sich per aria-labelledby an seiner Überschrift', async () => {
		await render(ConfirmDialog, { ...basisProps, show: true, onConfirm: vi.fn() });

		const dialog = dialogElement();
		const id = dialog.getAttribute('aria-labelledby');
		expect(id).toBeTruthy();
		expect(document.getElementById(id as string)?.textContent).toContain(
			'Wirklich zurücksetzen?'
		);
	});

	/* Der Fokus muss dorthin zurück, wo er beim Öffnen war — sonst steht er nach
	   dem Schließen am Seitenanfang, und wer per Tastatur arbeitet, hat seine
	   Position mitten in einer Aktion verloren. */
	it('gibt den Fokus nach dem Bestätigen an den Trigger zurück', async () => {
		const trigger = triggerAnlegen();
		const screen = await render(ConfirmDialog, {
			...basisProps,
			show: false,
			onConfirm: vi.fn()
		});
		expect(document.activeElement).toBe(trigger);

		await screen.rerender({ ...basisProps, show: true, onConfirm: vi.fn() });
		await vi.waitFor(() => expect(dialogElement().open).toBe(true));
		expect(document.activeElement).not.toBe(trigger);

		await screen.getByRole('button', { name: 'Endgültig zurücksetzen' }).click();

		await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
	});

	it('gibt den Fokus auch nach ESC an den Trigger zurück', async () => {
		const trigger = triggerAnlegen();
		const screen = await render(ConfirmDialog, {
			...basisProps,
			show: false,
			onConfirm: vi.fn(),
			onCancel: vi.fn()
		});

		await screen.rerender({
			...basisProps,
			show: true,
			onConfirm: vi.fn(),
			onCancel: vi.fn()
		});
		await vi.waitFor(() => expect(dialogElement().open).toBe(true));

		await userEvent.keyboard('{Escape}');

		await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
	});
});

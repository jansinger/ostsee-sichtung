import { render } from 'vitest-browser-svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { page } from 'vitest/browser';
import UnifiedDropzone from './UnifiedDropzone.svelte';
import type { ValidationPreset } from '$lib/types';

vi.mock('$lib/stores/toastState.svelte', () => ({
	createToast: vi.fn()
}));

vi.mock('$lib/utils', () => ({
	validateFiles: vi.fn()
}));

import { createToast } from '$lib/stores/toastState.svelte';
import { validateFiles } from '$lib/utils';

const mockConfig: ValidationPreset = {
	allowedTypes: ['image/jpeg', 'image/png'],
	maxFileSize: 10 * 1024 * 1024,
	maxVideoFileSize: 10 * 1024 * 1024,
	maxFiles: 5,
	accept: 'image/jpeg,image/png'
};

function makeFile(name = 'test.jpg', type = 'image/jpeg', size = 1024): File {
	return new File(['x'.repeat(size)], name, { type });
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(validateFiles).mockImplementation((files) => ({
		isValid: true,
		validFiles: files,
		errors: []
	}));
});

describe('UnifiedDropzone', () => {
	describe('rendering', () => {
		it('zeigt Titel und Hinweistexte an', async () => {
			render(UnifiedDropzone, {
				config: mockConfig,
				title: 'Fotos hochladen',
				emptyText: 'Klicken oder ziehen'
			});

			await expect.element(page.getByText('Fotos hochladen')).toBeVisible();
			await expect.element(page.getByText('Klicken oder ziehen')).toBeVisible();
		});

		it('zeigt aria-label mit Titel an', async () => {
			render(UnifiedDropzone, { config: mockConfig, title: 'Bilder' });

			await expect
				.element(page.getByRole('button', { name: /Bilder per Drag & Drop oder Klick/i }))
				.toBeVisible();
		});

		it('zeigt additionalText mit Bindestrich an', async () => {
			render(UnifiedDropzone, {
				config: mockConfig,
				subtitle: 'JPEG, PNG',
				additionalText: 'Max 10MB'
			});

			await expect.element(page.getByText(/JPEG, PNG - Max 10MB/)).toBeVisible();
		});

		it('zeigt nur subtitle ohne Bindestrich wenn additionalText leer', async () => {
			render(UnifiedDropzone, {
				config: mockConfig,
				subtitle: 'JPEG only',
				additionalText: ''
			});

			await expect.element(page.getByText('JPEG only')).toBeVisible();
		});
	});

	describe('Ladezustand', () => {
		it('zeigt loadingText wenn isAnalyzing=true', async () => {
			render(UnifiedDropzone, {
				config: mockConfig,
				isAnalyzing: true,
				loadingText: 'Lade hoch...'
			});

			await expect.element(page.getByText('Lade hoch...')).toBeVisible();
		});

		it('versteckt Titel wenn isAnalyzing=true', async () => {
			render(UnifiedDropzone, {
				config: mockConfig,
				title: 'NurDieserTitel',
				isAnalyzing: true
			});

			await expect.element(page.getByText('NurDieserTitel')).not.toBeInTheDocument();
		});

		it('zeigt Titel wenn isAnalyzing=false', async () => {
			render(UnifiedDropzone, {
				config: mockConfig,
				title: 'Dateien hochladen',
				isAnalyzing: false
			});

			await expect.element(page.getByText('Dateien hochladen')).toBeVisible();
		});
	});

	describe('Dateiauswahl', () => {
		it('ruft onFilesAdded mit validen Dateien auf', async () => {
			const onFilesAdded = vi.fn();
			const file = makeFile('foto.jpg');
			vi.mocked(validateFiles).mockReturnValueOnce({
				isValid: true,
				validFiles: [file],
				errors: []
			});

			render(UnifiedDropzone, { config: mockConfig, onFilesAdded });

			const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
			expect(fileInput).not.toBeNull();

			Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
			fileInput.dispatchEvent(new Event('change', { bubbles: true }));

			await vi.waitFor(() => {
				expect(onFilesAdded).toHaveBeenCalledWith([file]);
			});
		});

		it('zeigt Toast bei Validierungsfehlern', async () => {
			const badFile = makeFile('bad.exe', 'application/x-msdownload');
			vi.mocked(validateFiles).mockReturnValueOnce({
				isValid: false,
				validFiles: [],
				errors: ['Ungültiger Dateityp: bad.exe']
			});

			render(UnifiedDropzone, { config: mockConfig });

			const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
			Object.defineProperty(fileInput, 'files', { value: [badFile], writable: false });
			fileInput.dispatchEvent(new Event('change', { bubbles: true }));

			await vi.waitFor(() => {
				expect(createToast).toHaveBeenCalledWith('error', 'Ungültiger Dateityp: bad.exe');
			});
		});

		it('ruft onFilesAdded nicht auf wenn alle Dateien ungültig sind', async () => {
			const onFilesAdded = vi.fn();
			vi.mocked(validateFiles).mockReturnValueOnce({
				isValid: false,
				validFiles: [],
				errors: ['Fehler']
			});

			render(UnifiedDropzone, { config: mockConfig, onFilesAdded });

			const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
			Object.defineProperty(fileInput, 'files', { value: [makeFile()], writable: false });
			fileInput.dispatchEvent(new Event('change', { bubbles: true }));

			await vi.waitFor(() => {
				expect(onFilesAdded).not.toHaveBeenCalled();
			});
		});
	});

	describe('multiple=false', () => {
		it('hat kein multiple-Attribut am Input', async () => {
			render(UnifiedDropzone, { config: mockConfig, multiple: false });
			const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
			expect(fileInput.multiple).toBe(false);
		});

		it('hat multiple-Attribut am Input bei multiple=true', async () => {
			render(UnifiedDropzone, { config: mockConfig, multiple: true });
			const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
			expect(fileInput.multiple).toBe(true);
		});
	});

	describe('accept-Attribut (Befund I3)', () => {
		it('übernimmt config.accept statt es aus allowedTypes neu zu berechnen', async () => {
			// config.accept kommt vom Server (gruppiert zu image/*,video/*) und ist
			// bewusst NICHT identisch mit allowedTypes.join(',') — nur so zeigt der
			// Test, dass die Komponente das Feld tatsächlich liest statt es zu
			// ignorieren und selbst aus allowedTypes zu bauen.
			const configWithGroupedAccept: ValidationPreset = {
				allowedTypes: ['image/jpeg', 'image/png', 'video/mp4'],
				maxFileSize: 10 * 1024 * 1024,
				maxVideoFileSize: 100 * 1024 * 1024,
				maxFiles: 5,
				accept: 'image/*,video/*'
			};

			render(UnifiedDropzone, { config: configWithGroupedAccept });

			const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
			expect(fileInput.accept).toBe('image/*,video/*');
		});
	});

	describe('Datei-Vorschau', () => {
		it('zeigt Vorschau-Bereich wenn Dateien vorhanden', async () => {
			render(UnifiedDropzone, {
				config: mockConfig,
				files: [makeFile('bild.jpg')],
				showPreview: true
			});

			await expect.element(page.getByText('1 Datei hochgeladen')).toBeVisible();
		});

		it('zeigt Plural bei mehreren Dateien', async () => {
			render(UnifiedDropzone, {
				config: mockConfig,
				files: [makeFile('a.jpg'), makeFile('b.jpg')],
				showPreview: true
			});

			await expect.element(page.getByText('2 Dateien hochgeladen')).toBeVisible();
		});

		it('versteckt Vorschau wenn showPreview=false', async () => {
			render(UnifiedDropzone, {
				config: mockConfig,
				files: [makeFile('a.jpg')],
				showPreview: false
			});

			await expect.element(page.getByText('1 Datei hochgeladen')).not.toBeInTheDocument();
		});

		it('zeigt Dateinamen in der Vorschau', async () => {
			render(UnifiedDropzone, {
				config: mockConfig,
				files: [makeFile('meinbild.jpg')],
				showPreview: true
			});

			await expect.element(page.getByText('meinbild.jpg')).toBeVisible();
		});
	});

	describe('Datei entfernen', () => {
		it('ruft onFileRemoved mit Dateinamen auf', async () => {
			const onFileRemoved = vi.fn();
			render(UnifiedDropzone, {
				config: mockConfig,
				files: [makeFile('foto.jpg')],
				showPreview: true,
				onFileRemoved
			});

			await page.getByRole('button', { name: 'Datei entfernen' }).click();

			await vi.waitFor(() => {
				expect(onFileRemoved).toHaveBeenCalledWith('foto.jpg');
			});
		});
	});

	describe('Alle löschen', () => {
		it('zeigt "Alle löschen"-Button bei multiple=true', async () => {
			render(UnifiedDropzone, {
				config: mockConfig,
				files: [makeFile('a.jpg'), makeFile('b.jpg')],
				showPreview: true,
				multiple: true
			});

			await expect.element(page.getByRole('button', { name: 'Alle löschen' })).toBeVisible();
		});

		it('versteckt "Alle löschen"-Button bei multiple=false', async () => {
			render(UnifiedDropzone, {
				config: mockConfig,
				files: [makeFile('a.jpg')],
				showPreview: true,
				multiple: false
			});

			await expect
				.element(page.getByRole('button', { name: 'Alle löschen' }))
				.not.toBeInTheDocument();
		});

		it('ruft onClear auf', async () => {
			const onClear = vi.fn();
			render(UnifiedDropzone, {
				config: mockConfig,
				files: [makeFile('a.jpg'), makeFile('b.jpg')],
				showPreview: true,
				multiple: true,
				onClear
			});

			await page.getByRole('button', { name: 'Alle löschen' }).click();

			await vi.waitFor(() => {
				expect(onClear).toHaveBeenCalledOnce();
			});
		});
	});

	describe('Tastaturzugänglichkeit', () => {
		it('öffnet Dateidialog bei Enter-Taste', async () => {
			render(UnifiedDropzone, { config: mockConfig });

			const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
			const clickSpy = vi.spyOn(fileInput, 'click');

			const el = document.querySelector('[role="button"][tabindex="0"]') as HTMLElement;
			el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

			await vi.waitFor(() => {
				expect(clickSpy).toHaveBeenCalled();
			});
		});

		it('öffnet Dateidialog bei Leertaste', async () => {
			render(UnifiedDropzone, { config: mockConfig });

			const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
			const clickSpy = vi.spyOn(fileInput, 'click');

			const el = document.querySelector('[role="button"][tabindex="0"]') as HTMLElement;
			el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

			await vi.waitFor(() => {
				expect(clickSpy).toHaveBeenCalled();
			});
		});

		it('hat tabindex=0 für Keyboard-Navigation', async () => {
			render(UnifiedDropzone, { config: mockConfig });
			const el = document.querySelector('[role="button"][tabindex="0"]');
			expect(el).not.toBeNull();
		});
	});

	describe('Drag & Drop', () => {
		it('akzeptiert Dateien per Drop', async () => {
			const onFilesAdded = vi.fn();
			const file = makeFile('dropped.jpg');
			vi.mocked(validateFiles).mockReturnValueOnce({
				isValid: true,
				validFiles: [file],
				errors: []
			});

			render(UnifiedDropzone, { config: mockConfig, onFilesAdded });

			const dropzone = document.querySelector('[role="button"][tabindex="0"]') as HTMLElement;
			const dataTransfer = new DataTransfer();
			dataTransfer.items.add(file);

			dropzone.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer }));

			await vi.waitFor(() => {
				expect(onFilesAdded).toHaveBeenCalledWith([file]);
			});
		});
	});

	/**
	 * Die Vorschau ist in der App derzeit nicht erreichbar: einziger Consumer ist
	 * `DropzoneEnhanced.svelte`, und der setzt `showPreview={false}`. Der Default
	 * der Prop ist aber `true` — der nächste Consumer, der sie weglässt, bekäme
	 * die Buttons sofort zu sehen. Deshalb gelten hier dieselben Regeln wie
	 * nebenan in `DropzoneEnhanced`: 44 px Touch-Target
	 * (`design-system.md`) und ausschließlich Theme-Tokens, kein `text-white`
	 * (`daisyui.md`).
	 */
	describe('Vorschau-Buttons — A11y und Theme-Tokens', () => {
		/**
		 * Geprüft werden die Klassen, nicht die gerenderte Pixelhöhe: Das
		 * Browser-Test-Setup lädt `src/app.css` nicht, es gibt im Test-DOM also
		 * weder Tailwind- noch DaisyUI-Regeln — ein `getBoundingClientRect()`
		 * misst hier die ungestylte Button-Höhe (21 px) und wäre aussagelos.
		 * Die tatsächliche Pixelgröße im gebauten CSS deckt der E2E-Test
		 * „Accessibility — Touch-Targets der Hinweis-Buttons" ab.
		 */
		it('Entfernen- und "Alle löschen"-Button tragen die 44-px-Klassen', async () => {
			render(UnifiedDropzone, {
				config: mockConfig,
				files: [makeFile('a.jpg'), makeFile('b.jpg')],
				showPreview: true,
				multiple: true
			});

			const buttons = [
				page.getByRole('button', { name: 'Alle löschen' }),
				page.getByRole('button', { name: 'Datei entfernen' }).first()
			];

			for (const button of buttons) {
				await expect.element(button).toBeVisible();
				const className = (button.element() as HTMLElement).className;
				expect(className, `unerwartete Größenklasse: ${className}`).toContain('min-h-11');
				expect(className, `btn-xs unterschreitet 44 px: ${className}`).not.toContain('btn-xs');
			}
		});

		it('verwendet keine rohen Farbklassen ausserhalb des Themes', async () => {
			render(UnifiedDropzone, {
				config: mockConfig,
				files: [makeFile('a.jpg')],
				showPreview: true,
				multiple: true
			});

			await expect.element(page.getByRole('button', { name: 'Alle löschen' })).toBeVisible();

			const rawColorClasses = Array.from(document.querySelectorAll<HTMLElement>('button'))
				.map((button) => button.className)
				.filter((className) => /(^|:)text-white\b|(^|:)bg-white\b|-gray-\d/.test(className));

			expect(rawColorClasses).toEqual([]);
		});
	});
});

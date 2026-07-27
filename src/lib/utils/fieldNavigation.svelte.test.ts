/**
 * `fieldNavigation.ts` ist reine DOM-Logik (kein Svelte-Import), braucht aber
 * echtes `document`/`window` (siehe vitest.config.ts: von der Node-Coverage
 * ausgeschlossen als "Browser-only utility"). Der `.svelte.test.ts`-Suffix
 * routet diese Datei deshalb ins Browser-Test-Projekt (echter Chromium via
 * Playwright), obwohl keine Svelte-Komponente gerendert wird.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { scrollToElement, scrollToStepHeader } from './fieldNavigation';

/** Baut die für Step-Komponenten typische Struktur nach: Container > Step-Root > Header(Icon, h2, Badge) */
function buildStepContainer(containerId: string): { header: HTMLElement; heading: HTMLElement } {
	const container = document.createElement('div');
	container.id = containerId;

	const stepRoot = document.createElement('div'); // wie <div class="space-y-8"> in Step*.svelte
	const header = document.createElement('div'); // "Step Header": Icon + h2 + p + Badge

	const icon = document.createElement('div');
	const heading = document.createElement('h2');
	heading.textContent = 'Position & Zeit';
	const badge = document.createElement('div');
	badge.textContent = 'Schritt 1 von 4';

	header.append(icon, heading, badge);
	stepRoot.appendChild(header);
	container.appendChild(stepRoot);
	document.body.appendChild(container);

	return { header, heading };
}

describe('scrollToElement', () => {
	afterEach(() => {
		document.body.innerHTML = '';
		vi.restoreAllMocks();
	});

	it('scrollt mit dem Default-Offset von -80 (Platz für die sticky Navbar)', () => {
		const el = document.createElement('div');
		document.body.appendChild(el);
		vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ top: 500 } as DOMRect);
		const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

		scrollToElement(el);

		expect(scrollSpy).toHaveBeenCalledWith({
			top: 500 + window.scrollY - 80,
			behavior: 'smooth'
		});
	});

	it('erlaubt einen eigenen Offset statt des Defaults', () => {
		const el = document.createElement('div');
		document.body.appendChild(el);
		vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ top: 500 } as DOMRect);
		const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

		scrollToElement(el, -20);

		expect(scrollSpy).toHaveBeenCalledWith({
			top: 500 + window.scrollY - 20,
			behavior: 'smooth'
		});
	});

	it('tut nichts, wenn kein Element übergeben wird', () => {
		const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
		scrollToElement(null);
		expect(scrollSpy).not.toHaveBeenCalled();
	});
});

describe('scrollToStepHeader', () => {
	afterEach(() => {
		document.body.innerHTML = '';
		vi.restoreAllMocks();
	});

	it('gibt null zurück und scrollt nicht, wenn der Container nicht existiert', () => {
		const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
		expect(scrollToStepHeader('does-not-exist')).toBeNull();
		expect(scrollSpy).not.toHaveBeenCalled();
	});

	it('scrollt zum Eltern-Element der h2 (Icon+Badge-Block), nicht nur zum Container', () => {
		const { header } = buildStepContainer('form-content');
		vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({ top: 300 } as DOMRect);
		const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

		scrollToStepHeader('form-content');

		expect(scrollSpy).toHaveBeenCalledWith({
			top: 300 + window.scrollY - 80,
			behavior: 'smooth'
		});
	});

	it('gibt die h2 zurück, damit der Aufrufer sie fokussieren kann', () => {
		const { heading } = buildStepContainer('form-content');
		vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

		expect(scrollToStepHeader('form-content')).toBe(heading);
	});
});

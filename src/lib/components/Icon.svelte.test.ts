import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Icon from './Icon.svelte';

/**
 * Issue #629: Ein unbekannter Icon-Name rendert bisher still ein „?"
 * (`Icon.svelte`, `{:else}`-Zweig) — vier produktiv ausgelieferte Fälle sind
 * dadurch unbemerkt geblieben. `iconRegistry.test.ts` prüft das statisch per
 * Grep über den Quelltext; dieser Test prüft den *Laufzeit*-Fallback selbst.
 *
 * Beschlossenes Verhalten: In `dev` (`import.meta.env.DEV`) soll ein
 * unbekannter Name laut über `console.error` scheitern — in `prod` bleibt
 * das „?"-Fallback unverändert still. Kein Verhaltensunterschied für Nutzer,
 * nur zusätzliches Feedback für Entwickler.
 */

describe('Icon', () => {
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		consoleErrorSpy.mockRestore();
	});

	it('meldet einen unbekannten Icon-Namen über console.error (im Dev-Modus)', async () => {
		render(Icon, { icon: 'lucide:does-not-exist' });
		await tick();

		expect(consoleErrorSpy).toHaveBeenCalled();
		const messages = consoleErrorSpy.mock.calls.map((call: unknown[]) => call.join(' '));
		expect(messages.some((message: string) => message.includes('lucide:does-not-exist'))).toBe(
			true
		);
	});

	it('rendert weiterhin das „?"-Fallback für unbekannte Icons — Nutzerverhalten bleibt gleich', async () => {
		const { container } = render(Icon, { icon: 'lucide:does-not-exist' });
		await tick();

		const fallback = container.querySelector('[title="Missing icon: lucide:does-not-exist"]');
		expect(fallback).not.toBeNull();
		expect(fallback?.textContent).toBe('?');
	});

	it('ruft console.error NICHT auf, wenn der Icon-Name bekannt ist', async () => {
		render(Icon, { icon: 'lucide:map-pin' });
		await tick();

		expect(consoleErrorSpy).not.toHaveBeenCalled();
	});

	it('kennt das projekteigene custom:porpoise — es ersetzt das fachlich falsche Fisch-Icon', async () => {
		const { container } = render(Icon, { icon: 'custom:porpoise' });
		await tick();

		expect(consoleErrorSpy).not.toHaveBeenCalled();
		expect(container.querySelector('svg path')).not.toBeNull();
	});
});

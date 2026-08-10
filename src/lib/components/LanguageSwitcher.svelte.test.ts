import { render } from 'vitest-browser-svelte';
import { expect, it } from 'vitest';
import LanguageSwitcher from './LanguageSwitcher.svelte';

it('verweist auf die jeweils andere Sprache und kennzeichnet sie', async () => {
	const bildschirm = render(LanguageSwitcher);
	const verweis = bildschirm.getByRole('link', { name: 'English' });
	await expect.element(verweis).toHaveAttribute('hreflang', 'en');
	await expect.element(verweis).toHaveAttribute('lang', 'en');
	// Ohne data-sveltekit-reload navigiert SvelteKit clientseitig, während die
	// Laufzeit-Locale aus dem zuerst gerenderten Dokument stammt — URL, SSR und
	// Locale laufen auseinander.
	await expect.element(verweis).toHaveAttribute('data-sveltekit-reload');
});

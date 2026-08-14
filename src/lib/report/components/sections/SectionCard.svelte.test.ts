import { createRawSnippet } from 'svelte';
import { render } from 'vitest-browser-svelte';
import { describe, expect, it } from 'vitest';
import SectionCard from './SectionCard.svelte';

/**
 * Die `variant`-Prop ist der Grund, aus dem `PositionAndTime.svelte` und
 * `PositionPanel.svelte` ihre Inline-Boxen aufgeben können. Geprüft wird
 * deshalb genau das, was diese Aufrufstellen gebraucht haben: dass „inset"
 * keine Karte ist (kein `card`, kein Schatten) und trotzdem denselben Titel
 * mit Icon trägt.
 *
 * Der Hover wird hier NICHT geprüft — er kommt seit PR 2 aus `app.css`
 * (`.card:hover`) und ist damit kein Verhalten dieser Komponente mehr.
 */

const body = () => createRawSnippet(() => ({ render: () => '<p>Inhalt</p>' }));

describe('SectionCard', () => {
	it('rendert Titel und Inhalt', async () => {
		const { container } = await render(SectionCard, {
			title: 'Positionsangabe',
			icon: 'lucide:map-pin',
			children: body()
		});

		expect(container.querySelector('h3')?.textContent).toContain('Positionsangabe');
	});

	it('variant="card" (Default) ist eine DaisyUI-Karte', async () => {
		const { container } = await render(SectionCard, {
			title: 'Sichtungsdetails',
			icon: 'lucide:eye',
			children: body()
		});

		const root = container.querySelector('div');
		expect(root?.className).toContain('card');
		expect(root?.className).toContain('shadow-raised');
		// shadow-sm ist in design-system.md verboten — nur -raised/-floating.
		expect(root?.className).not.toContain('shadow-sm');
	});

	it('variant="inset" ist ein eingebetteter Block ohne Karte und ohne Schatten', async () => {
		const { container } = await render(SectionCard, {
			title: 'Datum und Uhrzeit',
			icon: 'lucide:calendar',
			variant: 'inset',
			children: body()
		});

		const root = container.querySelector('div');
		expect(root?.className).not.toContain('card');
		expect(root?.className).not.toContain('shadow');
		expect(root?.className).toContain('bg-base-200/50');
		expect(container.querySelector('h3')?.textContent).toContain('Datum und Uhrzeit');
	});

	it('setzt das Icon dekorativ (aria-hidden), der Titel trägt die Bedeutung', async () => {
		const { container } = await render(SectionCard, {
			title: 'Positionsangabe',
			icon: 'lucide:map-pin',
			variant: 'inset',
			children: body()
		});

		expect(container.querySelector('h3 svg')?.getAttribute('aria-hidden')).toBe('true');
	});
});

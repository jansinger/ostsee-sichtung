import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import type { ReporterHistory } from '$lib/types/reporterHistory';
import ReporterHistoryBadge from './ReporterHistoryBadge.svelte';

function historie(overrides: Partial<ReporterHistory> = {}): ReporterHistory {
	return { approved: 0, rejected: 0, open: 0, since: '2019-03-04T08:00:00Z', ...overrides };
}

describe('ReporterHistoryBadge', () => {
	it('nennt die Zahl der freigegebenen Meldungen', async () => {
		render(ReporterHistoryBadge, { history: historie({ approved: 23 }) });

		await expect
			.element(page.getByTestId('reporter-badge'))
			.toHaveTextContent('Melder: 23 freigegeben');
	});

	it('zeigt die Erstmeldung als eigenen Befund', async () => {
		render(ReporterHistoryBadge, { history: historie() });

		await expect.element(page.getByTestId('reporter-badge')).toHaveTextContent('Erstmeldung');
	});

	/* Ohne Daten gibt es nichts zu behaupten — ein graues „Melder: –" läse sich
	   wie ein Befund. Gleiche Regel wie beim Spam-Badge für `NULL`. */
	it('rendert ohne Historie gar kein Badge', async () => {
		render(ReporterHistoryBadge, { history: null });

		await expect.element(page.getByTestId('reporter-badge')).not.toBeInTheDocument();
	});

	it('warnt sichtbar bei überwiegend abgelehnten Meldungen', async () => {
		render(ReporterHistoryBadge, { history: historie({ approved: 1, rejected: 2 }) });

		const badge = page.getByTestId('reporter-badge');
		await expect.element(badge).toHaveClass(/badge-warning/);
		await expect.element(badge).toHaveTextContent('Melder: 2 von 3 abgelehnt');
	});

	/* Der `title` ist nur per Maus erreichbar — dieselbe Aussage muss für
	   Screenreader danebenstehen (WCAG 1.4.1, wie beim Spam-Badge). */
	it('trägt die Erklärung zusätzlich für Screenreader', async () => {
		render(ReporterHistoryBadge, { history: historie({ approved: 23 }) });

		await expect
			.element(page.getByText('Viele frühere Meldungen dieser Adresse wurden freigegeben'))
			.toBeInTheDocument();
	});

	/* Fünf der sechs Stufen teilen sich `badge-ghost` — das Icon ist die
	   farbunabhängige Unterscheidung (WCAG 1.4.1). Eine reine Text-Assertion
	   bemerkt es nicht, wenn die `<Icon>`-Zeile verschwindet: Der Badge-Text
	   bliebe unverändert. Geprüft wird deshalb im DOM (`<svg>` im Badge), nicht
	   über den Quelltext. */
	it('rendert ein Icon im Badge', async () => {
		render(ReporterHistoryBadge, { history: historie({ approved: 23 }) });

		const badge = page.getByTestId('reporter-badge');
		await expect.element(badge).toBeInTheDocument();
		expect(badge.element().querySelector('svg')).not.toBeNull();
	});

	/* Zwei Stufen mit unterschiedlichem Icon — die Unterscheidung muss nicht
	   nur „irgendein Icon", sondern ein je nach Stufe verschiedenes sein. */
	it('zeigt bei flagged ein anderes Icon als bei first', async () => {
		const { container: flaggedContainer } = render(ReporterHistoryBadge, {
			history: historie({ approved: 1, rejected: 2 })
		});
		const flaggedIcon = flaggedContainer.querySelector('[data-testid="reporter-badge"] svg');

		const { container: firstContainer } = render(ReporterHistoryBadge, { history: historie() });
		const firstIcon = firstContainer.querySelector('[data-testid="reporter-badge"] svg');

		expect(flaggedIcon).not.toBeNull();
		expect(firstIcon).not.toBeNull();
		expect(flaggedIcon?.outerHTML).not.toBe(firstIcon?.outerHTML);
	});

	/* Text und Icon sind bei 3 und bei 30 Freigaben identisch — ohne den Rahmen
	   wäre die Stufe im DOM nicht vorhanden, und die Schwellen 3/10 blieben eine
	   reine Tooltip-Angelegenheit. Geprüft wird die gerenderte Klasse, nicht das
	   Präsentationsobjekt: Die Komponente könnte den Rahmen sonst still
	   fallenlassen. */
	it('reicht den Stufen-Rahmen bis ins Markup durch', async () => {
		const { container: knownContainer } = render(ReporterHistoryBadge, {
			history: historie({ approved: 5 })
		});
		const known = knownContainer.querySelector('[data-testid="reporter-badge"]');

		const { container: establishedContainer } = render(ReporterHistoryBadge, {
			history: historie({ approved: 30 })
		});
		const established = establishedContainer.querySelector('[data-testid="reporter-badge"]');

		const { container: newContainer } = render(ReporterHistoryBadge, {
			history: historie({ approved: 1 })
		});
		const neu = newContainer.querySelector('[data-testid="reporter-badge"]');

		expect(known?.className).toContain('border');
		expect(established?.className).toContain('border');
		expect(known?.className).not.toBe(established?.className);
		// Die unterste Stufe bleibt rahmenlos — sonst gäbe es keinen Ruhezustand.
		expect(neu?.className).not.toContain('border');
	});
});

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
});

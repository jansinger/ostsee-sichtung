import { render } from 'vitest-browser-svelte';
import { describe, expect, it, vi } from 'vitest';
import Toast from './Toast.svelte';

describe('Toast — Aktion', () => {
	it('zeigt keinen Aktions-Knopf, wenn keine Aktion übergeben wurde', async () => {
		const screen = await render(Toast, { message: 'Gespeichert' });
		expect(screen.container.querySelectorAll('button').length).toBe(1); // nur „schließen"
	});

	it('rendert die Aktion und ruft sie beim Klick', async () => {
		const onClick = vi.fn();
		const screen = await render(Toast, {
			message: 'Status: Freigegeben',
			action: { label: 'Rückgängig', onClick }
		});

		await screen.getByRole('button', { name: 'Rückgängig' }).click();
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	/* Ein Undo-Toast, der sich beim Klick nicht schließt, lädt zum zweiten Klick
	   ein — und der zweite Klick würde den Wechsel erneut zurücknehmen. */
	it('schließt sich nach dem Klick auf die Aktion', async () => {
		const onDismiss = vi.fn();
		const screen = await render(Toast, {
			message: 'Status: Freigegeben',
			action: { label: 'Rückgängig', onClick: vi.fn() },
			onDismiss
		});

		await screen.getByRole('button', { name: 'Rückgängig' }).click();
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});
});

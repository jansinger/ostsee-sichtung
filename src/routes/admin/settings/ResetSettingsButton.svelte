<script lang="ts">
	/**
	 * Destruktive Aktion "Einstellungen zurücksetzen" mit projektüblichem
	 * Bestätigungsdialog (native <dialog>, Muster wie DeleteDialog.svelte).
	 * Der Trigger-Button folgt der Destruktiv-Konvention aus design-system.md:
	 * btn btn-outline btn-error btn-sm, nie ohne Bestätigung.
	 */
	import Icon from '$lib/components/Icon.svelte';

	let { onReset }: { onReset: () => void } = $props();

	let dialogElement = $state<HTMLDialogElement | null>(null);
	let show = $state(false);

	$effect(() => {
		if (!dialogElement) return;
		if (show && !dialogElement.open) {
			dialogElement.showModal();
		} else if (!show && dialogElement.open) {
			dialogElement.close();
		}
	});

	function openDialog() {
		show = true;
	}

	function confirmReset() {
		show = false;
		onReset();
	}

	function cancel() {
		show = false;
	}
</script>

<button type="button" class="btn btn-outline btn-error btn-sm gap-2" onclick={openDialog}>
	<Icon icon="lucide:refresh-cw" class="size-4" aria-hidden="true" />
	Zurücksetzen
</button>

<dialog
	bind:this={dialogElement}
	class="modal"
	aria-labelledby="reset-settings-dialog-title"
	onclose={cancel}
>
	<div class="modal-box w-96">
		<h3 id="reset-settings-dialog-title" class="mb-4 text-lg font-bold">
			Einstellungen zurücksetzen
		</h3>
		<p class="mb-4">
			Alle Einstellungen auf die Vorbelegung zurücksetzen — gespeicherte Werte gehen verloren.
		</p>
		<div class="modal-action">
			<button type="button" class="btn" onclick={cancel}>Abbrechen</button>
			<button type="button" class="btn btn-error" onclick={confirmReset}>
				Endgültig zurücksetzen
			</button>
		</div>
	</div>
	<!-- Schleier über der Seite dahinter, kein Theme-Ton: bg-scrim/<n>
	     (--scrim-surface in tokens.css), Muster wie DeleteDialog.svelte. -->
	<form method="dialog" class="modal-backdrop bg-scrim/50">
		<button aria-label="Dialog schließen" onclick={cancel}>
			<span class="sr-only">Dialog schließen</span>
		</button>
	</form>
</dialog>

<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	let {
		show = $bindable(false),
		onConfirm,
		onCancel
	} = $props<{
		show?: boolean;
		onConfirm?: () => void;
		onCancel?: () => void;
	}>();

	let dialogElement = $state<HTMLDialogElement | null>(null);
	let confirmed = false;

	// Native <dialog> mit showModal()/close() für Fokus-Trap und ESC-Handling
	$effect(() => {
		if (!dialogElement) return;
		if (show && !dialogElement.open) {
			confirmed = false;
			dialogElement.showModal();
		} else if (!show && dialogElement.open) {
			dialogElement.close();
		}
	});

	function confirm() {
		confirmed = true;
		onConfirm?.();
		show = false;
	}

	function cancel() {
		show = false;
	}

	// Wird bei ESC, Backdrop-Klick und close() ausgelöst
	function handleClose() {
		if (!confirmed) {
			onCancel?.();
		}
		show = false;
	}
</script>

<dialog
	bind:this={dialogElement}
	class="modal"
	aria-labelledby="delete-dialog-title"
	onclose={handleClose}
>
	<div class="modal-box w-96">
		<h3 id="delete-dialog-title" class="mb-4 text-lg font-bold">{m.components_ui_dialog_deletedialog_text_sichtung_loeschen()}</h3>
		<p class="mb-4">
			{m.components_ui_dialog_deletedialog_text_sind_sie_sicher_dass_sie()}
		</p>
		<div class="modal-action">
			<button class="btn" onclick={cancel}>{m.components_ui_dialog_deletedialog_text_abbrechen()}</button>
			<button class="btn btn-error" onclick={confirm}>{m.components_ui_dialog_deletedialog_text_loeschen()}</button>
		</div>
	</div>
	<!-- Schleier über der Seite dahinter, kein Theme-Ton: bg-scrim/<n>
	     (--scrim-surface in tokens.css). -->
	<form method="dialog" class="modal-backdrop bg-scrim/50">
		<button aria-label={m.components_ui_dialog_deletedialog_aria_label_dialog_schliessen()} onclick={cancel}>
			<span class="sr-only">{m.components_ui_dialog_deletedialog_text_dialog_schliessen()}</span>
		</button>
	</form>
</dialog>

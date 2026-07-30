<script lang="ts">
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
		<h3 id="delete-dialog-title" class="mb-4 text-lg font-bold">Sichtung löschen</h3>
		<p class="mb-4">
			Sind Sie sicher, dass Sie diese Sichtung löschen möchten? Diese Aktion kann nicht rückgängig
			gemacht werden.
		</p>
		<div class="modal-action">
			<button class="btn" onclick={cancel}>Abbrechen</button>
			<button class="btn btn-error" onclick={confirm}>Löschen</button>
		</div>
	</div>
	<!-- Schleier über der Seite dahinter, kein Theme-Ton: bg-scrim/<n>
	     (--scrim-surface in tokens.css). -->
	<form method="dialog" class="modal-backdrop bg-scrim/50">
		<button aria-label="Dialog schließen" onclick={cancel}>
			<span class="sr-only">Dialog schließen</span>
		</button>
	</form>
</dialog>

<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		ArrowLeftOutline,
		ExclamationCircleOutline,
		FileSearchOutline,
		HomeOutline,
		InfoCircleOutline,
		LockOutline,
		MailBoxOutline,
		RefreshOutline
	} from 'flowbite-svelte-icons';

	// Error-Informationen aus der page store (Runes Mode)
	const error = $derived($page.error);
	const status = $derived($page.status);

	/**
	 * Navigiert zurück zur Startseite
	 */
	const goHome = (): void => {
		goto('/');
	};

	/**
	 * Navigiert zur vorherigen Seite oder zur Startseite
	 */
	const goBack = (): void => {
		if (browser && window.history.length > 1) {
			window.history.back();
		} else {
			goHome();
		}
	};

	/**
	 * Lädt die aktuelle Seite neu
	 */
	const reloadPage = (): void => {
		if (browser) {
			window.location.reload();
		}
	};

	/**
	 * Bestimmt das passende Icon-Component basierend auf dem HTTP-Status
	 */
	const getErrorIconComponent = (statusCode: number) => {
		switch (statusCode) {
			case 404:
				return FileSearchOutline;
			case 403:
				return LockOutline;
			case 500:
				return ExclamationCircleOutline;
			default:
				return ExclamationCircleOutline;
		}
	};

	/**
	 * Bestimmt die passende Nachricht basierend auf dem HTTP-Status
	 */
	const getErrorMessage = (statusCode: number): { title: string; description: string } => {
		switch (statusCode) {
			case 404:
				return {
					title: 'Seite nicht gefunden',
					description: 'Die angeforderte Seite existiert nicht oder wurde verschoben.'
				};
			case 403:
				return {
					title: 'Zugriff verweigert',
					description: 'Sie haben keine Berechtigung, auf diese Ressource zuzugreifen.'
				};
			case 500:
				return {
					title: 'Serverfehler',
					description:
						'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
				};
			default:
				return {
					title: 'Ein Fehler ist aufgetreten',
					description: 'Entschuldigung, etwas ist schiefgelaufen.'
				};
		}
	};

	let errorMessage = $derived(getErrorMessage(status));
	let ErrorIconComponent = $derived(getErrorIconComponent(status));
</script>

<svelte:head>
	<title>Fehler {status} - Sichtungen WebApp</title>
	<meta name="description" content="Ein Fehler ist aufgetreten - {errorMessage.title}" />
</svelte:head>

<div class="bg-base-200 flex min-h-screen items-center justify-center p-4">
	<div class="w-full max-w-md">
		<!-- Hauptfehler-Karte -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body items-center text-center">
				<!-- Fehler-Icon -->
				<div class="avatar placeholder mb-4">
					<div class="bg-error text-error-content h-20 w-20 rounded-full">
						<ErrorIconComponent class="h-10 w-10" />
					</div>
				</div>

				<!-- Status Code -->
				<div class="badge badge-error badge-lg mb-2 font-mono font-bold">
					{status}
				</div>

				<!-- Titel -->
				<h1 class="card-title mb-2 text-2xl">
					{errorMessage.title}
				</h1>

				<!-- Beschreibung -->
				<p class="text-base-content/70 mb-6">
					{errorMessage.description}
				</p>

				<!-- Debug-Informationen (nur im Development-Modus) -->
				{#if error?.message && status !== 404}
					<div class="collapse-arrow bg-base-200 collapse mb-4">
						<input type="checkbox" />
						<div class="collapse-title text-sm font-medium">Technische Details</div>
						<div class="collapse-content">
							<div class="mockup-code text-xs">
								<pre class="text-error"><code>{error.message}</code></pre>
							</div>
						</div>
					</div>
				{/if}

				<!-- Aktions-Buttons -->
				<div class="card-actions w-full justify-center">
					<div class="btn-group btn-group-vertical sm:btn-group-horizontal">
						<button class="btn btn-primary" onclick={goHome} aria-label="Zur Startseite">
							<HomeOutline class="mr-2 h-4 w-4" />
							Startseite
						</button>

						<button class="btn btn-ghost" onclick={goBack} aria-label="Zurück">
							<ArrowLeftOutline class="mr-2 h-4 w-4" />
							Zurück
						</button>

						{#if status >= 500}
							<button class="btn btn-outline" onclick={reloadPage} aria-label="Seite neu laden">
								<RefreshOutline class="mr-2 h-4 w-4" />
								Neu laden
							</button>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Zusätzliche Hilfe-Karte -->
		<div class="card bg-base-100 mt-4 shadow-lg">
			<div class="card-body">
				<h2 class="card-title text-lg">
					<InfoCircleOutline class="mr-2 h-5 w-5" />
					Hilfe & Kontakt
				</h2>

				<div class="text-base-content/70 space-y-2 text-sm">
					<p>Falls das Problem weiterhin besteht:</p>
					<ul class="ml-4 list-inside list-disc space-y-1">
						<li>Überprüfen Sie Ihre Internetverbindung</li>
						<li>Versuchen Sie es in ein paar Minuten erneut</li>
						<li>Leeren Sie den Browser-Cache</li>
					</ul>
				</div>

				<!-- Kontakt-Info (optional) -->
				<div class="card-actions mt-4 justify-end">
					<a
						href="mailto:support@example.com"
						class="btn btn-sm btn-ghost"
						aria-label="Support kontaktieren"
					>
						<MailBoxOutline class="mr-1 h-4 w-4" />
						Support
					</a>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	/* Zusätzliche Animationen für bessere UX */
	.card {
		animation: fadeInUp 0.6s ease-out;
	}

	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.avatar.placeholder {
		animation: pulse 2s infinite;
	}
</style>

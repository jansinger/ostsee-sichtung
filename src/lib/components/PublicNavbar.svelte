<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { page } from '$app/state';
	import ConnectionBadge from '$lib/components/ConnectionBadge.svelte';
	import Icon from '$lib/components/Icon.svelte';

	import { ADMIN_BEREICHE, istAdminPfad } from '$lib/config/adminNav';
	import { TRANSLATION_ROLLOUT_COMPLETE } from '$lib/i18n/translationRolloutStage';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { connection } from '$lib/stores/connectionState.svelte';
	import type { PublicUser } from '$lib/types/User';
	import { isNotIFrame } from '$lib/utils/client/isNotIFrame';
	import LanguageSwitcher from './LanguageSwitcher.svelte';
	import OstseeTiereLogo from './OstseeTiereLogo.svelte';
	import UserMenu from './UserMenu.svelte';
	import UserMenuMobile from './UserMenuMobile.svelte';

	let { user, isAdmin = false }: { user: PublicUser | null; isAdmin: boolean } = $props();

	const currentPath = $derived(page.url.pathname);

	/* Die Gruppe fasst den ganzen Verwaltungs-Teilbaum zusammen — welcher der
	   drei Bereiche darin aktiv ist, zeigt erst die Unternavigation. */
	const istAdminBereich = $derived(istAdminPfad(currentPath));

	let mobileMenuElement = $state<HTMLDetailsElement | null>(null);
	let adminMenuElement = $state<HTMLDetailsElement | null>(null);

	// Close mobile menu when navigating (SvelteKit client-side navigation keeps component mounted)
	$effect(() => {
		void currentPath; // track path changes
		if (mobileMenuElement?.open) {
			mobileMenuElement.open = false;
		}
		if (adminMenuElement?.open) {
			adminMenuElement.open = false;
		}
	});
</script>

{#snippet publicItems()}
	<li>
		<a href={localizeHref('/')} class={currentPath === '/' ? 'active font-medium' : ''}>
			{m.components_publicnavbar_text_meldung()}
		</a>
	</li>
	<li>
		<a href={localizeHref('/map')} class={currentPath === '/map' ? 'active font-medium' : ''}>
			{m.components_publicnavbar_text_karte()}
		</a>
	</li>
	<li>
		<a
			href={localizeHref('/bestimmungshilfe')}
			class={currentPath === '/bestimmungshilfe' ? 'active font-medium' : ''}
		>
			{m.components_publicnavbar_text_bestimmungshilfe()}
		</a>
	</li>
	<!--
		„Hintergrund" statt „Über uns" (Wunsch des Museums, 2026-08-05): Die Seite
		soll die Erklärtexte zur Arbeit tragen, und genau das steht dort bereits —
		Citizen Science, Mission, Datenschutz. Eine eigene Route `/hintergrund`
		wäre eine zweite Seite mit demselben Inhalt gewesen.

		Der Footer führt dieselbe Seite unter demselben Namen; ein Ziel trägt
		einen Namen. Der Wortlaut ist bewusst der des Menüs und nicht der der
		Seitenüberschrift („Über Ostsee-Tiere") — das Museum hat den Begriff
		vorgegeben, und beide Formulierungen meinen dasselbe.

		Was der Link NICHT löst: Im iframe auf meeresmuseum.de ist diese
		Navigation ausgeblendet (`isNotIFrame` unten), die Seite ist dort also
		weiterhin unerreichbar. Deshalb bleiben die Erklärtexte zusätzlich im
		Formular (`FormHelp.svelte`) — dieselbe Abwägung wie bei der
		Bestimmungshilfe. Belege: docs/IFRAME_EINBETTUNG.md
	-->
	<li>
		<a href={localizeHref('/about')} class={currentPath === '/about' ? 'active font-medium' : ''}>
			{m.components_publicnavbar_text_hintergrund()}
		</a>
	</li>
{/snippet}

{#snippet adminItems()}
	{#each ADMIN_BEREICHE as bereich (bereich.href)}
		<li>
			<a href={bereich.href} class={currentPath === bereich.href ? 'active font-medium' : ''}>
				{bereich.label}
			</a>
		</li>
	{/each}
{/snippet}

{#if isNotIFrame}
	<!-- Fixed Navbar -->
	<header class="bg-base-200/95 z-nav shadow-floating sticky top-0 backdrop-blur-lg">
		<div class="container mx-auto">
			<!--
				`justify-between` + `w-auto` an beiden Seiten ersetzt DaisyUIs feste
				50/50-Teilung. Die kostete die Menüseite die Hälfte der Containerbreite,
				während die Logoseite ihre Hälfte fast leer ließ — und weil `.menu`
				`flex-flow: column wrap` ist (`menu-horizontal` dreht nur die Richtung),
				brach das Menü darin still in eine zweite Zeile um, statt breiter zu
				werden. Abgesichert in `e2e/navbar-structure.spec.ts`.
			-->
			<div class="navbar justify-between">
				<div class="navbar-start w-auto">
					<OstseeTiereLogo size="sm" showText={true} className="ml-2" />
					{#if isAdmin}
						<span class="divider divider-horizontal mx-2"></span>
						<span class="text-base-content/70 text-lg font-semibold"
							>{m.components_publicnavbar_text_admin()}</span
						>
					{/if}
				</div>
				<div class="navbar-end w-auto gap-2">
					<!--
						Sichtbar nur ohne Verbindung — im Normalfall rendert die Komponente
						nichts und kostet keinen Platz.
					-->
					<ConnectionBadge compact />

					<!--
						Eingebunden seit `TRANSLATION_ROLLOUT_COMPLETE = true` (2026-08-13,
						`$lib/i18n/translationRolloutStage.ts`) — dort auch die eine bekannte
						Ausnahme (Datenschutz-Abschnitt auf `/about` bleibt deutsch).

						`!connection.isOffline` bleibt zusätzlich zur äußeren Bedingung
						bestehen (Commit 4098b962: Umschalter + Offline-Abzeichen liefen bei
						320px gemeinsam über, 231px Inhalt gegen 320px verfügbare Breite) —
						beide Bedienelemente konkurrieren dadurch nie gleichzeitig um Platz.
						`e2e/navbar-structure.spec.ts` prüft die Einbindung positiv,
						`e2e/submit-offline.spec.ts` die Platz-Aufteilung online/offline.
					-->
					{#if TRANSLATION_ROLLOUT_COMPLETE && !connection.isOffline}
						<LanguageSwitcher />
					{/if}

					<!-- Desktop menu -->
					<div class="hidden lg:flex lg:items-center lg:gap-4">
						<ul class="menu menu-horizontal flex-nowrap px-1">
							{@render publicItems()}

							<!--
								Die drei Verwaltungsziele liegen in einer Gruppe statt einzeln auf
								der obersten Ebene. Sie richten sich an eine andere Zielgruppe als
								Meldung/Karte/Bestimmungshilfe, und sieben gleichrangige Links
								waren genau die Last, die den Umbruch auslöste.
							-->
							{#if isAdmin}
								<li>
									<details bind:this={adminMenuElement}>
										<summary class={istAdminBereich ? 'active font-medium' : ''}>
											{m.components_publicnavbar_text_verwaltung()}
										</summary>
										<!-- Kein eigenes `z-*`: Der Header trägt bereits einen
										     z-index und bildet damit einen Stacking-Context —
										     alles darin liegt über dem Seiteninhalt. Freie
										     `z-*`-Utilities verbietet design-system.md, und ein
										     Token wäre hier eine Zahl ohne Wirkung. Schatten aus
										     dem Token, nicht aus DaisyUIs `shadow`. -->
										<ul class="rounded-box bg-base-100 shadow-floating w-52 p-2">
											{@render adminItems()}
										</ul>
									</details>
								</li>
							{/if}
						</ul>

						<!-- User Menu - Desktop -->
						<UserMenu {user} />
					</div>

					<!-- Mobile menu -->
					<details bind:this={mobileMenuElement} class="dropdown dropdown-end lg:hidden">
						<summary
							aria-label={m.components_publicnavbar_aria_label_menue()}
							class="btn btn-ghost"
						>
							<Icon icon="lucide:list" width="24" class="h-6 w-6 shrink-0" />
						</summary>
						<ul
							class="dropdown-content menu menu-sm rounded-box bg-base-100 z-overlay shadow-floating absolute right-0 mt-3 w-52 p-2"
						>
							{@render publicItems()}

							<!--
								Im Burger-Menü stehen die Verwaltungsziele flach unter einer
								Überschrift statt in einem zweiten Aufklapper: Platz ist hier
								nicht knapp, und ein `details` im `details` kostet einen Tipp
								mehr ohne Gegenwert.
							-->
							{#if isAdmin}
								<li class="menu-title">{m.components_publicnavbar_text_verwaltung_2()}</li>
								{@render adminItems()}
							{/if}

							<!-- User Menu - Mobile -->
							<div class="divider my-2"></div>
							<UserMenuMobile {user} />
						</ul>
					</details>
				</div>
			</div>
		</div>
	</header>
{/if}

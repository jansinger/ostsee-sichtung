<script lang="ts">
	import { page } from '$app/state';
	import ConnectionBadge from '$lib/components/ConnectionBadge.svelte';
	import Icon from '$lib/components/Icon.svelte';

	import type { PublicUser } from '$lib/types/User';
	import { isNotIFrame } from '$lib/utils/client/isNotIFrame';
	import OstseeTiereLogo from './OstseeTiereLogo.svelte';
	import UserMenu from './UserMenu.svelte';
	import UserMenuMobile from './UserMenuMobile.svelte';

	let { user, isAdmin = false }: { user: PublicUser | null; isAdmin: boolean } = $props();

	const currentPath = $derived(page.url.pathname);

	/* Detailseiten (/admin/123) gehören zur Sichtungsverwaltung, nicht zu
	   Statistiken oder Einstellungen — deshalb kein reines `startsWith`. */
	const istAdminBereich = $derived(currentPath === '/admin' || currentPath.startsWith('/admin/'));

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
		<a href="/" class={currentPath === '/' ? 'active font-medium' : ''}> Meldung </a>
	</li>
	<li>
		<a href="/map" class={currentPath === '/map' ? 'active font-medium' : ''}> Karte </a>
	</li>
	<li>
		<a
			href="/bestimmungshilfe"
			class={currentPath === '/bestimmungshilfe' ? 'active font-medium' : ''}
		>
			Bestimmungshilfe
		</a>
	</li>
{/snippet}

{#snippet adminItems()}
	<li>
		<a href="/admin" class={currentPath === '/admin' ? 'active font-medium' : ''}> Sichtungen </a>
	</li>
	<li>
		<a
			href="/admin/statistics"
			class={currentPath === '/admin/statistics' ? 'active font-medium' : ''}
		>
			Statistiken
		</a>
	</li>
	<li>
		<a href="/admin/settings" class={currentPath === '/admin/settings' ? 'active font-medium' : ''}>
			Einstellungen
		</a>
	</li>
{/snippet}

{#if isNotIFrame}
	<!-- Fixed Navbar -->
	<header class="bg-base-200/95 sticky top-0 z-50 shadow-md backdrop-blur-lg">
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
						<span class="text-base-content/70 text-lg font-semibold">Admin</span>
					{/if}
				</div>
				<div class="navbar-end w-auto gap-2">
					<!--
						Sichtbar nur ohne Verbindung — im Normalfall rendert die Komponente
						nichts und kostet keinen Platz.
					-->
					<ConnectionBadge compact />

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
											Verwaltung
										</summary>
										<ul class="rounded-box bg-base-100 z-50 w-52 p-2 shadow">
											{@render adminItems()}
										</ul>
									</details>
								</li>
							{/if}
						</ul>

						<!-- User Menu - Desktop -->
						<UserMenu user={user || null} position="right" />
					</div>

					<!-- Mobile menu -->
					<details bind:this={mobileMenuElement} class="dropdown dropdown-end lg:hidden">
						<summary aria-label="Menü" class="btn btn-ghost">
							<Icon icon="lucide:list" width="24" class="h-6 w-6 shrink-0" />
						</summary>
						<ul
							class="dropdown-content menu menu-sm rounded-box bg-base-100 absolute right-0 z-50 mt-3 w-52 p-2 shadow"
						>
							{@render publicItems()}

							<!--
								Im Burger-Menü stehen die Verwaltungsziele flach unter einer
								Überschrift statt in einem zweiten Aufklapper: Platz ist hier
								nicht knapp, und ein `details` im `details` kostet einen Tipp
								mehr ohne Gegenwert.
							-->
							{#if isAdmin}
								<li class="menu-title">Verwaltung</li>
								{@render adminItems()}
							{/if}

							<!-- User Menu - Mobile -->
							<div class="divider my-2"></div>
							<UserMenuMobile user={user || null} />
						</ul>
					</details>
				</div>
			</div>
		</div>
	</header>
{/if}

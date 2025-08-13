<script lang="ts">
	import { page } from '$app/stores';
	import { List, User, LogOut } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();
</script>

<div class="flex min-h-screen flex-col">
	<!-- Navbar -->
	<header class="bg-base-200 shadow-md">
		<div class="container mx-auto">
			<div class="navbar">
				<div class="navbar-start">
					<a href="/" class="btn btn-ghost text-xl">Sichtungen Admin</a>
				</div>
				<div class="navbar-end">
					<!-- Desktop menu -->
					<div class="hidden lg:flex lg:items-center lg:gap-4">
						<ul class="menu menu-horizontal px-1">
							<li>
								<a
									href="/admin"
									class={$page.url.pathname.startsWith('/admin') &&
									!$page.url.pathname.includes('/export')
										? 'active font-medium'
										: ''}
								>
									Sichtungen
								</a>
							</li>
							<li>
								<a
									href="/admin/export"
									class={$page.url.pathname.includes('/export') ? 'active font-medium' : ''}
								>
									Export
								</a>
							</li>
							<li>
								<span class="cursor-not-allowed px-4 py-2 opacity-50">Karte</span>
							</li>
						</ul>
						
						<!-- User menu - Desktop -->
						{#if data.user}
							<div class="dropdown dropdown-end">
								<button
									aria-label="Benutzer-Menü"
									class="btn btn-ghost gap-2"
								>
									{#if data.user.picture}
										<div class="avatar">
											<div class="w-8 h-8 rounded-full">
												<img src={data.user.picture} alt="Profilbild" />
											</div>
										</div>
									{:else}
										<Icon src={User} class="h-5 w-5" />
									{/if}
									<span class="hidden xl:inline">{data.user.nickname || data.user.name}</span>
								</button>
								<ul class="dropdown-content menu menu-sm rounded-box bg-base-100 z-[1] mt-3 w-52 p-2 shadow">
									<li class="menu-title">
										<span>{data.user.name}</span>
									</li>
									<li class="menu-title">
										<span class="text-xs opacity-70">{data.user.email}</span>
									</li>
									<li><hr class="my-2" /></li>
									<li>
										<a href="/api/auth/logout">
											<Icon src={LogOut} class="h-4 w-4" />
											Abmelden
										</a>
									</li>
								</ul>
							</div>
						{/if}
					</div>

					<!-- Mobile menu -->
					<div class="dropdown dropdown-end lg:hidden">
						<button aria-label="Menü" class="btn btn-ghost">
							<Icon src={List} class="h-6 w-6 shrink-0" />
						</button>
						<ul
							class="dropdown-content menu menu-sm rounded-box bg-base-100 z-[1] mt-3 w-52 p-2 shadow"
						>
							<li>
								<a
									href="/admin"
									class={$page.url.pathname.startsWith('/admin') &&
									!$page.url.pathname.includes('/export')
										? 'active font-medium'
										: ''}
								>
									Sichtungen
								</a>
							</li>
							<li>
								<a
									href="/admin/export"
									class={$page.url.pathname.includes('/export') ? 'active font-medium' : ''}
								>
									Export
								</a>
							</li>
							<li>
								<span class="cursor-not-allowed opacity-50">Karte</span>
							</li>
							
							<!-- User info - Mobile -->
							{#if data.user}
								<li><hr class="my-2" /></li>
								<li class="menu-title">
									<div class="flex items-center gap-2">
										{#if data.user.picture}
											<div class="avatar">
												<div class="w-6 h-6 rounded-full">
													<img src={data.user.picture} alt="Profilbild" />
												</div>
											</div>
										{:else}
											<Icon src={User} class="h-4 w-4" />
										{/if}
										<span>{data.user.nickname || data.user.name}</span>
									</div>
								</li>
								<li class="menu-title">
									<span class="text-xs opacity-70">{data.user.email}</span>
								</li>
								<li>
									<a href="/api/auth/logout">
										<Icon src={LogOut} class="h-4 w-4" />
										Abmelden
									</a>
								</li>
							{/if}
						</ul>
					</div>
				</div>
			</div>
		</div>
	</header>

	<!-- Page content -->
	<main class="flex-grow">
		{@render children()}
	</main>

	<!-- Footer -->
	<footer class="footer-center footer bg-base-200 text-base-content p-4">
		<div>
			<p>© 2025 Deutsches Meeresmuseum - Alle Rechte vorbehalten</p>
		</div>
	</footer>
</div>

<script lang="ts">
	import { page } from '$app/stores';
	import { List } from '@steeze-ui/lucide-icons';
	import { Icon } from '@steeze-ui/svelte-icon';

	let { children } = $props();
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
					<ul class="menu menu-horizontal hidden px-1 lg:flex">
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

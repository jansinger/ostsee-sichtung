import type { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import { copyFileSync, existsSync } from 'fs';
import { assertServerIdentity, nodeIdentityFetch } from '../src/tools/dev-server-identity';

async function globalSetup(config: FullConfig) {
	console.log('🔧 Setting up test environment...');

	// Ensure .env exists
	if (!existsSync('.env')) {
		console.log('📋 Creating .env from .env.example...');
		copyFileSync('.env.example', '.env');
	}

	// Only run svelte-kit sync if not in CI (where we've already built)
	if (!process.env.CI) {
		console.log('🔄 Running SvelteKit sync...');
		execSync('npx svelte-kit sync', { stdio: 'inherit' });
	} else {
		console.log('🏗️ CI environment detected - skipping sync (build already completed)');
	}

	/**
	 * Prüft, dass der Server aus *diesem* Arbeitsverzeichnis ausliefert, und bricht
	 * sonst ab. Ein grüner Lauf gegen einen fremden Worktree ist schlimmer als gar
	 * kein Lauf: Er behauptet Sicherheit, die es nicht gibt.
	 */
	// Über alle Projekte statt `projects[0]`: Käme ein zweites Projekt (firefox, webkit)
	// vor chromium, prüfte das Setup sonst still eine andere baseURL als die getestete.
	const urls = new Set(
		config.projects.map((project) => project.use?.baseURL).filter((url): url is string => !!url)
	);
	if (urls.size === 0 && config.webServer?.url) urls.add(config.webServer.url);
	if (urls.size === 0)
		throw new Error('Kein baseURL konfiguriert — Identitätsprüfung nicht möglich.');

	for (const url of urls) {
		await assertServerIdentity({ url, expectedRoot: process.cwd(), fetchImpl: nodeIdentityFetch });
		console.log(`✅ Dev-Server unter ${url} liefert aus ${process.cwd()}`);
	}

	console.log('✅ Test environment ready');
}

export default globalSetup;

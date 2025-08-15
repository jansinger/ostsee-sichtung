import { execSync } from 'child_process';
import { copyFileSync, existsSync } from 'fs';

async function globalSetup() {
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

	console.log('✅ Test environment ready');
}

export default globalSetup;

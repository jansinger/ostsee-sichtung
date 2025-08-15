import { execSync } from 'child_process';
import { copyFileSync, existsSync } from 'fs';

async function globalSetup() {
	console.log('🔧 Setting up test environment...');

	// Ensure .env exists
	if (!existsSync('.env')) {
		console.log('📋 Creating .env from .env.example...');
		copyFileSync('.env.example', '.env');
	}

	// SvelteKit sync to prepare types and generate files
	console.log('🔄 Running SvelteKit sync...');
	execSync('npx svelte-kit sync', { stdio: 'inherit' });

	console.log('✅ Test environment ready');
}

export default globalSetup;

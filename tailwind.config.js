import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Roboto', 'system-ui', 'sans-serif']
			}
		}
	},
	plugins: [daisyui],
	daisyui: {
		// DaisyUI Config - Nur Light Mode (vereinfacht für Stabilität)
		darkTheme: false,
		base: true,
		styled: true,
		utils: true,
		logs: false
	}
};

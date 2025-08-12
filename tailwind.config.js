import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		'./src/**/*.svelte',
		'./node_modules/daisyui/dist/**/*.js'
	],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
				body: ['Roboto', 'Inter', 'system-ui', 'sans-serif'],
			}
		}
	},
	plugins: [daisyui],
	daisyui: {
		themes: ['light', 'dark', 'cupcake']
	}
};

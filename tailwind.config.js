import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}', './node_modules/daisyui/dist/**/*.js'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Source Sans Pro', 'Inter', 'system-ui', 'sans-serif']
			}
		}
	},
	plugins: [daisyui],
	daisyui: {
		// DaisyUI Config - Nur Light Mode
		darkTheme: false,
		base: true,
		styled: true,
		utils: true,
		logs: false
	}
};

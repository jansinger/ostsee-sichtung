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
				body: ['Roboto', 'Inter', 'system-ui', 'sans-serif']
			}
		}
	},
	plugins: [daisyui],
	daisyui: {
		themes: [
			{
				meeresmuseum: {
					// Color scheme definition
					'color-scheme': 'light',
					
					// Base colors - following corporate theme structure
					'--color-base-100': 'oklch(100% 0 0)',          // Pure white background
					'--color-base-200': 'oklch(93% 0 0)',           // Light gray
					'--color-base-300': 'oklch(86% 0 0)',           // Medium light gray
					'--color-base-content': 'oklch(22.389% .031 278.072)', // Dark blue-gray text
					
					// Primary colors - Museum main blue #005377
					'--color-primary': 'oklch(33.5% .08 218)',      // Museum blue
					'--color-primary-content': 'oklch(100% 0 0)',   // White text on primary
					primary: '#005377',                             // Hex for utilities
					'primary-content': '#ffffff',                   // Hex for utilities
					
					// Secondary colors - Museum secondary teal #00a6a6
					'--color-secondary': 'oklch(65% .08 180)',      // Museum teal
					'--color-secondary-content': 'oklch(100% 0 0)', // White text on secondary
					secondary: '#00a6a6',                           // Hex for utilities
					'secondary-content': '#ffffff',                 // Hex for utilities
					
					// Accent colors - Museum orange #fa8800
					'--color-accent': 'oklch(70% .15 65)',          // Museum orange
					'--color-accent-content': 'oklch(0% 0 0)',      // Black text on accent
					accent: '#fa8800',                              // Hex for utilities
					'accent-content': '#000000',                    // Hex for utilities
					
					// Neutral colors
					'--color-neutral': 'oklch(0% 0 0)',             // Black neutral
					'--color-neutral-content': 'oklch(100% 0 0)',   // White neutral content
					neutral: '#000000',                             // Hex for utilities
					'neutral-content': '#ffffff',                   // Hex for utilities
					
					// Base colors for utilities
					'base-100': '#ffffff',                          // Hex for utilities
					'base-200': '#ededed',                          // Hex for utilities
					'base-300': '#dbdbdb',                          // Hex for utilities
					'base-content': '#1a1a1a',                      // Hex for utilities
					
					// Semantic colors - using proven values from corporate theme
					'--color-info': 'oklch(33.5% .08 218)',         // Same as primary
					'--color-info-content': 'oklch(100% 0 0)',      // White
					info: '#005377',                                // Hex for text-info utility
					'info-content': '#ffffff',                      // Hex for utilities
					
					'--color-success': 'oklch(62% .194 149.214)',   // Green success (from corporate)
					'--color-success-content': 'oklch(100% 0 0)',   // White
					success: '#047857',                             // Hex for text-success utility
					'success-content': '#ffffff',                   // Hex for utilities
					
					'--color-warning': 'oklch(85% .199 91.936)',    // Orange warning (from corporate)
					'--color-warning-content': 'oklch(0% 0 0)',     // Black
					warning: '#d97706',                             // Hex for text-warning utility
					'warning-content': '#000000',                   // Hex for utilities
					
					'--color-error': 'oklch(70% .191 22.216)',      // Red error (from corporate)
					'--color-error-content': 'oklch(0% 0 0)',       // Black
					error: '#dc2626',                               // Hex for text-error utility
					'error-content': '#000000',                     // Hex for utilities
					
					// Design tokens - following corporate theme
					'--radius-selector': '.25rem',                  // Button radius
					'--radius-field': '.25rem',                     // Input field radius  
					'--radius-box': '.25rem',                       // Card/box radius
					
					// Design tokens - Sizes
					'--size-selector': '.25rem',                    // Small spacing
					'--size-field': '.25rem',                       // Field padding
					
					// Design tokens - Border & Effects
					'--border': '1px',                              // Border width
					'--depth': '0',                                 // Shadow depth (corporate style)
					'--noise': '0'                                  // Noise effect
				}
			},
			'light',
			'dark',
			'cupcake'
		]
	}
};

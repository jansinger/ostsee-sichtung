import { ScalarApiReference } from '@scalar/sveltekit';
import type { RequestHandler } from './$types';

const configuration = {
	spec: {
		url: '/openapi.yml'
	},
	theme: 'default' as const,
	layout: 'modern' as const,
	showSidebar: true,
	searchHotKey: 'k',
	hiddenClients: [],
	isEditable: false,
	darkMode: false,
	customCss: `
		/* Custom styling for better integration */
		.scalar-app {
			font-family: 'Roboto', system-ui, sans-serif;
			height: 100vh !important;
			overflow: hidden;
		}
		
		/* Fix sidebar scrolling */
		.scalar-sidebar {
			overflow-y: auto !important;
			max-height: 100vh;
		}
		
		/* Main content scrolling */
		.scalar-content {
			overflow-y: auto !important;
			max-height: 100vh;
		}
		
		/* Better mobile responsiveness */
		@media (max-width: 768px) {
			.scalar-sidebar {
				width: 100% !important;
			}
			
			.scalar-app {
				height: auto !important;
			}
		}
		
		/* Ensure clickable elements work */
		.scalar-sidebar a,
		.scalar-sidebar button {
			cursor: pointer !important;
			pointer-events: auto !important;
		}
		
		/* Fix operation selection */
		.scalar-sidebar .scalar-sidebar__item {
			pointer-events: auto !important;
		}
		
		.scalar-sidebar .scalar-sidebar__item:hover {
			background-color: rgba(0, 0, 0, 0.05) !important;
		}
	`,
	metaData: {
		title: 'Ostsee-Tiere API Documentation',
		description: 'Interaktive API-Dokumentation für die Ostsee-Tiere Plattform',
		ogDescription: 'Umfassende OpenAPI-Dokumentation mit interaktiver Schnittstelle',
		ogTitle: 'Ostsee-Tiere API Docs',
		twitterCard: 'summary'
	}
};

export const GET: RequestHandler = ScalarApiReference(configuration);
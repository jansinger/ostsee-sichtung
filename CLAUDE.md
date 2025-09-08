# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ostsee-Tiere** is a modern SvelteKit application for recording and managing marine animal sightings in the Baltic Sea. The application enables citizens, researchers, and nature observers to report their whale, seal, and other marine animal sightings, contributing valuable data to marine research and conservation efforts.

The user experience is designed to be as simple and intuitive as possible using a multi-step form that only displays relevant sections based on user input. Users can visualize their sightings on an interactive map and capture precise geographic information. 

The application leverages modern web technologies including SvelteKit, TailwindCSS, and PostGIS for an engaging user interface and powerful data processing capabilities, with comprehensive support for iframe embedding and mobile-responsive design.

Administration and data management are supported through user-friendly interfaces that allow review and management of submitted sightings.

## Development Commands

### Core Development
- `npm run dev` - Start development server (https://localhost:4000)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

**HTTPS Development Server:**
- Port: 4000 (automatically configured)
- SSL: Automatic certificate generation with `@vitejs/plugin-basic-ssl`
- Certificates stored in `./certs/` directory
- Supports `localhost` and `*.local.dev` domains
- Enables secure iframe embedding and modern Web APIs

### Database Operations
- `npm run db:start` - Start PostgreSQL database (Docker, port 5433)
- `npm run db:stop` - Stop database container
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle Studio (database management UI)

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking
- `npm run check` - Run svelte-check for Svelte-specific issues

### Testing
- `npm run test:unit` - Run unit tests with Vitest
- `npm run test:unit:watch` - Run unit tests in watch mode  
- `npm run test:e2e` - Run end-to-end tests with Playwright
- `npm run test` - Run quick test suite (lint + unit tests)
- `npm run test:quick` - Run quick test suite (lint + type-check + check + unit tests)

## Architecture Overview

### Technology Stack
- **Framework**: SvelteKit 5 with TypeScript
- **Database**: PostgreSQL with PostGIS extension for geographical data
- **ORM**: Drizzle with type-safe queries
- **Styling**: TailwindCSS with DaisyUI components and custom theme `meeresmuseum`
- **Maps**: OpenLayers for interactive mapping
- **Forms**: svelte-forms-lib with Yup validation
- **Logging**: Pino logger

### Database Schema
The main entity is `sichtungen` (sightings) table with comprehensive fields for marine animal sightings including:
- Geographic data (PostGIS point geometry, latitude/longitude)
- Sighting metadata (date, location, distance, counts)
- Environmental conditions (sea state, wind, visibility)
- Observer details and contact information
- Administrative fields (approval status, verification, internal comments)
- Dead animal findings with additional details

Supporting tables:
- `sichtungen_dateien` - File attachments with metadata (JSONB for EXIF data, URLs, file information)
- `ne_10m_ocean` - Geographic ocean boundaries for validation

Key sequences: `sichtungen_seq`

### Project Structure
```
src/
├── lib/
│   ├── components/          # Reusable UI components
│   ├── constants/          # Enums and constant definitions (species, conditions, etc.)
│   ├── map/               # OpenLayers map functionality
│   ├── server/db/         # Database schema and repository layer
│   ├── types/             # TypeScript type definitions
│   ├── form/              # Form utilities and validation
│   ├── export/            # Data export functionality
│   ├── formState.ts       # Form state management and initial values
│   └── sightingSchema.ts  # Yup validation schema
└── routes/
    ├── api/               # Backend API endpoints
    ├── map/               # Map visualization page
    ├── sichtungen/        # Sighting forms and management
    ├── +page.svelte       # Main multi-step form
    └── components/        # Route-specific components
        ├── steps/         # Form step components
        └── conditional/   # Conditional form components
```

### Key Implementation Files
- `/src/routes/+page.svelte` - Main multi-step form with dynamic navigation
- `/src/lib/sightingSchema.ts` - Yup validation schema for form validation
- `/src/lib/server/db/schema.ts` - Database schema definition with PostGIS integration and JSONB support
- `/src/lib/server/db/sightingRepository.ts` - Data access layer for sighting operations
- `/src/lib/constants/` - Constants for dropdown options and form selections
- `/src/lib/server/storage/` - Storage abstraction layer supporting local and cloud providers

## Key Design Patterns
- Always consider the Design Guide in @docs/DESIGN_GUIDE.md

### Key Patterns & Form Logic
- Use Drizzle ORM with PostGIS for geographic queries
- Leverage extensive constants files for form options (species, conditions, etc.)
- Multi-step form implementation with conditional logic and progressive disclosure
- Geographic validation using Baltic Sea boundaries
- CSP configuration for OpenStreetMap tile integration
- Form validation using svelte-forms-lib with Yup schemas
- OpenLayers integration for interactive map functionality with coordinate capture
- Media upload with EXIF metadata extraction and cloud storage integration


### Database Connection
Local development uses Docker PostgreSQL on port 5433 (not default 5432) with credentials:
- User: root
- Password: mysecretpassword  
- Database: local

Always check Baltic Sea geographic bounds using the `checkBalticSeaFile` utility before saving sightings.

## Legacy REST API Compatibility

**⚠️ CRITICAL: 100% Compliance Required**

The project includes legacy REST API endpoints for mobile app compatibility. These APIs MUST maintain 100% compatibility with the original schweinswalsichtung.de specification to ensure existing mobile applications continue to function correctly.

**Reference**: See `docs/LEGACY_API_SPECIFICATION.md` for the complete specification derived from the original PDF documentation.

**Key Requirements:**
- Exact field names as specified in the original API
- Exact URL paths (no additional prefixes)
- Exact response formats and data types
- Backward compatibility is mandatory - any breaking changes are forbidden

**Critical Implementation Notes:**
- URL paths must match exactly: `/rest_sichtungen`, `/sichtungen/showreports.json`, etc.
- Response field names in showreports.json must be abbreviated: `ts`, `id`, `dt`, `ti`, `lat`, `lon`, `ct`, `yo`, `sh`, `na`, `ar`
- Coordinates must be returned as strings, not numbers
- Boolean values must use 0/1 integers, not true/false
- Date formats must match exactly (DD.MM.YY, YYYY-MM-DD HH:MI)
- All wind directions must be supported: 'N','NW','W','SW','S','SO','O','NO'

The legacy APIs are located in `/src/routes/api/legacy/` and include field mapping, validation, and response transformation to maintain perfect compatibility with the original API.

## Development Guidelines & Code Conventions

### Clean Code Principles
- **DRY (Don't Repeat Yourself)**: Extract reusable logic into utility functions, custom hooks, or shared components
- **Single Responsibility**: Each function, component, or module should have one clear purpose
- **Separation of Concerns**: Keep business logic, data access, and presentation layers separate
- **KISS (Keep It Simple)**: Prefer simple, readable solutions over complex ones
- **YAGNI (You Aren't Gonna Need It)**: Don't add functionality until it's actually needed
- **Composition over Inheritance**: Use component composition and utility functions instead of complex inheritance hierarchies

### TypeScript Best Practices
- Use TypeScript types and interfaces for type safety - avoid `any` types
- Prefer `const` and `let` over `var` for block scoping
- Use template literals for string concatenation
- Leverage destructuring for cleaner code
- Write pure functions when possible to improve testability and avoid side effects
- Ensure functions are idempotent for better reusability
- Make functions deterministic for predictable behavior
- Define explicit return types for functions for better type safety
- Use type guards and narrowing for runtime type safety

### Code Quality Standards
- Write clear, well-structured, and maintainable code
- Use descriptive naming conventions following project patterns:
  - Components: PascalCase (e.g., `MediaGallery.svelte`)
  - Functions/variables: camelCase (e.g., `loadSightingFiles`)
  - Constants: UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`)
  - Types/Interfaces: PascalCase with descriptive suffixes (e.g., `SightingFormData`)
- Document complex logic and important architectural decisions
- Consider performance, security, and scalability in implementations
- Write unit tests where applicable and design for testability
- Follow existing project conventions and ESLint rules
- Minimize technical debt and unnecessary dependencies
- Prefer small, focused files - create separate files for each major function or component
- Use modern accessibility recommendations to conform with European accessibility rules (WCAG 2.1 AA)

### Database & Data Access Patterns
- Use repository pattern for database operations (e.g., `sightingRepository.ts`)
- Always validate data before database operations
- Use transactions for multi-table operations
- Leverage JSONB for flexible structured data (e.g., EXIF metadata)
- Keep database schema changes versioned and reversible
- Use proper indexes for frequently queried fields

### Project-Specific Conventions
- Follow existing component organization patterns in `/src/lib/components/`
- Use established constants from `/src/lib/report/formOptions/` for form options
- Maintain consistency with Drizzle ORM patterns for database operations
- Respect the multi-step form structure and conditional logic patterns
- Use PostGIS utilities for geographic data handling
- Follow TailwindCSS + DaisyUI styling patterns established in the codebase
- **IMPORTANT**: Use Svelte 5 runes mode (`$state`, `$derived`, `$effect`, etc.)
- Use Pino for logging, avoid console usage except for debugging
- Store file metadata including EXIF data as JSONB in database for efficient querying
- Use storage abstraction layer for file operations to support multiple providers
- Run `npm run check` and `npm run type-check` after code changes
- Import from `/lib` using `$lib` with full paths (e.g., `import { foo } from '$lib/utils/bar'`)
- Use Conventional Commits for commit messages
- Commits are validated with commitlint - follow rules in `commitlint.config.mjs`
- **IMPORTANT**: Use English for commit messages with lowercase subject lines
- Available commit scopes: deps, api, ui, db, auth, export, admin, report, map, config, build, ci, docs, test, types, style, perf, security, a11y, release, media
- Prüfe nach Änderungen immer auf notwendige Aktualisierungen der Dokumentationen, also aller *.md Dateien
- Aktuallisiere nach Änderungen an der API immer auch die OpenAPI Spec
- **IMPORTANT**: Always use context7 MCP server for retrieving current documentation and best practices
- Nutze die lokale DB aus .env für lokale Ausführung mit npm run dev und für tools / scripte

## Technology Stack Documentation and Best Practices

### Always Use context7 MCP Server
**CRITICAL**: When working with any external libraries or frameworks, ALWAYS use the context7 MCP server to retrieve the most current documentation, patterns, and best practices. This ensures you're working with up-to-date information and following current conventions.

```bash
# Example: Get current DaisyUI documentation
Use Task tool with context7 to get latest DaisyUI patterns
Use Task tool with context7 to get latest Svelte 5 best practices
Use Task tool with context7 to get latest SvelteKit patterns
```

### DaisyUI v5 (2025) - Modern Component Framework

#### Current Version Features
- **DaisyUI v5** with 61% smaller bundle size and zero dependencies
- **ESM compatible** with native CSS nesting support
- **Tailwind CSS 4 compatibility** and CSS-based configuration
- **35+ built-in themes** with advanced customization options

#### Component Patterns (Always Use context7 for Latest)
```css
/* Modern CSS-based configuration */
@plugin "daisyui" {
  themes: light --default, dark --prefersdark, cupcake;
  include: button, input, select, card;
  exclude: checkbox, footer;
  prefix: "";
  root: ":root";
  logs: true;
}
```

#### Best Practices for Component Development
- Use semantic component classes: `btn btn-primary`, `input input-bordered`
- Leverage size variants: `btn-xs`, `btn-sm`, `btn-md`, `btn-lg`, `btn-xl`
- Apply color system: `btn-neutral`, `btn-primary`, `btn-secondary`, `btn-accent`
- Follow accessibility patterns with proper ARIA attributes
- Use theme switching via `data-theme` attribute
- Combine DaisyUI with Tailwind utilities for custom styling

#### Current Component Availability (Use context7 for Complete List)
- **Forms**: Enhanced input, button, select, textarea with validation
- **Layout**: Card, modal, drawer, divider, hero
- **Navigation**: Navbar, menu, breadcrumbs, tabs, pagination
- **Data Display**: Table, badge, alert, progress, stats
- **New in v5**: List, Status, Fieldset, Label, Filter, Calendar, Validator, Dock

### Svelte 5 Runes System - Modern Reactivity

#### Core Runes (Always Verify Latest Syntax with context7)
```typescript
// $state - Reactive state management
let count = $state(0);
let user = $state({ name: 'John', age: 30 });
let todos = $state([{ done: false, text: 'add todos' }]);

// $derived - Computed values with automatic dependency tracking  
let doubled = $derived(count * 2);
let total = $derived.by(() => {
    return items.reduce((sum, item) => sum + item.value, 0);
});

// $effect - Side effects with automatic cleanup
$effect(() => {
    document.title = `Count: ${count}`;
});

$effect(() => {
    const interval = setInterval(() => tick(), 1000);
    return () => clearInterval(interval); // Cleanup
});

// $props - Component properties with destructuring
let { name = 'Anonymous', age, onSelect }: Props = $props();
```

#### Modern Component Patterns
```svelte
<!-- Component.svelte -->
<script lang="ts">
    interface Props {
        items: string[];
        onSelect?: (item: string) => void;
    }
    
    let { items, onSelect }: Props = $props();
    let selectedItem = $state<string | null>(null);
    let hasSelection = $derived(selectedItem !== null);
    
    $effect(() => {
        if (selectedItem && onSelect) {
            onSelect(selectedItem);
        }
    });
</script>

<!-- Event handling without on: prefix -->
<button onclick={() => handleClick()}>Click</button>
```

#### Migration Best Practices
- Replace `let variable` with `$state(initial)`
- Replace `$: derived = expression` with `$derived(expression)`
- Replace `export let prop` with `let { prop } = $props()`
- Replace `on:event` with `onevent` function calls
- Use `mount()` instead of `new Component()` for instantiation

### SvelteKit 2025 - Full-Stack Framework

#### File-Based Routing (Always Check Latest Patterns with context7)
```
src/routes/
├── +page.svelte              # Home page (/)
├── +layout.svelte            # Root layout
├── +error.svelte            # Error boundary
├── blog/
│   ├── +page.svelte         # Blog index (/blog)
│   ├── +page.server.ts      # Server-side load & actions
│   ├── [slug]/
│   │   └── +page.svelte     # Dynamic route (/blog/hello)
│   └── [...rest]/
│       └── +page.svelte     # Catch-all (/blog/a/b/c)
└── api/
    └── +server.ts           # API endpoint (/api)
```

#### Load Functions and Data Fetching
```typescript
// Universal load (+page.ts) - runs on server and client
export const load: PageLoad = async ({ fetch, params }) => {
    const response = await fetch(`/api/posts/${params.slug}`);
    return { post: await response.json() };
};

// Server-only load (+page.server.ts) - sensitive data
export const load: PageServerLoad = async ({ params, cookies }) => {
    const user = await db.getUser(cookies.get('sessionid'));
    return { user, privateData: await db.getPrivate(user.id) };
};
```

#### Form Actions and Progressive Enhancement
```typescript
// +page.server.ts - Form actions
export const actions: Actions = {
    default: async ({ request }) => {
        const data = await request.formData();
        const email = data.get('email');
        if (!email) return fail(400, { email, missing: true });
        // Process form...
        return { success: true };
    }
};
```

```svelte
<!-- Progressive enhancement -->
<form method="POST" use:enhance>
    <input name="email" value={form?.email ?? ''} />
    {#if form?.missing}<p>Email required</p>{/if}
    <button type="submit">Submit</button>
</form>
```

#### Production Deployment Patterns (Use context7 for Latest Adapter Options)
```javascript
// Vercel adapter with latest features
import adapter from '@sveltejs/adapter-vercel';

export default {
    kit: {
        adapter: adapter({
            edge: true,      // Edge runtime
            isr: true,       // Incremental Static Regeneration  
            split: true      // Function per route
        })
    }
};
```

### Development Workflow with Context7

#### Always Start with Documentation Lookup
1. **Before implementing features**: Use context7 to get latest patterns
2. **Before using new APIs**: Verify current syntax and best practices  
3. **Before deployment**: Check latest adapter and configuration options
4. **Before optimization**: Get current performance recommendations

#### Example Usage Pattern
```bash
# Before working on forms
Use Task + context7: "Get latest DaisyUI form component patterns and accessibility requirements"

# Before state management
Use Task + context7: "Get current Svelte 5 runes best practices and performance patterns"  

# Before deployment
Use Task + context7: "Get latest SvelteKit deployment options and optimization techniques"
```

### Integration Best Practices

#### Combining DaisyUI + Svelte 5 + SvelteKit
```svelte
<script lang="ts">
    // Svelte 5 runes for state
    let formData = $state({ email: '', password: '' });
    let isSubmitting = $state(false);
    let errors = $state<Record<string, string>>({});
    
    // Derived validation state
    let isValid = $derived(formData.email && formData.password && !isSubmitting);
    
    async function handleSubmit() {
        isSubmitting = true;
        try {
            const response = await fetch('/api/auth', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            // Handle response...
        } finally {
            isSubmitting = false;
        }
    }
</script>

<!-- DaisyUI components with Svelte 5 event handling -->
<form onsubmit={handleSubmit}>
    <div class="form-control w-full max-w-xs">
        <label class="label">
            <span class="label-text">Email</span>
        </label>
        <input 
            type="email" 
            bind:value={formData.email}
            class="input input-bordered {errors.email ? 'input-error' : ''}"
            class:input-success={formData.email && !errors.email}
        />
    </div>
    
    <button 
        type="submit" 
        class="btn btn-primary"
        class:loading={isSubmitting}
        disabled={!isValid}
    >
        {isSubmitting ? 'Submitting...' : 'Submit'}
    </button>
</form>
```

### Additional Core Technologies - Always Use Context7

#### Weather & Geographic APIs
- **Open-Meteo API**: Free weather data service with historical and forecast endpoints
- **OpenLayers**: Modern web mapping library for interactive geographic data visualization
- **PostGIS**: Spatial database extension for PostgreSQL with geographic queries

#### Database & ORM Technologies
- **Drizzle ORM**: Type-safe SQL ORM with excellent PostgreSQL and PostGIS integration
- **PostgreSQL**: Advanced relational database with JSONB support and spatial extensions
- **PostGIS**: Spatial database capabilities for geographic data storage and queries

#### API Documentation & Validation
- **Scalar OpenAPI**: Modern API documentation and client generation from OpenAPI specs
- **Yup**: Schema validation library for form data and API validation

#### UI & Authentication
- **Lucide Icons**: Beautiful, customizable SVG icon library with React/Svelte components
- **Auth0**: Identity and access management platform with OAuth2/OIDC support

#### Context7 Usage for These Technologies

```bash
# Weather & Maps
Use Task + context7: "Get latest Open-Meteo API endpoints and best practices for historical weather data"
Use Task + context7: "Get current OpenLayers v10+ patterns for web mapping with PostGIS integration"

# Database & ORM
Use Task + context7: "Get latest Drizzle ORM patterns for PostgreSQL with PostGIS spatial queries"
Use Task + context7: "Get current PostgreSQL 16+ features and JSONB best practices"
Use Task + context7: "Get PostGIS 3+ spatial query patterns and geographic data handling"

# API & Validation
Use Task + context7: "Get latest Scalar OpenAPI documentation patterns and client generation"
Use Task + context7: "Get current Yup v1+ validation patterns for complex form schemas"

# UI & Auth
Use Task + context7: "Get latest Lucide Icons integration patterns for Svelte components"
Use Task + context7: "Get current Auth0 SPA integration with SvelteKit and security best practices"
```

#### Integration Best Practices for Full Stack

```typescript
// Weather API with Drizzle ORM + PostGIS
import { db } from '$lib/server/db';
import { sightings } from '$lib/server/db/schema';

// Fetch weather data and store with geographic queries
const nearbyWeather = await db
  .select()
  .from(sightings)
  .where(
    sql`ST_DWithin(${sightings.location}, ST_Point(${lng}, ${lat}), 1000)`
  );

// OpenLayers with PostGIS data
const map = new Map({
  layers: [
    new VectorLayer({
      source: new VectorSource({
        url: '/api/sightings/geojson',
        format: new GeoJSON()
      })
    })
  ]
});

// Auth0 + SvelteKit integration
export const handle: Handle = Auth0Handle({
  clientID: env.AUTH0_CLIENT_ID,
  domain: env.AUTH0_DOMAIN,
  clientSecret: env.AUTH0_CLIENT_SECRET
});

// Yup + Lucide Icons in forms
import { MapPin, Calendar } from '@steeze-ui/lucide-icons';

const schema = yup.object({
  position: yup.object({
    lat: yup.number().min(-90).max(90).required(),
    lng: yup.number().min(-180).max(180).required()
  }),
  date: yup.date().max(new Date()).required()
});
```

#### OpenAPI + Scalar Documentation Pattern

```typescript
// Use Scalar for API documentation generation
import { generateOpenAPI } from '$lib/server/openapi';

// Auto-generate from Yup schemas
export const weatherAPI = {
  '/api/weather/historical': {
    get: {
      parameters: weatherParamsSchema,
      responses: weatherResponseSchema
    }
  }
};
```

**Critical Reminder**: Always use context7 MCP server to get the most current documentation, API changes, breaking updates, and integration patterns for ALL these technologies, as they evolve rapidly and best practices change frequently. This is especially important for:

- Open-Meteo API endpoint changes and new parameters
- OpenLayers version updates and mapping patterns  
- Drizzle ORM schema evolution and PostgreSQL integration
- PostGIS spatial function updates and performance patterns
- Auth0 security updates and SvelteKit integration changes
- Yup validation patterns and schema composition techniques
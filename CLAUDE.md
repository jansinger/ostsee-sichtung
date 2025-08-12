# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**OstseeSichtung** is a modern SvelteKit application for recording and managing marine animal sightings in the Baltic Sea. The application enables citizens, researchers, and nature observers to report their whale, seal, and other marine animal sightings, contributing valuable data to marine research and conservation efforts.

The user experience is designed to be as simple and intuitive as possible using a multi-step form that only displays relevant sections based on user input. Users can visualize their sightings on an interactive map and capture precise geographic information. 

The application leverages modern web technologies including SvelteKit, TailwindCSS, and PostGIS for an engaging user interface and powerful data processing capabilities, with comprehensive support for iframe embedding and mobile-responsive design.

Administration and data management are supported through user-friendly interfaces that allow review and management of submitted sightings.

## Development Commands

### Core Development
- `npm run dev` - Start development server (http://localhost:5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

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
- `npm run test` - Run complete test suite (type-check + lint + unit + e2e)

## Architecture Overview

### Technology Stack
- **Framework**: SvelteKit 5 with TypeScript
- **Database**: PostgreSQL with PostGIS extension for geographical data
- **ORM**: Drizzle with type-safe queries
- **Styling**: TailwindCSS with DaisyUI components
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

Key sequences: `sichtungen_seq` starts at 1840, test sequences available for development.

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
- `/src/routes/report/+page.svelte` - Main multi-step form with dynamic navigation
- `/src/lib/sightingSchema.ts` - Yup validation schema for form validation
- `/src/lib/server/db/schema.ts` - Database schema definition with PostGIS integration
- `/src/lib/report/formOptions/` - Constants for dropdown options and form selections

## Key Design Patterns
- Always cosider the Design Guide in `DESIGNGUIDE.md` (important!)

### Key Patterns & Form Logic
- Use Drizzle ORM with PostGIS for geographic queries
- Leverage extensive constants files for form options (species, conditions, etc.)
- Multi-step form implementation
- Geographic validation using Baltic Sea boundaries
- CSP configuration for OpenStreetMap tile integration
- Form validation using svelte-forms-lib with Yup schemas
- OpenLayers integration for interactive map functionality with coordinate capture


### Database Connection
Local development uses Docker PostgreSQL on port 5433 (not default 5432) with credentials:
- User: root
- Password: mysecretpassword  
- Database: local

Always check Baltic Sea geographic bounds using the `checkBalticSea` utility before saving sightings.

## Development Guidelines & Code Conventions

### TypeScript Best Practices
- Use TypeScript types and interfaces for type safety - avoid `any` types
- Prefer `const` and `let` over `var` for block scoping
- Use template literals for string concatenation
- Leverage destructuring for cleaner code
- Write pure functions when possible to improve testability and avoid side effects
- Ensure functions are idempotent for better reusability
- Make functions deterministic for predictable behavior

### Code Quality Standards
- Write clear, well-structured, and maintainable code
- Use descriptive naming conventions following project patterns
- Document complex logic and important architectural decisions
- Consider performance, security, and scalability in implementations
- Write unit tests where applicable and design for testability
- Follow existing project conventions and ESLint rules
- Minimize technical debt and unnecessary dependencies
- Prefer small files, i.e. create a seperat file for each function
- Please use modern accessibility recommendations to conform with european accessibility rules

### Project-Specific Conventions
- Follow existing component organization patterns in `/src/lib/components/`
- Use established constants from `/src/lib/constants/` for form options
- Maintain consistency with Drizzle ORM patterns for database operations
- Respect the multi-step form structure and conditional logic patterns
- Use PostGIS utilities for geographic data handling
- Follow TailwindCSS + DaisyUI styling patterns established in the codebase
- Use Svelte 5 runes mode
- Use Pino for logging, avoid console usage
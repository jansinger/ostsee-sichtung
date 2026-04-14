import vitestOpenApi from 'vitest-openapi';
import path from 'path';

// Registers toSatisfyApiSpec() and toSatisfySchemaInApiSpec() matchers globally.
// Must be imported (side-effect import) in vitest-setup-server.ts before any contract tests run.
vitestOpenApi(path.resolve(process.cwd(), 'static/openapi.yml'));

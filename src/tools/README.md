# Tools Directory

This directory contains maintenance and utility scripts for the Ostsee-Tiere application.

## Available Scripts

### 1. License Management

#### `generate-license-notices.js`
Generates third-party license notices and attribution files.

**Usage:**
```bash
npm run generate:licenses
```

**Output Files:**
- `THIRD-PARTY-NOTICES.md` - Detailed license information with compatibility analysis
- `THIRD-PARTY-NOTICES.txt` - Summary text file
- `third-party-licenses.csv` - Machine-readable CSV format

### 2. Database Maintenance

#### `fix-media-upload-flags.js`
Corrects the `aufnahmeHochladen` (media upload) flags in the `sichtungen` table based on actual file existence in `sichtungen_dateien`.

**Purpose:**
- Ensures data consistency between sighting records and their associated media files
- Sets flag to `1` when files exist, `0` when no files are present
- Useful after data migrations or file cleanup operations

**Usage:**
```bash
# Live update (makes actual changes)
npm run db:fix-media-flags

# Dry run (shows what would be changed without making changes)
npm run db:fix-media-flags:dry-run

# Verbose output (detailed logging)
npm run db:fix-media-flags:verbose

# Combine flags
node src/tools/fix-media-upload-flags.js --dry-run --verbose
```

**Parameters:**
- `--dry-run`: Simulates changes without writing to database
- `--verbose`: Provides detailed output for each processed record

**Output:**
- Summary of total sightings checked
- Count of correct vs incorrect flags
- List of records that need/have been updated
- Validation results (for live updates)

**Safety Features:**
- Dry run mode for safe testing
- Detailed logging of all changes
- Post-update validation
- Graceful error handling
- Database connection cleanup

## Development Guidelines

### Creating New Tools

1. **Location**: Place scripts in `src/tools/`
2. **Naming**: Use kebab-case with descriptive names
3. **Documentation**: Include JSDoc headers with usage examples
4. **Safety**: Always include dry-run functionality for destructive operations
5. **Logging**: Provide clear, informative output
6. **npm Scripts**: Add corresponding entries in `package.json`

### Script Template

```javascript
#!/usr/bin/env node

/**
 * @fileoverview Brief description of what the script does
 * 
 * Detailed explanation of the script's purpose and functionality.
 * 
 * Usage:
 *   node src/tools/script-name.js [--options]
 * 
 * @author Ostsee-Tiere Team
 * @since version
 */

// Import statements
// Configuration parsing
// Main functionality
// Error handling
// Cleanup
```

### Database Scripts

For scripts that interact with the database:

1. **Use environment variables** for connection strings
2. **Include proper error handling** and connection cleanup
3. **Implement dry-run mode** for any destructive operations
4. **Provide detailed logging** of all database operations
5. **Validate results** after making changes

### Best Practices

- **Test thoroughly** with dry-run before live execution
- **Document all parameters** and expected behavior
- **Handle edge cases** gracefully
- **Provide meaningful error messages**
- **Use consistent coding style** with the rest of the project
- **Include proper TypeScript/JSDoc** for maintainability

## Running Tools

### Prerequisites

1. **Database Connection**: Ensure PostgreSQL is running
   ```bash
   npm run db:start
   ```

2. **Environment Variables**: Set `DATABASE_URL` if using non-default connection
   ```bash
   export DATABASE_URL="postgresql://user:password@host:port/database"
   ```

3. **Dependencies**: Install all project dependencies
   ```bash
   npm install
   ```

### Execution

Most tools are integrated with npm scripts for convenience:

```bash
# List all available scripts
npm run

# Execute specific tools
npm run db:fix-media-flags:dry-run
npm run generate:licenses
```

### Monitoring

Tools provide structured output suitable for:
- **Manual review** during development
- **CI/CD integration** for automated maintenance
- **Logging systems** for production monitoring

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify PostgreSQL is running: `npm run db:start`
   - Check connection string format
   - Ensure database exists and is accessible

2. **Permission Errors**
   - Verify script has execute permissions: `chmod +x src/tools/script.js`
   - Check file system permissions for output files

3. **Dependency Issues**
   - Run `npm install` to ensure all dependencies are available
   - Check Node.js version compatibility

### Getting Help

- **Review script output** for specific error messages
- **Check logs** in verbose mode for detailed information
- **Use dry-run mode** to test without making changes
- **Consult project documentation** for database schema details

---

For questions or issues with tools, please consult the project documentation or open an issue in the repository.
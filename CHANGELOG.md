# Changelog

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.0.0] - 2024-01-15

### ✨ Features

- **export**: Complete export functionality redesign with modal interface
- **export**: Add CSV, JSON, XML, and KML export formats with filter support
- **export**: Add file size estimation for each export format
- **auth**: User authentication and authorization system
- **admin**: Administrative interface for sighting management
- **report**: Multi-step sighting reporting form with GPS integration
- **map**: Interactive map visualization with OpenLayers
- **ui**: Modern responsive design with TailwindCSS and DaisyUI

### 🐛 Bug Fixes

- **font**: Fix font loading flicker (FOUT) with optimized metrics
- **font**: Remove hardcoded font preloads causing 404 errors
- **exif**: Fix EXIF data extraction by moving to server-side processing
- **ui**: Various mobile responsiveness improvements

### 🏗️ Build System

- **ci**: Add Dependabot combined PR workflow with conventional commits
- **ci**: Setup semantic-release for automated versioning
- **ci**: Configure commitlint and husky for commit quality enforcement
- **config**: Optimize Vite configuration and suppress CommonJS warnings

### 📚 Documentation

- Add comprehensive CONTRIBUTING.md with conventional commits guidelines
- Update README with development setup instructions

---

*This changelog is automatically generated using [semantic-release](https://semantic-release.gitbook.io/). Future releases will be documented automatically based on conventional commit messages.*
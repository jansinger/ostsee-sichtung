# Contributing to Ostsee-Tiere

Thank you for your interest in contributing to the Ostsee-Tiere project! This guide will help you understand our workflow and requirements.

## 🚀 Development Workflow

### 1. Branch Protection & Pull Requests

- **The `main` branch is protected** - direct commits are not allowed
- All changes must be made through Pull Requests (PRs)
- Each PR must be reviewed and approved before merging
- All status checks must pass before merging

### 2. Creating a Pull Request

```bash
# Create a feature branch
git checkout -b feat/your-feature-name

# Make your changes and commit using conventional commits
npm run commit  # Interactive commit tool

# Push your branch
git push origin feat/your-feature-name

# Create a Pull Request on GitHub
```

## 📝 Conventional Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages. This helps us:

- Automatically generate changelogs
- Determine semantic version bumps
- Maintain a clean, readable history

### Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description | Release |
|------|-------------|---------|
| `feat` | ✨ A new feature | Minor |
| `fix` | 🐛 A bug fix | Patch |
| `docs` | 📚 Documentation only changes | Patch |
| `style` | 💄 Changes that do not affect code meaning | No release |
| `refactor` | ♻️ Code change that neither fixes a bug nor adds a feature | Patch |
| `perf` | ⚡ Performance improvements | Patch |
| `test` | ✅ Adding missing tests or correcting existing tests | No release |
| `build` | 🏗️ Changes affecting build system or external dependencies | Patch |
| `ci` | 🔧 Changes to CI configuration files and scripts | No release |
| `chore` | 🔨 Other changes that don't modify src or test files | No release |
| `revert` | ⏪ Reverts a previous commit | Varies |

### Scopes

Common scopes used in this project:

- `api` - API endpoints
- `ui` - User interface components  
- `db` - Database related
- `auth` - Authentication
- `export` - Export functionality
- `admin` - Admin interface
- `report` - Report/sighting forms
- `map` - Map functionality
- `deps` - Dependencies
- `config` - Configuration
- `security` - Security improvements
- `perf` - Performance improvements

### Examples

```bash
# Feature
feat(auth): add OAuth login support

# Bug fix
fix(api): handle null response in export endpoint

# Documentation
docs: update README with setup instructions

# Dependency update
chore(deps): update @sveltejs/kit to v2.30.0

# Breaking change
feat(api)!: restructure user authentication endpoints

BREAKING CHANGE: The login endpoint now returns a different response format
```

### Interactive Commit Tool

We provide an interactive commit tool to help you create proper commit messages:

```bash
npm run commit
```

This will guide you through creating a conventional commit message step by step.

## 🔧 Development Setup

### Prerequisites

- Node.js 20 or later
- Docker (for database)
- Git

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sichtungen-webapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the database**
   ```bash
   npm run db:start
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

### Git Hooks

This project uses [Husky](https://typicode.github.io/husky/) to enforce quality checks:

- **pre-commit**: Runs linting and type checking
- **commit-msg**: Validates commit message format

These hooks are automatically installed when you run `npm install`.

## ✅ Quality Checks

Before submitting a PR, ensure all checks pass:

```bash
# Run all checks
npm run test

# Individual checks
npm run lint          # ESLint
npm run type-check    # TypeScript
npm run check         # Svelte check
npm test             # Unit tests
npm run test:e2e     # E2E tests
npm run build        # Build check
```

## 📦 Release Process

This project uses [semantic-release](https://semantic-release.gitbook.io/) for automated versioning and releases:

1. **Automatic versioning** based on conventional commit messages
2. **Changelog generation** from commit history
3. **GitHub releases** with release notes
4. **Version bumping** in package.json

### Release Types

- **Patch** (1.0.1): `fix`, `docs`, `perf` commits
- **Minor** (1.1.0): `feat` commits  
- **Major** (2.0.0): commits with `BREAKING CHANGE` or `!` in type

## 🚦 Pull Request Guidelines

### PR Title
Use conventional commit format for PR titles:
```
feat(auth): add OAuth login support
```

### PR Description
Include:
- **What** changed
- **Why** it was changed
- **How** to test it
- **Screenshots** (if UI changes)
- **Breaking changes** (if any)

### Review Process

1. **Automated checks** must pass
2. **Code review** by maintainers
3. **Testing** instructions followed
4. **Documentation** updated if needed

## 🔒 Security

- Never commit secrets or API keys
- Use environment variables for configuration
- Follow security best practices
- Report security issues privately

## 📞 Getting Help

- **Documentation**: Check existing docs and README
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the project's license.

Thank you for contributing to Ostsee-Tiere! 🐋🦭
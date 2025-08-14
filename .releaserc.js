/** @type {import('semantic-release').GlobalConfig} */
module.exports = {
  branches: [
    '+([0-9])?(.{+([0-9]),x}).x',
    'main',
    'next',
    'next-major',
    { name: 'beta', prerelease: true },
    { name: 'alpha', prerelease: true }
  ],
  plugins: [
    // Analyze commits to determine version bump
    '@semantic-release/commit-analyzer',
    
    // Generate release notes
    '@semantic-release/release-notes-generator',
    
    // Update CHANGELOG.md
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
        changelogTitle: '# Changelog\n\nAll notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.'
      }
    ],
    
    // Update package.json version
    '@semantic-release/npm',
    
    // Commit updated files
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json', 'package-lock.json'],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
      }
    ],
    
    // Create GitHub release
    [
      '@semantic-release/github',
      {
        successComment: false,
        failComment: false,
        releasedLabels: ['released'],
        addReleases: 'bottom'
      }
    ]
  ],
  preset: 'conventionalcommits',
  presetConfig: {
    types: [
      { type: 'feat', section: '✨ Features' },
      { type: 'fix', section: '🐛 Bug Fixes' },
      { type: 'perf', section: '⚡ Performance Improvements' },
      { type: 'revert', section: '⏪ Reverts' },
      { type: 'docs', section: '📚 Documentation', hidden: false },
      { type: 'style', section: '💄 Styles', hidden: true },
      { type: 'chore', section: '🔨 Miscellaneous', hidden: true },
      { type: 'refactor', section: '♻️ Code Refactoring', hidden: false },
      { type: 'test', section: '✅ Tests', hidden: true },
      { type: 'build', section: '🏗️ Build System', hidden: false },
      { type: 'ci', section: '🔧 CI/CD', hidden: true }
    ]
  },
  releaseRules: [
    // Breaking changes
    { breaking: true, release: 'major' },
    
    // Features
    { type: 'feat', release: 'minor' },
    
    // Fixes
    { type: 'fix', release: 'patch' },
    { type: 'perf', release: 'patch' },
    
    // Documentation
    { type: 'docs', release: 'patch' },
    
    // Build system changes that might affect users
    { type: 'build', scope: 'deps', release: 'patch' },
    
    // Security fixes (custom rule)
    { type: 'fix', scope: 'security', release: 'patch' },
    
    // No release for other types
    { type: 'style', release: false },
    { type: 'chore', release: false },
    { type: 'test', release: false },
    { type: 'ci', release: false },
    { type: 'refactor', release: false }
  ]
};
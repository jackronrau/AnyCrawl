# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1-alpha.1] - 2025-05-10

### Added

- Initial project setup with monorepo structure using pnpm workspaces
- Core web crawling functionality with support for:
  - Single page content extraction
  - Multi-threading and multi-process architecture
- SERP (Search Engine Results Page) crawling capabilities
  - Support for Google search engine
  - Batch processing capabilities (many pages per request)
- Development environment setup:
  - TypeScript configuration
  - Prettier code formatting
  - Turbo repo configuration for monorepo management
- Basic project documentation:
  - README with project overview and features
  - Contributing guidelines
  - MIT License
- Node.js environment requirements (>=18)
- Package management with pnpm 10.10.0

### Technical Details

- Built with Node.js and TypeScript
- Redis integration for caching and queue management
- Multi-threading and multi-process architecture for high performance
- JavaScript rendering support through Puppeteer and Playwright, HTTP through Cheerio

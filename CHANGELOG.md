# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1-alpha.2] - 2025-05-15

### Added

- Added proxy support to scraping configuration
- Added ANYCRAWL_KEEPALIVE option for engine keep-alive functionality

### Changed

- Updated Dockerfiles for Cheerio, Playwright, and Puppeteer services
- Improved Docker environment variables configuration
- Modified Docker permissions and directory ownership settings
- Updated .env.example and docker-compose.yml to use ANYCRAWL_REDIS_URL

### Fixed

- Fixed Docker permissions issues for scraping services
- Fixed database migration issues

## [0.0.1-alpha.1] - 2025-05-13

### Added

- Initial project setup with a monorepo structure using pnpm workspaces
- Docker support for easy deployment and environment consistency
    - Provided `Dockerfile` and `docker-compose.yml`
- Node.js environment requirements (>=18)
- Package management with pnpm 10.10.0
- Core web crawling functionality:
    - Single page content extraction
    - Multi-threading and multi-process architecture for high performance
- SERP (Search Engine Results Page) crawling:
    - Support for Google search engine
    - Batch processing (multiple pages per request)
- Development environment setup:
    - TypeScript configuration
    - Prettier code formatting
    - Turbo repo configuration for monorepo management
- Documentation:
    - Project overview and feature list in README
    - Contributing guidelines
    - MIT License

### Technical Details

- Built with Node.js and TypeScript
- Redis integration for caching and queue management
- JavaScript rendering support via Puppeteer and Playwright
- HTTP crawling via Cheerio

**This is the initial release.**

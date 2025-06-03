<div align="center">

<h1>
  AnyCrawl
</h1>

<img src="https://img.shields.io/badge/⚡-Fast-blue" alt="Fast"/>
<img src="https://img.shields.io/badge/🚀-Scalable-orange" alt="Scalable"/>
<img src="https://img.shields.io/badge/🕷️-Web%20Crawling-ff69b4" alt="Web Crawling"/>
<img src="https://img.shields.io/badge/🌐-Site%20Crawling-9cf" alt="Site Crawling"/>
<img src="https://img.shields.io/badge/🔍-SERP%20(Multi%20Engines)-green" alt="SERP"/>
<img src="https://img.shields.io/badge/⚙️-Multi%20Threading-yellow" alt="Multi Threading"/>
<img src="https://img.shields.io/badge/🔄-Multi%20Process-purple" alt="Multi Process"/>
<img src="https://img.shields.io/badge/📦-Batch%20Tasks-red" alt="Batch Tasks"/>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![LLM Ready](https://img.shields.io/badge/LLM-Ready-blueviolet)](https://github.com/any4ai/anycrawl)
[![Documentation](https://img.shields.io/badge/📖-Documentation-blue)](https://docs.anycrawl.dev)

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis"/>
</p>

</div>

## 📖 Overview

AnyCrawl is a high-performance web crawling and scraping application that excels in multiple domains:

- **SERP Crawling**: Support for multiple search engines with batch processing capabilities
- **Web Crawling**: Efficient single-page content extraction
- **Site Crawling**: Comprehensive full-site crawling with intelligent traversal
- **High Performance**: Multi-threading and multi-process architecture
- **Batch Processing**: Efficient handling of batch crawling tasks

Built with modern architectures and optimized for LLMs (Large Language Models), AnyCrawl provides:

## 🚀 Quick Start

📖 **For detailed documentation, visit [Docs](https://docs.anycrawl.dev)**

### Docker Deployment

```bash
docker compose up --build
```

### Environment Variables

| Variable                       | Description                                  | Default                        | Example                                                     |
| ------------------------------ | -------------------------------------------- | ------------------------------ | ----------------------------------------------------------- |
| `NODE_ENV`                     | Runtime environment                          | `production`                   | `production`, `development`                                 |
| `ANYCRAWL_API_PORT`            | API service port                             | `8080`                         | `8080`                                                      |
| `ANYCRAWL_HEADLESS`            | Use headless mode for browser engines        | `true`                         | `true`, `false`                                             |
| `ANYCRAWL_PROXY_URL`           | Proxy server URL (supports HTTP and SOCKS)   | _(none)_                       | `http://proxy:8080`, `socks5://proxy:1080`                  |
| `ANYCRAWL_IGNORE_SSL_ERROR`    | Ignore SSL certificate errors                | `true`                         | `true`, `false`                                             |
| `ANYCRAWL_KEEP_ALIVE`          | Keep connections alive between requests      | `true`                         | `true`, `false`                                             |
| `ANYCRAWL_AVAILABLE_ENGINES`   | Available scraping engines (comma-separated) | `cheerio,playwright,puppeteer` | `playwright,puppeteer`                                      |
| `ANYCRAWL_API_DB_TYPE`         | Database type                                | `sqlite`                       | `sqlite`, `postgresql`                                      |
| `ANYCRAWL_API_DB_CONNECTION`   | Database connection string/path              | `/usr/src/app/db/database.db`  | `/path/to/db.sqlite`, `postgresql://user:pass@localhost/db` |
| `ANYCRAWL_REDIS_URL`           | Redis connection URL                         | `redis://redis:6379`           | `redis://localhost:6379`                                    |
| `ANYCRAWL_API_AUTH_ENABLED`    | Enable API authentication                    | `false`                        | `true`, `false`                                             |
| `ANYCRAWL_API_CREDITS_ENABLED` | Enable credit system                         | `false`                        | `true`, `false`                                             |

## 📚 Usage Examples

### Web Scraping

#### Basic Usage

```typescript

curl --location 'http://localhost:8080/v1/scrape' \
--header 'Content-Type: application/json' \
--data '{
    "url": "https://example.com/",
    "engine": "playwright"
}'

```

#### Parameters

| Parameter | Type              | Description                                                                                                                                                                                           |
| --------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| url       | string (required) | The URL to be scraped. Must be a valid URL starting with http:// or https://                                                                                                                          |
| engine    | string            | Scraping engine to use. Options: `cheerio` (static HTML parsing, fastest), `playwright` (JavaScript rendering with modern engine), `puppeteer` (JavaScript rendering with Chrome). Default: `cheerio` |

### Search Engine Results (SERP)

#### Basic Usage

```typescript
curl --location 'http://localhost:8080/v1/search' \
--header 'Content-Type: application/json' \
--data '{
    "query": "search keyword"
}'
```

#### Parameters

| Parameter | Type              | Description                                         | Default |
| --------- | ----------------- | --------------------------------------------------- | ------- |
| `query`   | string (required) | Search query to be executed                         | -       |
| `engine`  | string            | Search engine to use. Options: `google`             | google  |
| `pages`   | integer           | Number of search result pages to retrieve           | 1       |
| `lang`    | string            | Language code for search results (e.g., 'en', 'zh') | en-US   |

#### Supported Search Engines

- Google

## ❓ FAQ

### Common Questions

1. **Q: Can I use proxies?**
   A: Yes, AnyCrawl supports both HTTP and SOCKS proxies. Configure them through the `ANYCRAWL_PROXY_URL` environment variable.

2. **Q: How to handle JavaScript-rendered content?**
   A: AnyCrawl supports Puppeteer and Playwright for JavaScript rendering needs.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Mission

Our mission is to build foundational products for the AI ecosystem, providing essential tools that empower both individuals and enterprises to develop AI applications. We are committed to accelerating the advancement of AI technology by delivering robust, scalable infrastructure that serves as the cornerstone for innovation in artificial intelligence.

---

<div align="center">
  <sub>Built with ❤️ by the Any4AI team</sub>
</div>

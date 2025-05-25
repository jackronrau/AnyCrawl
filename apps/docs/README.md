# AnyCrawl API Documentation

本项目包含 AnyCrawl API 的文档系统，基于 [Fumadocs](https://fumadocs.vercel.app/) 构建。

## OpenAPI 规范生成

### 功能概述

本文档系统包含自动生成 OpenAPI 3.1.0 规范的功能，直接从 API 项目的 Zod schema 生成标准的 API 文档。

### 使用方法

#### 生成 OpenAPI 规范

```bash
# 生成一次性的 OpenAPI 规范
pnpm run generate-openapi

# 监听模式 - 文件变更时自动重新生成
pnpm run generate-openapi:watch
```

#### 构建文档

```bash
# 构建文档（会自动生成 OpenAPI 规范）
pnpm run build

# 开发模式
pnpm run dev
```

### 生成的文件

- `openapi.json` - OpenAPI 3.1.0 规范文件，生成在 docs 根目录

### 技术架构

#### 依赖关系

- **zod-openapi**: 用于从 Zod schema 生成 OpenAPI 规范
- **api workspace**: 直接导入 API 项目的 schema 定义
- **tsx**: 运行 TypeScript 脚本

#### Schema 导入

```typescript
// 从 API workspace 包导入真实的 schema
import { scrapeSchema } from "api/src/types/ScrapeSchema.js";
import { searchSchema } from "api/src/types/SearchSchema.js";
import { baseSchema } from "api/src/types/BaseSchema.js";
```

#### 生成过程

1. 从 API 项目导入 Zod schema
2. 使用 `zod-openapi` 扩展 schema 并添加 OpenAPI 元数据
3. 创建完整的 OpenAPI 文档对象
4. 写入 `openapi.json` 文件

### API 端点

生成的 OpenAPI 规范包含以下端点：

- `GET /` - 健康检查
- `GET /health` - 健康状态
- `POST /v1/scrape` - 网页抓取
- `POST /v1/search` - 网页搜索

### Schema 组件

- **ScrapeRequest** - 抓取请求参数
- **SearchRequest** - 搜索请求参数
- **SuccessResponse** - 成功响应格式
- **ErrorResponse** - 错误响应格式

### 认证

API 使用 Bearer Token (JWT) 进行认证。

### 开发指南

#### 修改 API 规范

1. 在 API 项目中修改相应的 Zod schema
2. 在 docs 项目中运行 `pnpm run generate-openapi`
3. 检查生成的 `openapi.json` 文件

#### 添加新的端点

1. 在 `scripts/generate-openapi.ts` 中的 `paths` 对象添加新端点
2. 创建相应的 request/response schema
3. 重新生成规范

#### 自定义 OpenAPI 元数据

在 schema 上使用 `.openapi()` 方法添加描述、示例等：

```typescript
const schema = z.string().openapi({
    description: "字段描述",
    example: "示例值",
});
```

### 文件结构

```
apps/docs/
├── scripts/
│   └── generate-openapi.ts    # OpenAPI 生成脚本
├── openapi.json              # 生成的 OpenAPI 规范 (gitignored)
├── package.json              # 包含生成脚本
└── README.md                 # 本文档
```

### 注意事项

- `openapi.json` 是生成的文件，已添加到 `.gitignore`
- 构建过程会自动生成最新的 OpenAPI 规范
- Schema 与 API 项目保持同步，确保文档准确性

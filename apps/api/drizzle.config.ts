import { defineConfig } from "drizzle-kit";

if (!process.env.API_DB_CONNECTION) {
  throw new Error("API_DB_CONNECTION environment variable is required");
}

const nameMap = {
  postgresql: "PostgreSQL",
  sqlite: "SQLite",
};

const dbType = nameMap[process.env.API_DB_TYPE as keyof typeof nameMap];

if (!dbType) {
  throw new Error(
    `Unsupported database type: ${process.env.API_DB_TYPE}. Please set API_DB_TYPE to one of: postgresql, sqlite`
  );
}

export default defineConfig({
  dialect: process.env.API_DB_TYPE as unknown as "postgresql" | "mysql" | "sqlite",
  schema: `./src/db/schemas/${dbType}.ts`,
  out: `./drizzle/${dbType}`,
  dbCredentials: {
    url: process.env.API_DB_CONNECTION,
  },
});

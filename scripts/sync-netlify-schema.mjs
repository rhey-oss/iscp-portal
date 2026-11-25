import { readFile, writeFile } from "node:fs/promises";

const source = new URL("../prisma/schema.prisma", import.meta.url);
const target = new URL("../prisma/schema.netlify.prisma", import.meta.url);

let schema = await readFile(source, "utf8");
if (!schema.includes('provider = "sqlite"')) {
  throw new Error("Expected a SQLite provider in prisma/schema.prisma");
}

schema = schema
  .replace('provider = "sqlite"', 'provider = "postgresql"')
  .replace('url      = env("DATABASE_URL")', 'url      = env("NETLIFY_DB_URL")');

await writeFile(target, schema, "utf8");
console.log("Synced prisma/schema.netlify.prisma for Netlify Database");

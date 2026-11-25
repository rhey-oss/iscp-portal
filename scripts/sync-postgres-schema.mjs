import { readFile, writeFile } from "node:fs/promises";

const source = new URL("../prisma/schema.prisma", import.meta.url);
const target = new URL("../prisma/schema.postgres.prisma", import.meta.url);

const schema = await readFile(source, "utf8");
if (!schema.includes('provider = "sqlite"')) {
  throw new Error("Expected a SQLite provider in prisma/schema.prisma");
}

await writeFile(
  target,
  schema.replace('provider = "sqlite"', 'provider = "postgresql"'),
  "utf8",
);

console.log("Synced prisma/schema.postgres.prisma from prisma/schema.prisma");

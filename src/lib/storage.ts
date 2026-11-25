import "server-only";

import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { AwsClient } from "aws4fetch";

/**
 * Object storage with a local-disk fallback for development.
 * On Netlify/Vercel, R2 credentials in the environment switch uploads to
 * Cloudflare R2 automatically — serverless filesystems are not persistent.
 */

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

function r2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

let cachedClient: AwsClient | null = null;

function client(config: R2Config) {
  if (!cachedClient) {
    cachedClient = new AwsClient({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: "auto",
      service: "s3",
    });
  }
  return cachedClient;
}

function objectUrl(config: R2Config, key: string) {
  return `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}/${encodeURIComponent(key)}`;
}

function localPath(key: string) {
  return path.join(process.cwd(), "uploads", key);
}

export async function putFile(
  key: string,
  bytes: Buffer,
  contentType: string,
) {
  const config = r2Config();
  if (!config) {
    await mkdir(path.join(process.cwd(), "uploads"), { recursive: true });
    await writeFile(localPath(key), bytes);
    return;
  }

  const response = await client(config).fetch(objectUrl(config, key), {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: new Blob([new Uint8Array(bytes)]),
  });
  if (!response.ok) {
    throw new Error(`Could not store image (${response.status}).`);
  }
}

export async function getFile(key: string): Promise<Buffer | null> {
  const config = r2Config();
  if (!config) {
    try {
      return await readFile(localPath(key));
    } catch {
      return null;
    }
  }

  const response = await client(config).fetch(objectUrl(config, key));
  if (response.status === 404) return null;
  if (!response.ok) return null;
  return Buffer.from(await response.arrayBuffer());
}

export async function deleteFile(key: string) {
  const config = r2Config();
  if (!config) {
    await unlink(localPath(key)).catch(() => undefined);
    return;
  }

  await client(config)
    .fetch(objectUrl(config, key), { method: "DELETE" })
    .catch(() => undefined);
}

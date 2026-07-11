/**
 * Object storage — Cloudflare R2 via the S3-compatible SDK.
 *
 * The service returns everything the client needs to complete an upload in
 * one round-trip: {uploadUrl, method, headers, objectKey, publicUrl, expiresAt}.
 * The API NEVER streams bytes — the client PUTs directly to R2 with the
 * presigned URL, then confirms to the API which persists the row.
 */
import { randomUUID } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env, type StorageConfig } from "../config/env";

export type UploadKind = "attachment" | "avatar" | "logo";

export interface PresignArgs {
  kind: UploadKind;
  contentType: string;
  sizeBytes: number;
  filename?: string;
  /**
   * Scoping id baked into the object key path — attachments live under
   * `attachments/<workspaceId>/<uuid>-<slug>`; avatars under
   * `avatars/<userId>/<uuid>-<slug>`. Prevents cross-tenant path collisions.
   */
  scopeId: string;
}

export interface PresignResult {
  objectKey: string;
  uploadUrl: string;
  publicUrl: string;
  /** Client sets these on the PUT. Content-Type MUST match what we signed for. */
  headers: Record<string, string>;
  method: "PUT";
  expiresAt: string; // ISO
}

const PRESIGN_TTL_SECONDS = 5 * 60; // 5 min — matches R2 default

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly cfg: StorageConfig;
  private readonly s3: S3Client;

  constructor() {
    this.cfg = env().storage;
    this.s3 = new S3Client({
      region: this.cfg.region,
      endpoint: this.cfg.endpoint,
      credentials: {
        accessKeyId: this.cfg.accessKey,
        secretAccessKey: this.cfg.secretKey,
      },
      // R2 needs path-style access — virtual-hosted buckets aren't supported.
      forcePathStyle: true,
    });
    this.logger.log(`storage: R2 bucket=${this.cfg.bucket}`);
  }

  get config(): StorageConfig {
    return this.cfg;
  }

  /**
   * Mint a presigned PUT URL. `sizeBytes` is signed into the request so the
   * client can't swap in a larger payload after receiving the URL.
   */
  async presign(args: PresignArgs): Promise<PresignResult> {
    if (!Number.isFinite(args.sizeBytes) || args.sizeBytes <= 0) {
      throw new Error("sizeBytes must be a positive number");
    }
    if (args.sizeBytes > this.cfg.maxUploadBytes) {
      throw new Error(
        `payload ${args.sizeBytes}B exceeds max ${this.cfg.maxUploadBytes}B`,
      );
    }

    const objectKey = buildObjectKey(args);
    const expiresAt = new Date(Date.now() + PRESIGN_TTL_SECONDS * 1000);

    const cmd = new PutObjectCommand({
      Bucket: this.cfg.bucket,
      Key: objectKey,
      ContentType: args.contentType,
      ContentLength: args.sizeBytes,
    });
    const uploadUrl = await getSignedUrl(this.s3, cmd, {
      expiresIn: PRESIGN_TTL_SECONDS,
    });
    return {
      objectKey,
      uploadUrl,
      publicUrl: this.publicUrlFor(objectKey),
      headers: { "Content-Type": args.contentType },
      method: "PUT",
      expiresAt: expiresAt.toISOString(),
    };
  }

  publicUrlFor(objectKey: string): string {
    return `${this.cfg.publicUrlBase}/${objectKey}`;
  }

  /**
   * Server-side upload — the browser extension can't PUT to R2 directly
   * because R2 CORS doesn't accept `chrome-extension://*` wildcards. The
   * extension POSTs multipart to `/attachments/upload`, this method streams
   * the buffer to R2 via S3 PutObject. Bytes DO pass through Nest here (one
   * extra hop vs the direct PUT the web app uses) — screenshots are small
   * enough that it's fine.
   */
  async uploadBuffer(args: {
    kind: UploadKind;
    scopeId: string;
    buffer: Buffer;
    contentType: string;
    filename?: string;
  }): Promise<{ objectKey: string; publicUrl: string; sizeBytes: number }> {
    if (args.buffer.length === 0) {
      throw new Error("empty upload");
    }
    if (args.buffer.length > this.cfg.maxUploadBytes) {
      throw new Error(
        `payload ${args.buffer.length}B exceeds max ${this.cfg.maxUploadBytes}B`,
      );
    }

    const objectKey = buildObjectKey({
      kind: args.kind,
      scopeId: args.scopeId,
      contentType: args.contentType,
      sizeBytes: args.buffer.length,
      filename: args.filename,
    });

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.cfg.bucket,
        Key: objectKey,
        Body: args.buffer,
        ContentType: args.contentType,
        ContentLength: args.buffer.length,
      }),
    );

    return {
      objectKey,
      publicUrl: this.publicUrlFor(objectKey),
      sizeBytes: args.buffer.length,
    };
  }

  /**
   * Best-effort delete. Currently unused (no cascade path deletes attachments)
   * but exists so future cleanup jobs share one code path.
   */
  async remove(objectKey: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.cfg.bucket, Key: objectKey }),
    );
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildObjectKey(args: PresignArgs): string {
  const uuid = randomUUID();
  const slug = safeFilename(args.filename ?? "");
  const suffix = slug ? `-${slug}` : "";
  const base = `${uuid}${suffix}`;
  switch (args.kind) {
    case "avatar":
      return `avatars/${args.scopeId}/${base}`;
    case "logo":
      return `logos/${args.scopeId}/${base}`;
    case "attachment":
    default:
      return `attachments/${args.scopeId}/${base}`;
  }
}

function safeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

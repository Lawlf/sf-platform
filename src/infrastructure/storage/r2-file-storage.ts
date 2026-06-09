import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { FileStoragePort } from "@/domain/ports/file-storage.port";
import { requireR2Config } from "@/infrastructure/config/env";

let client: S3Client | null = null;
let bucket: string | null = null;

function getClient(): { s3: S3Client; bucket: string } {
  if (!client || !bucket) {
    const cfg = requireR2Config();
    client = new S3Client({
      region: "auto",
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: cfg.accessKey, secretAccessKey: cfg.secret },
      // R2 não suporta o checksum que o SDK v3 injeta por padrão no PUT; com URL
      // assinada consumida pelo fetch do browser isso vira 403 SignatureDoesNotMatch.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
    bucket = cfg.bucket;
  }
  return { s3: client, bucket };
}

export class R2FileStorage implements FileStoragePort {
  async presignUpload(
    key: string,
    contentType: string,
    sizeBytes: number,
    expiresInSeconds = 300,
  ): Promise<string> {
    const { s3, bucket } = getClient();
    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: sizeBytes,
    });
    return getSignedUrl(s3, cmd, { expiresIn: expiresInSeconds });
  }

  async presignDownload(
    key: string,
    fileName: string,
    expiresInSeconds = 300,
  ): Promise<string> {
    const { s3, bucket } = getClient();
    const cmd = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${fileName.replace(/"/g, "")}"`,
    });
    return getSignedUrl(s3, cmd, { expiresIn: expiresInSeconds });
  }

  async delete(key: string): Promise<void> {
    const { s3, bucket } = getClient();
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }
}

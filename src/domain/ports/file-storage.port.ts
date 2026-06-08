export interface FileStoragePort {
  presignUpload(
    key: string,
    contentType: string,
    sizeBytes: number,
    expiresInSeconds?: number,
  ): Promise<string>;
  presignDownload(
    key: string,
    fileName: string,
    expiresInSeconds?: number,
  ): Promise<string>;
  delete(key: string): Promise<void>;
}

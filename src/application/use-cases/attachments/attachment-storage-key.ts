function extFromName(fileName: string): string {
  const m = /\.([a-zA-Z0-9]+)$/.exec(fileName);
  return m ? m[1]!.toLowerCase() : "bin";
}

export function buildStorageKey(userId: string, attachmentId: string, fileName: string): string {
  return `${userId}/${attachmentId}.${extFromName(fileName)}`;
}

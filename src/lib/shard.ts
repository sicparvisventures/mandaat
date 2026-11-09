/** Org dossiers are bundled into shards so a nightly run uploads 256 files instead of ~15k. */
export const ORG_SHARDS = 256;

export function orgShard(id: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % ORG_SHARDS).toString(16).padStart(2, "0");
}

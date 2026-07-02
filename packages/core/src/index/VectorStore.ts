export interface VectorChunk {
  id: string;
  memoryId: string;
  parentId: string | null;
  level: 'section' | 'bullet';
  text: string;
  textHash: string;
  embedding: number[];
  metadata: string; // JSON string
  created_at?: string;
  updated_at?: string;
}

export interface VectorStore {
  initialize(): void;
  upsertChunks(chunks: VectorChunk[]): Promise<void>;
  deleteChunks(ids: string[]): Promise<void>;
  getChunksByHash(ids: string[]): Promise<Map<string, string>>; // id -> textHash
  getAllChunksForMemory(memoryId: string): Promise<{ id: string; textHash: string }[]>;
  search(queryEmbedding: number[]): Promise<VectorChunk[]>;
  getChunkById(id: string): Promise<VectorChunk | null>;
  clearAll(): Promise<void>;
  close(): void;
}

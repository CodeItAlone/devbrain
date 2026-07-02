import fs from 'node:fs';
import crypto from 'node:crypto';
import { VectorStore } from './VectorStore.js';
import { EmbeddingProvider } from '../embeddings/EmbeddingProvider.js';

interface ParsedChunk {
  id: string;
  memoryId: string;
  parentId: string | null;
  level: 'section' | 'bullet';
  text: string;
  textHash: string;
  metadata: any;
}

export class VectorIndexer {
  constructor(
    private readonly vectorStore: VectorStore,
    private readonly embeddingProvider: EmbeddingProvider
  ) {}

  private hashText(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  parseMarkdown(filePath: string, memoryId: string): ParsedChunk[] {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const chunks: ParsedChunk[] = [];
    let currentSectionHeader = '';
    let currentSectionLines: string[] = [];

    const flushSection = (nextHeader: string) => {
      // Clean header name (e.g., "## Authentication" -> "Authentication")
      const headerTitle = currentSectionHeader.replace(/^#+\s+/, '').trim();
      
      const NOISY_SECTIONS = [
        'Folder Structure',
        'Recent Changes',
        'Repository Structure',
        'Recent Commit Log',
        'Git Metrics'
      ];
      
      if (NOISY_SECTIONS.includes(headerTitle)) {
        currentSectionHeader = nextHeader;
        currentSectionLines = [];
        return;
      }
      
      if (currentSectionLines.length > 0 || headerTitle) {
        const sectionText = [currentSectionHeader, ...currentSectionLines]
          .filter(Boolean)
          .join('\n')
          .trim();

        const sectionId = this.hashText(`${memoryId}:section:${headerTitle || 'General'}`);
        
        if (sectionText) {
          chunks.push({
            id: sectionId,
            memoryId,
            parentId: null,
            level: 'section',
            text: sectionText,
            textHash: this.hashText(sectionText),
            metadata: {
              title: headerTitle || 'General',
              filePath: memoryId
            }
          });
        }

        // Parse bullets and paragraphs inside the section
        let bulletIdx = 0;
        let currentParagraph = '';

        const flushParagraph = () => {
          if (currentParagraph.trim()) {
            const bulletText = currentParagraph.trim();
            const bulletId = this.hashText(`${memoryId}:bullet:${sectionId}:${bulletIdx}:${bulletText}`);
            chunks.push({
              id: bulletId,
              memoryId,
              parentId: sectionId,
              level: 'bullet',
              text: bulletText,
              textHash: this.hashText(bulletText),
              metadata: {
                sectionTitle: headerTitle || 'General',
                filePath: memoryId,
                index: bulletIdx
              }
            });
            bulletIdx++;
            currentParagraph = '';
          }
        };

        for (const line of currentSectionLines) {
          const trimmed = line.trim();
          if (!trimmed) {
            flushParagraph();
            continue;
          }

          // Check if list item
          const listMatch = trimmed.match(/^([*\-+]|\d+\.)\s+(.*)/);
          if (listMatch) {
            flushParagraph();
            const bulletText = listMatch[2].trim();
            const bulletId = this.hashText(`${memoryId}:bullet:${sectionId}:${bulletIdx}:${bulletText}`);
            chunks.push({
              id: bulletId,
              memoryId,
              parentId: sectionId,
              level: 'bullet',
              text: trimmed,
              textHash: this.hashText(trimmed),
              metadata: {
                sectionTitle: headerTitle || 'General',
                filePath: memoryId,
                index: bulletIdx
              }
            });
            bulletIdx++;
          } else {
            currentParagraph += (currentParagraph ? ' ' : '') + trimmed;
          }
        }
        flushParagraph();
      }

      currentSectionHeader = nextHeader;
      currentSectionLines = [];
    };

    for (const line of lines) {
      if (line.startsWith('#')) {
        flushSection(line.trim());
      } else {
        currentSectionLines.push(line);
      }
    }
    flushSection('');

    return chunks;
  }

  async indexMemory(filePath: string, memoryId: string): Promise<void> {
    this.vectorStore.initialize();

    const parsedChunks = this.parseMarkdown(filePath, memoryId);
    if (parsedChunks.length === 0) return;

    // Load existing database state for this file
    const existing = await this.vectorStore.getAllChunksForMemory(memoryId);
    const existingMap = new Map(existing.map(e => [e.id, e.textHash]));

    const chunksToUpsert: any[] = [];
    const activeIds = new Set<string>();

    for (const chunk of parsedChunks) {
      activeIds.add(chunk.id);
      const existingHash = existingMap.get(chunk.id);

      if (existingHash === chunk.textHash) {
        // Skip unchanged
        continue;
      }

      chunksToUpsert.push(chunk);
    }

    // Embed new/changed chunks
    if (chunksToUpsert.length > 0) {
      const texts = chunksToUpsert.map(c => c.text);
      const embeddings = await this.embeddingProvider.generateEmbeddings(texts);

      for (let i = 0; i < chunksToUpsert.length; i++) {
        chunksToUpsert[i].embedding = embeddings[i];
        chunksToUpsert[i].metadata = JSON.stringify(chunksToUpsert[i].metadata);
      }

      await this.vectorStore.upsertChunks(chunksToUpsert);
    }

    // Delete stale chunks
    const idsToDelete: string[] = [];
    for (const { id } of existing) {
      if (!activeIds.has(id)) {
        idsToDelete.push(id);
      }
    }

    if (idsToDelete.length > 0) {
      await this.vectorStore.deleteChunks(idsToDelete);
    }
  }
}

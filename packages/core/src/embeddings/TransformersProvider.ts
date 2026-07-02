import os from 'node:os';
import path from 'node:path';
import { EmbeddingProvider } from './EmbeddingProvider.js';

export class TransformersProvider implements EmbeddingProvider {
  private pipelineInstance: any = null;
  private modelName: string;

  constructor(modelName: string = 'onnx-community/all-MiniLM-L6-v2-ONNX') {
    // We default to 'onnx-community/all-MiniLM-L6-v2-ONNX' or 'Xenova/all-MiniLM-L6-v2'
    this.modelName = modelName;
  }

  private async getPipeline() {
    if (this.pipelineInstance) {
      return this.pipelineInstance;
    }

    try {
      // Lazy load @huggingface/transformers
      const { pipeline, env } = await import('@huggingface/transformers');

      // Configure transformers cache globally
      const globalDevBrainHome = path.join(os.homedir(), '.devbrain');
      const cacheDir = path.join(globalDevBrainHome, 'models');
      
      env.cacheDir = cacheDir;

      // Prevent remote model downloads from hanging in test environments
      if (process.env.VITEST || process.env.NODE_ENV === 'test') {
        throw new Error('Network connection disabled in test environment.');
      }
      
      // Feature extraction pipeline
      this.pipelineInstance = await pipeline('feature-extraction', this.modelName);
      return this.pipelineInstance;
    } catch (error: any) {
      const msg = error.message || '';
      let errorType = 'Embedding Model Load Failure';
      let diagnostics = 'Ensure you have an active internet connection for the first run, or that the model is present in the cache.';

      if (msg.includes('Unauthorized') || msg.includes('401') || msg.includes('forbidden')) {
        errorType = 'Authentication Error';
        diagnostics = 'The model repository appears to be private, requires authentication tokens, or is unauthorized.';
      } else if (msg.includes('404') || msg.includes('not found') || msg.includes('Cannot find')) {
        errorType = 'Invalid Model Identifier';
        diagnostics = `The model repository '${this.modelName}' does not exist on Hugging Face. Check for spelling errors or missing ONNX suffixes.`;
      } else if (msg.includes('fetch') || msg.includes('network') || msg.includes('connect') || msg.includes('offline') || msg.includes('getaddrinfo') || msg.includes('timeout')) {
        errorType = 'Network Connection Failure';
        diagnostics = 'Failed to connect to Hugging Face Hub to download model files. Subsequent runs will function offline once downloaded.';
      } else if (msg.includes('cache') || msg.includes('corrupt') || msg.includes('integrity') || msg.includes('checksum')) {
        errorType = 'Cache Corruption Error';
        diagnostics = 'The cached model files are corrupt. Try clearing the global model cache directory at ~/.devbrain/models/.';
      }

      throw new Error(`[${errorType}] ${error.message}\nFix: ${diagnostics}`);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const extractor = await this.getPipeline();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const extractor = await this.getPipeline();
    const results: number[][] = [];
    
    // Batch process sequentially to prevent memory overhead or run in parallel
    for (const text of texts) {
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      results.push(Array.from(output.data));
    }
    
    return results;
  }
}

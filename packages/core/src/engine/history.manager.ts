import { join } from 'node:path';
import { DEVBRAIN_DIR_NAME, HISTORY_FILE_NAME, HistorySchema, CommitHistoryEntry } from '@devbrain/shared';
import { FilesystemService } from '../filesystem/filesystem.service.js';

export class HistoryManager {
  private readonly historyPath: string;

  constructor(
    private readonly cwd: string,
    private readonly fsService: FilesystemService = new FilesystemService(),
  ) {
    this.historyPath = join(cwd, DEVBRAIN_DIR_NAME, HISTORY_FILE_NAME);
  }

  /**
   * Loads the current history or returns an empty default schema.
   */
  async loadHistory(): Promise<HistorySchema> {
    try {
      if (await this.fsService.exists(this.historyPath)) {
        return await this.fsService.readJson<HistorySchema>(this.historyPath);
      }
    } catch {
      // Fall through to default if reading/parsing fails
    }

    return {
      lastProcessedCommit: '',
      commits: [],
    };
  }

  /**
   * Persists the history schema.
   */
  async saveHistory(history: HistorySchema): Promise<void> {
    await this.fsService.writeJson(this.historyPath, history);
  }

  /**
   * Adds an entry to commit history and updates lastProcessedCommit.
   */
  async addCommitEntry(entry: CommitHistoryEntry): Promise<void> {
    const history = await this.loadHistory();
    
    // Check if commit already processed to avoid duplicates
    const index = history.commits.findIndex((c) => c.commitHash === entry.commitHash);
    if (index !== -1) {
      history.commits[index] = entry;
    } else {
      history.commits.unshift(entry); // Prepend so new commits are first
    }

    history.lastProcessedCommit = entry.commitHash;

    // Limit log entries to keep history.json reasonably sized (e.g. max 500 entries)
    if (history.commits.length > 500) {
      history.commits = history.commits.slice(0, 500);
    }

    await this.saveHistory(history);
  }

  /**
   * Gets the last processed commit hash.
   */
  async getLastProcessedCommit(): Promise<string | null> {
    const history = await this.loadHistory();
    return history.lastProcessedCommit || null;
  }
}

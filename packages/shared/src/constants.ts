export const DEVBRAIN_VERSION = '0.2.0';

export const DEFAULT_IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/coverage/**',
  '**/target/**',
  '**/build/**',
  '**/.cache/**',
];

export const CONFIG_FILE_NAME = 'config.json';
export const DEVBRAIN_DIR_NAME = '.devbrain';
export const VERSION_FILE_NAME = 'version.json';
export const HISTORY_FILE_NAME = 'history.json';
export const MEMORY_FILE_NAME = 'memory.json';
export const PROJECT_MEMORY_FILE_NAME = 'PROJECT_MEMORY.md';
export const CONTEXT_FILE_NAME = 'context.md';
export const CUSTOM_NOTES_FILE_NAME = 'custom_notes.md';
export const LOCK_FILE_NAME = '.lock';
export const LOGS_DIR_NAME = 'logs';

// Deprecated in v0.2, kept for backward compatibility if referenced
export const MEMORY_DIR_NAME = 'memory';
export const DEFAULT_MEMORY_DIR = `${DEVBRAIN_DIR_NAME}/${MEMORY_DIR_NAME}`;


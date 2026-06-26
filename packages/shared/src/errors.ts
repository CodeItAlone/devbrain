/**
 * Base error class for all DevBrain errors.
 * Provides structured details: what happened, why, and how to fix it.
 */
export class DevBrainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly explanation: string,
    public readonly remediation: string,
  ) {
    super(message);
    this.name = 'DevBrainError';
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Formats the error into a detailed, user-friendly CLI report.
   */
  public formatReport(): string {
    return [
      `Error [${this.code}]: ${this.message}`,
      `Why: ${this.explanation}`,
      `Fix: ${this.remediation}`,
    ].join('\n');
  }
}

/**
 * Thrown when config validation fails.
 */
export class ValidationError extends DevBrainError {
  constructor(message: string, explanation: string, remediation: string) {
    super('VALIDATION_ERROR', message, explanation, remediation);
    this.name = 'ValidationError';
  }
}

/**
 * Thrown when a filesystem operation fails.
 */
export class FilesystemError extends DevBrainError {
  constructor(message: string, explanation: string, remediation: string) {
    super('FILESYSTEM_ERROR', message, explanation, remediation);
    this.name = 'FilesystemError';
  }
}

/**
 * Thrown when an analyzer plugin execution fails.
 */
export class AnalyzerError extends DevBrainError {
  constructor(message: string, explanation: string, remediation: string) {
    super('ANALYZER_ERROR', message, explanation, remediation);
    this.name = 'AnalyzerError';
  }
}

/**
 * Thrown when command pipeline lifecycle encounters an execution error.
 */
export class CommandError extends DevBrainError {
  constructor(message: string, explanation: string, remediation: string) {
    super('COMMAND_ERROR', message, explanation, remediation);
    this.name = 'CommandError';
  }
}

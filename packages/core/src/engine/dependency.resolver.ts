import { basename, extname } from 'node:path';

export class DependencyResolver {
  private readonly coreConfigs = new Set([
    'package.json',
    'tsconfig.json',
    'docker-compose.yml',
    '.env.example',
    'schema.prisma',
    'pom.xml',
    'build.gradle',
    '.gitignore',
    '.eslintrc.json',
    '.prettierrc',
  ]);

  /**
   * Resolves the full list of files to analyze based on blast-radius rules.
   */
  resolveBlastRadius(
    changedFiles: string[],
    projectFiles: string[],
  ): { resolvedFiles: string[]; isFullScan: boolean } {
    // 1. Check for core configuration changes
    for (const file of changedFiles) {
      const name = basename(file);
      if (this.coreConfigs.has(name) || name.startsWith('.env')) {
        return { resolvedFiles: projectFiles, isFullScan: true };
      }
    }

    const resolved = new Set<string>();

    for (const file of changedFiles) {
      // Add the file itself
      resolved.add(file);

      const base = basename(file);
      const ext = extname(file);
      const nameWithoutExt = base.slice(0, -ext.length);

      // Check if it's a source code file (JS, TS, Python, Go, Java, C#, PHP, Ruby, etc.)
      const isSourceFile = /\.(ts|js|tsx|jsx|py|go|java|cs|php|rb)$/.test(ext);
      if (!isSourceFile) {
        continue;
      }

      // Check category: Controller
      if (/controller/i.test(nameWithoutExt)) {
        const prefix = nameWithoutExt.replace(/controller/i, '').toLowerCase();
        if (prefix) {
          this.expandControllerBlastRadius(prefix, projectFiles, resolved);
        }
      }
      // Check category: Entity / Model
      else if (
        /entity/i.test(nameWithoutExt) ||
        /model/i.test(nameWithoutExt) ||
        file.includes('/entities/') ||
        file.includes('/models/') ||
        // A simple filename in a src/models or entities dir, or standard short names
        /^[A-Z][a-zA-Z0-9]*$/.test(nameWithoutExt) // e.g. User.ts, Product.ts
      ) {
        // Extract prefix (e.g. UserEntity -> User, user.model -> user)
        let prefix = nameWithoutExt
          .replace(/entity/i, '')
          .replace(/model/i, '')
          .toLowerCase();
        
        // If it's a single word capitalized like User.ts, prefix is user
        if (!prefix) {
          prefix = nameWithoutExt.toLowerCase();
        }
        
        this.expandEntityBlastRadius(prefix, projectFiles, resolved);
      }
    }

    // Filter resolved files to ensure they exist in the current project files list
    const projectFilesSet = new Set(projectFiles);
    const finalFiles = Array.from(resolved).filter((f) => projectFilesSet.has(f));

    return { resolvedFiles: finalFiles, isFullScan: false };
  }

  private expandControllerBlastRadius(
    prefix: string,
    projectFiles: string[],
    resolved: Set<string>,
  ): void {
    // Find related services and routes
    for (const file of projectFiles) {
      const base = basename(file).toLowerCase();
      if (base.includes(prefix)) {
        if (base.includes('service') || base.includes('route') || base.includes('controller')) {
          resolved.add(file);
        }
      }
    }
  }

  private expandEntityBlastRadius(
    prefix: string,
    projectFiles: string[],
    resolved: Set<string>,
  ): void {
    // Find related repositories, DTOs, services, schemas
    for (const file of projectFiles) {
      const base = basename(file).toLowerCase();
      if (base.includes(prefix)) {
        if (
          base.includes('repository') ||
          base.includes('dto') ||
          base.includes('service') ||
          base.includes('entity') ||
          base.includes('model') ||
          base.includes('schema')
        ) {
          resolved.add(file);
        }
      } else if (base.includes('schema.prisma') || base.includes('schema.sql')) {
        resolved.add(file);
      }
    }
  }
}

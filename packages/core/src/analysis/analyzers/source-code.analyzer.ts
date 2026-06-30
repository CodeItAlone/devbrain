import { join, extname, basename } from 'node:path';
import { ProjectContext, AnalysisResult } from '@devbrain/shared';
import { Analyzer } from '../analyzer.interface.js';
import { FilesystemService } from '../../filesystem/filesystem.service.js';

export interface SourceModule {
  filePath: string;
  name: string;
  type: 'service' | 'controller' | 'route' | 'model' | 'other';
  classes: string[];
  functions: string[];
  imports: string[];
}

export interface SourceApi {
  method: string;
  path: string;
  file: string;
}

export class SourceCodeAnalyzer implements Analyzer {
  readonly id = 'source-code';
  readonly name = 'Source Code Structure Analyzer';

  constructor(private readonly fsService = new FilesystemService()) {}

  async supports(project: ProjectContext): Promise<boolean> {
    // Supports if there are any TS/JS source files in the project list
    return project.files.some((f) => /\.(ts|js|tsx|jsx)$/.test(f) && !f.includes('node_modules') && !f.includes('dist'));
  }

  async analyze(project: ProjectContext): Promise<AnalysisResult> {
    const modules: SourceModule[] = [];
    const apis: SourceApi[] = [];
    const databaseEntities = new Set<string>();
    const authMethods = new Set<string>();
    const externalServices = new Set<string>();

    // Process only TS/JS source files up to a reasonable limit (e.g. 500 files for speed)
    const sourceFiles = project.files
      .filter((f) => /\.(ts|js|tsx|jsx)$/.test(f) && !f.includes('node_modules') && !f.includes('dist') && !f.endsWith('.test.ts') && !f.endsWith('.spec.ts'))
      .slice(0, 500);

    for (const file of sourceFiles) {
      try {
        const fullPath = join(project.cwd, file);
        const content = await this.fsService.read(fullPath);

        const baseName = basename(file);
        const ext = extname(file);
        const nameWithoutExt = baseName.slice(0, -ext.length);

        // 1. Determine Module Type
        let type: 'service' | 'controller' | 'route' | 'model' | 'other' = 'other';
        if (/controller/i.test(nameWithoutExt)) type = 'controller';
        else if (/service/i.test(nameWithoutExt)) type = 'service';
        else if (/route/i.test(nameWithoutExt)) type = 'route';
        else if (/model/i.test(nameWithoutExt) || /entity/i.test(nameWithoutExt)) type = 'model';

        // 2. Classes
        const classes: string[] = [];
        const classRegex = /class\s+([A-Za-z0-9_]+)/g;
        let match;
        while ((match = classRegex.exec(content)) !== null) {
          classes.push(match[1]);
          if (type === 'model') {
            databaseEntities.add(match[1]);
          }
        }

        // 3. Functions
        const functions: string[] = [];
        const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/g;
        while ((match = funcRegex.exec(content)) !== null) {
          functions.push(match[1]);
        }

        const arrowFuncRegex = /(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\((?:[^)]*)\)\s*=>/g;
        while ((match = arrowFuncRegex.exec(content)) !== null) {
          functions.push(match[1]);
        }

        // 4. Imports / External Services
        const imports: string[] = [];
        const importRegex = /(?:import|require)\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
        while ((match = importRegex.exec(content)) !== null) {
          const importSource = match[1];
          imports.push(importSource);

          // Detect external service integrations
          if (['axios', 'stripe', 'twilio', 'aws-sdk', 'redis', '@google-cloud/'].some(s => importSource.includes(s))) {
            externalServices.add(importSource);
          }
        }

        // 5. API Endpoints
        // Match express-like router: router.get('/path', ...) or app.post('/path', ...)
        const expressApiRegex = /(?:app|router|route|express)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/gi;
        while ((match = expressApiRegex.exec(content)) !== null) {
          apis.push({
            method: match[1].toUpperCase(),
            path: match[2],
            file,
          });
        }

        // Match NestJS decorators: @Get('/path') or @Post()
        const nestApiDecoratorRegex = /@(Get|Post|Put|Delete|Patch)\s*\(\s*(?:['"]([^'"]+)['"])?/g;
        while ((match = nestApiDecoratorRegex.exec(content)) !== null) {
          apis.push({
            method: match[1].toUpperCase(),
            path: match[2] || '/',
            file,
          });
        }

        // 6. Authentication detection
        if (/jwt|passport|bcrypt|oauth|session|authHeader|bearer/i.test(content)) {
          if (content.includes('jwt') || content.includes('JWT')) authMethods.add('JWT');
          if (content.includes('oauth') || content.includes('OAuth')) authMethods.add('OAuth');
          if (content.includes('session')) authMethods.add('Session-based');
        }

        modules.push({
          filePath: file,
          name: nameWithoutExt,
          type,
          classes,
          functions: functions.slice(0, 15), // cap function list
          imports,
        });
      } catch {
        // Skip unparseable files
      }
    }

    return {
      analyzerId: this.id,
      analyzerName: this.name,
      data: {
        modules,
        apis: apis.slice(0, 100), // cap API endpoints
        databaseEntities: Array.from(databaseEntities),
        authMethods: Array.from(authMethods),
        externalServices: Array.from(externalServices),
      },
    };
  }
}

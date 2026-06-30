import { describe, it, expect } from 'vitest';
import { DependencyResolver } from './dependency.resolver.js';

describe('DependencyResolver Unit Tests', () => {
  const resolver = new DependencyResolver();

  const mockProjectFiles = [
    'package.json',
    'tsconfig.json',
    'src/controllers/UserController.ts',
    'src/services/UserService.ts',
    'src/routes/user.routes.ts',
    'src/models/User.ts',
    'src/repositories/user.repository.ts',
    'src/dtos/user.dto.ts',
    'src/utils/math.ts',
  ];

  it('should trigger a full scan if a core config file changes', () => {
    const changes = ['package.json'];
    const result = resolver.resolveBlastRadius(changes, mockProjectFiles);
    
    expect(result.isFullScan).toBe(true);
    expect(result.resolvedFiles).toEqual(mockProjectFiles);
  });

  it('should expand blast radius for a Controller change to include its service and routes', () => {
    const changes = ['src/controllers/UserController.ts'];
    const result = resolver.resolveBlastRadius(changes, mockProjectFiles);

    expect(result.isFullScan).toBe(false);
    expect(result.resolvedFiles.sort()).toEqual([
      'src/controllers/UserController.ts',
      'src/services/UserService.ts',
      'src/routes/user.routes.ts',
    ].sort());
  });

  it('should expand blast radius for an Entity change to include its repositories, DTOs, and services', () => {
    const changes = ['src/models/User.ts'];
    const result = resolver.resolveBlastRadius(changes, mockProjectFiles);

    expect(result.isFullScan).toBe(false);
    expect(result.resolvedFiles.sort()).toEqual([
      'src/models/User.ts',
      'src/repositories/user.repository.ts',
      'src/dtos/user.dto.ts',
      'src/services/UserService.ts',
    ].sort());
  });

  it('should keep a small change isolated without expanding blast radius', () => {
    const changes = ['src/utils/math.ts'];
    const result = resolver.resolveBlastRadius(changes, mockProjectFiles);

    expect(result.isFullScan).toBe(false);
    expect(result.resolvedFiles).toEqual(['src/utils/math.ts']);
  });
});

import { RetrievedMemory } from './SemanticRetriever.js';

export class ContextBuilder {
  buildContext(query: string, results: RetrievedMemory[]): string {
    if (results.length === 0) {
      return [
        '# DEVBRAIN AI CONTEXT (SEMANTIC SEARCH)',
        '',
        `Query: "${query}"`,
        '',
        'No matching local memories found.',
      ].join('\n');
    }

    const lines: string[] = [];
    lines.push('<!-- START OF DEVBRAIN AI ASSISTANT CONTEXT SCHEMA -->');
    lines.push('# DEVBRAIN AI CONTEXT (SEMANTIC SEARCH)');
    lines.push('');
    lines.push(`Query: "${query}"`);
    lines.push('');
    lines.push('The following local memories were retrieved as highly relevant to your query:');
    lines.push('');

    const grouped = new Map<string, {
      sectionTitle: string;
      memoryId: string;
      sectionText: string;
      maxScore: number;
      bullets: string[];
    }>();

    const sectionsDirectlyMatched: RetrievedMemory[] = [];

    for (const res of results) {
      const chunk = res.chunk;
      if (chunk.level === 'section') {
        sectionsDirectlyMatched.push(res);
      } else {
        const parentId = chunk.parentId || 'orphan';
        let parentTitle = 'General';
        let parentText = '';
        const memoryId = chunk.memoryId;

        if (res.parentSection) {
          parentText = res.parentSection.text;
          try {
            const meta = JSON.parse(res.parentSection.metadata);
            parentTitle = meta.title || 'General';
          } catch {}
        } else {
          try {
            const meta = JSON.parse(chunk.metadata);
            parentTitle = meta.sectionTitle || 'General';
          } catch {}
        }

        const existing = grouped.get(parentId);
        if (existing) {
          existing.maxScore = Math.max(existing.maxScore, res.score);
          if (!existing.bullets.includes(chunk.text)) {
            existing.bullets.push(chunk.text);
          }
        } else {
          grouped.set(parentId, {
            sectionTitle: parentTitle,
            memoryId,
            sectionText: parentText,
            maxScore: res.score,
            bullets: [chunk.text]
          });
        }
      }
    }

    if (sectionsDirectlyMatched.length > 0) {
      lines.push('## SECTION LEVEL MATCHES');
      lines.push('');
      for (const sec of sectionsDirectlyMatched) {
        let title = 'General';
        try {
          const meta = JSON.parse(sec.chunk.metadata);
          title = meta.title || 'General';
        } catch {}
        
        lines.push(`### Section: ${title} (Score: ${sec.score})`);
        lines.push(`Source: \`${sec.chunk.memoryId}\``);
        lines.push('');
        lines.push(sec.chunk.text);
        lines.push('');
      }
    }

    if (grouped.size > 0) {
      lines.push('## DETAILED CONTEXT MATCHES');
      lines.push('');
      for (const [_, val] of grouped.entries()) {
        lines.push(`### Section: ${val.sectionTitle} (Max Bullet Score: ${val.maxScore})`);
        lines.push(`Source: \`${val.memoryId}\``);
        lines.push('');
        
        if (val.sectionText) {
          lines.push('#### Expanded Context:');
          lines.push('```markdown');
          lines.push(val.sectionText);
          lines.push('```');
          lines.push('');
        }

        lines.push('#### Exact Semantic Matches:');
        for (const bullet of val.bullets) {
          lines.push(`- ${bullet}`);
        }
        lines.push('');
      }
    }

    lines.push('<!-- END OF DEVBRAIN AI ASSISTANT CONTEXT SCHEMA -->');
    return lines.join('\n');
  }
}

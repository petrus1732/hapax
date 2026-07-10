import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('GitHub Pages static workflow patch', () => {
  it('removes auth-only pages and forms when it removes server actions for static export', () => {
    const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8');

    expect(workflow).toContain('rm -f app/lib/actions.ts');
    expect(workflow).toContain('rm -rf app/login');
    expect(workflow).toContain('rm -rf app/register');
    expect(workflow).toContain('rm -f app/ui/login-form.tsx');
    expect(workflow).toContain('rm -f app/ui/register-form.tsx');
  });
});

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('RUON Badge Integration', () => {
  const rootDir = path.resolve(__dirname, '../..')
  const indexHtmlPath = path.join(rootDir, 'index.html')
  const appLayoutPath = path.join(rootDir, 'src/components/layout/AppLayout.tsx')

  it('includes https://ruon.dev/badge.js in index.html', () => {
    expect(fs.existsSync(indexHtmlPath)).toBe(true)
    const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8')
    expect(indexHtml).toContain('https://ruon.dev/badge.js')
    expect(indexHtml).toMatch(/<script\s+src="https:\/\/ruon\.dev\/badge\.js"\s+async><\/script>/)
  })

  it('contains ruon-badge with ref="ckf-orcamentos", theme="dark", and size="sm" in AppLayout.tsx', () => {
    expect(fs.existsSync(appLayoutPath)).toBe(true)
    const appLayout = fs.readFileSync(appLayoutPath, 'utf-8')
    expect(appLayout).toContain('<ruon-badge')
    expect(appLayout).toContain('ref="ckf-orcamentos"')
    expect(appLayout).toContain('theme="dark"')
    expect(appLayout).toContain('size="sm"')
    expect(appLayout).toMatch(
      /<ruon-badge[\s\S]*?ref="ckf-orcamentos"[\s\S]*?theme="dark"[\s\S]*?size="sm"[\s\S]*?>[\s\S]*?<\/ruon-badge>/,
    )
  })
})

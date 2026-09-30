import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('RUON Badge Integration', () => {
  const rootDir = path.resolve(__dirname, '../..')
  const indexHtmlPath = path.join(rootDir, 'index.html')
  const appLayoutPath = path.join(rootDir, 'src/components/layout/AppLayout.tsx')
  const settingsPath = path.join(rootDir, 'src/pages/Configuracoes.tsx')

  it('includes https://ruon.dev/badge.js in index.html', () => {
    expect(fs.existsSync(indexHtmlPath)).toBe(true)
    const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8')
    expect(indexHtml).toContain('https://ruon.dev/badge.js')
    expect(indexHtml).toMatch(/<script\s+src="https:\/\/ruon\.dev\/badge\.js"\s+async><\/script>/)
  })

  it('keeps the RUON attribution in settings and out of the sidebar', () => {
    expect(fs.existsSync(appLayoutPath)).toBe(true)
    const appLayout = fs.readFileSync(appLayoutPath, 'utf-8')
    const settings = fs.readFileSync(settingsPath, 'utf-8')
    expect(appLayout).not.toContain('<ruon-badge')
    expect(settings).toContain('<ruon-badge project="ckf-orcamentos" theme="light" size="sm">')
  })
})

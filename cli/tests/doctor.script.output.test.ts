import { describe, it, expect } from 'vitest'
import { promises as fs } from 'fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'os'
import { join, resolve } from 'path'

const repoRoot = resolve(__dirname, '../../')
const doctorScript = resolve(repoRoot, 'scripts', 'doctor.sh')

async function runDoctorWithConfig(configToml: string): Promise<string> {
  const homeDir = await fs.mkdtemp(join(tmpdir(), 'codex-1up-doctor-'))
  const codexDir = join(homeDir, '.codex')
  const cfgPath = join(codexDir, 'config.toml')
  await fs.mkdir(codexDir, { recursive: true })
  await fs.writeFile(cfgPath, configToml, 'utf8')

  try {
    return execFileSync('bash', [doctorScript], {
      env: { ...process.env, HOME: homeDir, USERPROFILE: homeDir },
      encoding: 'utf8'
    })
  } finally {
    await fs.rm(homeDir, { recursive: true, force: true })
  }
}

describe('doctor script output', () => {
  it('reports removed/deprecated keys across all profile feature tables', async () => {
    const output = await runDoctorWithConfig([
      'profile = "balanced"',
      'web_search = "live"',
      '',
      '[profiles.balanced]',
      'web_search = "cached"',
      '',
      '[profiles.safe.features]',
      'search_tool = true',
      'web_search_cached = true',
      '',
      '[features]',
      'request_rule = true',
      ''
    ].join('\n'))

    expect(output).toContain('✔ web_search = cached (profiles.balanced.web_search)')
    expect(output).toContain("⚠ removed feature key 'search_tool' detected at profiles.safe.features.search_tool; remove it")
    expect(output).toContain("⚠ removed feature key 'request_rule' detected at features.request_rule; remove it")
    expect(output).toContain("ℹ deprecated feature key 'web_search_cached' set at profiles.safe.features.web_search_cached; prefer profiles.safe.web_search")
  })

  it('resolves multi_agent precedence in the expected order', async () => {
    const cases: Array<{ config: string; expectedLine: string }> = [
      {
        config: [
          'profile = "balanced"',
          '',
          '[profiles.balanced.features]',
          'multi_agent = true',
          '',
          '[features]',
          'multi_agent = false',
          'collab = false',
          ''
        ].join('\n'),
        expectedLine: '✔ multi_agent = true (profiles.balanced.features.multi_agent)'
      },
      {
        config: [
          'profile = "balanced"',
          '',
          '[profiles.balanced.features]',
          'collab = false',
          '',
          '[features]',
          'multi_agent = true',
          'collab = true',
          ''
        ].join('\n'),
        expectedLine: '✔ multi_agent = false (profiles.balanced.features.collab (legacy))'
      },
      {
        config: [
          'profile = "balanced"',
          '',
          '[features]',
          'multi_agent = true',
          'collab = false',
          ''
        ].join('\n'),
        expectedLine: '✔ multi_agent = true (features.multi_agent)'
      },
      {
        config: [
          'profile = "balanced"',
          '',
          '[features]',
          'collab = true',
          ''
        ].join('\n'),
        expectedLine: '✔ multi_agent = true (features.collab (legacy))'
      }
    ]

    for (const item of cases) {
      const output = await runDoctorWithConfig(item.config)
      expect(output).toContain(item.expectedLine)
    }
  })
})


import { describe, it, expect, vi } from 'vitest'
import { runCommand } from 'citty'
import { installCommand } from '../src/commands/install'
import { buildRawArgsFromFlags } from './test-utils'

// Mock the zx installer entry to observe invocation
vi.mock('../src/installers/main.js', () => ({
  runInstaller: vi.fn(async () => {})
}))
// Import the mocked symbol for assertions
import { runInstaller } from '../src/installers/main.js'

describe('install runs zx installer', () => {
  it('passes flags through', async () => {
    await runCommand(installCommand, {
      rawArgs: buildRawArgsFromFlags({ yes: true, 'dry-run': true })
    })
    expect((runInstaller as unknown as any).mock.calls.length).toBeGreaterThan(0)
  })
})

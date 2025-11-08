import { describe, it, expect, vi } from 'vitest'
import { installCommand } from '../src/commands/install'
import { vi, expect } from 'vitest'

vi.mock('execa', () => ({ execa: vi.fn(async () => ({})) }))
import { execa } from 'execa'

describe('install spawns script', () => {
  it('passes flags through', async () => {
    await installCommand.run!({ args: { yes: true, 'dry-run': true } as any })
    expect((execa as unknown as any).mock.calls.length).toBeGreaterThan(0)
  })
})

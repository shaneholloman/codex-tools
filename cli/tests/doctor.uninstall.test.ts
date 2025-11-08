import { describe, it, expect, vi } from 'vitest'
import { doctorCommand } from '../src/commands/doctor'
import { uninstallCommand } from '../src/commands/uninstall'
vi.mock('execa', () => ({ execa: vi.fn(async () => ({})) }))
import { execa } from 'execa'

describe('doctor/uninstall spawn', () => {
  it('spawns doctor', async () => {
    await doctorCommand.run!({ args: {} as any })
    expect((execa as unknown as any).mock.calls.length).toBeGreaterThan(0)
  })
  it('spawns uninstall', async () => {
    await uninstallCommand.run!({ args: {} as any })
    expect((execa as unknown as any).mock.calls.length).toBeGreaterThan(0)
  })
})

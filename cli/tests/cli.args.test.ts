import { describe, it, expect } from 'vitest'
import { root } from '../src/index'
import { runCommand } from 'citty'

describe('cli args validation', () => {
  it('fails when agents missing --path', async () => {
    let err: any
    try {
      await runCommand(root, { rawArgs: ['agents'] })
    } catch (e) { err = e }
    expect(err).toBeTruthy()
  })
})


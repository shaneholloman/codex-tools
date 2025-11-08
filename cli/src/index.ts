import { defineCommand } from 'citty'
import { installCommand } from './commands/install.js'
import { agentsCommand } from './commands/agents.js'
import { doctorCommand } from './commands/doctor.js'
import { uninstallCommand } from './commands/uninstall.js'
import { configCommand } from './commands/config.js'

export const root = defineCommand({
  meta: {
    name: 'codex-1up',
    version: '0.1.0',
    description: 'Power up Codex CLI with clean profiles config and helpers'
  },
  subCommands: {
    install: installCommand,
    agents: agentsCommand,
    doctor: doctorCommand,
    uninstall: uninstallCommand,
    config: configCommand
  }
})

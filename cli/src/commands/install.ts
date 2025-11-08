import { defineCommand } from 'citty'
import { execa } from 'execa'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { promises as fs } from 'fs'
import os from 'os'
import { accessSync } from 'fs'
import * as TOML from 'toml'

const __dirname = dirname(fileURLToPath(import.meta.url))
function findRoot() {
    const a = resolve(__dirname, '../../');
  const b = resolve(__dirname, '../../..');
  try { accessSync(resolve(a, 'install.sh')); return a } catch (e) {}
  return b
}
const repoRoot = findRoot()

export const installCommand = defineCommand({
  meta: {
    name: 'install',
    description: 'Run the codex-1up installer with validated flags'
  },
  args: {
    yes: { type: 'boolean', description: 'Non-interactive; accept safe defaults' },
    'dry-run': { type: 'boolean', description: 'Print actions without making changes' },
    'skip-confirmation': { type: 'boolean', description: 'Skip prompts' },
    shell: { type: 'string', description: 'auto|zsh|bash|fish' },
    vscode: { type: 'string', description: 'Install VS Code extension id' },
    'no-vscode': { type: 'boolean', description: 'Skip VS Code extension checks' },
    'git-external-diff': { type: 'boolean', description: 'Set difftastic as git external diff' },
    'install-node': { type: 'string', description: 'nvm|brew|skip' },
    'agents-md': { type: 'string', description: 'Write starter AGENTS.md to PATH (default PWD/AGENTS.md)', required: false },
    'agents-template': { type: 'string', description: 'default|typescript|python|shell' }
  },
  async run({ args }) {
    const installPath = resolve(repoRoot, 'install.sh')
    const flags: string[] = []
    if (args.yes) flags.push('--yes')
    if (args['dry-run']) flags.push('--dry-run')
    if (args['skip-confirmation']) flags.push('--skip-confirmation')
    if (args.shell) flags.push('--shell', String(args.shell))
    if (args.vscode) flags.push('--vscode', String(args.vscode))
    if (args['no-vscode']) flags.push('--no-vscode')
    if (args['git-external-diff']) flags.push('--git-external-diff')
    if (args['install-node']) flags.push('--install-node', String(args['install-node']))
    if (typeof args['agents-md'] !== 'undefined') {
      const v = args['agents-md']
      flags.push('--agents-md')
      if (v) flags.push(String(v))
    }
    if (args['agents-template']) flags.push('--agents-template', String(args['agents-template']))

    const child = execa('bash', [installPath, ...flags], { stdio: 'inherit' })
    await child

    await printPostInstallSummary()
  }
})

async function printPostInstallSummary() {
  const home = os.homedir()
  const cfgPath = resolve(home, '.codex', 'config.toml')
  let profile: string | undefined
  let profiles: string[] = []
  try {
    const raw = await fs.readFile(cfgPath, 'utf8')
    const data: any = TOML.parse(raw)
    profile = data.profile
    const profTable = data.profiles || {}
    profiles = Object.keys(profTable)
      } catch {
    // ignore — config may not exist if user skipped
  }

  const tools = ['codex', 'ast-grep', 'fd', 'rg', 'fzf', 'jq', 'yq', 'difft', 'difftastic']
  const results = await Promise.all(tools.map(async (t) => {
    try {
      const { stdout } = await execa('bash', ['-lc', `command -v ${t} >/dev/null 2>&1 && echo 1 || echo 0`])
      return [t, stdout.trim() === '1'] as const
    } catch {
      return [t, false] as const
    }
  }))

  const present = results.filter(([, ok]) => ok).map(([t]) => t)

  const lines: string[] = []
  lines.push('')
  lines.push('codex-1up: Installation summary')
  lines.push('────────────────────────────────')
  lines.push(`Config: ${cfgPath}${profile ? ` (active profile: ${profile})` : ''}`)
  if (profiles.length) lines.push(`Profiles: ${profiles.join(', ')}`)
    lines.push(`Tools detected: ${present.join(', ') || 'none'}`)
  lines.push('')
  lines.push('Usage:')
  lines.push('  - Switch profile for a session:  codex --profile <name>')
  lines.push('  - List available profiles:       codex-1up config profiles')
  lines.push('  - Persist active profile:        codex-1up config set-profile <name>')
  lines.push('  - Write AGENTS.md to a repo:     codex-1up agents --path . --template default')
  lines.push('')
  process.stdout.write(lines.join('\n') + '\n')
}

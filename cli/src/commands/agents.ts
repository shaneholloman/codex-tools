import { defineCommand } from 'citty'
import { promises as fs } from 'fs'
import { accessSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
function findRoot() {
  const a = resolve(__dirname, '../../');
  const b = resolve(__dirname, '../../..');
  try { accessSync(resolve(a, 'templates')); return a } catch (e) {}
  return b
}
const repoRoot = findRoot()

async function pathExists(p: string) {
  try { await fs.access(p); return true } catch { return false }
}

async function copyFileWithBackup(src: string, dest: string) {
  const exists = await pathExists(dest)
  if (exists) {
    const backup = `${dest}.backup.${new Date().toISOString().replace(/[:.]/g, '').replace('T','_').slice(0,15)}`
    await fs.copyFile(dest, backup)
  }
  await fs.mkdir(dirname(dest), { recursive: true })
  await fs.copyFile(src, dest)
}

export const agentsCommand = defineCommand({
  meta: { name: 'agents', description: 'Write an AGENTS.md from templates' },
  args: {
    path: { type: 'string', required: true, description: 'Target repo path or file' },
    template: { type: 'string', default: 'default', description: 'default|typescript|python|shell' }
  },
  async run({ args }) {
    const target = String(args.path)
    const template = String(args.template || 'default')
    const src = resolve(repoRoot, 'templates/agent-templates', `AGENTS-${template}.md`)
    const isDir = await pathExists(target).then(async ok => ok && (await fs.stat(target)).isDirectory()).catch(() => false)
    const dest = isDir ? resolve(target, 'AGENTS.md') : target

    if (!(await pathExists(src))) throw new Error(`Unknown template: ${template}`)
    await copyFileWithBackup(src, dest)
    process.stdout.write(`Wrote ${dest} (template: ${template})\n`)
  }
})


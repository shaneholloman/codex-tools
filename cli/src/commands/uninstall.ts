import { defineCommand } from 'citty'
import { execa } from 'execa'
import { fileURLToPath } from 'url'
import { accessSync } from 'fs'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
function findRoot(){
    const a = resolve(__dirname, '../../');
  const b = resolve(__dirname, '../../..');
  try { accessSync(resolve(a, 'install.sh')); return a } catch(e) {}
  return b
}
const repoRoot = findRoot()

export const uninstallCommand = defineCommand({
  meta: { name: 'uninstall', description: 'Clean up aliases and config created by this tool' },
  async run() {
    await execa('bash', [resolve(repoRoot, 'scripts/uninstall.sh')], { stdio: 'inherit' })
  }
})


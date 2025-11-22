import { $ } from 'zx'
import * as p from '@clack/prompts'
import type { InstallerContext } from './types.js'
import { needCmd, runCommand, chooseNodePmForGlobal } from './utils.js'

const REQUIRED_PACKAGES = ['@openai/codex'] as const
const CODEX_PKG = '@openai/codex'

export async function installNpmGlobals(ctx: InstallerContext): Promise<void> {
  if (ctx.options.installCodexCli === 'no') {
    ctx.logger.info('Skipping Codex CLI install (user choice)')
    return
  }
  ctx.logger.info('Checking global packages (@openai/codex)')

  const updates: string[] = []

  for (const pkg of REQUIRED_PACKAGES) {
    try {
      // Fetch latest version
      const latestResult = await $`npm view ${pkg} version`.quiet()
      const latest = latestResult.stdout.trim()

      if (!latest) {
        ctx.logger.warn(`Could not fetch latest version for ${pkg}; skipping upgrade check`)
        continue
      }

      // Check installed version
      const installedResult = await $`npm ls -g ${pkg} --depth=0 --json`.quiet().nothrow()
      let installed = ''
      try {
        const installedJson = JSON.parse(installedResult.stdout || '{}')
        installed = installedJson.dependencies?.[pkg]?.version || ''
      } catch {
        installed = ''
      }

      if (!installed) {
        ctx.logger.info(`${pkg} not installed; will install @${latest}`)
        updates.push(`${pkg}@${latest}`)
      } else if (installed !== latest) {
        // Package is installed but outdated
        const interactive =
          process.stdout.isTTY &&
          !ctx.options.dryRun &&
          !ctx.options.skipConfirmation &&
          !ctx.options.assumeYes

        if (pkg === CODEX_PKG && interactive) {
          const answer = await p.confirm({
            message: `Codex CLI is installed globally (v${installed}), latest is v${latest}. Upgrade now?`,
            initialValue: true
          })
          if (p.isCancel(answer)) {
            ctx.logger.info('Codex CLI upgrade cancelled; keeping existing version.')
          } else if (answer) {
            ctx.logger.info(`Scheduling Codex CLI upgrade: ${installed} -> ${latest}`)
            updates.push(`${pkg}@${latest}`)
          } else {
            ctx.logger.info('Keeping existing Codex CLI version as requested.')
          }
        } else {
          // Non-interactive (or non-codex package): auto-upgrade when enabled
          ctx.logger.info(`${pkg} ${installed} -> ${latest}`)
          updates.push(`${pkg}@${latest}`)
        }
      } else {
        ctx.logger.ok(`${pkg} up-to-date (${installed})`)
      }
    } catch (error) {
      ctx.logger.warn(`Error checking ${pkg}: ${error}`)
      // Still try to install if not present
      const installedResult = await $`npm ls -g ${pkg} --depth=0 --json`.quiet().nothrow()
      let installed = ''
      try {
        const installedJson = JSON.parse(installedResult.stdout || '{}')
        installed = installedJson.dependencies?.[pkg]?.version || ''
      } catch {
        installed = ''
      }
      if (!installed) {
        updates.push(pkg)
      }
    }
  }

  if (updates.length > 0) {
    const pmChoice = await chooseNodePmForGlobal(ctx.logger)

    const canPromptForPm =
      process.stdout.isTTY &&
      !ctx.options.dryRun &&
      !ctx.options.skipConfirmation &&
      !ctx.options.assumeYes

    let nodePm = pmChoice.pm

    if (pmChoice.pm === 'none' && pmChoice.reason?.startsWith('pnpm-')) {
      if (canPromptForPm) {
        const fallback = await p.select({
          message: 'pnpm is installed but its global bin is not configured. How should we proceed?',
          initialValue: 'npm',
          options: [
            { value: 'npm', label: 'Use npm for global installs this run' },
            { value: 'skip', label: 'Skip global installs (run "pnpm setup" then re-run)' }
          ]
        })
        if (p.isCancel(fallback) || fallback === 'skip') {
          ctx.logger.warn('Skipping global Node installs; pnpm is misconfigured. Run "pnpm setup" then re-run the installer.')
          return
        }
        ctx.logger.info('pnpm misconfigured; falling back to npm for global installs.')
        nodePm = 'npm'
      } else {
        ctx.logger.warn('pnpm detected but global bin dir is not configured; falling back to npm for this run. Run "pnpm setup" to use pnpm.')
        nodePm = 'npm'
      }
    }

    if (nodePm === 'none') {
      ctx.logger.warn('Skipping global Node installs because no supported package manager was found.')
    } else if (nodePm === 'pnpm') {
      ctx.logger.info('Installing/updating global packages via pnpm')
      await runCommand('pnpm', ['add', '-g', ...updates], {
        dryRun: ctx.options.dryRun,
        logger: ctx.logger
      })
    } else {
      ctx.logger.info('Installing/updating global packages via npm')
      await runCommand('npm', ['install', '-g', ...updates], {
        dryRun: ctx.options.dryRun,
        logger: ctx.logger
      })
    }
  } else {
    ctx.logger.ok('Global packages are up-to-date')
  }

  // Verify installations
  if (await needCmd('codex')) {
    ctx.logger.ok('Codex CLI installed')
  } else {
    ctx.logger.err('Codex CLI not found after install')
  }
}

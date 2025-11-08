#!/usr/bin/env node
// Loader: prefer built build; fallback to tsx in dev
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dist = resolve(__dirname, '../dist/main.js')
const src = resolve(__dirname, '../src/main.ts')
const require = createRequire(import.meta.url)

const { existsSync } = require('fs')

if (existsSync(dist)) {
  await import(dist)
} else {
  // Dev fallback
  await import('tsx/esm')
  await import(src)
}

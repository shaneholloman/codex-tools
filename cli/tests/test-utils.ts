export function buildRawArgsFromFlags(flags: Record<string, any>): string[] {
  const args: string[] = []
  for (const [key, value] of Object.entries(flags)) {
    const flag = key.length === 1 ? `-${key}` : `--${key}`
    if (typeof value === 'boolean') {
      if (value) args.push(flag)
    } else if (value !== undefined && value !== null) {
      args.push(`${flag}=${String(value)}`)
    }
  }
  return args
}


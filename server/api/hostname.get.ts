import os from 'node:os'

export default defineEventHandler(() => {
  return { hostname: os.hostname() }
})

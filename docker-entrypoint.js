#!/usr/bin/env node

const { spawn } = require('node:child_process')

const env = { ...process.env }

// SQLite on Fly: ensure DATABASE_URL is a file: URL (Fly or secrets may override)
if (!env.DATABASE_URL || !String(env.DATABASE_URL).startsWith('file:')) {
  env.DATABASE_URL = 'file:///data/sqlite.db'
}

;(async () => {
  const args = process.argv.slice(2)
  if (args[0] === 'npm' && args[1] === 'run' && args[2] === 'start') {
    await exec('npx prisma migrate deploy')
  }
  await exec(args.join(' '))
})()

function exec(command) {
  const child = spawn(command, { shell: true, stdio: 'inherit', env })
  return new Promise((resolve, reject) => {
    child.on('exit', code => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${command} failed rc=${code}`))
      }
    })
  })
}

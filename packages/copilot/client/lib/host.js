'use strict'
// The host facts the client sends (ARCH D32): at a decision point the processor count and the load, at a stage command
// and at a decision point the operating system, and the load samples of mc17 converge load in that command's own
// request. The machine's name, the user's name and the folders never leave the computer.

const os = require('node:os')

/*  The time between the two samples of a reading, as the release's hostState takes them. */
const HOST_SAMPLE_MS = 3000

/*  The host's load: two samples of the processors' counters HOST_SAMPLE_MS apart, from `sampler` (os.cpus by default),
 *  `wait` holding the time between them. Answers { load, busy, figure, sampledAt, cores }: `load` is the share of the
 *  processors' time outside idle between the samples, in percent with one decimal; `busy` reads whether the load passes
 *  `figure`, or `unknown` where no figure is given. Taken from the release with no change to its logic. */
function hostState (input) {
  const x = input || {}
  const sampler = x.sampler || (() => os.cpus())
  const wait = x.wait || ((ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms))
  const first = sampler()
  wait(HOST_SAMPLE_MS)
  const second = sampler()
  const sum = (list, idleOnly) => list.reduce((acc, c) => { const t = c.times; return acc + (idleOnly ? t.idle : t.user + t.nice + t.sys + t.idle + t.irq) }, 0)
  const total = sum(second) - sum(first)
  const idle = sum(second, true) - sum(first, true)
  const load = total > 0 ? Math.round(1000 * (total - idle) / total) / 10 : 0
  const figure = typeof x.figure === 'number' ? x.figure : null
  return { load, busy: figure === null ? 'unknown' : load > figure, figure, sampledAt: new Date().toISOString(), cores: second.length }
}

/*  The operating system as the engine names it. */
function osKind (platform) {
  const p = platform || process.platform
  return p === 'win32' ? 'windows' : (p === 'darwin' ? 'macos' : 'linux')
}

/*  The readings of `seconds` seconds, one hostState after another, as mc17 converge load takes them. */
function loadSamples (seconds, input) {
  const count = Math.max(1, Math.floor(Number(seconds) * 1000 / HOST_SAMPLE_MS))
  const out = []
  while (out.length < count) {
    const r = hostState(input)
    out.push({ at: r.sampledAt, load: r.load, cores: r.cores })
  }
  return out
}

module.exports = { HOST_SAMPLE_MS, hostState, osKind, loadSamples }

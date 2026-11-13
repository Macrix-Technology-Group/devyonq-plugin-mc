'use strict'
// mc17 config model <provider/model> (the second review of IP-MC-SERVER-002, N7): the person's own choice of the model a
// decision point's call spends their OpenRouter key on. The client keeps it in its own folder, ~/.mc17/client/config.json,
// which no step of the engine reaches (steps.js writes in the checkout, the work folder, the converge store and the
// temporary folder alone) and which the secret gate keeps from every AI tool, as it refuses mc17 config itself. The ask
// model takes the model from here alone: from nothing the engine can write, such as the checkout's lock, and not from
// --model on a command line, which the AI tool writes (the final check of IP-MC-SERVER-002, item 4). The command runs in
// a terminal of the person's own, as mc17 login and mc17 trust do.

const path = require('node:path')
const { writeAtomic, readOrNull } = require('./places.js')

/*  The settings the person can keep, each with its form. */
const SETTINGS = { model: 'an OpenRouter model id {provider}/{model}, such as anthropic/claude-sonnet-4' }

/*  The file the person's settings stand in. */
function configPath (ctx) {
  return path.join(ctx.places.own, 'config.json')
}

/*  The person's settings, {} where none were kept or the file does not read as an object. */
function readConfig (ctx) {
  const b = readOrNull(configPath(ctx))
  if (b === null) return {}
  try {
    const v = JSON.parse(b.toString('utf8').replace(/^﻿/, ''))
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
  } catch (_) { return {} }
}

/*  mc17 config model [<provider/model> | --clear]: prints the model kept, or keeps another, or clears it. Exits 0 where
 *  it printed or kept, 2 on a word it does not read, 1 where no terminal of the person's own stands for a change. */
async function configCommand (ctx, argv) {
  const say = (s) => ctx.err(s.endsWith('\n') ? s : s + '\n')
  const { MODEL_ID } = require('./model.js')
  const name = argv[1]
  const value = argv[2]
  if (!Object.prototype.hasOwnProperty.call(SETTINGS, name) || argv.length > 3) {
    say('mc17 config: name one setting and its value: mc17 config model <provider/model>, or mc17 config model --clear; mc17 config model alone prints it')
    return 2
  }
  const kept = readConfig(ctx)
  if (value === undefined) {
    ctx.out('model     : ' + (typeof kept.model === 'string' && kept.model ? kept.model : 'none kept, so a decision point\'s call spends on no model; keep one with mc17 config model <provider/model> in a terminal of your own') + '\n')
    return 0
  }
  if (value !== '--clear' && !MODEL_ID.test(value)) { say('mc17 config model: ' + JSON.stringify(value) + ' is no ' + SETTINGS.model); return 2 }
  const { terminalOf } = require('./login.js')
  if (!terminalOf(ctx).stand) { say('mc17 config: a setting is kept from a terminal of your own, and none stands here; run it in a terminal, not through an AI tool'); return 1 }
  const next = Object.assign({}, kept)
  if (value === '--clear') delete next.model
  else next.model = value
  try {
    writeAtomic(configPath(ctx), Buffer.from(JSON.stringify(next, null, 2) + '\n', 'utf8'))
  } catch (e) { say('mc17 config: the setting could not be kept in ' + ctx.places.own + ': ' + String(e.message || e).split('\n')[0]); return 1 }
  ctx.out('model     : ' + (next.model || 'cleared') + ', kept in the client\'s own folder\n')
  return 0
}

module.exports = { SETTINGS, configPath, readConfig, configCommand }

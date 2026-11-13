'use strict'
// The system text of mc17 converge probe (ARCH D16): the one other system message, beside the plugin's own policy.md,
// that the client composes a model call with. The engine's probe sends its own fixed text and no policy.md, so a client
// that composed every call with policy.md would refuse the probe's ask on its digest. The text below is the engine copy's
// PROBE_SYSTEM (core/harness/mc17/converge/model.js of the engine, at the commit contract/copy.json names), copied byte
// for byte; the client accepts these two texts and no third.

/*  The policy of the probe: the system message of its one call. */
const PROBE_SYSTEM = 'You are the judgment module of Mission Control, called by its probe. The probe tests the interface alone: the packet in the ' +
  'user message holds no decision, and each of its inputs reads unavailable. Answer with one JSON object and no other text, in the form ' +
  'mc17-convergence-proposal/1, whose action is escalate-or-stop and whose result says why: the packet holds no decision.'

module.exports = { PROBE_SYSTEM }

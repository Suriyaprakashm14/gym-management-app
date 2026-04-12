const { isProduction } = require('../config/env');

const debugEnabled =
  !isProduction() ||
  (process.env.LOG_LEVEL || '').toLowerCase() === 'debug';

/**
 * Verbose diagnostics (Luxand payloads, IDs). Disabled in production unless LOG_LEVEL=debug.
 */
function debug(...args) {
  if (debugEnabled) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

module.exports = { debug };

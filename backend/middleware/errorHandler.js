const { fail } = require('../utils/apiResponse');

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  // Handle oversize payloads (e.g. large JSON/base64 bodies) in a standardized way
  if (err?.type === 'entity.too.large') {
    return fail(
      res,
      413,
      'Uploaded file is too large',
      null,
      'PAYLOAD_TOO_LARGE'
    );
  }

  const statusCode = err?.statusCode || err?.status || 500;
  const message = err?.message || 'Internal server error';

  // Keep stack hidden in production responses
  const details =
    process.env.NODE_ENV === 'production'
      ? null
      : {
          stack: err?.stack || null,
        };

  return fail(res, statusCode, message, details, 'INTERNAL_ERROR');
}

module.exports = {
  errorHandler,
};

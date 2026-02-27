const { fail } = require('../utils/apiResponse');

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
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

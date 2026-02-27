const { fail } = require('../utils/apiResponse');

function notFoundHandler(req, res) {
  return fail(
    res,
    404,
    `Route not found: ${req.method} ${req.originalUrl}`,
    null,
    'ROUTE_NOT_FOUND'
  );
}

module.exports = {
  notFoundHandler,
};

const { randomUUID } = require('crypto');

function attachRequestContext(req, res, next) {
  const incomingRequestId = req.header('x-request-id');
  const requestId = incomingRequestId || randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  next();
}

module.exports = {
  attachRequestContext,
};

function buildMeta(req) {
  return {
    requestId: req?.requestId || null,
    timestamp: new Date().toISOString(),
  };
}

function ok(res, data = null, message = 'Success') {
  const payload = {
    success: true,
    message,
    data,
    meta: buildMeta(res.req),
  };
  return res.status(200).json(payload);
}

function created(res, data = null, message = 'Created') {
  const payload = {
    success: true,
    message,
    data,
    meta: buildMeta(res.req),
  };
  return res.status(201).json(payload);
}

function fail(res, statusCode, message, details = null, code = 'REQUEST_FAILED') {
  const payload = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: buildMeta(res.req),
  };
  return res.status(statusCode).json(payload);
}

module.exports = {
  ok,
  created,
  fail,
};

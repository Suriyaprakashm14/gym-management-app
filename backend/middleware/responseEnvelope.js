function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeSuccessPayload(payload, req) {
  // Already in target shape.
  if (isObject(payload) && payload.success === true && 'data' in payload) {
    return {
      ...payload,
      meta: payload.meta || {
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Legacy { success, message, ...rest } shape.
  if (isObject(payload) && payload.success === true && !('data' in payload)) {
    const { success, message, meta, ...rest } = payload;
    return {
      success: true,
      message: message || 'Success',
      data: rest,
      meta: meta || {
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      },
    };
  }

  return {
    success: true,
    message: 'Success',
    data: payload,
    meta: {
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    },
  };
}

function normalizeErrorPayload(payload, req, statusCode) {
  if (isObject(payload) && payload.success === false && payload.error) {
    return {
      ...payload,
      meta: payload.meta || {
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      },
    };
  }

  const message =
    (isObject(payload) && (payload.error || payload.message)) ||
    (typeof payload === 'string' ? payload : 'Request failed');

  return {
    success: false,
    error: {
      code: statusCode === 404 ? 'NOT_FOUND' : 'REQUEST_FAILED',
      message,
      details: isObject(payload) ? payload : null,
    },
    meta: {
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    },
  };
}

function responseEnvelope(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = (payload) => {
    const statusCode = res.statusCode || 200;
    if (statusCode >= 400) {
      return originalJson(normalizeErrorPayload(payload, req, statusCode));
    }

    return originalJson(normalizeSuccessPayload(payload, req));
  };

  next();
}

module.exports = {
  responseEnvelope,
};

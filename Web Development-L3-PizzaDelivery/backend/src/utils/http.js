function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function asyncHandler(handler) {
  return function (req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

module.exports = { fail, asyncHandler };

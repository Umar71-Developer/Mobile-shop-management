class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

function notFound(message = 'Not found') {
  return new HttpError(404, message);
}

function badRequest(message) {
  return new HttpError(400, message);
}

module.exports = { HttpError, notFound, badRequest };

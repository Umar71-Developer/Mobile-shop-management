const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function getPagination(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const requested = parseInt(query.limit, 10);
  const limit = Math.min(MAX_LIMIT, Math.max(1, requested || DEFAULT_LIMIT));
  return { page, limit, skip: (page - 1) * limit };
}

function paginated(items, total, { page, limit }) {
  return {
    items,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

module.exports = { getPagination, paginated };

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 100

export const getPaginationParams = (query = {}) => {
  const temPaginacao = query.page !== undefined || query.limit !== undefined
  const page = Math.max(Number.parseInt(query.page || "1", 10) || 1, 1)
  const limitBruto = Number.parseInt(query.limit || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT
  const limit = Math.min(Math.max(limitBruto, 1), MAX_LIMIT)
  const skip = (page - 1) * limit

  return {
    temPaginacao,
    page,
    limit,
    skip
  }
}

export const montarRespostaPaginada = ({ data, total, page, limit, summary }) => ({
  data,
  pagination: {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit))
  },
  ...(summary ? { summary } : {})
})

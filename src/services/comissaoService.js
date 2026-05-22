export const calcularValorComissao = (valorBase, percentual) => {
  return (Number(valorBase || 0) * Number(percentual || 0)) / 100
}

export const resolverPercentualComissao = (percentualItem, percentualPadrao) => {
  if (percentualItem !== null && percentualItem !== undefined) {
    return Number(percentualItem)
  }

  return Number(percentualPadrao || 0)
}

export const criarComissao = async ({
  tx,
  empresaId,
  usuarioId,
  vendaId = null,
  agendamentoId = null,
  tipo,
  descricao = null,
  valorBase,
  percentualItem = null,
  percentualPadrao = 0
}) => {
  if (!usuarioId) return null

  const percentual = resolverPercentualComissao(percentualItem, percentualPadrao)
  const valorBaseNumero = Number(valorBase || 0)

  return await tx.comissao.create({
    data: {
      empresaId,
      usuarioId,
      vendaId,
      agendamentoId,
      tipo,
      descricao,
      valorBase: valorBaseNumero,
      percentual,
      valorComissao: calcularValorComissao(valorBaseNumero, percentual),
      status: "pendente"
    }
  })
}

export default function PaginacaoLista({
  total,
  pagina,
  porPagina,
  onPaginaChange,
  onPorPaginaChange,
  rotulo = "registro(s)",
}) {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))
  const inicio = total === 0 ? 0 : (pagina - 1) * porPagina + 1
  const fim = Math.min(pagina * porPagina, total)

  const irPara = (proximaPagina) => {
    onPaginaChange(Math.min(Math.max(proximaPagina, 1), totalPaginas))
  }

  return (
    <div className="px-4 py-4 sm:px-6 flex flex-col gap-3 border-t border-gray-100 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <p>
          Mostrando {inicio}-{fim} de {total} {rotulo}
        </p>

        <select
          value={porPagina}
          onChange={(e) => onPorPaginaChange(Number(e.target.value))}
          aria-label="Itens por página"
          className="w-36 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-[#2D2E47] outline-none focus:ring-2 focus:ring-[#3E7996] sm:w-32"
        >
          <option value={5}>5 por pág.</option>
          <option value={10}>10 por pág.</option>
          <option value={20}>20 por pág.</option>
          <option value={50}>50 por pág.</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => irPara(pagina - 1)}
          disabled={pagina <= 1}
          className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed disabled:hover:bg-white"
        >
          Anterior
        </button>

        <span className="min-w-10 rounded-lg bg-[#2F8AA3] px-4 py-2 text-center font-semibold text-white">
          {pagina}
        </span>

        <button
          type="button"
          onClick={() => irPara(pagina + 1)}
          disabled={pagina >= totalPaginas}
          className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed disabled:hover:bg-white"
        >
          Próxima
        </button>
      </div>
    </div>
  )
}

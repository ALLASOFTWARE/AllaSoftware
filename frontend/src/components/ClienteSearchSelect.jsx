import { useEffect, useState, useMemo } from "react"

export default function ClienteSearchSelect({
  clientes = [],
  setClienteId,
  buscaInicial = "",
  placeholder = "Buscar cliente...",
  permitirSemCliente = true,
  onSelect
}) {
  const [busca, setBusca] = useState("")
  const [mostrar, setMostrar] = useState(false)

  useEffect(() => {
    setBusca(buscaInicial)
  } , [buscaInicial])

  const clientesFiltrados = useMemo(() => {
    return clientes.filter((cliente) =>
      cliente.nome.toLowerCase().includes(busca.toLowerCase())
    )
  }, [clientes, busca])

  const selecionarCliente = (cliente) => {
    setClienteId(String(cliente.id))
    setBusca(cliente.nome)
    setMostrar(false)
    onSelect && onSelect(cliente)
  }

  const limpar = () => {
    setBusca("")
    setClienteId("")
    setMostrar(false)
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={busca}
        onChange={(e) => {
          const valor = e.target.value
          setBusca(valor)
          setClienteId("")
          setMostrar(true)
        }}
        onFocus={() => setMostrar(true)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#3E7996]"
      />

      {/* Botão limpar */}
      {busca && (
        <button
          type="button"
          onClick={limpar}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      )}

      {/* Dropdown */}
      {mostrar && busca && (
        <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          
          {permitirSemCliente && (
            <button
              type="button"
              onClick={() => {
                limpar()
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-600 border-b border-gray-100"
            >
              Sem cliente
            </button>
          )}

          {clientesFiltrados.length > 0 ? (
            clientesFiltrados.map((cliente) => (
              <button
                key={cliente.id}
                type="button"
                onClick={() => selecionarCliente(cliente)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50"
              >
                <p className="font-medium text-[#2D2E47]">
                  {cliente.nome}
                </p>
                <p className="text-sm text-gray-500">
                  {cliente.email || cliente.telefone || "Sem contato"}
                </p>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500">
              Nenhum cliente encontrado.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from "react"
import AppLayout from "../layouts/AppLayout"
import api from "../services/api"
import CampoInput from "../components/CampoInput"
import ModalAviso from "../components/ModalAviso"
import PaginacaoLista from "../components/PaginacaoLista"

const vazio = {
  ativo: false,
  numero: "",
  nomeExibicao: "",
  businessId: "",
  wabaId: "",
  phoneNumberId: "",
  accessToken: "",
  templateConfirmacao: "agendamento_confirmado",
  templateLembrete24h: "lembrete_agendamento_24h",
  idioma: "pt_BR",
  permitirExcedente: false
}

const usoVazio = {
  limite: 350,
  usadas: 0,
  restantes: 350,
  excedentes: 0,
  percentual: 0,
  permitirExcedente: false,
  limiteAtingido: false,
  bloqueado: false
}

export default function WhatsAppConfig() {
  const [form, setForm] = useState(vazio)
  const [mensagens, setMensagens] = useState([])
  const [usoMensal, setUsoMensal] = useState(usoVazio)
  const [paginaMensagens, setPaginaMensagens] = useState(1)
  const [mensagensPorPagina, setMensagensPorPagina] = useState(10)
  const [totalMensagens, setTotalMensagens] = useState(0)
  const [telefoneTeste, setTelefoneTeste] = useState("")
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(false)
  const [aviso, setAviso] = useState(null)
  const [tokenConfigurado, setTokenConfigurado] = useState(false)

  useEffect(() => {
    carregar()
  }, [paginaMensagens, mensagensPorPagina])

  const carregar = async () => {
    try {
      const [configRes, mensagensRes] = await Promise.all([
        api.get("/whatsapp/config").catch(() => ({ data: null })),
        api
          .get(`/whatsapp/mensagens?page=${paginaMensagens}&limit=${mensagensPorPagina}`)
          .catch(() => ({ data: { data: [], pagination: { total: 0 } } }))
      ])

      if (configRes.data) {
        const { usoMensal: uso, ...config } = configRes.data
        setForm({
          ...vazio,
          ...config,
          accessToken: ""
        })
        setTokenConfigurado(Boolean(configRes.data.tokenConfigurado))
        setTelefoneTeste(configRes.data.numero || "")
        setUsoMensal(uso || usoVazio)
      }

      setMensagens(mensagensRes.data?.data || [])
      setTotalMensagens(mensagensRes.data?.pagination?.total || 0)
    } catch (error) {
      console.error("Erro ao carregar WhatsApp:", error)
      setAviso({ titulo: "Erro", mensagem: "Nao foi possivel carregar a configuracao." })
    } finally {
      setLoading(false)
    }
  }

  const alterar = (campo, valor) => {
    setForm((atual) => ({ ...atual, [campo]: valor }))
  }

  const salvar = async (e) => {
    e.preventDefault()
    if (salvando) return

    try {
      setSalvando(true)
      const payload = { ...form }
      if (!payload.accessToken) delete payload.accessToken
      delete payload.usoMensal
      delete payload.tokenConfigurado
      delete payload.accessTokenEncrypted

      const res = await api.put("/whatsapp/config", payload)
      const { usoMensal: uso, ...config } = res.data
      setForm({ ...vazio, ...config, accessToken: "" })
      setUsoMensal(uso || usoVazio)
      setTokenConfigurado(Boolean(res.data.tokenConfigurado))
      setAviso({ titulo: "Sucesso", mensagem: "Configuracao salva com sucesso." })
    } catch (error) {
      console.error("Erro ao salvar WhatsApp:", error)
      setAviso({ titulo: "Erro", mensagem: error.response?.data?.error || "Erro ao salvar configuracao." })
    } finally {
      setSalvando(false)
    }
  }

  const testar = async () => {
    if (testando) return

    try {
      setTestando(true)
      await api.post("/whatsapp/teste", { telefone: telefoneTeste })
      setAviso({ titulo: "Sucesso", mensagem: "Mensagem de teste enviada." })
      carregar()
    } catch (error) {
      console.error("Erro ao testar WhatsApp:", error)
      if (error.response?.data?.usoMensal) {
        setUsoMensal(error.response.data.usoMensal)
      }
      setAviso({ titulo: "Erro", mensagem: error.response?.data?.detalhes || error.response?.data?.error || "Erro no teste." })
    } finally {
      setTestando(false)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#2D2E47]">
            WhatsApp
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure o numero da empresa para confirmacoes e lembretes de agendamento.
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 p-5 text-gray-500">
            Carregando configuracao...
          </div>
        ) : (
          <form onSubmit={salvar} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-5">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#2D2E47]">
                    Mensagens do mês
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {usoMensal.usadas} de {usoMensal.limite} mensagens inclusas no pacote.
                  </p>
                </div>

                <div className="rounded-lg bg-white px-3 py-2 text-sm shadow-sm border border-gray-100">
                  <span className="font-semibold text-[#2D2E47]">
                    {usoMensal.restantes > 0 ? usoMensal.restantes : 0}
                  </span>{" "}
                  <span className="text-gray-500">restantes</span>
                </div>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white border border-gray-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    usoMensal.bloqueado
                      ? "bg-red-500"
                      : usoMensal.limiteAtingido
                        ? "bg-amber-500"
                        : "bg-[#2F8AA3]"
                  }`}
                  style={{ width: `${Math.min(usoMensal.percentual || 0, 100)}%` }}
                />
              </div>

              {(usoMensal.limiteAtingido || usoMensal.bloqueado) && (
                <div
                  className={`mt-4 rounded-lg border p-3 text-sm ${
                    usoMensal.bloqueado
                      ? "border-red-100 bg-red-50 text-red-700"
                      : "border-amber-100 bg-amber-50 text-amber-700"
                  }`}
                >
                  {usoMensal.bloqueado
                    ? "O limite gratuito foi atingido. Novas mensagens automaticas nao serao enviadas enquanto o excedente nao estiver autorizado."
                    : `O limite gratuito foi atingido. As proximas mensagens entram como excedente (${usoMensal.excedentes} ja excedente(s) neste mes).`}
                </div>
              )}

              <label className="mt-4 flex items-start gap-3 rounded-lg bg-white p-3 text-sm text-gray-700 border border-gray-100">
                <input
                  type="checkbox"
                  checked={form.permitirExcedente}
                  onChange={(e) => alterar("permitirExcedente", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#2F8AA3]"
                />
                <span>
                  <span className="block font-semibold text-[#2D2E47]">
                    Continuar enviando apos 350 mensagens no mes
                  </span>
                  <span className="text-gray-500">
                    Quando ativado, as mensagens acima do pacote serao enviadas e cobradas como excedente. Quando desativado, o sistema para de enviar ao atingir o limite.
                  </span>
                </span>
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => alterar("ativo", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#2F8AA3]"
              />
              Ativar envio automatico por WhatsApp
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CampoInput label="Numero WhatsApp" value={form.numero || ""} onChange={(e) => alterar("numero", e.target.value)} placeholder="5584999999999" />
              <CampoInput label="Nome de exibicao" value={form.nomeExibicao || ""} onChange={(e) => alterar("nomeExibicao", e.target.value)} placeholder="Nome da empresa no WhatsApp" />
              <CampoInput label="Phone Number ID *" value={form.phoneNumberId || ""} onChange={(e) => alterar("phoneNumberId", e.target.value)} required />
              <CampoInput label="WhatsApp Business Account ID" value={form.wabaId || ""} onChange={(e) => alterar("wabaId", e.target.value)} />
              <CampoInput label="Business ID" value={form.businessId || ""} onChange={(e) => alterar("businessId", e.target.value)} />
              <CampoInput label={`Access Token${tokenConfigurado ? " (preencha apenas para trocar)" : " *"}`} type="password" value={form.accessToken || ""} onChange={(e) => alterar("accessToken", e.target.value)} />
              <CampoInput label="Template confirmacao" value={form.templateConfirmacao || ""} onChange={(e) => alterar("templateConfirmacao", e.target.value)} />
              <CampoInput label="Template lembrete 24h" value={form.templateLembrete24h || ""} onChange={(e) => alterar("templateLembrete24h", e.target.value)} />
              <CampoInput label="Idioma" value={form.idioma || "pt_BR"} onChange={(e) => alterar("idioma", e.target.value)} />
            </div>

            {form.ultimoErro && (
              <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                Ultimo erro: {form.ultimoErro}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="submit"
                disabled={salvando}
                className="px-5 py-2.5 rounded-xl bg-[#2F8AA3] text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {salvando ? "Salvando..." : "Salvar configuracao"}
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-lg font-semibold text-[#2D2E47]">Teste de envio</h2>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              value={telefoneTeste}
              onChange={(e) => setTelefoneTeste(e.target.value)}
              placeholder="5584999999999"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#3E7996]"
            />
            <button
              type="button"
              onClick={testar}
              disabled={testando}
              className="px-5 py-2.5 rounded-xl bg-[#2F8AA3] text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {testando ? "Enviando..." : "Enviar teste"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-[#2D2E47]">Ultimas mensagens</h2>
          </div>
          {mensagens.length === 0 ? (
            <div className="p-5 text-sm text-gray-500">Nenhuma mensagem registrada.</div>
          ) : (
            <>
              <div className="divide-y divide-gray-100">
                {mensagens.map((mensagem) => (
                  <div key={mensagem.id} className="px-5 py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-[#2D2E47]">
                        {mensagem.tipo} - {mensagem.destino}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        mensagem.status === "enviado"
                          ? "bg-emerald-50 text-emerald-700"
                          : mensagem.status === "erro" || mensagem.status === "bloqueado_limite"
                            ? "bg-red-50 text-red-700"
                            : "bg-gray-100 text-gray-600"
                      }`}>
                        {mensagem.status}
                      </span>
                    </div>
                    <p className="text-gray-500 mt-1">
                      {mensagem.cliente?.nome || "Sem cliente"} - {mensagem.templateName || "sem template"}
                    </p>
                    {mensagem.erro && (
                      <p className="text-red-600 mt-1 break-words">{mensagem.erro}</p>
                    )}
                  </div>
                ))}
              </div>
              <PaginacaoLista
                total={totalMensagens}
                pagina={paginaMensagens}
                porPagina={mensagensPorPagina}
                onPaginaChange={setPaginaMensagens}
                onPorPaginaChange={(valor) => {
                  setMensagensPorPagina(valor)
                  setPaginaMensagens(1)
                }}
                rotulo="mensagem(ns)"
              />
            </>
          )}
        </div>
      </div>

      {aviso && <ModalAviso {...aviso} onClose={() => setAviso(null)} />}
    </AppLayout>
  )
}

export default function Modal({ titulo, children, onClose, largura = "max-w-2xl" }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/35 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className={`w-full ${largura} bg-white rounded-t-2xl shadow-xl max-h-[92dvh] overflow-y-auto sm:rounded-2xl sm:max-h-[90vh]`}
      >
        <div className="flex items-center justify-between gap-4 px-4 py-4 border-b border-gray-100 sm:px-6 sm:py-5">
          <h2 className="text-xl font-bold text-[#2D2E47] sm:text-2xl">{titulo}</h2>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  )
}

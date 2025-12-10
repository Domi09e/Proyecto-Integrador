import { useState, useEffect } from "react";
import { X, ShoppingBag, CheckCircle, AlertCircle, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

// Mapeo de etiquetas para mostrar el plan de forma amigable
const PREFS_LABELS = {
  "pago_completo": "1 Pago (Contado)",
  "pagar_despues": "Pagar en 30 días (1 Cuota)",
  "4_quincenas": "4 Cuotas Quincenales (0% interés)",
  "12_meses": "12 Cuotas Mensuales",
  "24_meses": "24 Cuotas Mensuales"
};

// Divisores matemáticos según el plan
const PREFS_DIVISOR = {
  "pago_completo": 1,
  "pagar_despues": 1,
  "4_quincenas": 4,
  "12_meses": 12,
  "24_meses": 24
};

export default function CheckoutModal({ tienda, onClose, initialAmount }) {
  const navigate = useNavigate();
  
  // Si viene del carrito, usamos ese monto. Si no, string vacío.
  const [monto, setMonto] = useState(initialAmount ? initialAmount.toString() : "");
  
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  // 1. Cargar el perfil del cliente al abrir el modal
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Obtenemos crédito disponible y preferencia de pago
        const { data } = await api.get("/client/profile");
        setUserProfile(data);
      } catch (err) {
        console.error("Error cargando perfil", err);
        setError("No se pudo verificar tu límite de crédito.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 2. Cálculos y Validaciones en tiempo real
  const montoNum = parseFloat(monto) || 0;
  const creditoDisponible = Number(userProfile?.poder_credito || 0);
  
  // Validaciones lógicas
  const excedeCredito = montoNum > creditoDisponible;
  const montoInvalido = montoNum <= 0;
  
  // Obtener preferencia y calcular cuota
  const pref = userProfile?.preferencia_bnpl || "4_quincenas";
  const numCuotas = PREFS_DIVISOR[pref] || 4;
  const montoCuota = montoNum > 0 ? (montoNum / numCuotas).toFixed(2) : "0.00";

  // 3. Procesar la Compra
  const handleCheckout = async (e) => {
    e.preventDefault();
    
    // Doble validación antes de enviar
    if (montoInvalido || excedeCredito) return;

    try {
      setProcessing(true);
      setError("");

      const payload = {
        tiendaId: tienda.id,
        monto: montoNum,
        metodo_pago: "bnpl_balance" 
      };

      // Llamada al backend
      await api.post("/bnpl/checkout", payload);

      // Éxito
      alert(`¡Compra exitosa en ${tienda.nombre || tienda.name}!`);
      navigate("/cartera"); // Redirigir a la cartera para ver la deuda
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Ocurrió un error al procesar el pago.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header del Modal */}
        <div className="bg-slate-950 p-6 text-white flex justify-between items-start shrink-0">
          <div>
            <p className="text-emerald-400 text-xs uppercase tracking-wider font-bold mb-1">Confirmar Compra BNPL</p>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShoppingBag className="text-emerald-400" size={24} />
              {tienda.nombre || tienda.name}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition"
            disabled={processing}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              <p className="text-sm text-slate-500">Verificando crédito...</p>
            </div>
          ) : (
            <form onSubmit={handleCheckout} className="space-y-6">
              
              {/* Tarjeta de Crédito Disponible */}
              <div className={`border rounded-xl p-4 flex items-center justify-between transition-colors ${
                excedeCredito ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-100"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    excedeCredito ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"
                  }`}>
                    <Wallet size={20} />
                  </div>
                  <div>
                    <p className={`text-xs font-medium uppercase ${
                      excedeCredito ? "text-red-800" : "text-emerald-800"
                    }`}>
                      Tu Crédito Disponible
                    </p>
                    <p className={`text-lg font-bold ${
                      excedeCredito ? "text-red-700" : "text-emerald-700"
                    }`}>
                      RD$ {creditoDisponible.toLocaleString('es-DO', {minimumFractionDigits: 2})}
                    </p>
                  </div>
                </div>
              </div>

              {/* Input del Monto */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Total a pagar
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0.00"
                    // Si viene del carrito (initialAmount existe), es solo lectura
                    readOnly={!!initialAmount}
                    className={`w-full pl-8 pr-4 py-3 text-lg font-semibold border-2 rounded-xl outline-none transition
                      ${excedeCredito 
                        ? "border-red-300 text-red-600 focus:border-red-500 bg-red-50" 
                        : initialAmount 
                          ? "border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed" // Estilo readOnly
                          : "border-slate-200 focus:border-slate-900"
                      }`}
                    autoFocus={!initialAmount}
                  />
                </div>
                
                {/* Mensaje de error de crédito insuficiente */}
                {excedeCredito && (
                  <div className="mt-2 flex items-start gap-2 text-xs text-red-600 font-medium animate-pulse">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span>No tienes suficiente crédito para realizar esta compra.</span>
                  </div>
                )}
              </div>

              {/* Desglose del Plan de Pago */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle className="text-slate-900 mt-0.5" size={18} />
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">Plan activo en tu perfil</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {PREFS_LABELS[pref] || pref}
                    </p>
                  </div>
                </div>
                
                {montoNum > 0 && (
                  <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-slate-800">
                    <span className="text-sm">Pagarás {numCuotas} cuotas de:</span>
                    <span className="text-xl font-bold text-indigo-700">RD$ {Number(montoCuota).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Mensaje de Error General (Backend) */}
              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm border border-red-100">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {/* Botón de Acción */}
              <button
                type="submit"
                disabled={processing || montoInvalido || excedeCredito}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl transition transform active:scale-[0.98] 
                  ${processing || montoInvalido || excedeCredito 
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" 
                    : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200"
                  }`}
              >
                {processing ? "Procesando..." : "Confirmar Compra"}
              </button>
              
              <p className="text-center text-[10px] text-slate-400 px-4">
                Al confirmar, se generará una orden de compra y se descontará de tu crédito disponible inmediatamente.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
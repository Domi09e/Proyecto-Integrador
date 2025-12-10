import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion"; // Usamos framer-motion para suavidad
import { 
  Wallet as WalletIcon, 
  TrendingUp, 
  Calendar, 
  CreditCard, 
  ArrowRight, 
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  MoreHorizontal,
  ArrowUpRight,
  ShieldCheck
} from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/authContext";

export default function Cartera() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get("/client/wallet-summary");
        setData(res.data);
      } catch (err) {
        console.error(err);
        setError("No pudimos cargar tu información financiera.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Cargando tu billetera...</p>
        </div>
      </div>
    );
  }

  // Datos seguros
  const disponible = data?.disponible || 0;
  const deudaTotal = data?.deuda_total || 0;
  const compras = data?.compras_activas || [];
  const proximoPago = data?.proximo_pago;

  // Cálculo visual de barra
  const limiteTotal = disponible + deudaTotal;
  const porcentajeUso = limiteTotal > 0 ? (deudaTotal / limiteTotal) * 100 : 0;

  // Animaciones
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 pb-20">
      
      {/* --- HEADER --- */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20 shadow-sm/50 backdrop-blur-md bg-white/80">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <WalletIcon className="text-indigo-600" /> Billetera
          </h1>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400 font-medium uppercase">Hola,</p>
              <p className="text-sm font-bold text-slate-700">{user?.nombre}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-200">
              {user?.nombre?.charAt(0)}
            </div>
          </div>
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8"
      >
        
        {/* --- SECCIÓN SUPERIOR: TARJETA Y RESUMEN --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* 1. TARJETA VIRTUAL PREMIUM */}
          <motion.div variants={itemVariants} className="lg:col-span-7">
            <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl shadow-indigo-200 transition-transform hover:scale-[1.01] duration-500 group">
              {/* Background Gradiente Animado */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4338ca]"></div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full blur-3xl -ml-10 -mb-10"></div>
              
              {/* Textura de ruido (opcional para realismo) */}
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

              <div className="relative z-10 p-8 flex flex-col justify-between h-full text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-indigo-200 text-xs font-semibold tracking-[0.2em] uppercase mb-1">BNPL Virtual Card</p>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs text-indigo-100 font-medium">Protección activa</span>
                    </div>
                  </div>
                  {/* Chip Simulado */}
                  <div className="w-12 h-9 rounded bg-gradient-to-br from-yellow-200 to-yellow-500 shadow-inner opacity-90 flex items-center justify-center">
                     <div className="w-8 h-5 border border-yellow-600/50 rounded-sm grid grid-cols-2 gap-px">
                        <div className="border-r border-yellow-600/50"></div>
                     </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-indigo-200 font-medium">Saldo Disponible</p>
                  <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-white drop-shadow-md">
                    RD$ {disponible.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </h2>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-indigo-300 font-mono tracking-widest mb-1">•••• •••• •••• {user?.id.toString().padStart(4, '0')}</p>
                    <p className="text-sm font-semibold tracking-wide uppercase">{user?.nombre} {user?.apellido}</p>
                  </div>
                  {/* Logo Marca (Simulado) */}
                  <div className="flex -space-x-3 opacity-90">
                    <div className="w-8 h-8 rounded-full bg-red-500/80"></div>
                    <div className="w-8 h-8 rounded-full bg-yellow-500/80"></div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 2. ESTADÍSTICAS Y PRÓXIMO PAGO */}
          <motion.div variants={itemVariants} className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Tarjeta de Próximo Pago */}
            <div className="flex-1 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
              {proximoPago ? (
                <>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-rose-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Calendar size={20} />
                      </div>
                      <h3 className="font-bold text-slate-800">Próximo Vencimiento</h3>
                    </div>
                    
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <p className="text-3xl font-bold text-slate-900">
                          RD$ {Number(proximoPago.monto).toLocaleString()}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                          {new Date(proximoPago.fecha).toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block bg-rose-100 text-rose-700 text-xs font-bold px-2 py-1 rounded-md mb-1">
                          Cuota {proximoPago.numero}
                        </span>
                      </div>
                    </div>

                    <Link 
                      to="/pagos" 
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition shadow-lg shadow-slate-200"
                    >
                      Pagar ahora <ArrowRight size={16} />
                    </Link>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">¡Todo al día!</p>
                    <p className="text-sm text-slate-500 px-4">No tienes cuotas pendientes próximas a vencer.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Barra de Uso de Crédito */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-slate-700">Deuda Total</span>
                <span className="text-sm font-bold text-indigo-600">RD$ {deudaTotal.toLocaleString()}</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${porcentajeUso}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className={`h-full rounded-full ${porcentajeUso > 80 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                ></motion.div>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-right">Has usado el {Math.round(porcentajeUso)}% de tu límite</p>
            </div>

          </motion.div>
        </div>

        {/* --- SECCIÓN INFERIOR: COMPRAS ACTIVAS --- */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Actividad Reciente</h2>
            <Link to="/historial" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              Ver todo <ArrowUpRight size={16} />
            </Link>
          </div>

          {compras.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
              <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Sin compras activas</h3>
              <p className="text-slate-500 mb-6">¿Listo para estrenar? Compra ahora y paga después.</p>
              <Link 
                to="/tienda" 
                className="inline-flex bg-indigo-600 text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
              >
                Ir al Catálogo
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {compras.map((orden) => (
                <div 
                  key={orden.id} 
                  className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row items-center gap-6"
                >
                  {/* Icono Tienda */}
                  <div className="flex-shrink-0">
                    <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-2">
                      {orden.logo ? (
                        <img src={orden.logo} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <ShoppingBag className="text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-center md:text-left">
                    <h4 className="font-bold text-slate-800">{orden.tienda}</h4>
                    <div className="flex items-center justify-center md:justify-start gap-3 mt-1 text-xs text-slate-500">
                      <span>Orden #{orden.id}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span>{new Date(orden.fecha).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Barra de Progreso Individual */}
                  <div className="w-full md:w-1/3">
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className="text-slate-600">Progreso de pago</span>
                      <span className="text-indigo-600">{orden.progreso}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                        style={{ width: `${orden.progreso}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-medium">
                      <span>Restan: {orden.cuotas_restantes} cuotas</span>
                      <span>Deuda: RD$ {orden.deuda_restante.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div>
                    <button className="p-2 rounded-full text-slate-400 hover:bg-slate-50 hover:text-indigo-600 transition">
                      <MoreHorizontal size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

      </motion.div>
    </div>
  );
}
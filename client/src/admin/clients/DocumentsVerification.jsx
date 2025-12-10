import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FileText, Check, X, ArrowLeft, User, 
  ShieldCheck, AlertTriangle, Eye, Clock
} from "lucide-react";
import api from "../../api/axios";
import { motion, AnimatePresence } from "framer-motion";

export default function DocumentsVerification() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // Cargar documentos pendientes
  const loadDocs = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/documentos-pendientes");
      setDocs(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  // Manejar Aprobación/Rechazo
  const handleProcess = async (id, estado) => {
    let motivo = null;
    
    if (estado === 'rechazado') {
        motivo = prompt("Por favor, indica el motivo del rechazo (ej: imagen borrosa):");
        if (!motivo) return; // Cancelar si no escribe motivo
    } else {
        if(!window.confirm("¿Aprobar documento? Esto asignará crédito al cliente.")) return;
    }

    setProcessingId(id);

    try {
      await api.put(`/admin/documentos/${id}/estado`, {
        estado,
        nota_rechazo: motivo
      });
      
      // Animación de salida (lo quitamos de la lista localmente)
      setDocs(prev => prev.filter(d => d.id !== id));
      alert(estado === 'verificado' ? "¡Documento aprobado y crédito asignado!" : "Documento rechazado.");
      
    } catch (error) {
      console.error(error);
      alert("Error al procesar la solicitud.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-400">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 sm:p-10">
      
      {/* HEADER */}
      <header className="max-w-7xl mx-auto mb-8 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white transition text-slate-400"
            title="Volver atrás"
          >
            <ArrowLeft size={24} />
          </button>
          
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              Verificación de Identidad
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Revisión manual de documentos KYC para aprobación de créditos.
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto space-y-8">

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <StatCard 
             title="Pendientes de Revisión" 
             value={docs.length} 
             color="text-amber-400" 
             bg="bg-amber-500/10" 
             icon={<Clock size={24}/>}
           />
           <StatCard 
             title="Revisados Hoy" 
             value="0" // Podrías traer este dato del backend si quisieras
             color="text-emerald-400" 
             bg="bg-emerald-500/10" 
             icon={<ShieldCheck size={24}/>}
           />
           <StatCard 
             title="Total Rechazados" 
             value="0" 
             color="text-rose-400" 
             bg="bg-rose-500/10" 
             icon={<AlertTriangle size={24}/>}
           />
        </div>

        {/* GRID DE DOCUMENTOS */}
        {docs.length === 0 ? (
           <div className="p-20 text-center bg-slate-800 rounded-3xl border border-slate-700 text-slate-500">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-20"/>
              <h3 className="text-xl font-bold text-slate-400">¡Todo al día!</h3>
              <p>No hay documentos pendientes de revisión.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
             <AnimatePresence>
                {docs.map((doc) => (
                   <motion.div 
                     key={doc.id}
                     layout
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.9 }}
                     className="bg-slate-800 border border-slate-700 rounded-3xl overflow-hidden shadow-xl flex flex-col"
                   >
                      {/* Imagen Header */}
                      <div className="relative h-56 bg-slate-900 group overflow-hidden">
                         <img 
                           src={doc.ruta_imagen.startsWith('http') ? doc.ruta_imagen : `${import.meta.env.VITE_API_URL}${doc.ruta_imagen}`} 
                           alt="Documento" 
                           className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                         />
                         
                         {/* Overlay Ver */}
                         <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <a 
                              href={doc.ruta_imagen.startsWith('http') ? doc.ruta_imagen : `${import.meta.env.VITE_API_URL}${doc.ruta_imagen}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-white/30 transition"
                            >
                               <Eye size={18}/> Ver Completo
                            </a>
                         </div>

                         {/* Badge Tipo */}
                         <div className="absolute top-4 left-4">
                            <span className="bg-slate-900/80 backdrop-blur text-slate-200 text-xs font-bold px-3 py-1 rounded-full border border-slate-700 uppercase tracking-wide">
                               {doc.tipo?.nombre || "Documento"}
                            </span>
                         </div>
                      </div>

                      {/* Info Body */}
                      <div className="p-6 flex-1 flex flex-col">
                         
                         <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                               <User size={20}/>
                            </div>
                            <div>
                               <h3 className="font-bold text-white text-lg">{doc.cliente?.nombre} {doc.cliente?.apellido}</h3>
                               <p className="text-xs text-slate-400">{doc.cliente?.email}</p>
                            </div>
                         </div>

                         <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 mb-6">
                            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Número de Documento</p>
                            <p className="text-white font-mono text-lg tracking-wide">{doc.numero_documento}</p>
                         </div>

                         {/* Acciones */}
                         <div className="mt-auto grid grid-cols-2 gap-3">
                            <button 
                              onClick={() => handleProcess(doc.id, 'rechazado')}
                              disabled={processingId === doc.id}
                              className="py-3 rounded-xl border border-rose-500/30 text-rose-400 font-bold hover:bg-rose-500/10 transition flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                               <X size={18}/> Rechazar
                            </button>
                            <button 
                              onClick={() => handleProcess(doc.id, 'verificado')}
                              disabled={processingId === doc.id}
                              className="py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 disabled:opacity-50"
                            >
                               {processingId === doc.id ? "..." : <><Check size={18}/> Aprobar</>}
                            </button>
                         </div>
                      </div>
                   </motion.div>
                ))}
             </AnimatePresence>
          </div>
        )}

      </div>
    </div>
  );
}

// Helpers
function StatCard({ title, value, icon, color, bg }) {
  return (
    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg flex items-center justify-between hover:-translate-y-1 transition-transform">
       <div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">{title}</p>
          <h3 className="text-2xl font-black text-white">{value}</h3>
       </div>
       <div className={`p-3 rounded-xl ${bg} ${color}`}>
          {icon}
       </div>
    </div>
  );
}
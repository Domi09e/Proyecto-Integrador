import { useEffect, useState } from "react";
import { ShieldAlert, Save, Lock, Unlock, CalendarClock, AlertTriangle } from "lucide-react";
import api from "../../api/axios"; // Ajusta la ruta a tu api
import { toast } from "react-hot-toast";

export default function RiskConfigPage() {
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState({
        dias_mora_maximo: 30,
        bloqueo_automatico_activo: true
    });

    // Cargar config al iniciar
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const { data } = await api.get('/admin/risk-config');
                setConfig(data);
            } catch (error) {
                console.error(error);
                toast.error("Error cargando configuración");
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    // Guardar cambios
    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await api.put('/admin/risk-config', {
                dias: parseInt(config.dias_mora_maximo),
                activo: config.bloqueo_automatico_activo
            });
            toast.success("Reglas de seguridad actualizadas");
        } catch (error) {
            toast.error("Error al guardar reglas");
        }
    };

    if (loading) return <div className="p-10 text-white">Cargando...</div>;

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-6 sm:p-10 font-sans">
            <header className="max-w-4xl mx-auto mb-8 border-b border-slate-800 pb-6">
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <ShieldAlert className="text-rose-500" size={32} />
                    Automatización de Riesgos
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                    Controla el robot que inhabilita a los usuarios morosos.
                </p>
            </header>

            <main className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* FORMULARIO */}
                <div className="md:col-span-2 space-y-6">
                    <form onSubmit={handleSave} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                        
                        {/* SWITCH ON/OFF */}
                        <div className="flex items-center justify-between mb-8 bg-slate-900 p-4 rounded-xl border border-slate-700">
                            <div className="flex gap-3">
                                <div className={`p-3 rounded-full ${config.bloqueo_automatico_activo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                                    {config.bloqueo_automatico_activo ? <Unlock size={24} /> : <Lock size={24} />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">Bloqueo Automático</h3>
                                    <p className="text-xs text-slate-400">
                                        {config.bloqueo_automatico_activo 
                                            ? "ACTIVO: El sistema revisará y bloqueará diariamente." 
                                            : "INACTIVO: Nadie será bloqueado automáticamente."}
                                    </p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={config.bloqueo_automatico_activo}
                                    onChange={(e) => setConfig({...config, bloqueo_automatico_activo: e.target.checked})}
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                        </div>

                        {/* INPUT DIAS */}
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                                <CalendarClock size={16} className="text-indigo-400"/>
                                Días de tolerancia de atraso
                            </label>
                            <p className="text-xs text-slate-500 mb-3">
                                Si una factura vence y pasan estos días sin pagarse, el cliente será inhabilitado.
                            </p>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    min="1"
                                    value={config.dias_mora_maximo}
                                    onChange={(e) => setConfig({...config, dias_mora_maximo: e.target.value})}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 pl-4 text-white focus:border-indigo-500 outline-none font-mono text-lg"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">DÍAS</span>
                            </div>
                        </div>

                        <button 
                            type="submit"
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/20 transition flex items-center justify-center gap-2"
                        >
                            <Save size={20} /> Guardar Configuración
                        </button>
                    </form>
                </div>

                {/* INFO */}
                <div className="space-y-6">
                    <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-2xl">
                        <h3 className="text-rose-400 font-bold flex items-center gap-2 mb-3">
                            <AlertTriangle size={20}/> Simulación
                        </h3>
                        <div className="text-sm text-rose-200/80 leading-relaxed space-y-2">
                            <p>Si hoy es: <span className="text-white font-mono">{new Date().toLocaleDateString()}</span></p>
                            <p>El sistema buscará facturas que vencieron antes del:</p>
                            <div className="bg-slate-900 p-2 rounded text-center font-mono font-bold text-rose-400 mt-2">
                                {new Date(new Date().setDate(new Date().getDate() - config.dias_mora_maximo)).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}
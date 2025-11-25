// src/pages/GroupPaymentPage.jsx
import { useState, useMemo } from "react";
import { Users, Plus, Trash2, Calculator, AlertCircle } from "lucide-react";
// import api from "../api/axios"; // ← cuando tengas el endpoint, lo usas aquí

export default function Pagos() {
  const [groupName, setGroupName] = useState("Compra en grupo");
  const [totalAmount, setTotalAmount] = useState("");
  const [installments, setInstallments] = useState(4); // 4 pagos por defecto
  const [splitMode, setSplitMode] = useState("equal"); // "equal" | "custom"

  const [members, setMembers] = useState([
    { id: 1, name: "Tú", email: "tu@correo.com", share: "" },
    { id: 2, name: "Amigo 1", email: "amigo1@correo.com", share: "" },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // -----------------------------
  // Cálculos derivados
  // -----------------------------
  const numericTotal = Number(totalAmount) || 0;
  const numericInstallments = Number(installments) || 1;

  const equalShare = useMemo(() => {
    if (!numericTotal || members.length === 0) return 0;
    return numericTotal / members.length;
  }, [numericTotal, members.length]);

  const customTotal = useMemo(
    () =>
      members.reduce(
        (acc, m) => acc + (Number(m.share) || 0),
        0
      ),
    [members]
  );

  const isCustomTotalValid =
    splitMode === "custom"
      ? Math.abs(customTotal - numericTotal) < 0.01
      : true;

  // -----------------------------
  // Handlers de miembros
  // -----------------------------
  const handleMemberChange = (id, field, value) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              [field]: value,
            }
          : m
      )
    );
  };

  const handleAddMember = () => {
    const newId = members.length
      ? Math.max(...members.map((m) => m.id)) + 1
      : 1;
    setMembers((prev) => [
      ...prev,
      { id: newId, name: `Integrante ${newId}`, email: "", share: "" },
    ]);
  };

  const handleRemoveMember = (id) => {
    if (members.length <= 1) return;
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  // -----------------------------
  // Submit (simulado)
  // -----------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!numericTotal || numericTotal <= 0) {
      setErrorMsg("El monto total debe ser mayor a 0.");
      return;
    }

    if (!installments || installments <= 0) {
      setErrorMsg("La cantidad de cuotas debe ser mayor a 0.");
      return;
    }

    if (members.length === 0) {
      setErrorMsg("Debes agregar al menos un integrante.");
      return;
    }

    if (splitMode === "custom" && !isCustomTotalValid) {
      setErrorMsg(
        `La suma personalizada (${customTotal.toFixed(
          2
        )}) no coincide con el total (${numericTotal.toFixed(2)}).`
      );
      return;
    }

    try {
      setSubmitting(true);

      // payload para el backend
      const payload = {
        nombre_grupo: groupName,
        monto_total: numericTotal,
        cuotas: numericInstallments,
        modo_division: splitMode, // "equal" o "custom"
        integrantes: members.map((m) => ({
          nombre: m.name,
          email: m.email,
          monto_asignado:
            splitMode === "equal"
              ? equalShare
              : Number(m.share) || 0,
        })),
      };

      console.log("Payload simulación grupo BNPL:", payload);

      // Cuando tengas endpoint:
      // const { data } = await api.post("/group-payments", payload);
      // console.log("Respuesta backend:", data);

      setSuccessMsg(
        "Simulación de pago en grupo creada correctamente (modo demo)."
      );
    } catch (err) {
      console.error(err);
      setErrorMsg("Ocurrió un error creando el pago en grupo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex justify-center px-4 py-10">
      <div className="w-full max-w-4xl bg-slate-900/80 border border-slate-800 rounded-3xl shadow-xl p-6 md:p-8">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="flex items-center gap-2 text-xl md:text-2xl font-bold">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                <Users size={18} />
              </span>
              Pagos en grupo BNPL
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Crea una compra en grupo, divide el monto entre amigos y
              genera cuotas individuales.
            </p>
          </div>
        </header>

        {/* Mensajes */}
        {errorMsg && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            <AlertCircle size={16} className="mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            <Check size={16} className="mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Formulario principal */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos generales */}
          <section className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nombre del grupo
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Monto total (RD$)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
              />
            </div>
          </section>

          {/* Plazo y modo de división */}
          <section className="grid md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Cuotas BNPL
              </label>
              <input
                type="number"
                min="1"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Ej: 4 = 4 pagos quincenales, 12 = 12 mensualidades.
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Cómo se reparte el monto
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSplitMode("equal")}
                  className={`flex-1 inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-medium border ${
                    splitMode === "equal"
                      ? "bg-emerald-600 text-white border-emerald-500"
                      : "bg-slate-900 text-slate-200 border-slate-700"
                  }`}
                >
                  <Calculator size={14} />
                  Monto dividido en partes iguales
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode("custom")}
                  className={`flex-1 inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-medium border ${
                    splitMode === "custom"
                      ? "bg-emerald-600 text-white border-emerald-500"
                      : "bg-slate-900 text-slate-200 border-slate-700"
                  }`}
                >
                  Monto personalizado
                </button>
              </div>
            </div>
          </section>

          {/* Miembros del grupo */}
          <section className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold uppercase text-slate-400 tracking-wide">
                Integrantes del grupo
              </h2>
              <button
                type="button"
                onClick={handleAddMember}
                className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700"
              >
                <Plus size={14} /> Agregar integrante
              </button>
            </div>

            <div className="space-y-2">
              {members.map((m) => {
                const assignedAmount =
                  splitMode === "equal"
                    ? equalShare
                    : Number(m.share) || 0;
                const perInstallment =
                  numericInstallments > 0
                    ? assignedAmount / numericInstallments
                    : 0;

                return (
                  <div
                    key={m.id}
                    className="grid grid-cols-12 gap-2 items-center border border-slate-800 rounded-2xl bg-slate-950/60 px-3 py-2"
                  >
                    <div className="col-span-3">
                      <input
                        type="text"
                        placeholder="Nombre"
                        value={m.name}
                        onChange={(e) =>
                          handleMemberChange(m.id, "name", e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
                      />
                    </div>
                    <div className="col-span-4">
                      <input
                        type="email"
                        placeholder="Correo"
                        value={m.email}
                        onChange={(e) =>
                          handleMemberChange(m.id, "email", e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
                      />
                    </div>
                    <div className="col-span-3">
                      {splitMode === "custom" ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Monto RD$"
                          value={m.share}
                          onChange={(e) =>
                            handleMemberChange(m.id, "share", e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
                        />
                      ) : (
                        <p className="text-[11px] text-slate-200">
                          RD$ {assignedAmount.toFixed(2)} total
                        </p>
                      )}
                      <p className="text-[10px] text-slate-500">
                        {numericInstallments > 0
                          ? `~ RD$ ${perInstallment.toFixed(
                              2
                            )} x cuota`
                          : ""}
                      </p>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.id)}
                        className="p-1.5 rounded-full bg-slate-900 text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                        disabled={members.length <= 1}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {splitMode === "custom" && numericTotal > 0 && (
              <p
                className={`mt-2 text-[11px] ${
                  isCustomTotalValid
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                Total asignado: RD$ {customTotal.toFixed(2)} /{" "}
                RD$ {numericTotal.toFixed(2)}
              </p>
            )}
          </section>

          {/* Botón submit */}
          <div className="pt-4 border-t border-slate-800 mt-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {submitting ? "Creando grupo..." : "Simular compra en grupo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

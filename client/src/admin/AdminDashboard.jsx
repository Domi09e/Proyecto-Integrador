import { useEffect, useState } from "react";
import { getPublicSettings, getPublicTiendas } from "../api";

export default function AdminDashboard(){
  const [stats, setStats] = useState({ tiendas: "–", settings: "–" });
  useEffect(()=>{ (async()=>{
    try {
      const [t, s] = await Promise.all([ getPublicTiendas(), getPublicSettings() ]);
      setStats({ tiendas: t.data?.length ?? 0, settings: s.data?.length ?? 0 });
    } catch {}
  })(); },[]);
  return (
    <div>
      <h1>Dashboard</h1>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(0,1fr))", gap:12, marginTop:12 }}>
        <Card label="Tiendas publicadas" value={stats.tiendas} />
        <Card label="Settings" value={stats.settings} />
        <Card label="Versión" value="v1.0" />
      </div>
    </div>
  );
}

function Card({label, value}) {
  return <div style={{ border:"1px solid #e5e7eb", borderRadius:16, padding:16 }}>
    <div style={{ color:"#6b7280", fontSize:12 }}>{label}</div>
    <div style={{ fontSize:28, fontWeight:800 }}>{value}</div>
  </div>;
}

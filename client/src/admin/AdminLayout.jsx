// client/src/admin/AdminLayout.jsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAdminAuth } from "./adminAuth.context";

export function Topbar() {
  const nav = useNavigate();
  const { user, signout } = useAdminAuth();
  return (
    <div style={{height:56,borderBottom:"1px solid #e5e7eb",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",background:"#fff",position:"sticky",top:0,zIndex:10}}>
      <strong>BNPL — Admin</strong>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        {user && <span style={{ color:"#6b7280", fontSize:13 }}>{user.username || user.email}</span>}
        <button className="btn" onClick={()=>nav("/")}>Ir al cliente</button>
        <button className="btn ghost" onClick={signout}>Salir</button>
      </div>
      <style>{`.btn{padding:10px 12px;border-radius:10px;border:1px solid #e5e7eb;background:#111827;color:#fff}.btn.ghost{background:#fff;color:#111827}`}</style>
    </div>
  );
}

export function Sidebar() {
  const link = ({isActive}) => ({ padding:"10px 12px", borderRadius:10, textDecoration:"none", color:isActive?"#111827":"#374151", background:isActive?"#e5e7eb":"transparent", fontWeight:500 });
  return (
    <aside style={{width:260,padding:16,borderRight:"1px solid #e5e7eb",background:"#fafafa",position:"sticky",top:0,height:"100vh"}}>
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:18,fontWeight:700 }}>Panel de control</div>
        <div style={{ color:"#6b7280", fontSize:12 }}>Administración BNPL</div>
      </div>
      <nav style={{ display:"grid", gap:6 }}>
        <NavLink to="/admin" end style={link}>Dashboard</NavLink>
        <NavLink to="/admin/tiendas" style={link}>Tiendas</NavLink>
        <NavLink to="/admin/clientes" style={link}>Clientes</NavLink>
        <NavLink to="/admin/pagos" style={link}>Pagos</NavLink>
        <NavLink to="/admin/config" style={link}>Configuraciones</NavLink>
      </nav>
    </aside>
  );
}

export default function AdminLayout() {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"260px 1fr", minHeight:"100vh" }}>
      <Sidebar />
      <div style={{ display:"grid", gridTemplateRows:"56px 1fr" }}>
        <Topbar />
        <main style={{ padding:20 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ---- Auth Context (solo para Admin) ---- //
const AdminAuthContext = createContext(null);
export function useAdminAuth(){
  const ctx = useContext(AdminAuthContext);
  if(!ctx) throw new Error("useAdminAuth must be used within <AdminAuthProvider>");
  return ctx;
}

function AdminAuthProvider({ children }){
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);

  useEffect(()=>{ (async()=>{
    try {
      const { data } = await adminVerifyApi();
      if (data && data.id) { setUser(data); setIsAuthenticated(true); }
    } catch { /* not logged */ } finally { setLoading(false); }
  })(); }, []);

  const signin = async (payload) => {
    const { data } = await adminLoginApi(payload);
    setUser(data); setIsAuthenticated(true);
    return data;
  };

  const signup = async (payload) => {
    const { data } = await adminRegisterApi(payload);
    setUser(data); setIsAuthenticated(true);
    return data;
  };

  const signout = async () => {
    try { await adminLogoutApi(); } catch{} finally { setUser(null); setIsAuthenticated(false); }
  };

  return (
    <AdminAuthContext.Provider value={{ user, isAuthenticated, loading, errors, signin, signup, signout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
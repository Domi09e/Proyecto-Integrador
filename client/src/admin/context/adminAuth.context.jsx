// client/src/admin/context/adminAuth.context.jsx

import { createContext, useContext, useEffect, useState } from "react";
import {
  adminRegisterApi,
  adminLoginApi,
  adminVerifyApi,
  adminLogoutApi,
} from "../api";

const AdminAuthContext = createContext(null);

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx)
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}

export default function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await adminVerifyApi();
        if (data?.id) {
          setUser(data);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch {
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signin = async (payload) => {
    const { data } = await adminLoginApi(payload);
    setUser(data);
    setIsAuthenticated(true);
  };
  const signup = async (payload) => {
    const { data } = await adminRegisterApi(payload);
    setUser(data);
    setIsAuthenticated(true);
  };
  const signout = async () => {
    try {
      await adminLogoutApi();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{ user, isAuthenticated, loading, signin, signup, signout }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardForRole, ROLE_CONFIGS, type UserRole } from "@/config/roles";

export interface UserSession {
  sessionId: string;
  token: string;
  loginAt: string;
  expiresAt: string;
  terminalIp: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  department: string;
  designation?: string;
  employeeId?: string;
  session?: UserSession;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (userData: Partial<User> & { role: UserRole }) => void;
  logout: () => void;
  verifyAndLogin: (username: string, pass: string, role: string) => Promise<{ success: boolean; error?: string }>;
}

const STORAGE_KEY = "ir_railflow_auth_session";

// 8 hours session timeout (in ms)
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export const OFFICIAL_CREDENTIALS: Record<string, { pass: string; role: UserRole; name: string; dept: string; empId: string }> = {
  CONTROLLER: {
    pass: "CONTROLLER@123",
    role: "controller",
    name: "Shri Rajesh Kumar Sharma",
    dept: "Operations Control (COA)",
    empId: "NR-OPT-9412",
  },
  TDMS: {
    pass: "TDMS@123",
    role: "tdms",
    name: "Dr. Ananya Verma",
    dept: "Track Defect Management System",
    empId: "NR-ENG-7201",
  },
  TMS: {
    pass: "TMS@123",
    role: "tms",
    name: "Shri Vikramaditya Rao",
    dept: "Track Management System",
    empId: "NR-TMS-4509",
  },
  SMMS: {
    pass: "SMMS@123",
    role: "smms",
    name: "Smt. Priyanka Sen",
    dept: "Signal & Telecom Maintenance",
    empId: "NR-SNT-3814",
  },
};

function generateSessionToken(role: string): UserSession {
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_MS);
  const randomHex = Math.random().toString(36).substring(2, 10).toUpperCase();

  return {
    sessionId: `SES-${role}-${randomHex}`,
    token: `CRIS-JWT.${btoa(`${role}:${now.getTime()}`)}.${randomHex}`,
    loginAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    terminalIp: `10.102.${Math.floor(100 + Math.random() * 900)}.${Math.floor(10 + Math.random() * 90)}`,
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: User = JSON.parse(saved);
        // Verify session expiry
        if (parsed.session?.expiresAt) {
          const exp = new Date(parsed.session.expiresAt).getTime();
          if (Date.now() < exp) {
            return parsed;
          }
        }
        localStorage.removeItem(STORAGE_KEY);
      }
      return null;
    } catch {
      return null;
    }
  });

  const navigate = useNavigate();

  // Periodically check session expiry
  useEffect(() => {
    if (!user?.session?.expiresAt) return;
    const interval = setInterval(() => {
      const exp = new Date(user.session!.expiresAt).getTime();
      if (Date.now() >= exp) {
        logout();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const login = (userData: Partial<User> & { role: UserRole }) => {
    const config = ROLE_CONFIGS[userData.role] || ROLE_CONFIGS.controller;
    const session = userData.session || generateSessionToken(userData.role.toUpperCase());

    const fullUser: User = {
      id: userData.id || `USR-${userData.role.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      name: userData.name || `${config.name} Officer`,
      role: userData.role,
      department: userData.department || config.department,
      designation: userData.designation || config.name,
      employeeId: userData.employeeId || `IR-${config.badge}-01`,
      session,
    };

    setUser(fullUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fullUser));

    // Redirect directly to the authorized dashboard
    const targetDashboard = getDashboardForRole(userData.role);
    navigate(targetDashboard, { replace: true });
  };

  const verifyAndLogin = async (
    username: string,
    pass: string,
    role: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanUser = username.trim().toUpperCase();
    const cleanRole = role.trim().toUpperCase();

    // 1. Check if department matches username
    if (cleanRole !== cleanUser) {
      return {
        success: false,
        error: `Department mismatch: You selected '${cleanRole}' but entered username for '${cleanUser}'. Please match both.`,
      };
    }

    // 2. Check credentials
    const official = OFFICIAL_CREDENTIALS[cleanUser];
    if (!official) {
      return {
        success: false,
        error: `User '${cleanUser}' is not registered in the Indian Railways authority database.`,
      };
    }

    if (pass !== official.pass) {
      return {
        success: false,
        error: `Authentication failed: Incorrect password for ${official.name} (${cleanUser}).`,
      };
    }

    // 3. Generate authenticated session
    const session = generateSessionToken(cleanRole);

    login({
      id: `USR-${cleanRole}-01`,
      name: official.name,
      role: official.role,
      department: official.dept,
      designation: official.name,
      employeeId: official.empId,
      session,
    });

    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    navigate("/login", { replace: true });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        verifyAndLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

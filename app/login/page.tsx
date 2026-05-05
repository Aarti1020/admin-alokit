"use client";

import { FormEvent, useState } from "react";
import { ShieldCheck, Mail, Lock, LogIn } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/auth";

export default function LoginPage() {
  const { login, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isLocalDev = process.env.NODE_ENV !== "production";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await login(email.trim().toLowerCase(), password);
      toast.success("Welcome back.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to log in");
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail("admin@example.com");
    setPassword("Admin1234");
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #f5f3ff 100%)",
          padding: "24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            background: "#ffffff",
            borderRadius: "20px",
            padding: "32px 24px",
            boxShadow: "0 20px 60px rgba(15, 23, 42, 0.10)",
            border: "1px solid rgba(226, 232, 240, 0.9)",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 500,
              color: "#475569",
            }}
          >
            Checking admin session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #f5f3ff 100%)",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#ffffff",
          borderRadius: "24px",
          padding: "32px",
          boxShadow: "0 25px 70px rgba(15, 23, 42, 0.12)",
          border: "1px solid rgba(226, 232, 240, 0.9)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              color: "#ffffff",
              marginBottom: "14px",
              boxShadow: "0 10px 30px rgba(79, 70, 229, 0.28)",
            }}
          >
            <ShieldCheck size={26} />
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            Admin Login
          </h2>

          <p
            style={{
              marginTop: "8px",
              marginBottom: 0,
              fontSize: "14px",
              color: "#64748b",
              lineHeight: 1.6,
            }}
          >
            Sign in to access the admin dashboard securely.
          </p>
        </div>

        {isLocalDev ? (
          <div
            style={{
             
            }}
          >
             

            
          </div>
        ) : null}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "18px" }}>
          <label style={{ display: "grid", gap: "8px" }}>
            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#334155",
              }}
            >
              Email
            </span>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                height: "50px",
                border: "1px solid #dbe3ee",
                borderRadius: "14px",
                padding: "0 14px",
                background: "#ffffff",
              }}
            >
              <Mail size={18} color="#64748b" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                placeholder="Enter your admin email"
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "14px",
                  color: "#0f172a",
                }}
              />
            </div>
          </label>

          <label style={{ display: "grid", gap: "8px" }}>
            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#334155",
              }}
            >
              Password
            </span>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                height: "50px",
                border: "1px solid #dbe3ee",
                borderRadius: "14px",
                padding: "0 14px",
                background: "#ffffff",
              }}
            >
              <Lock size={18} color="#64748b" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                placeholder="Enter your password"
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "14px",
                  color: "#0f172a",
                }}
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: "8px",
              height: "52px",
              width: "100%",
              border: "none",
              borderRadius: "14px",
              background: submitting
                ? "#94a3b8"
                : "linear-gradient(135deg, #4f46e5, #7c3aed)",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              cursor: submitting ? "not-allowed" : "pointer",
              boxShadow: submitting
                ? "none"
                : "0 16px 35px rgba(79, 70, 229, 0.28)",
              transition: "all 0.2s ease",
            }}
          >
            <LogIn size={18} />
            {submitting ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
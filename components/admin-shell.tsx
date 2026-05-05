"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Boxes,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareMore,
  Package,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
  X
} from "lucide-react";
import { useAuth } from "@/context/auth";
import { classNames } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Dashboard", caption: "Overview", icon: LayoutDashboard },
  { href: "/products", label: "Products", caption: "Inventory", icon: Package },
  { href: "/catalog", label: "Catalog", caption: "Categories", icon: Boxes },
  { href: "/orders", label: "Orders", caption: "Fulfillment", icon: BarChart3 },
  { href: "/users", label: "Users", caption: "Customers", icon: Users },
  { href: "/admins", label: "Admins", caption: "Access control", icon: UserCog },
  { href: "/reviews", label: "Reviews", caption: "Moderation", icon: MessageSquareMore },
  { href: "/leads", label: "Leads", caption: "Pipeline", icon: ShieldCheck },
  { href: "/content", label: "Content", caption: "CMS studio", icon: FileText }
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const route = navigation.find((item) => pathname.startsWith(item.href));
  const routeLabel = pathname.startsWith("/profile") ? "Profile" : route?.label || "Workspace";
  const lastLoginLabel = user?.lastLoginAt
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(user.lastLoginAt))
    : "Secure session";

  return (
    <div className="admin-shell">
      <div
        className={classNames("sidebar-backdrop", mobileMenuOpen && "sidebar-backdrop-visible")}
        onClick={() => setMobileMenuOpen(false)}
      />

      <aside className={classNames("sidebar", mobileMenuOpen && "sidebar-open")}>
        <div className="sidebar-top">
          <div className="brand-block">
            <div className="brand-mark">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="eyebrow">Alokit Admin</p>
              <h1>Admin Panel</h1>
              <span className="mini-text">Operational workspace</span>
            </div>
          </div>
          <button
            type="button"
            className="icon-button sidebar-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-section-label">Navigation</div>
        <nav className="sidebar-nav">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={classNames("nav-link", active && "nav-link-active")}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="nav-link-icon">
                  <Icon size={18} />
                </span>
                <span className="nav-link-copy">
                  <strong>{item.label}</strong>
                  <small>{item.caption}</small>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="workspace-card">
            <span className="pill pill-soft">JWT secured</span>
            <strong>{user?.fullName || "Admin"}</strong>
            <div className="mini-text">{user?.email || "admin@alokit.co"}</div>
            <div className="mini-text">Last active: {lastLoginLabel}</div>
          </div>
          <button type="button" className="ghost-button ghost-button-strong" onClick={logout}>
            <LogOut size={16} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <div className="topbar-main">
            <button
              type="button"
              className="icon-button topbar-menu"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>
            <div className="stack-sm">
              <div className="breadcrumb">
                <span>Admin workspace</span>
                <span className="breadcrumb-dot" />
                <span>{routeLabel}</span>
              </div>
              <div>
                <h2>{routeLabel}</h2>
                <p className="topbar-subtitle">Manage your admin tasks from one place.</p>
              </div>
            </div>
          </div>

          <div className="topbar-meta">
            <div className="topbar-stat">
              <span>Environment</span>
              <strong>Local admin</strong>
            </div>
            <button
              type="button"
              className="topbar-user topbar-user-button"
              onClick={() => router.push("/profile")}
              aria-label="Open admin profile"
            >
              <div className="avatar-dot avatar-dot-large">{user?.fullName?.charAt(0) || "A"}</div>
              <div>
                <strong>{user?.fullName || "Admin"}</strong>
                <span>{user?.role || "admin"}</span>
              </div>
            </button>
          </div>
        </header>
        <main className="page-shell">{children}</main>
      </div>
    </div>
  );
}

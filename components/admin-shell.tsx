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
    // admin-shell: full-height flex row
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">

      {/* sidebar-backdrop */}
      <div
        className={classNames(
          "fixed inset-0 z-20 bg-black/40 transition-opacity duration-200 lg:hidden",
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* sidebar */}
      <aside
        className={classNames(
          "fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-white border-r border-gray-200 shadow-sm transition-transform duration-300 lg:static lg:translate-x-0",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* sidebar-top */}
        <div className="flex items-center justify-between gap-3 px-4 py-5 border-b border-gray-100">
          {/* brand-block */}
          <div className="flex items-start gap-3">
            {/* brand-mark */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Sparkles size={18} />
            </div>
            <div>
              {/* eyebrow */}
              <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500">
                Alokit Admin
              </p>
              <h1 className="text-md font-bold text-gray-900 leading-tight">Admin Panel</h1>
              {/* mini-text */}
              <span className="text-[11px] text-gray-400">Operational workspace</span>
            </div>
          </div>

          {/* icon-button sidebar-close */}
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* sidebar-section-label */}
        <div className="px-4 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Navigation
        </div>

        {/* sidebar-nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={classNames(
                  // nav-link base
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors group",
                  active
                    // nav-link-active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {/* nav-link-icon */}
                <span
                  className={classNames(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                    active ? "bg-indigo-100 text-indigo-600" : "text-gray-400 group-hover:text-gray-600"
                  )}
                >
                  <Icon size={18} />
                </span>
                {/* nav-link-copy */}
                <span className="flex flex-col leading-tight">
                  <strong className="text-md font-semibold">{item.label}</strong>
                  <small className="text-[11px] font-normal text-gray-400">{item.caption}</small>
                </span>
              </Link>
            );
          })}
        </nav>

        {/* sidebar-foot */}
        <div className="border-t border-gray-100 px-4 py-4 space-y-3">
          {/* workspace-card */}
          <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-3 space-y-1">
            {/* pill pill-soft */}
            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
              JWT secured
            </span>
            <strong className="block text-md font-semibold text-gray-900">
              {user?.fullName || "Admin"}
            </strong>
            <div className="text-[11px] text-gray-500">{user?.email || "admin@alokit.co"}</div>
            <div className="text-[11px] text-gray-400">Last active: {lastLoginLabel}</div>
          </div>

          {/* ghost-button ghost-button-strong */}
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-md font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            onClick={logout}
          >
            <LogOut size={16} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* content-shell */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* topbar */}
        <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
          {/* topbar-main */}
          <div className="flex items-center gap-3 min-w-0">
            {/* icon-button topbar-menu */}
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 transition-colors lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>

            {/* stack-sm */}
            <div className="flex flex-col gap-0.5 min-w-0">
              {/* breadcrumb */}
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span>Admin workspace</span>
                {/* breadcrumb-dot */}
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span>{routeLabel}</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 leading-tight">{routeLabel}</h2>
                {/* topbar-subtitle */}
                <p className="text-[12px] text-gray-400">Manage your admin tasks from one place.</p>
              </div>
            </div>
          </div>

          {/* topbar-meta */}
          <div className="flex items-center gap-4 shrink-0">
            {/* topbar-stat */}
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-[11px] text-gray-400">Environment</span>
              <strong className="text-md font-semibold text-gray-700">Local admin</strong>
            </div>

            {/* topbar-user topbar-user-button */}
            <button
              type="button"
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors"
              onClick={() => router.push("/profile")}
              aria-label="Open admin profile"
            >
              {/* avatar-dot avatar-dot-large */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-md font-bold">
                {user?.fullName?.charAt(0) || "A"}
              </div>
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <strong className="text-md font-semibold text-gray-900">
                  {user?.fullName || "Admin"}
                </strong>
                <span className="text-[11px] text-gray-400">{user?.role || "admin"}</span>
              </div>
            </button>
          </div>
        </header>

        {/* page-shell */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
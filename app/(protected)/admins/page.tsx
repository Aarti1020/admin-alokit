"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Search, ShieldCheck, UserCog, UserPlus, Users } from "lucide-react";
import toast from "react-hot-toast";
import { userApi } from "@/lib/api";
import type { AdminUser } from "@/lib/types";
import { classNames, formatDateTime } from "@/lib/utils";

const emptyAdminForm = {
  id: "",
  fullName: "",
  email: "",
  phone: "",
  role: "admin" as "admin" | "superAdmin",
  isActive: true,
  password: "",
  confirmPassword: ""
};

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | "admin" | "superAdmin">("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [form, setForm] = useState(emptyAdminForm);

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const response = await userApi.list({ limit: 100, search, status: statusFilter });
      const adminAccounts = response.data.filter((user) =>
        roleFilter ? user.role === roleFilter : user.role === "admin" || user.role === "superAdmin"
      );
      setAdmins(adminAccounts);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to fetch admin accounts");
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search, statusFilter]);

  useEffect(() => {
    void loadAdmins();
  }, [loadAdmins]);

  const resetForm = () => setForm(emptyAdminForm);

  const beginEdit = async (userId: string) => {
    try {
      const response = await userApi.get(userId);
      const user = response.data;
      if (user.role === "user") {
        toast.error("This page only manages admin accounts");
        return;
      }
      setForm({
        id: user.id || user._id || "",
        fullName: user.fullName ?? "",
        email: user.email ?? "",
        phone: user.phone || "",
        role: user.role as "admin" | "superAdmin",
        isActive: user.isActive ?? true,
        password: "",
        confirmPassword: ""
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load admin details");
    }
  };

  const submitAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (form.id) {
        await userApi.update(form.id, {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          role: form.role,
          isActive: form.isActive
        });
        toast.success("Admin account updated");
      } else {
        if (!form.password) throw new Error("Password is required for a new admin account");
        await userApi.create({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          role: form.role,
          isActive: form.isActive,
          password: form.password
        });
        toast.success("Admin account created");
      }
      resetForm();
      await loadAdmins();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save admin account");
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    if (!form.id) {
      toast.error("Select an admin before resetting a password");
      return;
    }
    if (!form.password) {
      toast.error("Enter a new password first");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Confirm password must match");
      return;
    }
    setResettingPassword(true);
    try {
      await userApi.resetPassword(form.id, { password: form.password, confirmPassword: form.confirmPassword });
      toast.success("Password reset");
      setForm((cur) => ({ ...cur, password: "", confirmPassword: "" }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to reset password");
    } finally {
      setResettingPassword(false);
    }
  };

  const toggleAdminStatus = async (userId: string, isActive: boolean) => {
    try {
      if (isActive) {
        await userApi.block(userId);
      } else {
        await userApi.unblock(userId);
      }
      toast.success("Admin status updated");
      await loadAdmins();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    }
  };

  const deleteAdmin = async (userId: string) => {
    try {
      await userApi.remove(userId);
      toast.success("Admin account deleted");
      if (form.id === userId) resetForm();
      await loadAdmins();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  };

  const adminInsights = useMemo(() => {
    const activeAdmins = admins.filter((u) => u.isActive).length;
    const superAdmins = admins.filter((u) => u.role === "superAdmin").length;
    const recentLogins = admins.filter((u) => {
      if (!u.lastLoginAt) return false;
      return Date.now() - new Date(u.lastLoginAt).getTime() < 1000 * 60 * 60 * 24 * 7;
    }).length;
    return [
      {
        label: "Admin accounts",
        value: admins.length,
        detail: `${activeAdmins} active admin users`,
        icon: Users
      },
      {
        label: "Super admins",
        value: superAdmins,
        detail: "Highest access level in this workspace",
        icon: ShieldCheck
      },
      {
        label: "Recent logins",
        value: recentLogins,
        detail: "Signed in during the last 7 days",
        icon: UserCog
      },
      {
        label: "Access mode",
        value: roleFilter || "all",
        detail: roleFilter ? `Filtering ${roleFilter} accounts` : "Showing admin and super admin accounts",
        icon: KeyRound
      }
    ];
  }, [admins, roleFilter]);

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

  const labelClass = "space-y-1.5 text-sm font-medium text-slate-700";

  const primaryButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60";

  const secondaryButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60";

  const dangerButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50 focus:outline-none focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-60";

  const roleBadgeClass = (role: AdminUser["role"]) =>
    classNames(
      "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
      role === "superAdmin"
        ? "bg-purple-50 text-purple-700 ring-purple-200"
        : "bg-blue-50 text-blue-700 ring-blue-200"
    );

  const statusBadgeClass = (isActive?: boolean) =>
    classNames(
      "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
      isActive ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"
    );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 bg-gradient-to-br from-blue-50 via-white to-slate-50 px-5 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
                <ShieldCheck size={14} />
                Admin access control
              </div>
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Manage admin accounts
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                Create admins, assign access levels, review account status, and manage secure password resets from one dashboard.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <button className={secondaryButtonClass} type="button" onClick={() => loadAdmins()}>
                Refresh admins
              </button>
              <button className={primaryButtonClass} type="button" onClick={resetForm}>
                <UserPlus size={16} />
                New admin
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {adminInsights.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                    <Icon size={20} />
                  </div>
                  <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                    {item.label}
                  </span>
                </div>
                <strong className="mt-4 block text-2xl font-bold text-slate-950">{item.value}</strong>
                <p className="mt-1 text-sm leading-5 text-slate-500">{item.detail}</p>
              </article>
            );
          })}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Find admin accounts</h2>
              <p className="mt-1 text-sm text-slate-500">Search and filter the admin list before editing access.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:w-auto">
              <label className="relative w-full sm:min-w-[320px] lg:w-[420px]">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="Search by name, email, or phone"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>

              <select
                className={inputClass}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as "" | "admin" | "superAdmin")}
              >
                <option value="">All admin roles</option>
                <option value="admin">Admin</option>
                <option value="superAdmin">Super admin</option>
              </select>

              <select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
              {admins.length} admin accounts loaded
            </span>
            {roleFilter ? <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">Role: {roleFilter}</span> : null}
            {statusFilter ? <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">Status: {statusFilter}</span> : null}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-5 sm:px-6">
              <h2 className="text-lg font-bold text-slate-950">Admin accounts</h2>
              <p className="mt-1 text-sm text-slate-500">Only admin and super admin users are shown here.</p>
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Admin</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last login</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm font-medium text-slate-500">
                        Loading admin accounts...
                      </td>
                    </tr>
                  ) : admins.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm font-medium text-slate-500">
                        No admin accounts match the current filters.
                      </td>
                    </tr>
                  ) : (
                    admins.map((user) => {
                      const userId = user.id || user._id || "";
                      return (
                        <tr key={userId} className="transition hover:bg-slate-50/80">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700 ring-1 ring-blue-100">
                                {(user.fullName || user.email || "A").slice(0, 1).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-950">{user.fullName}</p>
                                <p className="truncate text-slate-500">{user.email}</p>
                                <p className="truncate text-slate-400">{user.phone || "No phone"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={roleBadgeClass(user.role)}>{user.role === "superAdmin" ? "Super admin" : "Admin"}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={statusBadgeClass(user.isActive)}>{user.isActive ? "Active" : "Inactive"}</span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-slate-500">{formatDateTime(user.lastLoginAt)}</td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              <button type="button" className={secondaryButtonClass} onClick={() => beginEdit(userId)}>
                                Edit
                              </button>
                              <button type="button" className={secondaryButtonClass} onClick={() => toggleAdminStatus(userId, Boolean(user.isActive))}>
                                {user.isActive ? "Block" : "Unblock"}
                              </button>
                              <button type="button" className={dangerButtonClass} onClick={() => deleteAdmin(userId)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 lg:hidden">
              {loading ? (
                <div className="px-4 py-10 text-center text-sm font-medium text-slate-500">Loading admin accounts...</div>
              ) : admins.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm font-medium text-slate-500">No admin accounts match the current filters.</div>
              ) : (
                admins.map((user) => {
                  const userId = user.id || user._id || "";
                  return (
                    <article key={userId} className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700 ring-1 ring-blue-100">
                          {(user.fullName || user.email || "A").slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-bold text-slate-950">{user.fullName}</h3>
                            <span className={statusBadgeClass(user.isActive)}>{user.isActive ? "Active" : "Inactive"}</span>
                          </div>
                          <p className="mt-1 break-all text-sm text-slate-500">{user.email}</p>
                          <p className="mt-0.5 text-sm text-slate-400">{user.phone || "No phone"}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className={roleBadgeClass(user.role)}>{user.role === "superAdmin" ? "Super admin" : "Admin"}</span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                              Last login: {formatDateTime(user.lastLoginAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <button type="button" className={secondaryButtonClass} onClick={() => beginEdit(userId)}>
                          Edit
                        </button>
                        <button type="button" className={secondaryButtonClass} onClick={() => toggleAdminStatus(userId, Boolean(user.isActive))}>
                          {user.isActive ? "Block" : "Unblock"}
                        </button>
                        <button type="button" className={dangerButtonClass} onClick={() => deleteAdmin(userId)}>
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-6 xl:self-start">
            <div className="border-b border-slate-200 px-4 py-5 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">{form.id ? "Edit admin" : "Create admin"}</h2>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Manage profile fields, access level, active state, and password resets.
                  </p>
                </div>
                {form.id ? <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">Editing</span> : null}
              </div>
            </div>

            <form className="space-y-6 p-4 sm:p-6" onSubmit={submitAdmin}>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Profile</h3>
                  <p className="mt-1 text-sm text-slate-500">Set the admin identity and access level.</p>
                </div>

                <label className={labelClass}>
                  <span>Full name</span>
                  <input
                    className={inputClass}
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="Enter full name"
                    required
                  />
                </label>

                <label className={labelClass}>
                  <span>Email</span>
                  <input
                    className={inputClass}
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@example.com"
                    required
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <label className={labelClass}>
                    <span>Phone</span>
                    <input
                      className={inputClass}
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="Optional phone number"
                    />
                  </label>

                  <label className={labelClass}>
                    <span>Role</span>
                    <select
                      className={inputClass}
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "superAdmin" })}
                    >
                      <option value="admin">Admin</option>
                      <option value="superAdmin">Super admin</option>
                    </select>
                  </label>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50/50">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    <strong className="block text-sm font-semibold text-slate-950">Active account</strong>
                    <span className="mt-1 block text-sm leading-5 text-slate-500">
                      Turn this off to block sign-in without deleting the admin record.
                    </span>
                  </span>
                </label>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                    {form.id ? "Password reset" : "Initial password"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {form.id ? "Set a new password for the selected admin." : "Password is required when creating a new admin."}
                  </p>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <label className={labelClass}>
                    <span>{form.id ? "New password" : "Password"}</span>
                    <input
                      className={inputClass}
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Enter password"
                    />
                  </label>

                  <label className={labelClass}>
                    <span>Confirm password</span>
                    <input
                      className={inputClass}
                      type="password"
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      placeholder="Repeat password"
                    />
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:flex-wrap">
                <button className={primaryButtonClass} type="submit" disabled={saving}>
                  {saving ? "Saving..." : form.id ? "Update admin" : "Create admin"}
                </button>

                {form.id ? (
                  <button className={secondaryButtonClass} type="button" onClick={resetPassword} disabled={resettingPassword}>
                    {resettingPassword ? "Resetting..." : "Reset password"}
                  </button>
                ) : null}

                <button className={secondaryButtonClass} type="button" onClick={resetForm}>
                  Reset form
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

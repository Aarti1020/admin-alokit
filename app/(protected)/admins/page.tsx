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
      const response = await userApi.list({
        limit: 100,
        search,
        status: statusFilter
      });
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
        if (!form.password) {
          throw new Error("Password is required for a new admin account");
        }

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
      await userApi.resetPassword(form.id, {
        password: form.password,
        confirmPassword: form.confirmPassword
      });
      toast.success("Password reset");
      setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to reset password");
    } finally {
      setResettingPassword(false);
    }
  };

  const adminInsights = useMemo(() => {
    const activeAdmins = admins.filter((user) => user.isActive).length;
    const superAdmins = admins.filter((user) => user.role === "superAdmin").length;
    const recentLogins = admins.filter((user) => {
      if (!user.lastLoginAt) return false;
      return Date.now() - new Date(user.lastLoginAt).getTime() < 1000 * 60 * 60 * 24 * 7;
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

  return (
    <div className="stack-lg">
      <section className="stats-grid">
        {adminInsights.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="panel stat-card metric-card">
              <div className="metric-card-head">
                <div className="metric-icon">
                  <Icon size={18} />
                </div>
                <span>{item.label}</span>
              </div>
              <strong>{item.value}</strong>
              <p className="mini-text">{item.detail}</p>
            </article>
          );
        })}
      </section>

      <section className="panel stack-md">
        <div className="section-heading">
          <div>
            <h3>Admin operations</h3>
            <p>Create, update, and secure admin or super admin accounts from one place.</p>
          </div>
          <button className="ghost-button" type="button" onClick={() => loadAdmins()}>
            Refresh admins
          </button>
        </div>

        <div className="product-command-bar">
          <label className="search-input">
            <Search size={18} />
            <input
              placeholder="Search by name, email, or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as "" | "admin" | "superAdmin")}>
            <option value="">All admin roles</option>
            <option value="admin">Admin</option>
            <option value="superAdmin">Super admin</option>
          </select>
        </div>

        <div className="product-command-bar">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <div className="product-command-meta">
            <div className="pill">{admins.length} admin accounts loaded</div>
            <button className="ghost-button" type="button" onClick={resetForm}>
              <UserPlus size={16} />
              <span>New admin</span>
            </button>
          </div>
        </div>
      </section>

      <div className="two-column-grid">
        <section className="panel stack-md">
          <div className="section-heading">
            <div>
              <h3>Admin accounts</h3>
              <p>Only admin and super admin users are shown here.</p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5}>Loading admin accounts...</td>
                  </tr>
                ) : admins.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No admin accounts match the current filters.</td>
                  </tr>
                ) : (
                  admins.map((user) => {
                    const userId = user.id || user._id || "";
                    return (
                      <tr key={userId}>
                        <td>
                          <strong>{user.fullName}</strong>
                          <div className="mini-text">{user.email}</div>
                          <div className="mini-text">{user.phone || "No phone"}</div>
                        </td>
                        <td>{user.role === "superAdmin" ? "Super admin" : "Admin"}</td>
                        <td>
                          <span
                            className={classNames(
                              "pill",
                              user.isActive ? "status-pill-positive" : "status-pill-muted"
                            )}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>{formatDateTime(user.lastLoginAt)}</td>
                        <td>
                          <div className="row-actions row-actions-wrap">
                            <button type="button" className="ghost-button" onClick={() => beginEdit(userId)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="ghost-button"
                              onClick={async () => {
                                try {
                                  if (user.isActive) {
                                    await userApi.block(userId);
                                  } else {
                                    await userApi.unblock(userId);
                                  }
                                  toast.success("Admin status updated");
                                  await loadAdmins();
                                } catch (error) {
                                  toast.error(error instanceof Error ? error.message : "Action failed");
                                }
                              }}
                            >
                              {user.isActive ? "Block" : "Unblock"}
                            </button>
                            <button
                              type="button"
                              className="ghost-button danger"
                              onClick={async () => {
                                try {
                                  await userApi.remove(userId);
                                  toast.success("Admin account deleted");
                                  if (form.id === userId) {
                                    resetForm();
                                  }
                                  await loadAdmins();
                                } catch (error) {
                                  toast.error(error instanceof Error ? error.message : "Delete failed");
                                }
                              }}
                            >
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
        </section>

        <section className="panel stack-md">
          <div className="section-heading">
            <div>
              <h3>{form.id ? "Edit admin" : "Create admin"}</h3>
              <p>Manage profile fields, access level, active state, and password resets for admin users.</p>
            </div>
          </div>

          <form className="stack-md" onSubmit={submitAdmin}>
            <div className="form-section">
              <div className="form-section-head">
                <h4>Profile</h4>
                <p>Set the admin identity, role, and active state used across the dashboard.</p>
              </div>
              <div className="stack-sm">
                <label className="field">
                  <span>Full name</span>
                  <input
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    required
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </label>
                <div className="field-row">
                  <label className="field">
                    <span>Phone</span>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Role</span>
                    <select
                      value={form.role}
                      onChange={(e) =>
                        setForm({ ...form, role: e.target.value as "admin" | "superAdmin" })
                      }
                    >
                      <option value="admin">Admin</option>
                      <option value="superAdmin">Super admin</option>
                    </select>
                  </label>
                </div>
                <label className="toggle-card">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  <div>
                    <strong>Active account</strong>
                    <span>Turn this off to block sign-in without deleting the admin record.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-head">
                <h4>{form.id ? "Password reset" : "Initial password"}</h4>
                <p>{form.id ? "Set a new password for the selected admin." : "Password is required when creating a new admin."}</p>
              </div>
              <div className="stack-sm">
                <label className="field">
                  <span>{form.id ? "New password" : "Password"}</span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Confirm password</span>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  />
                </label>
              </div>
            </div>

            <div className="row-actions row-actions-wrap">
              <button className="primary-button" type="submit" disabled={saving}>
                {saving ? "Saving..." : form.id ? "Update admin" : "Create admin"}
              </button>
              {form.id ? (
                <button
                  className="ghost-button"
                  type="button"
                  onClick={resetPassword}
                  disabled={resettingPassword}
                >
                  {resettingPassword ? "Resetting..." : "Reset password"}
                </button>
              ) : null}
              <button className="ghost-button" type="button" onClick={resetForm}>
                Reset form
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

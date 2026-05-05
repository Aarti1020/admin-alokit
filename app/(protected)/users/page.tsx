"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Search, UserCog, UserPlus, Users } from "lucide-react";
import toast from "react-hot-toast";
import { userApi } from "@/lib/api";
import type { AdminUser, Order } from "@/lib/types";
import { classNames, formatCurrency, formatDateTime } from "@/lib/utils";

const emptyUserForm = {
  id: "",
  fullName: "",
  email: "",
  phone: "",
  role: "user" as const,
  isActive: true,
  password: "",
  confirmPassword: ""
};

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [form, setForm] = useState(emptyUserForm);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await userApi.list({
        limit: 100,
        search,
        role: "user",
        status: statusFilter
      });
      setUsers(response.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to fetch users");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const loadOrders = useCallback(async (userId: string) => {
    setSelectedUserId(userId);
    setLoadingOrders(true);
    try {
      const response = await userApi.orders(userId);
      setOrders(response.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to fetch orders");
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const resetForm = () => setForm(emptyUserForm);

  const beginEdit = async (userId: string) => {
    try {
      const response = await userApi.get(userId);
      const user = response.data;

      if (user.role !== "user") {
        toast.error("This page only manages customer users");
        return;
      }

      setForm({
        id: user.id || user._id || "",
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        role: "user",
        isActive: user.isActive,
        password: "",
        confirmPassword: ""
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load user details");
    }
  };

  const submitUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      if (form.id) {
        await userApi.update(form.id, {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          role: "user",
          isActive: form.isActive
        });
        toast.success("User updated");
      } else {
        if (!form.password) {
          throw new Error("Password is required for a new user");
        }

        await userApi.create({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          role: "user",
          isActive: form.isActive,
          password: form.password
        });
        toast.success("User created");
      }

      resetForm();
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save user");
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    if (!form.id) {
      toast.error("Select a user before resetting a password");
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

  const userInsights = useMemo(() => {
    const activeUsers = users.filter((user) => user.isActive).length;
    const recentLogins = users.filter((user) => {
      if (!user.lastLoginAt) return false;
      return Date.now() - new Date(user.lastLoginAt).getTime() < 1000 * 60 * 60 * 24 * 7;
    }).length;

    return [
      {
        label: "Visible users",
        value: users.length,
        detail: `${activeUsers} active customer accounts`,
        icon: Users
      },
      {
        label: "Customer scope",
        value: "Users only",
        detail: "Admin and super admin accounts are excluded here",
        icon: UserPlus
      },
      {
        label: "Recent logins",
        value: recentLogins,
        detail: "Signed in during the last 7 days",
        icon: UserCog
      },
      {
        label: "Orders loaded",
        value: orders.length,
        detail: selectedUserId ? "Order history for the selected user" : "Select a user to inspect history",
        icon: KeyRound
      }
    ];
  }, [orders.length, selectedUserId, users]);

  return (
    <div className="stack-lg">
      <section className="stats-grid">
        {userInsights.map((item) => {
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
            <h3>User operations</h3>
            <p>Manage customer accounts, reset passwords, review order history, and control customer access.</p>
          </div>
          <button className="ghost-button" type="button" onClick={() => loadUsers()}>
            Refresh users
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
          <div className="pill">Only users</div>
        </div>

        <div className="product-command-bar">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <div className="product-command-meta">
            <div className="pill">{users.length} users loaded</div>
            <button className="ghost-button" type="button" onClick={resetForm}>
              <UserPlus size={16} />
              <span>New user</span>
            </button>
          </div>
        </div>
      </section>

      <div className="two-column-grid">
        <section className="panel stack-md">
          <div className="section-heading">
            <div>
              <h3>Users</h3>
              <p>Inspect customer accounts, open order history, and jump into editing.</p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Status</th>
                  <th>Last login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4}>Loading users...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No users match the current filters.</td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const userId = user.id || user._id || "";
                    return (
                      <tr key={userId}>
                        <td>
                          <strong>{user.fullName}</strong>
                          <div className="mini-text">{user.email}</div>
                          <div className="mini-text">{user.phone || "No phone"}</div>
                        </td>
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
                            <button type="button" className="ghost-button" onClick={() => loadOrders(userId)}>
                              Orders
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
                                  toast.success("User status updated");
                                  await loadUsers();
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
                                  toast.success("User deleted");
                                  if (selectedUserId === userId) {
                                    setSelectedUserId("");
                                    setOrders([]);
                                  }
                                  if (form.id === userId) {
                                    resetForm();
                                  }
                                  await loadUsers();
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

        <section className="stack-lg">
          <section className="panel stack-md">
            <div className="section-heading">
              <div>
                <h3>{form.id ? "Edit user" : "Create user"}</h3>
                <p>Manage customer profile fields, active state, and password resets from one place.</p>
              </div>
            </div>

            <form className="stack-md" onSubmit={submitUser}>
              <div className="form-section">
                <div className="form-section-head">
                  <h4>Profile</h4>
                  <p>Set the customer identity and active state used across the storefront.</p>
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
                  <label className="field">
                    <span>Phone</span>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </label>
                  <label className="toggle-card">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                    <div>
                      <strong>Active account</strong>
                      <span>Turn this off to block sign-in without deleting the user record.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-head">
                  <h4>{form.id ? "Password reset" : "Initial password"}</h4>
                  <p>{form.id ? "Set a new password for the selected user." : "Password is required when creating a new user."}</p>
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
                  {saving ? "Saving..." : form.id ? "Update user" : "Create user"}
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

          <section className="panel stack-md">
            <div className="section-heading">
              <div>
                <h3>User orders</h3>
                <p>{selectedUserId ? "Order history for the selected user." : "Select a user to inspect purchases."}</p>
              </div>
            </div>
            {loadingOrders ? (
              <div className="empty-state">Loading order history...</div>
            ) : orders.length === 0 ? (
              <div className="empty-state">No orders loaded yet.</div>
            ) : (
              <div className="stack-sm">
                {orders.map((order) => (
                  <div key={order._id} className="list-card">
                    <div>
                      <strong>{order.orderNumber}</strong>
                      <div className="mini-text">{formatDateTime(order.createdAt)}</div>
                      <div className="mini-text">
                        {order.orderStatus} / {order.paymentStatus}
                      </div>
                    </div>
                    <div className="pill">{formatCurrency(order.pricing.total)}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </div>
  );
}

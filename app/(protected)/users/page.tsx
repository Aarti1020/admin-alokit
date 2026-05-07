"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  RefreshCw,
  Search,
  Shield,
  UserCog,
  UserPlus,
  Users,
  X,
} from "lucide-react";
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
  confirmPassword: "",
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
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await userApi.list({
        limit: 100,
        search,
        role: "user",
        status: statusFilter,
      });
      setUsers(response.data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to fetch users",
      );
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
      toast.error(
        error instanceof Error ? error.message : "Unable to fetch orders",
      );
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const resetForm = () => setForm(emptyUserForm);

  const openNewUserModal = () => {
    resetForm();
    setIsUserModalOpen(true);
  };

  const closeUserModal = () => {
    setIsUserModalOpen(false);
    resetForm();
  };

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
        confirmPassword: "",
      });
      setIsUserModalOpen(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load user details",
      );
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
          isActive: form.isActive,
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
          password: form.password,
        });
        toast.success("User created");
      }

      resetForm();
      setIsUserModalOpen(false);
      await loadUsers();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save user",
      );
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
        confirmPassword: form.confirmPassword,
      });
      toast.success("Password reset");
      setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to reset password",
      );
    } finally {
      setResettingPassword(false);
    }
  };

  const userInsights = useMemo(() => {
    const activeUsers = users.filter((user) => user.isActive).length;
    const recentLogins = users.filter((user) => {
      if (!user.lastLoginAt) return false;
      return (
        Date.now() - new Date(user.lastLoginAt).getTime() <
        1000 * 60 * 60 * 24 * 7
      );
    }).length;

    return [
      {
        label: "Visible users",
        value: users.length,
        detail: `${activeUsers} active customer accounts`,
        icon: Users,
      },
      {
        label: "Customer scope",
        value: "Users only",
        detail: "Admin and super admin accounts are excluded here",
        icon: UserPlus,
      },
      {
        label: "Recent logins",
        value: recentLogins,
        detail: "Signed in during the last 7 days",
        icon: UserCog,
      },
      {
        label: "Orders loaded",
        value: orders.length,
        detail: selectedUserId
          ? "Order history for the selected user"
          : "Select a user to inspect history",
        icon: KeyRound,
      },
    ];
  }, [orders.length, selectedUserId, users]);

  const selectedUser = useMemo(() => {
    return users.find((user) => (user.id || user._id || "") === selectedUserId);
  }, [selectedUserId, users]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {userInsights.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon size={18} />
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {item.label}
                </span>
              </div>
              <strong className="mt-4 block text-2xl font-bold text-slate-950">
                {item.value}
              </strong>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {item.detail}
              </p>
            </article>
          );
        })}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
              <Shield size={14} />
              Customer management
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              User operations
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">
              Manage customer accounts, reset passwords, review order history,
              and control customer access.
            </p>
          </div>

          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={() => loadUsers()}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh users
          </button>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_220px_auto] lg:items-center">
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              placeholder="Search by name, email, or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <select
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
            <div className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-600">
              {users.length} users loaded
            </div>
            <button
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              type="button"
              onClick={openNewUserModal}
            >
              <UserPlus size={16} />
              New user
            </button>
          </div>
        </div>
      </section>
      <div className="grid gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-6">
            <h2 className="text-lg font-bold text-slate-950">Users</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Inspect customer accounts, open order history, and jump into
              editing.
            </p>
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    User
                  </th>
                  <th className="px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Last login
                  </th>
                  <th className="px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td
                      className="px-6 py-10 text-center text-sm text-slate-500"
                      colSpan={4}
                    >
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td
                      className="px-6 py-10 text-center text-sm text-slate-500"
                      colSpan={4}
                    >
                      No users match the current filters.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const userId = user.id || user._id || "";
                    const isSelected = selectedUserId === userId;
                    return (
                      <tr
                        key={userId}
                        className={classNames(
                          "transition hover:bg-slate-50",
                          isSelected ? "bg-indigo-50/60" : "",
                        )}
                      >
                        <td className="px-6 py-4 align-top">
                          <strong className="block text-sm font-semibold text-slate-950">
                            {user.fullName}
                          </strong>
                          <div className="mt-1 text-sm text-slate-500">
                            {user.email}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-400">
                            {user.phone || "No phone"}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <span
                            className={classNames(
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                              user.isActive
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500",
                            )}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-top text-sm text-slate-600">
                          {formatDateTime(user.lastLoginAt)}
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                              onClick={() => beginEdit(userId)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                              onClick={() => loadOrders(userId)}
                            >
                              Orders
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
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
                                  toast.error(
                                    error instanceof Error
                                      ? error.message
                                      : "Action failed",
                                  );
                                }
                              }}
                            >
                              {user.isActive ? "Block" : "Unblock"}
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
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
                                    setIsUserModalOpen(false);
                                  }
                                  await loadUsers();
                                } catch (error) {
                                  toast.error(
                                    error instanceof Error
                                      ? error.message
                                      : "Delete failed",
                                  );
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

          <div className="divide-y divide-slate-100 lg:hidden">
            {loading ? (
              <div className="p-6 text-center text-sm text-slate-500">
                Loading users...
              </div>
            ) : users.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                No users match the current filters.
              </div>
            ) : (
              users.map((user) => {
                const userId = user.id || user._id || "";
                const isSelected = selectedUserId === userId;
                return (
                  <article
                    key={userId}
                    className={classNames(
                      "p-4",
                      isSelected ? "bg-indigo-50/60" : "bg-white",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-slate-950">
                          {user.fullName}
                        </h3>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {user.email}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {user.phone || "No phone"}
                        </p>
                      </div>
                      <span
                        className={classNames(
                          "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
                          user.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      Last login:{" "}
                      <span className="font-semibold text-slate-700">
                        {formatDateTime(user.lastLoginAt)}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        onClick={() => beginEdit(userId)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                        onClick={() => loadOrders(userId)}
                      >
                        Orders
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
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
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "Action failed",
                            );
                          }
                        }}
                      >
                        {user.isActive ? "Block" : "Unblock"}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
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
                              setIsUserModalOpen(false);
                            }
                            await loadUsers();
                          } catch (error) {
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "Delete failed",
                            );
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-6">
            <h2 className="text-lg font-bold text-slate-950">User orders</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {selectedUser
                ? `Order history for ${selectedUser.fullName}.`
                : selectedUserId
                  ? "Order history for the selected user."
                  : "Select a user to inspect purchases."}
            </p>
          </div>

          <div className="p-4 sm:p-6">
            {loadingOrders ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Loading order history...
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                No orders loaded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div
                    key={order._id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <strong className="block truncate text-sm font-bold text-slate-950">
                        {order.orderNumber}
                      </strong>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatDateTime(order.createdAt)}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded-full bg-white px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">
                          {order.orderStatus}
                        </span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">
                          {order.paymentStatus}
                        </span>
                      </div>
                    </div>
                    <div className="inline-flex w-fit rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700">
                      {formatCurrency(order.pricing.total)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
      {isUserModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0"
            onClick={closeUserModal}
            aria-hidden="true"
          />
          <div className="relative z-10 max-h-screen w-full overflow-y-auto sm:max-h-[calc(100vh-2rem)]">
            <div className="mx-auto flex min-h-screen items-end justify-center sm:min-h-0 sm:items-center">
              <section className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 sm:p-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">
                      {form.id ? "Edit user" : "Create user"}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Manage customer profile fields, active state, and password
                      resets from one place.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                    onClick={closeUserModal}
                    aria-label="Close user form"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form
                  className="max-h-[calc(100vh-10rem)] space-y-5 overflow-y-auto p-4 sm:p-6"
                  onSubmit={submitUser}
                >
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-950">
                        Profile
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Set the customer identity and active state used across
                        the storefront.
                      </p>
                    </div>

                    <div className="mt-4 grid gap-4">
                      <label className="grid gap-1.5">
                        <span className="text-sm font-semibold text-slate-700">
                          Full name
                        </span>
                        <input
                          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                          value={form.fullName}
                          onChange={(e) =>
                            setForm({ ...form, fullName: e.target.value })
                          }
                          required
                        />
                      </label>

                      <label className="grid gap-1.5">
                        <span className="text-sm font-semibold text-slate-700">
                          Email
                        </span>
                        <input
                          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                          type="email"
                          value={form.email}
                          onChange={(e) =>
                            setForm({ ...form, email: e.target.value })
                          }
                          required
                        />
                      </label>

                      <label className="grid gap-1.5">
                        <span className="text-sm font-semibold text-slate-700">
                          Phone
                        </span>
                        <input
                          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                          value={form.phone}
                          onChange={(e) =>
                            setForm({ ...form, phone: e.target.value })
                          }
                        />
                      </label>

                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:bg-slate-50">
                        <div className="relative mt-0.5 shrink-0">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={form.isActive}
                            onChange={(e) =>
                              setForm({ ...form, isActive: e.target.checked })
                            }
                          />
                          <div className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-indigo-600" />
                          <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                        </div>
                        <div>
                          <strong className="block text-sm font-semibold text-slate-900">
                            Active account
                          </strong>
                          <span className="mt-0.5 block text-sm leading-6 text-slate-500">
                            Turn this off to block sign-in without deleting the
                            user record.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-950">
                        {form.id ? "Password reset" : "Initial password"}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {form.id
                          ? "Set a new password for the selected user."
                          : "Password is required when creating a new user."}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-4">
                      <label className="grid gap-1.5">
                        <span className="text-sm font-semibold text-slate-700">
                          {form.id ? "New password" : "Password"}
                        </span>
                        <input
                          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                          type="password"
                          value={form.password}
                          onChange={(e) =>
                            setForm({ ...form, password: e.target.value })
                          }
                        />
                      </label>

                      <label className="grid gap-1.5">
                        <span className="text-sm font-semibold text-slate-700">
                          Confirm password
                        </span>
                        <input
                          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                          type="password"
                          value={form.confirmPassword}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              confirmPassword: e.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <button
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                      type="submit"
                      disabled={saving}
                    >
                      {saving
                        ? "Saving..."
                        : form.id
                          ? "Update user"
                          : "Create user"}
                    </button>
                    {form.id ? (
                      <button
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        type="button"
                        onClick={resetPassword}
                        disabled={resettingPassword}
                      >
                        {resettingPassword ? "Resetting..." : "Reset password"}
                      </button>
                    ) : null}
                    <button
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      type="button"
                      onClick={resetForm}
                    >
                      Reset form
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        </div>
      ) : null}{" "}
    </div>
  );
}

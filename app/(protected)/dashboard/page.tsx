"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Boxes,
  ChevronRight,
  Clock,
  CreditCard,
  PackageSearch,
  ShoppingCart,
  TrendingUp,
  Users2,
} from "lucide-react";
import toast from "react-hot-toast";
import { dashboardApi } from "@/lib/api";
import type { DashboardAnalytics } from "@/lib/types";
import { classNames, formatCurrency, formatDateTime } from "@/lib/utils";

type RouteParams = Record<string, string | undefined>;

export default function DashboardPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .get()
      .then((response) => setAnalytics(response.data))
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "Failed to load dashboard analytics."
        )
      )
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    if (!analytics) return null;

    const paidOrders = analytics.recentOrders.filter(
      (order) => order.paymentStatus === "paid"
    ).length;
    const processingOrders = analytics.recentOrders.filter((order) =>
      ["created", "pending", "confirmed", "processing", "packed"].includes(order.orderStatus)
    ).length;

    return {
      users: analytics.overview.totalUsers,
      products: analytics.overview.totalProducts,
      orders: analytics.overview.totalOrders,
      revenue: analytics.overview.revenue,
      lowStock: analytics.overview.lowStockProductsCount,
      paidOrders,
      processingOrders,
    };
  }, [analytics]);

  const buildRoute = (pathname: string, params?: RouteParams) => {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value) search.set(key, value);
    });
    const query = search.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const openRoute = (pathname: string, params?: RouteParams) => {
    router.push(buildRoute(pathname, params));
  };

  if (loading) {
    return (
      <div className="screen-center">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "3px solid var(--surface-brand-soft)",
              borderTopColor: "var(--accent)",
              animation: "spin 0.7s linear infinite",
            }}
          />
          <span style={{ fontSize: "0.9rem", color: "var(--text-soft)", fontWeight: 600 }}>
            Loading dashboard...
          </span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!analytics || !summary) {
    return (
      <div className="screen-center">
        <span>Dashboard data is unavailable.</span>
      </div>
    );
  }

  const latestOrder = analytics.recentOrders[0];
  const orderRoute = (orderId?: string) =>
    orderId ? buildRoute("/orders", { orderId }) : "/orders";

  const statusCards = [
    {
      label: "Low stock",
      value: String(summary.lowStock),
      helper: summary.lowStock > 0 ? "Needs attention" : "All items healthy",
      href: buildRoute("/products", { stock: "low" }),
      urgent: summary.lowStock > 0,
    },
    {
      label: "Active orders",
      value: String(summary.processingOrders),
      helper: "Currently in fulfillment",
      href: buildRoute("/orders", { status: "processing" }),
      urgent: false,
    },
    {
      label: "Last order",
      value: latestOrder ? formatDateTime(latestOrder.createdAt) : "No orders",
      helper: "Most recent activity",
      href: latestOrder?._id ? orderRoute(latestOrder._id) : "/orders",
      urgent: false,
    },
  ];

  const primaryCards = [
    {
      label: "Total users",
      value: summary.users.toLocaleString(),
      detail: "Customer accounts on the platform",
      icon: Users2,
      href: "/users",
    },
    {
      label: "Total products",
      value: summary.products.toLocaleString(),
      detail: "Products available in the admin catalog",
      icon: Boxes,
      href: "/products",
    },
    {
      label: "Total orders",
      value: summary.orders.toLocaleString(),
      detail: `${summary.processingOrders} recently in active fulfillment`,
      icon: ShoppingCart,
      href: "/orders",
    },
    {
      label: "Paid revenue",
      value: formatCurrency(summary.revenue),
      detail: `${summary.paidOrders} paid orders in the recent activity list`,
      icon: CreditCard,
      href: buildRoute("/orders", { paymentStatus: "paid" }),
    },
  ];

  const priorityChecks = [
    {
      title: "Stock health",
      body:
        summary.lowStock > 0
          ? "Some products are below the stock threshold."
          : "Inventory is in a healthy range.",
      icon: AlertTriangle,
      href: buildRoute("/products", { stock: "low" }),
    },
    {
      title: "Order flow",
      body: `${summary.processingOrders} recent orders are still being processed.`,
      icon: ShoppingCart,
      href: buildRoute("/orders", { status: "processing" }),
    },
    {
      title: "Revenue signal",
      body: `Recorded paid revenue is ${formatCurrency(summary.revenue)}.`,
      icon: TrendingUp,
      href: buildRoute("/orders", { paymentStatus: "paid" }),
    },
  ];

  const getOrderStatusStyle = (orderStatus: string, paymentStatus: string) => {
    const positive =
      ["paid", "delivered"].includes(paymentStatus) || orderStatus === "delivered";
    if (positive) return "status-pill-positive";
    return "status-pill-muted";
  };

  return (
    <div className="stack-lg dashboard-page">

      {/* ── Hero ── */}
      <section className="dashboard-hero panel">
        <div className="dashboard-hero-copy stack-sm">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <h3>Dashboard overview</h3>
              <p className="mini-text">
                Quick access to orders, products, customers, and stock status.
              </p>
            </div>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              background: "var(--surface-muted)",
              border: "1px solid var(--border)",
              borderRadius: 999,
              padding: "0.4rem 0.85rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}>
              <Clock size={12} />
              Updated just now
            </span>
          </div>

          <div className="dashboard-status-grid">
            {statusCards.map((item) => (
              <button
                key={item.label}
                type="button"
                className="dashboard-status-card dashboard-interactive-card"
                onClick={() => router.push(item.href)}
                aria-label={`Open ${item.label.toLowerCase()} details`}
              >
                <span>{item.label}</span>
                <strong style={{ color: item.urgent ? "var(--warning)" : "var(--text)" }}>
                  {item.value}
                </strong>
                <small style={{ color: item.urgent ? "var(--warning)" : undefined }}>
                  {item.helper}
                </small>
                <span className="dashboard-action-hint" style={{ marginTop: "0.5rem" }}>
                  Open <ChevronRight size={14} />
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Primary metric cards ── */}
      <section className="dashboard-compact-grid">
        {primaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              className="panel dashboard-compact-card dashboard-interactive-card"
              onClick={() => router.push(card.href)}
              aria-label={`Open ${card.label.toLowerCase()}`}
            >
              <div className="dashboard-compact-head">
                <div className="metric-icon dashboard-small-icon" aria-hidden="true">
                  <Icon size={16} />
                </div>
                <span>{card.label}</span>
                <span className="dashboard-action-hint">
                  Open <ChevronRight size={14} />
                </span>
              </div>
              <strong>{card.value}</strong>
              <p>{card.detail}</p>
            </button>
          );
        })}
      </section>

      {/* ── Bottom: orders + sidebar ── */}
      <section className="dashboard-secondary-grid">

        {/* Recent orders table */}
        <article className="panel dashboard-table-panel">
          <div className="section-heading" style={{ marginBottom: "1rem" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.15rem" }}>Recent orders</h3>
              <p style={{ margin: "0.3rem 0 0" }} className="muted">
                Latest customer orders and payment status.
              </p>
            </div>
            <button
              type="button"
              className="ghost-button"
              style={{ fontSize: "0.85rem", padding: "0.5rem 0.9rem", borderRadius: 12 }}
              onClick={() => router.push("/orders")}
            >
              All orders <ChevronRight size={14} />
            </button>
          </div>

          {analytics.recentOrders.length === 0 ? (
            <div className="empty-state">No recent orders are available yet.</div>
          ) : (
            <div className="dashboard-order-table">
              <div className="dashboard-order-header">
                <span>Order</span>
                <span>Customer</span>
                <span>Status</span>
                <span>Total</span>
              </div>

              {analytics.recentOrders.map((order) => (
                <button
                  key={order._id}
                  type="button"
                  className="dashboard-order-row dashboard-interactive-row"
                  onClick={() => router.push(orderRoute(order._id))}
                  aria-label={`Open order ${order.orderNumber}`}
                >
                  <div className="dashboard-order-main">
                    <strong>{order.orderNumber}</strong>
                    <small>{formatDateTime(order.createdAt)}</small>
                  </div>

                  <div className="dashboard-order-main">
                    <strong>{order.user?.fullName || order.user?.email || "Unknown"}</strong>
                    <small>{order.user?.email || "Customer record"}</small>
                  </div>

                  <div className="dashboard-order-status">
                    <span className={classNames("pill", getOrderStatusStyle(order.orderStatus, order.paymentStatus))}>
                      {order.orderStatus}
                    </span>
                    <small>{order.paymentStatus}</small>
                  </div>

                  <div className="dashboard-order-total">
                    <strong>{formatCurrency(order.pricing?.total)}</strong>
                    <span className="dashboard-row-action">
                      Open <ChevronRight size={14} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </article>

        {/* Right sidebar */}
        <div className="stack-md">

          {/* Low stock watchlist */}
          <article className="panel dashboard-side-panel">
            <div className="section-heading" style={{ marginBottom: "0.85rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Low stock</h3>
                <p style={{ margin: "0.25rem 0 0" }} className="muted">
                  {summary.lowStock} item{summary.lowStock !== 1 ? "s" : ""} need review.
                </p>
              </div>
              <button
                type="button"
                className="ghost-button"
                style={{ fontSize: "0.82rem", padding: "0.42rem 0.75rem", borderRadius: 10 }}
                onClick={() => openRoute("/products", { stock: "low" })}
              >
                View all
              </button>
            </div>

            {analytics.lowStockProducts.length === 0 ? (
              <div className="empty-state" style={{ padding: "1.5rem 1rem" }}>
                No low stock products right now.
              </div>
            ) : (
              <div className="stack-sm">
                {analytics.lowStockProducts.map((product) => {
                  const isCritical =
                    product.stock <= Math.floor((product.lowStockThreshold || 5) / 2);
                  return (
                    <button
                      key={product._id}
                      type="button"
                      className="dashboard-stock-card dashboard-interactive-row"
                      onClick={() => openRoute("/products", { productId: product._id })}
                      aria-label={`Open product ${product.title || product.name}`}
                    >
                      <div className="dashboard-stock-main">
                        <div className="metric-icon dashboard-small-icon" aria-hidden="true">
                          <PackageSearch size={15} />
                        </div>
                        <div>
                          <strong style={{ display: "block", fontSize: "0.9rem" }}>
                            {product.title || product.name}
                          </strong>
                          <div className="mini-text" style={{ marginTop: 2 }}>
                            {product.sku || "No SKU"}
                          </div>
                        </div>
                      </div>

                      <div className="dashboard-stock-meta">
                        <span
                          className="pill"
                          style={
                            isCritical
                              ? {
                                  background: "var(--surface-danger-soft)",
                                  color: "var(--danger)",
                                  borderColor: "rgba(220,38,38,0.12)",
                                }
                              : {
                                  background: "var(--surface-warning-soft)",
                                  color: "#8a4b06",
                                  borderColor: "rgba(217,119,6,0.12)",
                                }
                          }
                        >
                          {product.stock} / {product.lowStockThreshold || 0}
                        </span>
                        <span className="dashboard-row-action">
                          <ChevronRight size={14} />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </article>

          {/* Priority checks */}
          <article className="panel dashboard-side-panel">
            <div style={{ marginBottom: "0.85rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Priority checks</h3>
              <p style={{ margin: "0.25rem 0 0" }} className="muted">
                Simple signals to review first.
              </p>
            </div>

            <div className="dashboard-focus-list">
              {priorityChecks.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.title}
                    type="button"
                    className="dashboard-focus-item dashboard-interactive-row"
                    onClick={() => router.push(item.href)}
                    aria-label={`Open ${item.title.toLowerCase()}`}
                  >
                    <div className="metric-icon dashboard-small-icon" aria-hidden="true">
                      <Icon size={15} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <strong>{item.title}</strong>
                      <p>{item.body}</p>
                    </div>
                    <span className="dashboard-row-action">
                      <ChevronRight size={14} />
                    </span>
                  </button>
                );
              })}
            </div>
          </article>

        </div>
      </section>
    </div>
  );
}
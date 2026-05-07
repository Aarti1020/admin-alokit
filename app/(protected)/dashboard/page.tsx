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

  /* ── shared primitives ── */
  const panelBase =
    "bg-white/94 rounded-[28px] border border-[#dbe3f1]/85 shadow-[0_18px_50px_rgba(25,42,70,0.1)]";

  const interactiveCard =
    "text-left transition-all duration-200 cursor-pointer " +
    "hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(25,42,70,0.13)]";

  const ghostBtn =
    "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] bg-white text-[#101828] " +
    "text-md font-semibold border border-[#dbe3f1] shadow-[0_10px_30px_rgba(25,42,70,0.06)] " +
    "transition-all duration-200 hover:bg-[#f8faff] hover:border-[#c9d3e5]";

  const metricIcon =
    "w-8 h-8 rounded-[10px] bg-[#edf2ff] text-[#2f5bea] flex items-center justify-center shrink-0";

  const actionHint =
    "inline-flex items-center gap-1 text-md font-semibold text-[#2f5bea] opacity-70";

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-[#475467] font-semibold">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-full border-[3px] border-[#edf2ff] border-t-[#2f5bea] animate-spin" />
          <span className="text-md text-[#475467] font-semibold">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (!analytics || !summary) {
    return (
      <div className="min-h-screen grid place-items-center text-[#475467] font-semibold">
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
    if (positive)
      return "bg-[#e8fbf2] text-[#0e9f6e] border border-[#0e9f6e]/20";
    return "bg-[#f8faff] text-[#667085] border border-[#dbe3f1]";
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-[760px]:p-3">

      {/* ── Hero ── */}
      <section className={`${panelBase} p-6`}>
        <div className="flex flex-col gap-4">

          {/* heading row */}
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h3 className="m-0 text-lg font-bold text-[#101828]">Dashboard overview</h3>
              <p className="m-0 text-md text-[#667085] mt-0.5">
                Quick access to orders, products, customers, and stock status.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-md text-[#667085] font-semibold
                             bg-[#f8faff] border border-[#dbe3f1] rounded-full px-3.5 py-1.5 whitespace-nowrap">
              <Clock size={12} />
              Updated just now
            </span>
          </div>

          {/* status cards grid */}
          <div className="grid grid-cols-3 gap-3 max-[760px]:grid-cols-1">
            {statusCards.map((item) => (
              <button
                key={item.label}
                type="button"
                className={classNames(
                  panelBase,
                  interactiveCard,
                  "flex flex-col gap-1 p-4 bg-[#f8faff]"
                )}
                onClick={() => router.push(item.href)}
                aria-label={`Open ${item.label.toLowerCase()} details`}
              >
                <span className="text-md font-semibold text-[#475467]">{item.label}</span>
                <strong
                  className={classNames(
                    "text-xl font-bold",
                    item.urgent ? "text-[#d97706]" : "text-[#101828]"
                  )}
                >
                  {item.value}
                </strong>
                <small
                  className={classNames(
                    "text-md",
                    item.urgent ? "text-[#d97706]" : "text-[#667085]"
                  )}
                >
                  {item.helper}
                </small>
                <span className={`${actionHint} mt-2`}>
                  Open <ChevronRight size={14} />
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Primary metric cards ── */}
      <section className="grid grid-cols-4 gap-4 max-[1024px]:grid-cols-2 max-[560px]:grid-cols-1">
        {primaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              className={classNames(
                panelBase,
                interactiveCard,
                "flex flex-col gap-2 p-5"
              )}
              onClick={() => router.push(card.href)}
              aria-label={`Open ${card.label.toLowerCase()}`}
            >
              {/* head row */}
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2">
                  <div className={metricIcon} aria-hidden="true">
                    <Icon size={16} />
                  </div>
                  <span className="text-md font-semibold text-[#475467]">{card.label}</span>
                </div>
                <span className={actionHint}>
                  Open <ChevronRight size={14} />
                </span>
              </div>

              <strong className="text-2xl font-bold text-[#101828]">{card.value}</strong>
              <p className="m-0 text-md text-[#667085]">{card.detail}</p>
            </button>
          );
        })}
      </section>

      {/* ── Bottom: orders + sidebar ── */}
      <section className="grid grid-cols-[1fr_320px] gap-5 max-[1024px]:grid-cols-1">

        {/* Recent orders table */}
        <article className={`${panelBase} flex flex-col p-5`}>

          {/* section heading */}
          <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h3 className="m-0 text-[1.15rem] font-bold text-[#101828]">Recent orders</h3>
              <p className="m-0 mt-1 text-md text-[#475467]">
                Latest customer orders and payment status.
              </p>
            </div>
            <button
              type="button"
              className={ghostBtn}
              onClick={() => router.push("/orders")}
            >
              All orders <ChevronRight size={14} />
            </button>
          </div>

          {analytics.recentOrders.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-[#475467] font-semibold text-md">
              No recent orders are available yet.
            </div>
          ) : (
            <div className="flex flex-col">
              {/* table header */}
              <div className="grid grid-cols-[1fr_1fr_120px_100px] gap-3 px-3 pb-2
                              border-b border-[#dbe3f1] text-md font-bold text-[#667085] uppercase tracking-wide">
                <span>Order</span>
                <span>Customer</span>
                <span>Status</span>
                <span>Total</span>
              </div>

              {analytics.recentOrders.map((order) => (
                <button
                  key={order._id}
                  type="button"
                  className="grid grid-cols-[1fr_1fr_120px_100px] gap-3 px-3 py-3
                             border-b border-[#dbe3f1]/60 last:border-0 text-left
                             transition-colors duration-150 hover:bg-[#f8faff] rounded-[12px]
                             cursor-pointer"
                  onClick={() => router.push(orderRoute(order._id))}
                  aria-label={`Open order ${order.orderNumber}`}
                >
                  {/* order number + date */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <strong className="text-md font-bold text-[#101828] truncate">
                      {order.orderNumber}
                    </strong>
                    <small className="text-md text-[#667085]">
                      {formatDateTime(order.createdAt)}
                    </small>
                  </div>

                  {/* customer */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <strong className="text-md font-semibold text-[#101828] truncate">
                      {order.user?.fullName || order.user?.email || "Unknown"}
                    </strong>
                    <small className="text-md text-[#667085] truncate">
                      {order.user?.email || "Customer record"}
                    </small>
                  </div>

                  {/* status badges */}
                  <div className="flex flex-col gap-1">
                    <span
                      className={classNames(
                        "inline-flex w-fit px-2 py-0.5 rounded-full text-md font-semibold",
                        getOrderStatusStyle(order.orderStatus, order.paymentStatus)
                      )}
                    >
                      {order.orderStatus}
                    </span>
                    <small className="text-md text-[#667085]">{order.paymentStatus}</small>
                  </div>

                  {/* total + action */}
                  <div className="flex flex-col gap-1 items-end">
                    <strong className="text-md font-bold text-[#101828]">
                      {formatCurrency(order.pricing?.total)}
                    </strong>
                    <span className={actionHint}>
                      Open <ChevronRight size={14} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </article>

        {/* Right sidebar */}
        <div className="flex flex-col gap-4">

          {/* Low stock watchlist */}
          <article className={`${panelBase} flex flex-col p-5`}>
            <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
              <div>
                <h3 className="m-0 text-[1.1rem] font-bold text-[#101828]">Low stock</h3>
                <p className="m-0 mt-1 text-md text-[#475467]">
                  {summary.lowStock} item{summary.lowStock !== 1 ? "s" : ""} need review.
                </p>
              </div>
              <button
                type="button"
                className={ghostBtn}
                onClick={() => openRoute("/products", { stock: "low" })}
              >
                View all
              </button>
            </div>

            {analytics.lowStockProducts.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-[#475467] font-semibold text-md">
                No low stock products right now.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {analytics.lowStockProducts.map((product) => {
                  const isCritical =
                    product.stock <= Math.floor((product.lowStockThreshold || 5) / 2);
                  return (
                    <button
                      key={product._id}
                      type="button"
                      className="flex items-center justify-between gap-3 p-3
                                 rounded-[14px] border border-[#dbe3f1] bg-[#f8faff]
                                 text-left transition-all duration-200 cursor-pointer
                                 hover:bg-[#edf2ff] hover:border-[#c9d3e5]"
                      onClick={() => openRoute("/products", { productId: product._id })}
                      aria-label={`Open product ${product.title || product.name}`}
                    >
                      {/* icon + name */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={metricIcon} aria-hidden="true">
                          <PackageSearch size={15} />
                        </div>
                        <div className="min-w-0">
                          <strong className="block text-md font-semibold text-[#101828] truncate">
                            {product.title || product.name}
                          </strong>
                          <div className="text-md text-[#667085] mt-0.5">
                            {product.sku || "No SKU"}
                          </div>
                        </div>
                      </div>

                      {/* stock badge + chevron */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={classNames(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-md font-semibold border",
                            isCritical
                              ? "bg-[#ffe8ea] text-[#dc2626] border-[#dc2626]/20"
                              : "bg-[#fff3e1] text-[#8a4b06] border-[#d97706]/20"
                          )}
                        >
                          {product.stock} / {product.lowStockThreshold || 0}
                        </span>
                        <span className={actionHint}>
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
          <article className={`${panelBase} flex flex-col p-5`}>
            <div className="mb-3">
              <h3 className="m-0 text-[1.1rem] font-bold text-[#101828]">Priority checks</h3>
              <p className="m-0 mt-1 text-md text-[#475467]">
                Simple signals to review first.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              {priorityChecks.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.title}
                    type="button"
                    className="flex items-start gap-3 p-3 rounded-[14px] text-left
                               transition-colors duration-150 hover:bg-[#f8faff] cursor-pointer"
                    onClick={() => router.push(item.href)}
                    aria-label={`Open ${item.title.toLowerCase()}`}
                  >
                    <div className={metricIcon} aria-hidden="true">
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <strong className="block text-md font-semibold text-[#101828]">
                        {item.title}
                      </strong>
                      <p className="m-0 text-md text-[#667085] mt-0.5">{item.body}</p>
                    </div>
                    <span className={actionHint}>
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
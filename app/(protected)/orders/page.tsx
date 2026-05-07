"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CreditCard,
  PackageCheck,
  RefreshCw,
  ShoppingCart,
  UserRound
} from "lucide-react";
import toast from "react-hot-toast";
import { orderApi } from "@/lib/api";
import type { Order } from "@/lib/types";
import { classNames, formatCurrency, formatDateTime } from "@/lib/utils";

const orderStatuses: Order["orderStatus"][] = [
  "created",
  "pending",
  "confirmed",
  "packed",
  "processing",
  "shipped",
  "delivered",
  "cancelled"
];

const paymentStatuses: Order["paymentStatus"][] = [
  "pending",
  "paid",
  "failed",
  "refunded",
  "partially_refunded"
];

const cardBase =
  "rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50 transition-all duration-200";

const mutedText = "text-sm leading-6 text-slate-500";

const selectBase =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-5 text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";
const getOrderStatusBadgeClass = (status: Order["orderStatus"]) => {
  switch (status) {
    case "delivered":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "cancelled":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "shipped":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "packed":
    case "processing":
    case "confirmed":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
};

const getPaymentStatusBadgeClass = (status: Order["paymentStatus"]) => {
  switch (status) {
    case "paid":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "failed":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "refunded":
    case "partially_refunded":
      return "border-purple-200 bg-purple-50 text-purple-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
};

const formatStatusLabel = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const Badge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span
    className={classNames(
      "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize leading-none",
      className
    )}
  >
    {children}
  </span>
);

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const detailRef = useRef<HTMLElement | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [updatingOrderStatus, setUpdatingOrderStatus] = useState(false);
  const [updatingPaymentStatus, setUpdatingPaymentStatus] = useState(false);

  const orderIdFromQuery = searchParams.get("orderId") || "";
  const statusFromQuery = searchParams.get("status") || "";
  const paymentStatusFromQuery = searchParams.get("paymentStatus") || "";

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await orderApi.list({ limit: 50 });
      setOrders(response.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, []);

  const visibleOrders = useMemo(
    () =>
      orders.filter((order) => {
        const matchesStatus = !statusFromQuery || order.orderStatus === statusFromQuery;
        const matchesPayment =
          !paymentStatusFromQuery || order.paymentStatus === paymentStatusFromQuery;
        return matchesStatus && matchesPayment;
      }),
    [orders, paymentStatusFromQuery, statusFromQuery]
  );

  useEffect(() => {
    if (!visibleOrders.length) {
      setSelectedOrderId("");
      return;
    }

    if (orderIdFromQuery && visibleOrders.some((order) => order._id === orderIdFromQuery)) {
      setSelectedOrderId(orderIdFromQuery);
      return;
    }

    if (!selectedOrderId || !visibleOrders.some((order) => order._id === selectedOrderId)) {
      setSelectedOrderId(visibleOrders[0]._id);
    }
  }, [orderIdFromQuery, selectedOrderId, visibleOrders]);

  const selectedOrder =
    visibleOrders.find((order) => order._id === selectedOrderId) || visibleOrders[0] || null;

  const orderInsights = useMemo(() => {
    const processingCount = visibleOrders.filter((order) =>
      ["created", "pending", "confirmed", "packed", "processing"].includes(order.orderStatus)
    ).length;
    const paidCount = visibleOrders.filter((order) => order.paymentStatus === "paid").length;
    const revenue = visibleOrders.reduce((sum, order) => sum + Number(order.pricing?.total || 0), 0);

    return [
      {
        label: "Visible orders",
        value: visibleOrders.length,
        detail: "Orders in the current dashboard view",
        icon: ShoppingCart
      },
      {
        label: "Active fulfillment",
        value: processingCount,
        detail: "Orders still moving through processing",
        icon: PackageCheck
      },
      {
        label: "Paid orders",
        value: paidCount,
        detail: "Orders with confirmed payment",
        icon: CreditCard
      },
      {
        label: "Visible revenue",
        value: formatCurrency(revenue),
        detail: "Total value of the visible order list",
        icon: UserRound
      }
    ];
  }, [visibleOrders]);

  const getCustomerName = (order: Order) => {
    if (typeof order.user === "string") return order.user || "Unknown";
    return order.user?.fullName || order.shippingAddress?.fullName || order.user?.email || "Unknown";
  };

  const getCustomerEmail = (order: Order) => {
    if (typeof order.user === "string") return order.shippingAddress?.email || "No email";
    return order.user?.email || order.shippingAddress?.email || "No email";
  };

  const openOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleOrderKeyDown = (event: KeyboardEvent<HTMLElement>, orderId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openOrder(orderId);
    }
  };

  const updateOrderStatus = async (orderId: string, value: Order["orderStatus"]) => {
    setUpdatingOrderStatus(true);
    try {
      await orderApi.updateStatus(orderId, value);
      toast.success("Order status updated");
      await loadOrders();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setUpdatingOrderStatus(false);
    }
  };

  const updatePaymentStatus = async (orderId: string, value: Order["paymentStatus"]) => {
    setUpdatingPaymentStatus(true);
    try {
      await orderApi.updatePaymentStatus(orderId, value);
      toast.success("Payment status updated");
      await loadOrders();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setUpdatingPaymentStatus(false);
    }
  };

  return (
    <main className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {orderInsights.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              className={classNames(
                cardBase,
                "group min-h-36 overflow-hidden p-5 text-left hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/60 focus:outline-none focus:ring-4 focus:ring-indigo-100"
              )}
              onClick={() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                    <Icon size={20} />
                  </span>
                  <span className="text-sm font-semibold text-slate-600">{item.label}</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500 transition group-hover:bg-indigo-50 group-hover:text-indigo-600">
                  Open
                  <ArrowRight size={14} />
                </span>
              </div>
              <div className="mt-5 text-2xl font-bold tracking-tight text-slate-950">{item.value}</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">{item.detail}</p>
            </button>
          );
        })}
      </section>

      <section className={classNames(cardBase, "p-5 sm:p-6")}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Order management</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Orders</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Review order activity, update fulfillment, and manage payment status from one responsive dashboard.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {statusFromQuery ? (
              <Badge className="border-indigo-200 bg-indigo-50 text-indigo-700">
                Status: {formatStatusLabel(statusFromQuery)}
              </Badge>
            ) : null}
            {paymentStatusFromQuery ? (
              <Badge className="border-purple-200 bg-purple-50 text-purple-700">
                Payment: {formatStatusLabel(paymentStatusFromQuery)}
              </Badge>
            ) : null}
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              onClick={loadOrders}
              disabled={loading}
            >
              <RefreshCw size={16} className={classNames(loading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)] xl:items-start">
        <section className={classNames(cardBase, "overflow-hidden")}>
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Order queue</h2>
                <p className={mutedText}>
                  {loading ? "Loading live order data." : `${visibleOrders.length} orders in the current view.`}
                </p>
              </div>
            </div>
          </div>

          <div className="max-h-[760px] space-y-3 overflow-y-auto p-4 sm:p-5">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center text-sm font-medium text-slate-500">
                Loading orders...
              </div>
            ) : visibleOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center text-sm font-medium text-slate-500">
                No orders match the current dashboard view.
              </div>
            ) : (
              visibleOrders.map((order) => {
                const isSelected = selectedOrder?._id === order._id;

                return (
                  <article
                    key={order._id}
                    className={classNames(
                      "overflow-hidden rounded-2xl border bg-white transition-all duration-200",
                      isSelected
                        ? "border-indigo-300 shadow-md shadow-indigo-100 ring-4 ring-indigo-50"
                        : "border-slate-200 shadow-sm hover:border-indigo-200 hover:shadow-md hover:shadow-slate-100"
                    )}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer p-4 outline-none focus:ring-4 focus:ring-inset focus:ring-indigo-100 sm:p-5"
                      onClick={() => openOrder(order._id)}
                      onKeyDown={(event) => handleOrderKeyDown(event, order._id)}
                      aria-label={`Open order ${order.orderNumber}`}
                      aria-pressed={isSelected}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <strong className="block truncate text-base font-bold text-slate-950">
                            {order.orderNumber}
                          </strong>
                          <div className="mt-1 text-xs font-medium text-slate-500">
                            {formatDateTime(order.createdAt)}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          <Badge className={getOrderStatusBadgeClass(order.orderStatus)}>
                            {formatStatusLabel(order.orderStatus)}
                          </Badge>
                          <Badge className={getPaymentStatusBadgeClass(order.paymentStatus)}>
                            {formatStatusLabel(order.paymentStatus)}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-3 sm:grid-cols-2">
                        <div className="min-w-0">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</span>
                          <strong className="mt-1 block truncate text-sm font-bold text-slate-900">
                            {getCustomerName(order)}
                          </strong>
                          <div className="mt-0.5 truncate text-xs text-slate-500">{getCustomerEmail(order)}</div>
                        </div>
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total</span>
                          <strong className="mt-1 block text-sm font-bold text-slate-900">
                            {formatCurrency(order.pricing?.total)}
                          </strong>
                          <div className="mt-0.5 text-xs text-slate-500">{order.items?.length || 0} items</div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-500">
                          {isSelected ? "Currently open in detail panel" : "Open order details"}
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-indigo-600">
                          Open
                          <ArrowRight size={16} />
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section ref={detailRef} className={classNames(cardBase, "overflow-hidden scroll-mt-6")}>
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  {selectedOrder ? selectedOrder.orderNumber : "Order details"}
                </h2>
                <p className={mutedText}>
                  {selectedOrder
                    ? "Update fulfillment and payment status for the selected order."
                    : "Select an order from the queue to view details."}
                </p>
              </div>
              {selectedOrder ? (
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Badge className={getOrderStatusBadgeClass(selectedOrder.orderStatus)}>
                    {formatStatusLabel(selectedOrder.orderStatus)}
                  </Badge>
                  <Badge className={getPaymentStatusBadgeClass(selectedOrder.paymentStatus)}>
                    {formatStatusLabel(selectedOrder.paymentStatus)}
                  </Badge>
                </div>
              ) : null}
            </div>
          </div>

          {!selectedOrder ? (
            <div className="p-5 sm:p-6">
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center text-sm font-medium text-slate-500">
                Choose an order from the queue to inspect it here.
              </div>
            </div>
          ) : (
            <div className="space-y-5 p-4 sm:p-6">
              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                      <ShoppingCart size={20} />
                    </span>
                    <div>
                      <strong className="block text-lg font-bold text-slate-950">{selectedOrder.orderNumber}</strong>
                      <div className="mt-1 text-sm text-slate-500">Placed {formatDateTime(selectedOrder.createdAt)}</div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/80 bg-white px-4 py-3 text-left shadow-sm sm:text-right">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Order total</span>
                    <strong className="mt-1 block text-xl font-bold text-slate-950">
                      {formatCurrency(selectedOrder.pricing?.total)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">Customer</h3>
                    <p className={mutedText}>Shipping contact and customer identity.</p>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Name</span>
                      <strong className="mt-1 block break-words text-sm font-bold text-slate-900">
                        {getCustomerName(selectedOrder)}
                      </strong>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</span>
                      <strong className="mt-1 block break-words text-sm font-bold text-slate-900">
                        {getCustomerEmail(selectedOrder)}
                      </strong>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</span>
                      <strong className="mt-1 block break-words text-sm font-bold text-slate-900">
                        {selectedOrder.shippingAddress?.phone || "No phone"}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">Delivery</h3>
                    <p className={mutedText}>Shipping address on the order.</p>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Address</span>
                      <strong className="mt-1 block break-words text-sm font-bold leading-6 text-slate-900">
                        {[
                          selectedOrder.shippingAddress?.addressLine1,
                          selectedOrder.shippingAddress?.addressLine2
                        ]
                          .filter(Boolean)
                          .join(", ") || "No address"}
                      </strong>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Location</span>
                      <strong className="mt-1 block break-words text-sm font-bold leading-6 text-slate-900">
                        {[
                          selectedOrder.shippingAddress?.city,
                          selectedOrder.shippingAddress?.state,
                          selectedOrder.shippingAddress?.postalCode,
                          selectedOrder.shippingAddress?.country
                        ]
                          .filter(Boolean)
                          .join(", ") || "No location"}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">Fulfillment status</h3>
                    <p className={mutedText}>Update how the order moves through operations.</p>
                  </div>
                  <div className="mt-4">
                    <select
                      className={selectBase}
                      value={selectedOrder.orderStatus}
                      disabled={updatingOrderStatus}
                      onChange={(e) =>
                        void updateOrderStatus(selectedOrder._id, e.target.value as Order["orderStatus"])
                      }
                    >
                      {orderStatuses.map((status) => (
                        <option key={status} value={status}>
                          {formatStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">Payment status</h3>
                    <p className={mutedText}>Keep finance and operations aligned.</p>
                  </div>
                  <div className="mt-4">
                    <select
                      className={selectBase}
                      value={selectedOrder.paymentStatus}
                      disabled={updatingPaymentStatus}
                      onChange={(e) =>
                        void updatePaymentStatus(selectedOrder._id, e.target.value as Order["paymentStatus"])
                      }
                    >
                      {paymentStatuses.map((status) => (
                        <option key={status} value={status}>
                          {formatStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">Items</h3>
                    <p className={mutedText}>Products included in this order.</p>
                  </div>
                  <Badge className="border-slate-200 bg-slate-50 text-slate-600">
                    {selectedOrder.items?.length || 0} items
                  </Badge>
                </div>

                <div className="mt-4 space-y-3">
                  {selectedOrder.items?.length ? (
                    selectedOrder.items.map((item) => (
                      <div
                        key={item._id}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <strong className="block truncate text-sm font-bold text-slate-950">{item.productName}</strong>
                          <div className="mt-1 text-xs font-medium text-slate-500">{item.sku || "No SKU"}</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3 sm:justify-end">
                          <Badge className="border-white bg-white text-slate-600">{item.quantity} qty</Badge>
                          <strong className="text-sm font-bold text-slate-950">
                            {formatCurrency(item.lineTotal || item.finalPrice)}
                          </strong>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm font-medium text-slate-500">
                      No line items found for this order.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

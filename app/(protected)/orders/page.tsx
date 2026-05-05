"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CreditCard, PackageCheck, ShoppingCart, UserRound } from "lucide-react";
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
    <div className="stack-lg">
      <section className="stats-grid">
        {orderInsights.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              className="panel stat-card metric-card orders-insight-card"
              onClick={() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              <div className="metric-card-head">
                <div className="metric-icon" aria-hidden="true">
                  <Icon size={18} />
                </div>
                <span>{item.label}</span>
                <span className="orders-card-action">
                  Open
                  <ArrowRight size={16} />
                </span>
              </div>
              <strong>{item.value}</strong>
              <p className="mini-text">{item.detail}</p>
            </button>
          );
        })}
      </section>

      <section className="panel stack-md">
        <div className="section-heading">
          <div>
            <h3>Orders</h3>
            <p>Review order activity, update fulfillment, and manage payment status from one place.</p>
          </div>
          <div className="row-actions">
            {statusFromQuery ? <span className="pill">Status: {statusFromQuery}</span> : null}
            {paymentStatusFromQuery ? <span className="pill">Payment: {paymentStatusFromQuery}</span> : null}
            <button className="ghost-button" type="button" onClick={loadOrders}>
              Refresh
            </button>
          </div>
        </div>
      </section>

      <div className="two-column-grid orders-dashboard-grid">
        <section className="panel stack-md">
          <div className="section-heading">
            <div>
              <h3>Order queue</h3>
              <p>{loading ? "Loading live order data." : `${visibleOrders.length} orders in the current view.`}</p>
            </div>
          </div>

          <div className="stack-sm">
            {loading ? (
              <div className="empty-state">Loading orders...</div>
            ) : visibleOrders.length === 0 ? (
              <div className="empty-state">No orders match the current dashboard view.</div>
            ) : (
              visibleOrders.map((order) => {
                const isSelected = selectedOrder?._id === order._id;

                return (
                  <article
                    key={order._id}
                    className={classNames("list-card", "vertical", "orders-list-card", isSelected && "orders-list-card-selected")}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      className="orders-list-selectable"
                      onClick={() => openOrder(order._id)}
                      onKeyDown={(event) => handleOrderKeyDown(event, order._id)}
                      aria-label={`Open order ${order.orderNumber}`}
                      aria-pressed={isSelected}
                    >
                      <div className="review-head">
                        <div>
                          <strong>{order.orderNumber}</strong>
                          <div className="mini-text">{formatDateTime(order.createdAt)}</div>
                        </div>
                        <div className="orders-card-statuses">
                          <span
                            className={classNames(
                              "pill",
                              order.orderStatus === "delivered" ? "status-pill-positive" : "status-pill-muted"
                            )}
                          >
                            {order.orderStatus}
                          </span>
                          <span
                            className={classNames(
                              "pill",
                              order.paymentStatus === "paid" ? "status-pill-positive" : "status-pill-muted"
                            )}
                          >
                            {order.paymentStatus}
                          </span>
                        </div>
                      </div>

                      <div className="orders-list-grid">
                        <div>
                          <span className="mini-text">Customer</span>
                          <strong>{getCustomerName(order)}</strong>
                          <div className="mini-text">{getCustomerEmail(order)}</div>
                        </div>
                        <div>
                          <span className="mini-text">Total</span>
                          <strong>{formatCurrency(order.pricing?.total)}</strong>
                          <div className="mini-text">{order.items?.length || 0} items</div>
                        </div>
                      </div>

                      <div className="orders-card-footer">
                        <span className="orders-card-hint">
                          {isSelected ? "Currently open in detail panel" : "Open order details"}
                        </span>
                        <span className="orders-card-action">
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

        <section ref={detailRef} className="panel stack-md orders-detail-panel">
          <div className="section-heading">
            <div>
              <h3>{selectedOrder ? selectedOrder.orderNumber : "Order details"}</h3>
              <p>
                {selectedOrder
                  ? "Update fulfillment and payment status for the selected order."
                  : "Select an order from the queue to view details."}
              </p>
            </div>
          </div>

          {!selectedOrder ? (
            <div className="empty-state">Choose an order from the queue to inspect it here.</div>
          ) : (
            <div className="stack-md">
              <div className="editor-banner orders-detail-banner">
                <div className="editor-banner-icon">
                  <ShoppingCart size={18} />
                </div>
                <div className="stack-sm">
                  <div className="orders-detail-head">
                    <strong>{selectedOrder.orderNumber}</strong>
                    <span className="pill pill-soft">{formatCurrency(selectedOrder.pricing?.total)}</span>
                  </div>
                  <div className="mini-text">Placed {formatDateTime(selectedOrder.createdAt)}</div>
                </div>
              </div>

              <div className="two-column-grid">
                <div className="form-section">
                  <div className="form-section-head">
                    <h4>Customer</h4>
                    <p>Shipping contact and customer identity.</p>
                  </div>
                  <div className="stack-sm">
                    <div className="orders-detail-item">
                      <span>Name</span>
                      <strong>{getCustomerName(selectedOrder)}</strong>
                    </div>
                    <div className="orders-detail-item">
                      <span>Email</span>
                      <strong>{getCustomerEmail(selectedOrder)}</strong>
                    </div>
                    <div className="orders-detail-item">
                      <span>Phone</span>
                      <strong>{selectedOrder.shippingAddress?.phone || "No phone"}</strong>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-head">
                    <h4>Delivery</h4>
                    <p>Shipping address on the order.</p>
                  </div>
                  <div className="stack-sm">
                    <div className="orders-detail-item">
                      <span>Address</span>
                      <strong>
                        {[
                          selectedOrder.shippingAddress?.addressLine1,
                          selectedOrder.shippingAddress?.addressLine2
                        ]
                          .filter(Boolean)
                          .join(", ") || "No address"}
                      </strong>
                    </div>
                    <div className="orders-detail-item">
                      <span>Location</span>
                      <strong>
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

              <div className="two-column-grid">
                <div className="form-section">
                  <div className="form-section-head">
                    <h4>Fulfillment status</h4>
                    <p>Update how the order moves through operations.</p>
                  </div>
                  <select
                    value={selectedOrder.orderStatus}
                    disabled={updatingOrderStatus}
                    onChange={(e) =>
                      void updateOrderStatus(selectedOrder._id, e.target.value as Order["orderStatus"])
                    }
                  >
                    {orderStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-section">
                  <div className="form-section-head">
                    <h4>Payment status</h4>
                    <p>Keep finance and operations aligned.</p>
                  </div>
                  <select
                    value={selectedOrder.paymentStatus}
                    disabled={updatingPaymentStatus}
                    onChange={(e) =>
                      void updatePaymentStatus(selectedOrder._id, e.target.value as Order["paymentStatus"])
                    }
                  >
                    {paymentStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-head">
                  <h4>Items</h4>
                  <p>Products included in this order.</p>
                </div>
                <div className="stack-sm">
                  {selectedOrder.items?.length ? (
                    selectedOrder.items.map((item) => (
                      <div key={item._id} className="orders-item-row">
                        <div>
                          <strong>{item.productName}</strong>
                          <div className="mini-text">{item.sku}</div>
                        </div>
                        <div className="orders-item-meta">
                          <span className="pill">{item.quantity} qty</span>
                          <strong>{formatCurrency(item.lineTotal || item.finalPrice)}</strong>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">No line items found for this order.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

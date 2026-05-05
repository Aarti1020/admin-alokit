"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BadgeCheck, CircleSlash, FileText, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { leadApi } from "@/lib/api";
import type { Lead } from "@/lib/types";
import { classNames, formatDateTime } from "@/lib/utils";

const statuses: Lead["status"][] = ["new", "contacted", "qualified", "converted", "closed", "spam"];

type LeadAction = "status" | "note";

export default function LeadsPage() {
  const detailRef = useRef<HTMLElement | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [note, setNote] = useState("Reached out via admin panel");
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<{ leadId: string; action: LeadAction } | null>(null);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const response = await leadApi.list({ limit: 50 });
      setLeads(response.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to fetch leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLeads();
  }, []);

  useEffect(() => {
    if (!leads.length) {
      setSelectedLeadId("");
      return;
    }

    if (!selectedLeadId || !leads.some((lead) => lead._id === selectedLeadId)) {
      setSelectedLeadId(leads[0]._id);
    }
  }, [leads, selectedLeadId]);

  const selectedLead = leads.find((lead) => lead._id === selectedLeadId) || leads[0] || null;

  const leadInsights = useMemo(() => {
    const newCount = leads.filter((lead) => lead.status === "new").length;
    const activePipelineCount = leads.filter((lead) =>
      ["new", "contacted", "qualified"].includes(lead.status)
    ).length;
    const convertedCount = leads.filter((lead) => lead.status === "converted").length;
    const spamCount = leads.filter((lead) => lead.status === "spam").length;

    return [
      {
        label: "Visible leads",
        value: leads.length,
        detail: "Lead records currently loaded into the dashboard",
        icon: FileText
      },
      {
        label: "New leads",
        value: newCount,
        detail: "Fresh enquiries waiting for first response",
        icon: Sparkles
      },
      {
        label: "Active pipeline",
        value: activePipelineCount,
        detail: "Leads still moving through qualification",
        icon: BadgeCheck
      },
      {
        label: "Spam or closed",
        value: spamCount + leads.filter((lead) => lead.status === "closed").length,
        detail: `${convertedCount} leads already converted`,
        icon: CircleSlash
      }
    ];
  }, [leads]);

  const openLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleLeadKeyDown = (event: KeyboardEvent<HTMLElement>, leadId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openLead(leadId);
    }
  };

  const runLeadAction = async (
    leadId: string,
    action: LeadAction,
    handler: () => Promise<unknown>,
    message: string
  ) => {
    setActiveAction({ leadId, action });
    try {
      await handler();
      toast.success(message);
      await loadLeads();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update");
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <div className="stack-lg">
      <section className="stats-grid">
        {leadInsights.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              className="panel stat-card metric-card leads-insight-card"
              onClick={() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              <div className="metric-card-head">
                <div className="metric-icon" aria-hidden="true">
                  <Icon size={18} />
                </div>
                <span>{item.label}</span>
                <span className="leads-card-action">
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
            <h3>Leads pipeline</h3>
            <p>Move leads through the funnel, review enquiry details, and append notes from one workspace.</p>
          </div>
          <button className="ghost-button" type="button" onClick={loadLeads}>
            Refresh pipeline
          </button>
        </div>

        <label className="field inline-field">
          <span>Quick note</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="mini-text">
          This note is applied to the selected lead when you use the <strong>Add note</strong> action.
        </div>
      </section>

      <div className="two-column-grid leads-dashboard-grid">
        <section className="panel stack-md">
          <div className="section-heading">
            <div>
              <h3>Lead queue</h3>
              <p>{loading ? "Loading pipeline activity." : `${leads.length} leads available in the CRM view.`}</p>
            </div>
          </div>

          <div className="stack-sm">
            {loading ? (
              <div className="empty-state">Loading leads...</div>
            ) : leads.length === 0 ? (
              <div className="empty-state">No leads are available right now.</div>
            ) : (
              leads.map((lead) => {
                const isSelected = selectedLead?._id === lead._id;

                return (
                  <article
                    key={lead._id}
                    className={classNames("list-card", "vertical", "leads-list-card", isSelected && "leads-list-card-selected")}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      className="leads-list-selectable"
                      onClick={() => openLead(lead._id)}
                      onKeyDown={(event) => handleLeadKeyDown(event, lead._id)}
                      aria-label={`Open lead ${lead.name || "record"}`}
                      aria-pressed={isSelected}
                    >
                      <div className="review-head">
                        <div>
                          <strong>{lead.name || "Unnamed lead"}</strong>
                          <div className="mini-text">
                            {lead.formType || "Unknown form"} . {lead.source || "unknown source"} .{" "}
                            {formatDateTime(lead.createdAt)}
                          </div>
                        </div>
                        <span
                          className={classNames(
                            "pill",
                            lead.status === "converted" ? "status-pill-positive" : "status-pill-muted"
                          )}
                        >
                          {lead.status}
                        </span>
                      </div>
                      <p className="mini-text leads-card-message">
                        {lead.message || "No message was submitted with this lead."}
                      </p>
                      <div className="leads-card-footer">
                        <span className="leads-card-hint">
                          {isSelected ? "Currently open in detail panel" : "Open pipeline details"}
                        </span>
                        <span className="leads-card-action">
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

        <section ref={detailRef} className="panel stack-md leads-detail-panel">
          <div className="section-heading">
            <div>
              <h3>{selectedLead ? selectedLead.name || "Lead details" : "Lead details"}</h3>
              <p>
                {selectedLead
                  ? "Update lead status and append CRM notes from this panel."
                  : "Select a lead from the queue to inspect it here."}
              </p>
            </div>
          </div>

          {!selectedLead ? (
            <div className="empty-state">Choose a lead from the pipeline to inspect it here.</div>
          ) : (
            <div className="stack-md">
              <div className="editor-banner leads-detail-banner">
                <div className="editor-banner-icon">
                  <FileText size={18} />
                </div>
                <div className="stack-sm">
                  <div className="leads-detail-head">
                    <strong>{selectedLead.name || "Unnamed lead"}</strong>
                    <span className="pill pill-soft">{selectedLead.status}</span>
                  </div>
                  <div className="mini-text">
                    {selectedLead.formType || "Unknown form"} . {selectedLead.source || "unknown source"} .{" "}
                    {formatDateTime(selectedLead.createdAt)}
                  </div>
                </div>
              </div>

              <div className="two-column-grid">
                <div className="form-section">
                  <div className="form-section-head">
                    <h4>Contact</h4>
                    <p>Lead identity and follow-up information.</p>
                  </div>
                  <div className="stack-sm">
                    <div className="leads-detail-item">
                      <span>Name</span>
                      <strong>{selectedLead.name || "Unnamed lead"}</strong>
                    </div>
                    <div className="leads-detail-item">
                      <span>Email</span>
                      <strong>{selectedLead.email || "No email provided"}</strong>
                    </div>
                    <div className="leads-detail-item">
                      <span>Phone</span>
                      <strong>{selectedLead.phone || "No phone provided"}</strong>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-head">
                    <h4>Lead context</h4>
                    <p>Source and lifecycle position for this enquiry.</p>
                  </div>
                  <div className="stack-sm">
                    <div className="leads-detail-item">
                      <span>Source</span>
                      <strong>{selectedLead.source || "Unknown source"}</strong>
                    </div>
                    <div className="leads-detail-item">
                      <span>Form type</span>
                      <strong>{selectedLead.formType || "Unknown form"}</strong>
                    </div>
                    <div className="leads-detail-item">
                      <span>Created</span>
                      <strong>{formatDateTime(selectedLead.createdAt)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="two-column-grid">
                <div className="form-section">
                  <div className="form-section-head">
                    <h4>Pipeline status</h4>
                    <p>Update where this lead currently sits in the funnel.</p>
                  </div>
                  <select
                    value={selectedLead.status}
                    disabled={Boolean(activeAction)}
                    onChange={(e) =>
                      void runLeadAction(
                        selectedLead._id,
                        "status",
                        () => leadApi.updateStatus(selectedLead._id, e.target.value as Lead["status"]),
                        "Lead status updated"
                      )
                    }
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-section">
                  <div className="form-section-head">
                    <h4>Quick note action</h4>
                    <p>Append the current quick note to this lead record.</p>
                  </div>
                  <button
                    type="button"
                    className="primary-button"
                    disabled={Boolean(activeAction) || !note.trim()}
                    onClick={() =>
                      void runLeadAction(
                        selectedLead._id,
                        "note",
                        () => leadApi.addNote(selectedLead._id, note),
                        "Note added"
                      )
                    }
                  >
                    {activeAction?.leadId === selectedLead._id && activeAction.action === "note"
                      ? "Adding note..."
                      : "Add note"}
                  </button>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-head">
                  <h4>Lead message</h4>
                  <p>Original enquiry details submitted by the lead.</p>
                </div>
                <p className="leads-detail-message">
                  {selectedLead.message || "No message was submitted with this lead."}
                </p>
              </div>

              {selectedLead.consultationDetails ? (
                <div className="form-section">
                  <div className="form-section-head">
                    <h4>Consultation details</h4>
                    <p>Structured details captured from the gemstone consultation form.</p>
                  </div>
                  <div className="two-column-grid">
                    <div className="stack-sm">
                      <div className="leads-detail-item">
                        <span>First name</span>
                        <strong>{selectedLead.consultationDetails.firstName || "Not provided"}</strong>
                      </div>
                      <div className="leads-detail-item">
                        <span>Last name</span>
                        <strong>{selectedLead.consultationDetails.lastName || "Not provided"}</strong>
                      </div>
                      <div className="leads-detail-item">
                        <span>Date of birth</span>
                        <strong>{selectedLead.consultationDetails.dateOfBirth ? formatDateTime(selectedLead.consultationDetails.dateOfBirth) : "Not provided"}</strong>
                      </div>
                      <div className="leads-detail-item">
                        <span>Gender</span>
                        <strong>{selectedLead.consultationDetails.gender || "Not provided"}</strong>
                      </div>
                      <div className="leads-detail-item">
                        <span>Language</span>
                        <strong>{selectedLead.consultationDetails.language || "Not provided"}</strong>
                      </div>
                    </div>
                    <div className="stack-sm">
                      <div className="leads-detail-item">
                        <span>City of birth</span>
                        <strong>{selectedLead.consultationDetails.cityOfBirth || "Not provided"}</strong>
                      </div>
                      <div className="leads-detail-item">
                        <span>PIN code</span>
                        <strong>{selectedLead.consultationDetails.pinCode || "Not provided"}</strong>
                      </div>
                      <div className="leads-detail-item">
                        <span>State</span>
                        <strong>{selectedLead.consultationDetails.state || "Not provided"}</strong>
                      </div>
                      <div className="leads-detail-item">
                        <span>Country</span>
                        <strong>{selectedLead.consultationDetails.country || "Not provided"}</strong>
                      </div>
                      <div className="leads-detail-item">
                        <span>Package</span>
                        <strong>{selectedLead.consultationDetails.selectedPackage || "Not provided"}</strong>
                      </div>
                      <div className="leads-detail-item">
                        <span>Amount</span>
                        <strong>
                          {typeof selectedLead.consultationDetails.amount === "number"
                            ? `Rs.${selectedLead.consultationDetails.amount}`
                            : "Not provided"}
                        </strong>
                      </div>
                      <div className="leads-detail-item">
                        <span>Kundali report</span>
                        <strong>{selectedLead.consultationDetails.wantsKundaliReport ? "Yes" : "No"}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="form-section">
                <div className="form-section-head">
                  <h4>Notes history</h4>
                  <p>Timeline of notes already attached to this lead.</p>
                </div>
                <div className="stack-sm">
                  {selectedLead.notes?.length ? (
                    selectedLead.notes.map((entry, index) => (
                      <div key={`${selectedLead._id}-note-${index}`} className="leads-note-row">
                        <div>
                          <strong>{entry.note || "Empty note"}</strong>
                          <div className="mini-text">
                            {entry.createdAt ? formatDateTime(entry.createdAt) : "Timestamp unavailable"}
                          </div>
                        </div>
                        <span className="pill">Admin note</span>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">No notes have been added to this lead yet.</div>
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

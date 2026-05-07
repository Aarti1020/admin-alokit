"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BadgeCheck, CircleSlash, FileText, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { leadApi } from "@/lib/api";
import type { Lead } from "@/lib/types";
import { classNames, formatDateTime } from "@/lib/utils";

const statuses: Lead["status"][] = ["new", "contacted", "qualified", "converted", "closed", "spam"];

type LeadAction = "status" | "note";

const pageStack = "space-y-5 sm:space-y-6";
const panel = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6";
const panelStack = `${panel} space-y-4 sm:space-y-5`;
const sectionHeading = "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";
const headingTitle = "text-base font-semibold text-slate-950 sm:text-lg";
const headingDescription = "mt-1 max-w-3xl text-sm leading-6 text-slate-500";
const miniText = "text-xs leading-5 text-slate-500 sm:text-sm";
const iconBox = "flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700";
const actionText = "inline-flex items-center gap-1 text-xs font-semibold text-slate-600 transition-colors group-hover:text-slate-950";
const pill = "inline-flex w-fit shrink-0 items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold capitalize text-slate-600";
const mutedPill = "border-slate-200 bg-slate-50 text-slate-600";
const positivePill = "border-emerald-200 bg-emerald-50 text-emerald-700";
const softPill = "border-indigo-100 bg-indigo-50 text-indigo-700";
const emptyState = "rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500";
const stackSm = "space-y-3";
const stackMd = "space-y-4 sm:space-y-5";
const twoColumnGrid = "grid grid-cols-1 gap-4 lg:grid-cols-2";
const formSection = "rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5";
const formSectionHead = "mb-4 space-y-1";
const inputControl = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";
const detailItem = "flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 sm:p-4";
const detailLabel = "text-xs font-medium uppercase tracking-wide text-slate-400";
const detailValue = "break-words text-sm font-semibold text-slate-900";
const ghostButton = "inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 sm:w-auto";
const primaryButton = "inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto";

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
    <div className={pageStack}>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {leadInsights.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              className={`${panel} group flex min-h-40 flex-col items-start justify-between gap-4 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-slate-100`}
              onClick={() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              <div className="flex w-full flex-wrap items-center gap-2">
                <div className={iconBox} aria-hidden="true">
                  <Icon size={18} />
                </div>
                <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                <span className={`${actionText} ml-auto`}>
                  Open
                  <ArrowRight size={16} />
                </span>
              </div>
              <strong className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{item.value}</strong>
              <p className={miniText}>{item.detail}</p>
            </button>
          );
        })}
      </section>

      <section className={panelStack}>
        <div className={sectionHeading}>
          <div>
            <h3 className={headingTitle}>Leads pipeline</h3>
            <p className={headingDescription}>
              Move leads through the funnel, review enquiry details, and append notes from one workspace.
            </p>
          </div>
          <button className={ghostButton} type="button" onClick={loadLeads}>
            Refresh pipeline
          </button>
        </div>

        <label className="grid gap-2 sm:grid-cols-[minmax(120px,180px)_1fr] sm:items-center">
          <span className="text-sm font-semibold text-slate-700">Quick note</span>
          <input className={inputControl} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className={miniText}>
          This note is applied to the selected lead when you use the <strong>Add note</strong> action.
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.35fr)] xl:items-start">
        <section className={panelStack}>
          <div className={sectionHeading}>
            <div>
              <h3 className={headingTitle}>Lead queue</h3>
              <p className={headingDescription}>
                {loading ? "Loading pipeline activity." : `${leads.length} leads available in the CRM view.`}
              </p>
            </div>
          </div>

          <div className={stackSm}>
            {loading ? (
              <div className={emptyState}>Loading leads...</div>
            ) : leads.length === 0 ? (
              <div className={emptyState}>No leads are available right now.</div>
            ) : (
              leads.map((lead) => {
                const isSelected = selectedLead?._id === lead._id;

                return (
                  <article
                    key={lead._id}
                    className={classNames(
                      "rounded-2xl border bg-white p-3 shadow-sm transition sm:p-4",
                      isSelected ? "border-slate-900 ring-4 ring-slate-100" : "border-slate-200 hover:border-slate-300 hover:shadow-md"
                    )}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      className="group cursor-pointer rounded-xl outline-none focus:ring-4 focus:ring-slate-100"
                      onClick={() => openLead(lead._id)}
                      onKeyDown={(event) => handleLeadKeyDown(event, lead._id)}
                      aria-label={`Open lead ${lead.name || "record"}`}
                      aria-pressed={isSelected}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <strong className="block truncate text-sm font-semibold text-slate-950 sm:text-base">
                            {lead.name || "Unnamed lead"}
                          </strong>
                          <div className={miniText}>
                            {lead.formType || "Unknown form"} . {lead.source || "unknown source"} .{" "}
                            {formatDateTime(lead.createdAt)}
                          </div>
                        </div>
                        <span
                          className={classNames(
                            pill,
                            lead.status === "converted" ? positivePill : mutedPill
                          )}
                        >
                          {lead.status}
                        </span>
                      </div>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                        {lead.message || "No message was submitted with this lead."}
                      </p>
                      <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className={miniText}>
                          {isSelected ? "Currently open in detail panel" : "Open pipeline details"}
                        </span>
                        <span className={actionText}>
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

        <section ref={detailRef} className={`${panelStack} scroll-mt-6`}>
          <div className={sectionHeading}>
            <div>
              <h3 className={headingTitle}>{selectedLead ? selectedLead.name || "Lead details" : "Lead details"}</h3>
              <p className={headingDescription}>
                {selectedLead
                  ? "Update lead status and append CRM notes from this panel."
                  : "Select a lead from the queue to inspect it here."}
              </p>
            </div>
          </div>

          {!selectedLead ? (
            <div className={emptyState}>Choose a lead from the pipeline to inspect it here.</div>
          ) : (
            <div className={stackMd}>
              <div className="flex flex-col gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 sm:flex-row sm:items-start sm:p-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-700 shadow-sm">
                  <FileText size={18} />
                </div>
                <div className={stackSm}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <strong className="break-words text-base font-semibold text-slate-950">
                      {selectedLead.name || "Unnamed lead"}
                    </strong>
                    <span className={classNames(pill, softPill)}>{selectedLead.status}</span>
                  </div>
                  <div className={miniText}>
                    {selectedLead.formType || "Unknown form"} . {selectedLead.source || "unknown source"} .{" "}
                    {formatDateTime(selectedLead.createdAt)}
                  </div>
                </div>
              </div>

              <div className={twoColumnGrid}>
                <div className={formSection}>
                  <div className={formSectionHead}>
                    <h4 className="text-sm font-semibold text-slate-950">Contact</h4>
                    <p className={miniText}>Lead identity and follow-up information.</p>
                  </div>
                  <div className={stackSm}>
                    <div className={detailItem}>
                      <span className={detailLabel}>Name</span>
                      <strong className={detailValue}>{selectedLead.name || "Unnamed lead"}</strong>
                    </div>
                    <div className={detailItem}>
                      <span className={detailLabel}>Email</span>
                      <strong className={detailValue}>{selectedLead.email || "No email provided"}</strong>
                    </div>
                    <div className={detailItem}>
                      <span className={detailLabel}>Phone</span>
                      <strong className={detailValue}>{selectedLead.phone || "No phone provided"}</strong>
                    </div>
                  </div>
                </div>

                <div className={formSection}>
                  <div className={formSectionHead}>
                    <h4 className="text-sm font-semibold text-slate-950">Lead context</h4>
                    <p className={miniText}>Source and lifecycle position for this enquiry.</p>
                  </div>
                  <div className={stackSm}>
                    <div className={detailItem}>
                      <span className={detailLabel}>Source</span>
                      <strong className={detailValue}>{selectedLead.source || "Unknown source"}</strong>
                    </div>
                    <div className={detailItem}>
                      <span className={detailLabel}>Form type</span>
                      <strong className={detailValue}>{selectedLead.formType || "Unknown form"}</strong>
                    </div>
                    <div className={detailItem}>
                      <span className={detailLabel}>Created</span>
                      <strong className={detailValue}>{formatDateTime(selectedLead.createdAt)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className={twoColumnGrid}>
                <div className={formSection}>
                  <div className={formSectionHead}>
                    <h4 className="text-sm font-semibold text-slate-950">Pipeline status</h4>
                    <p className={miniText}>Update where this lead currently sits in the funnel.</p>
                  </div>
                  <select
                    className={inputControl}
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

                <div className={formSection}>
                  <div className={formSectionHead}>
                    <h4 className="text-sm font-semibold text-slate-950">Quick note action</h4>
                    <p className={miniText}>Append the current quick note to this lead record.</p>
                  </div>
                  <button
                    type="button"
                    className={primaryButton}
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

              <div className={formSection}>
                <div className={formSectionHead}>
                  <h4 className="text-sm font-semibold text-slate-950">Lead message</h4>
                  <p className={miniText}>Original enquiry details submitted by the lead.</p>
                </div>
                <p className="whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
                  {selectedLead.message || "No message was submitted with this lead."}
                </p>
              </div>

              {selectedLead.consultationDetails ? (
                <div className={formSection}>
                  <div className={formSectionHead}>
                    <h4 className="text-sm font-semibold text-slate-950">Consultation details</h4>
                    <p className={miniText}>Structured details captured from the gemstone consultation form.</p>
                  </div>
                  <div className={twoColumnGrid}>
                    <div className={stackSm}>
                      <div className={detailItem}>
                        <span className={detailLabel}>First name</span>
                        <strong className={detailValue}>
                          {selectedLead.consultationDetails.firstName || "Not provided"}
                        </strong>
                      </div>
                      <div className={detailItem}>
                        <span className={detailLabel}>Last name</span>
                        <strong className={detailValue}>
                          {selectedLead.consultationDetails.lastName || "Not provided"}
                        </strong>
                      </div>
                      <div className={detailItem}>
                        <span className={detailLabel}>Date of birth</span>
                        <strong className={detailValue}>
                          {selectedLead.consultationDetails.dateOfBirth
                            ? formatDateTime(selectedLead.consultationDetails.dateOfBirth)
                            : "Not provided"}
                        </strong>
                      </div>
                      <div className={detailItem}>
                        <span className={detailLabel}>Gender</span>
                        <strong className={detailValue}>
                          {selectedLead.consultationDetails.gender || "Not provided"}
                        </strong>
                      </div>
                      <div className={detailItem}>
                        <span className={detailLabel}>Language</span>
                        <strong className={detailValue}>
                          {selectedLead.consultationDetails.language || "Not provided"}
                        </strong>
                      </div>
                    </div>
                    <div className={stackSm}>
                      <div className={detailItem}>
                        <span className={detailLabel}>City of birth</span>
                        <strong className={detailValue}>
                          {selectedLead.consultationDetails.cityOfBirth || "Not provided"}
                        </strong>
                      </div>
                      <div className={detailItem}>
                        <span className={detailLabel}>PIN code</span>
                        <strong className={detailValue}>
                          {selectedLead.consultationDetails.pinCode || "Not provided"}
                        </strong>
                      </div>
                      <div className={detailItem}>
                        <span className={detailLabel}>State</span>
                        <strong className={detailValue}>
                          {selectedLead.consultationDetails.state || "Not provided"}
                        </strong>
                      </div>
                      <div className={detailItem}>
                        <span className={detailLabel}>Country</span>
                        <strong className={detailValue}>
                          {selectedLead.consultationDetails.country || "Not provided"}
                        </strong>
                      </div>
                      <div className={detailItem}>
                        <span className={detailLabel}>Package</span>
                        <strong className={detailValue}>
                          {selectedLead.consultationDetails.selectedPackage || "Not provided"}
                        </strong>
                      </div>
                      <div className={detailItem}>
                        <span className={detailLabel}>Amount</span>
                        <strong className={detailValue}>
                          {typeof selectedLead.consultationDetails.amount === "number"
                            ? `Rs.${selectedLead.consultationDetails.amount}`
                            : "Not provided"}
                        </strong>
                      </div>
                      <div className={detailItem}>
                        <span className={detailLabel}>Kundali report</span>
                        <strong className={detailValue}>
                          {selectedLead.consultationDetails.wantsKundaliReport ? "Yes" : "No"}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className={formSection}>
                <div className={formSectionHead}>
                  <h4 className="text-sm font-semibold text-slate-950">Notes history</h4>
                  <p className={miniText}>Timeline of notes already attached to this lead.</p>
                </div>
                <div className={stackSm}>
                  {selectedLead.notes?.length ? (
                    selectedLead.notes.map((entry, index) => (
                      <div
                        key={`${selectedLead._id}-note-${index}`}
                        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-start sm:justify-between sm:p-4"
                      >
                        <div className="min-w-0">
                          <strong className="block break-words text-sm font-semibold text-slate-950">
                            {entry.note || "Empty note"}
                          </strong>
                          <div className={miniText}>
                            {entry.createdAt ? formatDateTime(entry.createdAt) : "Timestamp unavailable"}
                          </div>
                        </div>
                        <span className={pill}>Admin note</span>
                      </div>
                    ))
                  ) : (
                    <div className={emptyState}>No notes have been added to this lead yet.</div>
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

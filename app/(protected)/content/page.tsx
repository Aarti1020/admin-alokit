"use client";

import { KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, FilePenLine, FileText, LayoutTemplate, Search, WandSparkles } from "lucide-react";
import toast from "react-hot-toast";
import { contentApi } from "@/lib/api";
import { classNames, slugify } from "@/lib/utils";

type ResourceKey = keyof typeof contentApi;
type ContentItem = Record<string, unknown>;
type FieldType = "text" | "textarea" | "select" | "checkbox" | "list" | "number";
type FormValues = Record<string, string | boolean>;

type Field = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  helper?: string;
};

const labels: Record<ResourceKey, string> = {
  collections: "Collections",
  blogs: "Blogs",
  pages: "Pages",
  faqs: "FAQs",
  banners: "Banners",
  homepage: "Homepage Sections",
  seo: "SEO Configs"
};

const descriptions: Record<ResourceKey, string> = {
  collections: "Manage curated groups and featured shopping collections.",
  blogs: "Publish editorial content and storefront education.",
  pages: "Control static pages like About, Contact, and policies.",
  faqs: "Organize common customer questions by topic and module.",
  banners: "Manage promo, hero, and campaign banners.",
  homepage: "Maintain homepage section settings with simple form controls.",
  seo: "Edit search metadata without exposing raw JSON."
};

const notes: Partial<Record<ResourceKey, string>> = {
  homepage:
    "Advanced section data is preserved automatically. This form focuses on the safe settings admins usually change."
};

const fields: Record<ResourceKey, Field[]> = {
  collections: [
    { key: "title", label: "Title", type: "text" },
    { key: "slug", label: "Slug", type: "text", helper: "Auto-generated from title if left blank." },
    { key: "shortDescription", label: "Short description", type: "textarea" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "status", label: "Status", type: "select", options: ["published", "draft"] },
    { key: "heroImage", label: "Hero image URL", type: "text" },
    { key: "thumbnail", label: "Thumbnail URL", type: "text" },
    { key: "productIds", label: "Product IDs", type: "list", helper: "Separate IDs with commas." },
    { key: "showOnHomepage", label: "Show on homepage", type: "checkbox" },
    { key: "isFeatured", label: "Featured collection", type: "checkbox" }
  ],
  blogs: [
    { key: "title", label: "Title", type: "text" },
    { key: "slug", label: "Slug", type: "text", helper: "Auto-generated from title if left blank." },
    { key: "excerpt", label: "Excerpt", type: "textarea" },
    { key: "content", label: "Content", type: "textarea" },
    { key: "category", label: "Category", type: "text" },
    { key: "authorName", label: "Author", type: "text" },
    { key: "status", label: "Status", type: "select", options: ["published", "draft"] },
    { key: "featuredImage", label: "Featured image URL", type: "text" },
    { key: "tags", label: "Tags", type: "list", helper: "Separate tags with commas." },
    { key: "isFeatured", label: "Featured blog", type: "checkbox" }
  ],
  pages: [
    { key: "title", label: "Title", type: "text" },
    { key: "slug", label: "Slug", type: "text" },
    {
      key: "pageType",
      label: "Page type",
      type: "select",
      options: [
        "custom",
        "about",
        "contact",
        "privacy-policy",
        "terms",
        "shipping-policy",
        "refund-policy",
        "faq-page"
      ]
    },
    { key: "content", label: "Content", type: "textarea" },
    { key: "status", label: "Status", type: "select", options: ["published", "draft"] },
    { key: "showInHeader", label: "Show in header", type: "checkbox" },
    { key: "showInFooter", label: "Show in footer", type: "checkbox" }
  ],
  faqs: [
    { key: "question", label: "Question", type: "text" },
    { key: "answer", label: "Answer", type: "textarea" },
    { key: "category", label: "Category", type: "text" },
    {
      key: "module",
      label: "Module",
      type: "select",
      options: ["general", "product", "order", "shipping", "refund", "rudraksha", "gemstone", "homepage", "collection"]
    },
    { key: "status", label: "Status", type: "select", options: ["active", "inactive"] },
    { key: "sortOrder", label: "Sort order", type: "number" },
    { key: "isFeatured", label: "Featured FAQ", type: "checkbox" }
  ],
  banners: [
    { key: "title", label: "Title", type: "text" },
    { key: "slug", label: "Slug", type: "text" },
    { key: "type", label: "Banner type", type: "select", options: ["hero", "promo", "category", "popup", "announcement"] },
    { key: "page", label: "Page", type: "select", options: ["homepage", "category", "product", "blog", "global", "collection"] },
    { key: "image", label: "Desktop image URL", type: "text" },
    { key: "mobileImage", label: "Mobile image URL", type: "text" },
    { key: "link", label: "Link", type: "text" },
    { key: "buttonText", label: "Button text", type: "text" },
    { key: "status", label: "Status", type: "select", options: ["active", "inactive"] },
    { key: "sortOrder", label: "Sort order", type: "number" },
    { key: "isClickable", label: "Clickable banner", type: "checkbox" }
  ],
  homepage: [
    { key: "key", label: "Section key", type: "text" },
    { key: "title", label: "Title", type: "text" },
    {
      key: "sectionType",
      label: "Section type",
      type: "select",
      options: [
        "hero",
        "announcement",
        "featuredCategories",
        "featuredProducts",
        "imageText",
        "trustBadges",
        "testimonials",
        "blogPreview",
        "faqPreview",
        "cta",
        "customHtml",
        "trust_badges",
        "category_explorer",
        "collection_grid",
        "product_slider",
        "image_text",
        "faq_preview",
        "reviews_preview",
        "newsletter",
        "custom_html"
      ]
    },
    { key: "status", label: "Status", type: "select", options: ["active", "inactive"] },
    { key: "sortOrder", label: "Sort order", type: "number" }
  ],
  seo: [
    { key: "pageKey", label: "Page key", type: "select", options: ["homepage", "blog-listing", "product-listing", "category-listing", "contact-page", "about-page"] },
    { key: "metaTitle", label: "Meta title", type: "text" },
    { key: "metaDescription", label: "Meta description", type: "textarea" },
    { key: "metaKeywords", label: "Meta keywords", type: "list", helper: "Separate keywords with commas." },
    { key: "ogTitle", label: "OG title", type: "text" },
    { key: "ogDescription", label: "OG description", type: "textarea" },
    { key: "ogImage", label: "OG image URL", type: "text" },
    { key: "canonicalUrl", label: "Canonical URL", type: "text" },
    { key: "robots", label: "Robots", type: "text" }
  ]
};

const defaults: Record<ResourceKey, ContentItem> = {
  collections: {
    title: "",
    slug: "",
    shortDescription: "",
    description: "",
    status: "published",
    heroImage: "",
    thumbnail: "",
    productIds: [],
    showOnHomepage: false,
    isFeatured: false
  },
  blogs: {
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category: "",
    authorName: "",
    status: "published",
    featuredImage: "",
    tags: [],
    isFeatured: false
  },
  pages: {
    title: "",
    slug: "",
    pageType: "custom",
    content: "",
    status: "published",
    showInHeader: false,
    showInFooter: false
  },
  faqs: {
    question: "",
    answer: "",
    category: "",
    module: "general",
    status: "active",
    sortOrder: 0,
    isFeatured: false
  },
  banners: {
    title: "",
    slug: "",
    type: "hero",
    page: "homepage",
    image: "",
    mobileImage: "",
    link: "",
    buttonText: "",
    status: "active",
    sortOrder: 0,
    isClickable: false
  },
  homepage: { key: "", title: "", sectionType: "hero", status: "active", sortOrder: 1, data: {} },
  seo: {
    pageKey: "homepage",
    metaTitle: "",
    metaDescription: "",
    metaKeywords: [],
    ogTitle: "",
    ogDescription: "",
    ogImage: "",
    canonicalUrl: "",
    robots: "index,follow"
  }
};

const getId = (item: ContentItem) => String(item._id || item.id || "");
const getLabel = (item: ContentItem) =>
  String(item.title || item.question || item.pageKey || item.key || item.slug || "Untitled");
const getMeta = (item: ContentItem) =>
  [item.status, item.slug || item.pageKey || item.key || item.category].filter(Boolean).map(String);

const preview = (item: ContentItem) => {
  const source =
    item.shortDescription || item.excerpt || item.metaDescription || item.description || item.answer || item.content;
  if (typeof source !== "string" || !source.trim()) return "No preview available yet.";
  return source.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
};

const toFormValues = (resource: ResourceKey, item: ContentItem): FormValues =>
  Object.fromEntries(
    fields[resource].map((field) => {
      const value = item[field.key];
      if (field.type === "checkbox") return [field.key, Boolean(value)];
      if (field.type === "list") return [field.key, Array.isArray(value) ? value.join(", ") : ""];
      return [field.key, value === undefined || value === null ? "" : String(value)];
    })
  );

const splitList = (value: string) =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const buildBody = (resource: ResourceKey, form: FormValues, current: ContentItem | null) => {
  const body = { ...(current || {}), ...defaults[resource] };
  delete body._id;
  delete body.__v;
  delete body.createdAt;
  delete body.updatedAt;
  delete body.createdBy;
  delete body.updatedBy;

  fields[resource].forEach((field) => {
    const value = form[field.key];
    if (field.type === "checkbox") body[field.key] = Boolean(value);
    else if (field.type === "number") body[field.key] = value === "" ? 0 : Number(value);
    else if (field.type === "list") body[field.key] = splitList(String(value || ""));
    else body[field.key] = String(value || "");
  });

  if ("title" in body && typeof body.title === "string" && body.title.trim() && !String(body.slug || "").trim()) {
    body.slug = slugify(body.title);
  }

  return body;
};

type InsightAction = "all" | "live" | "review" | "editor";

export default function ContentPage() {
  const listRef = useRef<HTMLElement | null>(null);
  const editorRef = useRef<HTMLElement | null>(null);
  const [resource, setResource] = useState<ResourceKey>("collections");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [form, setForm] = useState<FormValues>(() => toFormValues("collections", defaults.collections));
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const api = useMemo(() => contentApi[resource], [resource]);

  const resetForm = useCallback(
    (nextResource = resource) => {
      setSelectedId("");
      setSelectedItem(null);
      setForm(toFormValues(nextResource, defaults[nextResource]));
    },
    [resource]
  );

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.list();
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to fetch content");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (selectedId && !items.some((item) => getId(item) === selectedId)) {
      resetForm();
    }
  }, [items, resetForm, selectedId]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => JSON.stringify(item).toLowerCase().includes(query));
  }, [items, search]);

  const insights = useMemo(() => {
    const withStatus = items.filter((item) => typeof item.status === "string");
    const live = withStatus.filter((item) => ["published", "active"].includes(String(item.status))).length;

    return [
      {
        label: "Visible items",
        value: items.length,
        detail: `${labels[resource]} loaded from backend`,
        icon: LayoutTemplate,
        action: "all" as InsightAction
      },
      {
        label: "Live items",
        value: live,
        detail: "Published or active content",
        icon: FileText,
        action: "live" as InsightAction
      },
      {
        label: "Needs review",
        value: Math.max(withStatus.length - live, 0),
        detail: "Draft or inactive content",
        icon: FilePenLine,
        action: "review" as InsightAction
      },
      {
        label: "Editor mode",
        value: selectedId ? "Editing" : "Creating",
        detail: selectedId ? "Editing an existing item" : "Ready for a new item",
        icon: WandSparkles,
        action: "editor" as InsightAction
      }
    ];
  }, [items, resource, selectedId]);

  const openEditor = () => {
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openList = () => {
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onResourceChange = (next: ResourceKey) => {
    setResource(next);
    setSearch("");
    resetForm(next);
  };

  const onEdit = async (id: string) => {
    try {
      const response = await api.get(id);
      setSelectedId(id);
      setSelectedItem(response.data);
      setForm(toFormValues(resource, response.data));
      openEditor();
      toast.success(`${labels[resource]} item loaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load item");
    }
  };

  const onSave = async () => {
    const body = buildBody(resource, form, selectedItem);
    setSaving(true);
    try {
      if (selectedId) {
        await api.update(selectedId, body);
        toast.success(`${labels[resource]} item updated`);
      } else {
        await api.create(body);
        toast.success(`${labels[resource]} item created`);
      }
      resetForm();
      await loadItems();
      openList();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save content");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!("delete" in api) || typeof api.delete !== "function") {
      toast.error("Delete is not available for this resource");
      return;
    }
    setDeletingId(id);
    try {
      await api.delete(id);
      toast.success("Item deleted");
      if (selectedId === id) resetForm();
      await loadItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete item");
    } finally {
      setDeletingId("");
    }
  };

  const openMatchingItem = async (matcher: (item: ContentItem) => boolean) => {
    const match = items.find(matcher);
    if (!match) {
      openList();
      return;
    }
    await onEdit(getId(match));
  };

  const handleInsightAction = async (action: InsightAction) => {
    if (action === "all") {
      setSearch("");
      openList();
      return;
    }

    if (action === "live") {
      setSearch("");
      await openMatchingItem((item) => ["published", "active"].includes(String(item.status || "")));
      return;
    }

    if (action === "review") {
      setSearch("");
      await openMatchingItem(
        (item) =>
          typeof item.status === "string" && !["published", "active"].includes(String(item.status))
      );
      return;
    }

    resetForm();
    openEditor();
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>, id: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void onEdit(id);
    }
  };

  return (
    <div className="stack-lg">
      <section className="stats-grid">
        {insights.map((item) => {
          const Icon = item.icon;
          const isActive =
            (item.action === "editor" && Boolean(selectedId)) ||
            (item.action === "all" && !search.trim()) ||
            false;

          return (
            <button
              key={item.label}
              type="button"
              className={classNames(
                "panel",
                "stat-card",
                "metric-card",
                "content-insight-card",
                isActive && "content-insight-card-active"
              )}
              onClick={() => void handleInsightAction(item.action)}
            >
              <div className="metric-card-head">
                <div className="metric-icon" aria-hidden="true">
                  <Icon size={18} />
                </div>
                <span>{item.label}</span>
                <span className="content-card-action">
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

      <div className="two-column-grid content-studio-grid">
        <section ref={listRef} className="panel stack-md">
          <div className="section-heading">
            <div>
              <h3>Content Studio</h3>
              <p>{descriptions[resource]}</p>
            </div>
            <div className="row-actions">
              <button className="ghost-button" type="button" onClick={() => resetForm()}>
                New item
              </button>
              <button className="ghost-button" type="button" onClick={() => loadItems()}>
                Refresh list
              </button>
            </div>
          </div>

          <label className="field">
            <span>Resource</span>
            <select value={resource} onChange={(e) => onResourceChange(e.target.value as ResourceKey)}>
              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <div className="product-command-bar">
            <label className="search-input">
              <Search size={18} />
              <input
                placeholder={`Search ${labels[resource].toLowerCase()} by title, slug, or content`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <button className="ghost-button" type="button" onClick={openEditor}>
              Open editor
            </button>
          </div>

          <div className="product-command-meta">
            <div className="pill">{filteredItems.length} items visible</div>
            <div className="pill">{selectedId ? "Editing current item" : "Ready to create"}</div>
          </div>

          <div className="stack-sm">
            {loading ? (
              <div className="empty-state">Loading content items...</div>
            ) : filteredItems.length === 0 ? (
              <div className="empty-state">No items match the current search.</div>
            ) : (
              filteredItems.map((item) => {
                const id = getId(item);
                const meta = getMeta(item);
                const isSelected = selectedId === id;

                return (
                  <article
                    key={id}
                    className={classNames(
                      "list-card",
                      "vertical",
                      "content-item-card",
                      isSelected && "content-item-card-selected"
                    )}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      className="content-item-selectable"
                      onClick={() => void onEdit(id)}
                      onKeyDown={(event) => handleCardKeyDown(event, id)}
                      aria-label={`Open ${getLabel(item)} in editor`}
                      aria-pressed={isSelected}
                    >
                      <div className="review-head">
                        <div>
                          <strong>{getLabel(item)}</strong>
                          <div className="mini-text">{id}</div>
                        </div>
                        {meta[0] ? <span className="pill pill-soft">{meta[0]}</span> : null}
                      </div>
                      {meta.length > 1 ? <div className="mini-text">{meta.slice(1).join(" . ")}</div> : null}
                      <p className="mini-text">{preview(item)}</p>
                      <div className="content-card-footer">
                        <span className="content-card-hint">
                          {isSelected ? "Currently open in editor" : "Open in editor"}
                        </span>
                        <span className="content-card-action">
                          Edit
                          <ArrowRight size={16} />
                        </span>
                      </div>
                    </div>
                    <div className="row-actions row-actions-wrap">
                      <button type="button" className="ghost-button" onClick={() => void onEdit(id)}>
                        Edit
                      </button>
                      {"delete" in api ? (
                        <button
                          type="button"
                          className="ghost-button danger"
                          onClick={() => void onDelete(id)}
                          disabled={deletingId === id}
                        >
                          {deletingId === id ? "Deleting..." : "Delete"}
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section ref={editorRef} className="panel stack-md">
          <div className="section-heading">
            <div>
              <h3>{selectedId ? "Edit item" : "Create item"}</h3>
              <p>Structured admin fields only. No raw JSON needed.</p>
            </div>
            <button className="ghost-button" type="button" onClick={() => resetForm()}>
              Reset form
            </button>
          </div>

          <div className={classNames("editor-banner", selectedId && "editor-banner-active")}>
            <div className="editor-banner-icon">
              <WandSparkles size={18} />
            </div>
            <div>
              <div className="product-editor-mode-row">
                <strong>{selectedId ? "Editing existing content" : "Creating new content"}</strong>
                <span className={classNames("pill", selectedId ? "pill-soft" : "status-pill-muted")}>
                  {selectedId ? "Edit mode" : "Create mode"}
                </span>
              </div>
              <div className="mini-text">
                Slugs are generated automatically from the title if you leave them blank.
              </div>
            </div>
          </div>

          {notes[resource] ? <div className="pill warning">{notes[resource]}</div> : null}

          <form
            className="stack-md"
            onSubmit={(event) => {
              event.preventDefault();
              void onSave();
            }}
          >
            {fields[resource].map((field) =>
              field.type === "checkbox" ? (
                <label key={field.key} className="toggle-card">
                  <input
                    type="checkbox"
                    checked={Boolean(form[field.key])}
                    onChange={(e) => setForm((current) => ({ ...current, [field.key]: e.target.checked }))}
                  />
                  <div>
                    <strong>{field.label}</strong>
                    <span>{field.helper || "Enable or disable this option."}</span>
                  </div>
                </label>
              ) : field.type === "select" ? (
                <label key={field.key} className="field">
                  <span>{field.label}</span>
                  <select
                    value={String(form[field.key] || "")}
                    onChange={(e) => setForm((current) => ({ ...current, [field.key]: e.target.value }))}
                  >
                    {field.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {field.helper ? <small>{field.helper}</small> : null}
                </label>
              ) : field.type === "textarea" ? (
                <label key={field.key} className="field">
                  <span>{field.label}</span>
                  <textarea
                    value={String(form[field.key] || "")}
                    onChange={(e) => setForm((current) => ({ ...current, [field.key]: e.target.value }))}
                  />
                  {field.helper ? <small>{field.helper}</small> : null}
                </label>
              ) : (
                <label key={field.key} className="field">
                  <span>{field.label}</span>
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    value={String(form[field.key] || "")}
                    onChange={(e) => setForm((current) => ({ ...current, [field.key]: e.target.value }))}
                  />
                  {field.helper ? <small>{field.helper}</small> : null}
                </label>
              )
            )}

            <div className="row-actions row-actions-wrap">
              <button className="primary-button" type="submit" disabled={saving}>
                {saving ? "Saving..." : selectedId ? "Update item" : "Create item"}
              </button>
              <button className="ghost-button" type="button" onClick={() => resetForm()}>
                Reset form
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

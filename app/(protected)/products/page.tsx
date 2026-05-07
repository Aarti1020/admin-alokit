"use client";

import Image from "next/image";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  ArrowRight,
  BadgeIndianRupee,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Eye,
  ImagePlus,
  PackagePlus,
  Pencil,
  Search,
  Star,
  Trash2,
  Video,
  X
} from "lucide-react";
import toast from "react-hot-toast";
import { catalogApi, productApi } from "@/lib/api";
import type { Category, Product, SubCategory } from "@/lib/types";
import { classNames, formatCurrency } from "@/lib/utils";

/* ─── constants & types (unchanged) ────────────────────────────────────── */

const emptyProductForm = {
  id: "",
  title: "",
  sku: "",
  category: "",
  subCategory: "",
  productType: "gemstone",
  basePrice: "0",
  salePrice: "0",
  stock: "0",
  lowStockThreshold: "5",
  status: "active",
  shortDescription: "",
  description: "",
  isFeatured: false,
  showOnHomepage: false
};

const ACCEPTED_PRODUCT_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const ACCEPTED_PRODUCT_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const ACCEPTED_PRODUCT_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const ACCEPTED_PRODUCT_VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"];

const MAX_PRODUCT_IMAGES = 8;
const MAX_PRODUCT_IMAGE_SIZE = 4 * 1024 * 1024;
const MIN_PRODUCT_VIDEO_SIZE = 2048 * 1024;
const MAX_PRODUCT_VIDEO_SIZE = 5120 * 1024;

type ProductViewFilter = "all" | "featured" | "low-stock" | "inventory";
type ProductFormState = typeof emptyProductForm;

type ProductImageObject = {
  url?: string;
  secure_url?: string;
  path?: string;
};

type ProductWithImageFallbacks = Product & {
  thumbnail?: string;
  image?: string;
  imageUrl?: string;
  featuredImage?: string | ProductImageObject | null;
  images?: Array<string | ProductImageObject> | string | ProductImageObject;
  media?: Array<string | ProductImageObject> | string | ProductImageObject;
};

type CategoryGroup = {
  id: string;
  name: string;
  products: Product[];
};

/* ─── pure helpers (unchanged) ─────────────────────────────────────────── */

const normalizeText = (value?: string | null) => String(value || "").trim().toLowerCase();

const normalizeUrl = (value?: string | null) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  return trimmed;
};

const getUrlFromCandidate = (candidate?: string | ProductImageObject | null) => {
  if (!candidate) return "";
  if (typeof candidate === "string") return normalizeUrl(candidate);
  return normalizeUrl(candidate.secure_url) || normalizeUrl(candidate.url) || normalizeUrl(candidate.path) || "";
};

const toArray = <T,>(value?: T | T[] | null): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const resolveProductThumbnail = (product: Product) => {
  const item = product as ProductWithImageFallbacks;
  const direct =
    normalizeUrl(item.thumbnail) ||
    normalizeUrl(item.image) ||
    normalizeUrl(item.imageUrl) ||
    getUrlFromCandidate(item.featuredImage);
  if (direct) return direct;
  const images = toArray(item.images);
  for (const image of images) {
    const url = getUrlFromCandidate(image);
    if (url) return url;
  }
  const media = toArray(item.media);
  for (const mediaItem of media) {
    const url = getUrlFromCandidate(mediaItem);
    if (url) return url;
  }
  return "";
};

const parseMoneyField = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getFileSignature = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;
const getProductTitle = (product: Product) => product.title || product.name || "Untitled product";

const getCategoryId = (product: Product) =>
  typeof product.category === "string" ? product.category : product.category?._id || "uncategorized";

const getCategoryName = (product: Product, categories: Category[]) => {
  if (typeof product.category !== "string" && product.category?.name) return product.category.name;
  const matchedCategory = categories.find((category) => category._id === getCategoryId(product));
  return matchedCategory?.name || "Uncategorized";
};

const getSubCategoryName = (product: Product) => {
  if (!product.subCategory) return "No subcategory";
  return typeof product.subCategory === "string" ? "Linked subcategory" : product.subCategory.name || "No subcategory";
};

const getProductPrice = (product: Product) => product.effectivePrice || product.salePrice || product.basePrice || 0;

const buildCategoryGroups = (products: Product[], categories: Category[]) => {
  const groups = new Map<string, CategoryGroup>();
  categories.forEach((category) => {
    groups.set(category._id, { id: category._id, name: category.name, products: [] });
  });
  products.forEach((product) => {
    const categoryId = getCategoryId(product);
    const categoryName = getCategoryName(product, categories);
    if (!groups.has(categoryId)) {
      groups.set(categoryId, { id: categoryId, name: categoryName, products: [] });
    }
    groups.get(categoryId)?.products.push(product);
  });
  return Array.from(groups.values())
    .filter((group) => group.products.length > 0)
    .sort((a, b) => {
      const aName = normalizeText(a.name);
      const bName = normalizeText(b.name);
      if (aName.includes("gemstone") && !bName.includes("gemstone")) return -1;
      if (!aName.includes("gemstone") && bName.includes("gemstone")) return 1;
      if (aName.includes("rudraksha") && !bName.includes("rudraksha")) return -1;
      if (!aName.includes("rudraksha") && bName.includes("rudraksha")) return 1;
      return a.name.localeCompare(b.name);
    });
};

/* ─── ProductCompactCard ────────────────────────────────────────────────── */

function ProductCompactCard({
  product,
  categories,
  onOpen,
  brokenThumbnailIds,
  onImageError
}: {
  product: Product;
  categories: Category[];
  onOpen: (product: Product) => void;
  brokenThumbnailIds: Record<string, boolean>;
  onImageError: (productId: string) => void;
}) {
  const productTitle = getProductTitle(product);
  const thumbnailUrl = resolveProductThumbnail(product);
  const categoryName = getCategoryName(product, categories);
  const lowStock = product.stock <= (product.lowStockThreshold || 5);
  const showThumbnail = Boolean(thumbnailUrl) && !brokenThumbnailIds[product._id];

  return (
    <button
      type="button"
      /* product-card-compact — fixed width, never shrinks in carousel */
      className="w-[260px] min-w-[260px] max-w-[260px] snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md max-sm:w-[78vw] max-sm:min-w-[78vw] max-sm:max-w-[78vw] max-[420px]:w-[84vw] max-[420px]:min-w-[84vw] max-[420px]:max-w-[84vw]"
      onClick={() => onOpen(product)}
    >
      {/* product-card-compact-media */}
      <div className="relative aspect-[4/3] w-full bg-slate-50 overflow-hidden">
        {showThumbnail ? (
          <Image
            src={thumbnailUrl}
            alt={productTitle}
            fill
            className="object-cover"
            sizes="(max-width: 760px) 78vw, 260px"
            unoptimized
            onError={() => onImageError(product._id)}
          />
        ) : (
          /* product-card-compact-fallback */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-slate-500">
            <ImagePlus size={22} />
            <span className="text-sm font-medium">No image</span>
          </div>
        )}

        {/* status-badge */}
        <span
          className={classNames(
            "absolute top-2 right-2 px-2 py-0.5 rounded-full text-[0.7rem] font-bold uppercase tracking-wide",
            product.status === "active"
              ? "bg-emerald-50 text-emerald-700"   /* active */
              : "bg-rose-50 text-rose-600"    /* inactive */
          )}
        >
          {product.status}
        </span>
      </div>

      {/* product-card-compact-body */}
      <div className="p-3.5 flex flex-col gap-1.5">
        <h4 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2 m-0">{productTitle}</h4>
        <p className="text-sm text-slate-600 m-0">{categoryName}</p>

        {/* product-card-compact-meta */}
        <div className="flex items-start justify-between gap-2 flex-wrap mt-1">
          <strong className="text-sm font-bold text-slate-900">{formatCurrency(getProductPrice(product))}</strong>
          <span
            className={classNames(
              "text-sm font-semibold px-2 py-0.5 rounded-full",
              lowStock
                ? "bg-amber-50 text-amber-700"   /* low stock */
                : "bg-slate-50 text-slate-500"
            )}
          >
            Stock: {product.stock}
          </span>
        </div>
      </div>
    </button>
  );
}

/* ─── ModalShell ────────────────────────────────────────────────────────── */

function ModalShell({
  children,
  onClose,
  variant = "modal"
}: {
  children: ReactNode;
  onClose: () => void;
  variant?: "modal" | "drawer";
}) {
  return (
    /* ui-modal-overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center
                 bg-slate-950/50 backdrop-blur-sm overflow-y-auto p-4
                 max-sm:items-end max-sm:p-0"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className={classNames(
          "relative bg-white shadow-lg",
          "border border-slate-200 w-full",
          variant === "drawer"
            /* ui-drawer */
            ? "rounded-2xl max-w-[min(860px,calc(100vw-2rem))] max-h-[90vh] flex flex-col overflow-hidden max-sm:rounded-t-2xl max-sm:max-w-full max-sm:max-h-[92vh] max-sm:border-b-0"
            /* ui-modal */
            : "rounded-2xl max-w-[min(900px,calc(100vw-2rem))] max-h-[90vh] flex flex-col overflow-hidden max-sm:rounded-t-2xl max-sm:max-w-full max-sm:max-h-[92vh] max-sm:border-b-0"
        )}
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

/* ─── ProductsPage ──────────────────────────────────────────────────────── */

export default function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [viewFilter, setViewFilter] = useState<ProductViewFilter>("all");
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoPreview, setVideoPreview] = useState("");

  const [brokenThumbnailIds, setBrokenThumbnailIds] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<ProductFormState>(emptyProductForm);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  /* ─────────────────────────────────────────────────────────────────────── */
const defaultDescription = `Traditional Benefits

Believed to attract prosperity and positive opportunities

Traditionally associated with abundance and confidence

Said to support focus on growth and success

Who Should Wear

Business owners and entrepreneurs

Working professionals seeking growth

People focused on abundance and positive intentions

How to Wear

Wear on the wrist comfortably for daily use

Commonly worn on Thursday or Friday

Can be worn after simple cleansing and intention setting

Do’s

Keep the bracelet clean and dry

Store in a neat pouch or box when not in use

Wear with positive intention and regular care

Don’ts

Avoid direct contact with chemicals and perfume

Do not stretch the bracelet roughly

Do not keep in dirty or damp places`;
  
  const isEditing = Boolean(form.id);

  const selectedSubCategories = useMemo(
    () =>
      form.category
        ? subCategories.filter((item) =>
            typeof item.category === "string" ? item.category === form.category : item.category?._id === form.category
          )
        : subCategories,
    [form.category, subCategories]
  );

  const productInsights = useMemo(() => {
    const activeCount = products.filter((p) => p.status === "active").length;
    const featuredCount = products.filter((p) => p.isFeatured).length;
    const lowStockCount = products.filter((p) => p.stock <= (p.lowStockThreshold || 5)).length;
    const inventoryValue = products.reduce((t, p) => t + getProductPrice(p) * p.stock, 0);
    return [
      { label: "Total products",   value: products.length,              detail: `${activeCount} active in catalog`,        icon: Boxes,             filter: "all" as const },
      { label: "Featured",         value: featuredCount,                detail: "Highlighted storefront products",         icon: Star,              filter: "featured" as const },
      { label: "Low stock",        value: lowStockCount,                detail: "Products need restock review",           icon: AlertTriangle,     filter: "low-stock" as const },
      { label: "Inventory value",  value: formatCurrency(inventoryValue), detail: "Estimated from current stock",         icon: BadgeIndianRupee,  filter: "inventory" as const }
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = normalizeText(search);
    return products.filter((product) => {
      const productName = getProductTitle(product);
      const categoryName = getCategoryName(product, categories);
      const subCategoryName = getSubCategoryName(product);
      const matchesQuery =
        !query ||
        normalizeText(productName).includes(query) ||
        normalizeText(product.sku).includes(query) ||
        normalizeText(categoryName).includes(query) ||
        normalizeText(subCategoryName).includes(query);
      const matchesStatus = !status || product.status === status;
      const matchesViewFilter =
        viewFilter === "all" ||
        viewFilter === "inventory" ||
        (viewFilter === "featured" && product.isFeatured) ||
        (viewFilter === "low-stock" && product.stock <= (product.lowStockThreshold || 5));
      const matchesCategory = activeCategory === "all" || getCategoryId(product) === activeCategory;
      return matchesQuery && matchesStatus && matchesViewFilter && matchesCategory;
    });
  }, [products, search, status, viewFilter, activeCategory, categories]);

  const categoryGroups    = useMemo(() => buildCategoryGroups(filteredProducts, categories), [filteredProducts, categories]);
  const allCategoryGroups = useMemo(() => buildCategoryGroups(products, categories),         [products, categories]);

  const selectedProduct = useMemo(
    () => products.find((p) => p._id === form.id) || null,
    [form.id, products]
  );

  const existingProductImages = useMemo(
    () => (selectedProduct?.images || []).map((image) => image.url).filter(Boolean),
    [selectedProduct]
  );

  const mediaImageUrls = imagePreviews.length ? imagePreviews : existingProductImages;
  const mediaVideoUrl  = videoPreview || selectedProduct?.productVideo?.url || "";

  useEffect(() => {
    const previews = selectedFiles.map((f) => URL.createObjectURL(f));
    setImagePreviews(previews);
    return () => previews.forEach((p) => URL.revokeObjectURL(p));
  }, [selectedFiles]);

  useEffect(() => {
    if (!selectedVideo) { setVideoPreview(""); return; }
    const preview = URL.createObjectURL(selectedVideo);
    setVideoPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [selectedVideo]);

  const loadMeta = async () => {
    const [catRes, subRes] = await Promise.all([catalogApi.categories(), catalogApi.subCategories()]);
    setCategories(catRes.data);
    setSubCategories(subRes.data);
  };

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productApi.list({ search, status, limit: 200 });
      setProducts(res.data);
      setBrokenThumbnailIds({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to fetch products");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    void Promise.resolve()
      .then(() => Promise.all([loadMeta(), loadProducts()]))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Unable to load product data"));
  }, [loadProducts]);

  const scrollCategoryCarousel = (groupId: string, direction: "left" | "right") => {
    document.getElementById(`carousel-${groupId}`)?.scrollBy({ left: direction === "left" ? -360 : 360, behavior: "smooth" });
  };

  const resetForm    = () => { setForm(emptyProductForm); setSelectedFiles([]); setSelectedVideo(null); };
  const openCreateEditor = () => { resetForm(); setIsEditorOpen(true); };
  const closeEditor  = () => { setIsEditorOpen(false); resetForm(); };

  const fillForm = (product: Product) => {
    setForm({
      id: product._id,
      title: product.title || product.name || "",
      sku: product.sku || "",
      category: typeof product.category === "string" ? product.category : product.category?._id || "",
      subCategory: typeof product.subCategory === "string" ? product.subCategory : product.subCategory?._id || "",
      productType: product.productType || "gemstone",
      basePrice: String(product.basePrice || 0),
      salePrice: String(product.salePrice || 0),
      stock: String(product.stock || 0),
      lowStockThreshold: String(product.lowStockThreshold || 5),
      status: product.status === "inactive" ? "inactive" : "active",
      shortDescription: product.shortDescription || "",
      // description: product.description || "",
      description: product.description || defaultDescription,
      isFeatured: Boolean(product.isFeatured),
      showOnHomepage: Boolean(product.showOnHomepage)
    });
    setSelectedFiles([]);
    setSelectedVideo(null);
  };

  const openEditEditor = (product: Product) => { fillForm(product); setPreviewProduct(null); setIsEditorOpen(true); };

  const handleProductImageSelection = (files: FileList | null, input: HTMLInputElement) => {
    const nextFiles = Array.from(files || []);
    if (!nextFiles.length) { input.value = ""; return; }
    const invalid = nextFiles.filter((f) => !ACCEPTED_PRODUCT_IMAGE_TYPES.has(f.type));
    if (invalid.length) {
      input.value = "";
      toast.error(`Not accepted: ${invalid.map((f) => f.name).join(", ")}. Only ${ACCEPTED_PRODUCT_IMAGE_EXTENSIONS.join(", ")} allowed.`);
      return;
    }
    const oversized = nextFiles.filter((f) => f.size > MAX_PRODUCT_IMAGE_SIZE);
    if (oversized.length) {
      input.value = "";
      toast.error(`Each image must be 4MB or smaller: ${oversized.map((f) => f.name).join(", ")}`);
      return;
    }
    setSelectedFiles((cur) => {
      const sigs = new Set(cur.map(getFileSignature));
      const toAdd = nextFiles.filter((f) => !sigs.has(getFileSignature(f)));
      const combined = [...cur, ...toAdd];
      if (combined.length > MAX_PRODUCT_IMAGES) { toast.error(`Upload up to ${MAX_PRODUCT_IMAGES} product images`); return cur; }
      if (!toAdd.length) { toast.error("These images are already queued."); return cur; }
      return combined;
    });
    input.value = "";
  };

  const handleProductVideoSelection = (files: FileList | null, input: HTMLInputElement) => {
    const file = files?.[0];
    if (!file) { setSelectedVideo(null); return; }
    if (!ACCEPTED_PRODUCT_VIDEO_TYPES.has(file.type)) {
      setSelectedVideo(null); input.value = "";
      toast.error(`Only ${ACCEPTED_PRODUCT_VIDEO_EXTENSIONS.join(", ")} videos are allowed.`);
      return;
    }
    if (file.size < MIN_PRODUCT_VIDEO_SIZE || file.size > MAX_PRODUCT_VIDEO_SIZE) {
      setSelectedVideo(null); input.value = "";
      toast.error("Video size must be between 2048 KB and 5120 KB.");
      return;
    }
    setSelectedVideo(file);
  };

  const removeSelectedImage = (index: number) =>
    setSelectedFiles((cur) => cur.filter((_, i) => i !== index));

  const createFormData = () => {
    const body = new FormData();
    body.set("title", form.title.trim());
    body.set("sku", form.sku.trim());
    body.set("category", form.category);
    body.set("subCategory", form.subCategory);
    body.set("productType", form.productType);
    body.set("basePrice", form.basePrice);
    body.set("salePrice", form.salePrice);
    body.set("stock", form.stock);
    body.set("lowStockThreshold", form.lowStockThreshold);
    body.set("status", form.status);
    body.set("shortDescription", form.shortDescription.trim());
    body.set("description", form.description.trim());
    body.set("isFeatured", String(form.isFeatured));
    body.set("showOnHomepage", String(form.showOnHomepage));
    selectedFiles.forEach((f) => body.append("images", f));
    if (selectedVideo) body.set("video", selectedVideo);
    return body;
  };

  const validateProductForm = () => {
    const basePrice = parseMoneyField(form.basePrice);
    const salePrice = parseMoneyField(form.salePrice);
    const stock = Number(form.stock);
    const lowStockThreshold = Number(form.lowStockThreshold);
    if (!form.title.trim()) throw new Error("Product title is required");
    if (!form.category) throw new Error("Please select a category");
    if (!form.subCategory) throw new Error("Please select a subcategory");
    if (basePrice < 0 || salePrice < 0) throw new Error("Product prices cannot be negative");
    if (salePrice > 0 && salePrice > basePrice) throw new Error("Sale price cannot be greater than base price");
    if (!Number.isInteger(stock) || stock < 0) throw new Error("Stock must be a non-negative whole number");
    if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) throw new Error("Low stock threshold must be a non-negative whole number");
    if (!form.id && selectedFiles.length === 0) throw new Error("At least one product image is required for new products");
  };

  const submitProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      validateProductForm();
      const body = createFormData();
      if (form.id) {
        await productApi.update(form.id, body);
        toast.success("Product updated successfully");
      } else {
        await productApi.create(body);
        toast.success("Product created successfully");
      }
      closeEditor();
      await loadProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save product");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFeatured = async (product: Product) => {
    try {
      await productApi.updateFeatured(product._id, !product.isFeatured);
      toast.success(product.isFeatured ? "Removed from featured" : "Added to featured");
      await loadProducts();
      setPreviewProduct((cur) => cur?._id === product._id ? { ...cur, isFeatured: !product.isFeatured } : cur);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const toggleStatus = async (product: Product) => {
    const nextStatus = product.status === "active" ? "inactive" : "active";
    try {
      await productApi.updateStatus(product._id, nextStatus);
      toast.success(`Product marked ${nextStatus}`);
      await loadProducts();
      setPreviewProduct((cur) => cur?._id === product._id ? { ...cur, status: nextStatus } : cur);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status update failed");
    }
  };

  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`Delete ${getProductTitle(product)}? This action cannot be undone.`)) return;
    try {
      await productApi.remove(product._id);
      toast.success("Product deleted successfully");
      setPreviewProduct(null);
      await loadProducts();
      if (form.id === product._id) resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const applyInsightFilter = (filter: ProductViewFilter) => {
    setViewFilter(filter);
    if (filter === "all" || filter === "inventory") { setSearch(""); setStatus(""); setActiveCategory("all"); }
  };

  const previewThumbnail = previewProduct ? resolveProductThumbnail(previewProduct) : "";

  /* ── shared Tailwind primitives ── */
  const primaryBtn =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

  const ghostBtn =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

  const dangerGhostBtn =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

  const iconBtn =
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2";

  const panelBase =
    "rounded-2xl border border-slate-200 bg-white shadow-sm";

  const inputBase =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50";

  const fieldLabel = "flex flex-col gap-1.5 text-sm font-medium text-slate-900";
  const fieldSpan = "text-sm font-medium text-slate-700";


  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-4 sm:p-6 lg:p-8">

      {/* ── Hero ── */}
      <section className={`${panelBase} flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between`}>
        <div className="flex flex-col gap-1 min-w-0">
          {/* products-page-label / eyebrow */}
          <span className="uppercase tracking-[0.14em] text-[0.72rem] font-bold text-indigo-600">
            Catalog Management
          </span>
          <h2 className="m-0 text-2xl font-bold text-slate-900 ">Products</h2>
          <p className="m-0 text-sm text-slate-600 max-w-xl">
            Manage inventory with category-wise carousels. Click a product to preview details, then edit or delete from
            the product modal.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <button className={`${primaryBtn} w-full sm:w-auto`} type="button" onClick={openCreateEditor}>
            <PackagePlus size={16} />
            Add product
          </button>
          <button className={`${ghostBtn} w-full sm:w-auto`} type="button" onClick={() => loadProducts()}>
            Refresh
          </button>
        </div>
      </section>

      {/* ── Insights stats grid ── */}
      <section className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {productInsights.map((item) => {
          const Icon = item.icon;
          const isActive = viewFilter === item.filter || (item.filter === "all" && viewFilter === "inventory");
          return (
            <button
              key={item.label}
              type="button"
              className={classNames(
                panelBase,
                "group flex flex-col gap-1.5 p-5 text-left transition",
                "hover:-translate-y-0.5 hover:shadow-xl",
                isActive && "ring-2 ring-indigo-200 border-indigo-600/30"
              )}
              onClick={() => applyInsightFilter(item.filter)}
              aria-pressed={isActive}
            >
              {/* metric-card-head */}
              <div className="flex items-center gap-2 justify-between w-full">
                <div className="flex items-center gap-2">
                  {/* metric-icon */}
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Icon size={16} />
                  </div>
                  <span className="text-sm font-semibold text-slate-600">{item.label}</span>
                </div>
                <span className="flex items-center gap-1 text-sm font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  View <ArrowRight size={12} />
                </span>
              </div>
              <strong className="text-xl font-bold text-slate-900 mt-1">{item.value}</strong>
              <p className="text-sm text-slate-500 m-0">{item.detail}</p>
            </button>
          );
        })}
      </section>

      {/* ── Catalog panel ── */}
      <section className={`${panelBase} flex flex-col gap-5 p-6 min-w-0 overflow-visible max-sm:p-4`}>

        {/* section heading */}
        <div className="flex items-start justify-between gap-4 flex-wrap max-sm:flex-col">
          <div className="min-w-0">
            <h3 className="m-0 text-lg font-bold text-slate-900 ">Category carousels</h3>
            <p className="m-0 text-sm text-slate-600">
              Products are grouped by their assigned category. Use scroll, swipe, or arrow buttons to view all.
            </p>
          </div>
          <button className={primaryBtn} type="button" onClick={openCreateEditor}>
            <PackagePlus size={16} />
            Add product
          </button>
        </div>

        {/* search + status filter — product-command-bar */}
        <div className="grid grid-cols-[1fr_minmax(170px,220px)] gap-3 max-xl:grid-cols-1">
          {/* search-input */}
          <label className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl px-3.5 py-0 text-slate-500 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100 transition">
            <Search size={18} className="shrink-0" />
            <input
              className="flex-1 min-w-0 bg-transparent border-none outline-none py-[0.92rem] text-sm text-slate-900 placeholder:text-slate-400"
              placeholder="Search product, size, category, or subcategory"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <select
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-[0.92rem] text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* category filter strip */}
        <div
          className="flex gap-2 flex-wrap"
          aria-label="Filter products by category"
        >
          {[{ id: "all", name: "All categories", count: products.length }, ...allCategoryGroups.map((g) => ({ id: g.id, name: g.name, count: g.products.length }))].map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={classNames(
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition",
                activeCategory === chip.id
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
              onClick={() => setActiveCategory(chip.id)}
            >
              {chip.name}
              <span className={classNames(
                "text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full",
                activeCategory === chip.id ? "bg-white/20 text-white" : "bg-slate-50 text-slate-500"
              )}>
                {chip.count}
              </span>
            </button>
          ))}
        </div>

        {/* product-command-meta pills */}
        <div className="flex flex-wrap gap-2.5">
          {[
            `${filteredProducts.length} products visible`,
            `${categoryGroups.length} category carousels`,
            viewFilter === "featured" ? "Featured filter active" : viewFilter === "low-stock" ? "Low stock filter active" : "All inventory in view"
          ].map((text) => (
            <div
              key={text}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-50 text-slate-600 border border-slate-200"
            >
              {text}
            </div>
          ))}
        </div>

        {/* carousel stack */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-600 font-semibold">
            Loading product inventory...
          </div>
        ) : categoryGroups.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-slate-600 font-semibold">
            No products match the current search, status, or category filter.
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {categoryGroups.map((group) => (
              <section
                key={group.id}
                /* category-section */
                className="flex flex-col gap-3 bg-slate-50 rounded-2xl border border-slate-200 p-4 min-w-0 overflow-hidden max-sm:rounded-2xl max-[420px]:p-3.5"
              >
                {/* category-section-header */}
                <div className="flex items-center justify-between gap-3 min-w-0 max-md:flex-col max-md:items-stretch">
                  <div className="min-w-0">
                    <h3 className="m-0 text-base font-bold text-slate-900  break-words">
                      {group.name}
                    </h3>
                    <p className="m-0 text-sm text-slate-600 break-words">{group.products.length} products</p>
                  </div>

                  {/* category-section-actions */}
                  <div className="flex items-center gap-2 max-md:justify-end max-sm:flex-row max-sm:justify-end">
                    <button
                      type="button"
                      className={`${iconBtn} max-sm:w-[42px] max-sm:h-[42px] max-sm:min-w-[42px]`}
                      onClick={() => scrollCategoryCarousel(group.id, "left")}
                      aria-label={`Scroll ${group.name} left`}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      className={`${iconBtn} max-sm:w-[42px] max-sm:h-[42px] max-sm:min-w-[42px]`}
                      onClick={() => scrollCategoryCarousel(group.id, "right")}
                      aria-label={`Scroll ${group.name} right`}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div
                  id={`carousel-${group.id}`}
                  className="flex w-full snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-hidden scroll-smooth px-1 pb-4 pt-1 [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]"
                >
                  {group.products.map((product) => (
                    <ProductCompactCard
                      key={product._id}
                      product={product}
                      categories={categories}
                      brokenThumbnailIds={brokenThumbnailIds}
                      onImageError={(id) => setBrokenThumbnailIds((cur) => ({ ...cur, [id]: true }))}
                      onOpen={setPreviewProduct}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      {/* ── Preview modal ── */}
      {previewProduct ? (
        <ModalShell onClose={() => setPreviewProduct(null)}>
          {/* ui-modal-header */}
          <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-200 min-w-0 max-sm:flex-col max-sm:items-stretch">
            <div className="min-w-0">
              <h3 className="m-0 text-base font-bold text-slate-900  break-words">
                {getProductTitle(previewProduct)}
              </h3>
              <p className="m-0 text-sm text-slate-600 break-words">
                {getCategoryName(previewProduct, categories)} · {getSubCategoryName(previewProduct)}
              </p>
            </div>
            <button type="button" className={iconBtn} onClick={() => setPreviewProduct(null)} aria-label="Close preview">
              <X size={18} />
            </button>
          </div>

          {/* product-preview-content */}
          <div className="flex-1 overflow-y-auto grid grid-cols-[minmax(260px,380px)_minmax(0,1fr)] max-xl:grid-cols-1 max-sm:p-4 max-sm:grid-cols-1">
            {/* product-preview-image-wrap */}
            <div className="relative min-h-[320px] bg-slate-50 max-sm:min-h-[260px]">
              {previewThumbnail ? (
                <Image
                  src={previewThumbnail}
                  alt={getProductTitle(previewProduct)}
                  fill
                  className="object-cover"
                  sizes="(max-width: 760px) 90vw, 380px"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <ImagePlus size={26} />
                  <span className="text-sm">No image available</span>
                </div>
              )}
            </div>

            {/* product-preview-details */}
            <div className="flex flex-col gap-4 p-5 overflow-y-auto">
              {/* preview-grid */}
              <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                {[
                  { label: "Price",    value: formatCurrency(getProductPrice(previewProduct)) },
                  { label: "Stock",    value: previewProduct.stock },
                  { label: "Status",   value: previewProduct.status },
                  { label: "Featured", value: previewProduct.isFeatured ? "Yes" : "No" }
                ].map((item) => (
                  <div key={item.label} className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm text-slate-500 font-medium">{item.label}</span>
                    <strong className="text-sm font-bold text-slate-900 break-words">{item.value}</strong>
                  </div>
                ))}
              </div>

              {[
                { label: "Short description", value: previewProduct.shortDescription || "No short description added." },
                { label: "Full description",  value: previewProduct.description || "No full description added." }
              ].map((item) => (
                <div key={item.label} className="flex flex-col gap-1 min-w-0">
                  <span className="text-sm text-slate-500 font-medium">{item.label}</span>
                  <p className="m-0 text-sm text-slate-900 break-words">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ui-modal-footer */}
          <div className="flex flex-wrap gap-2.5 p-5 border-t border-slate-200 min-w-0 max-sm:flex-col max-sm:items-stretch">
            <button type="button" className={ghostBtn} onClick={() => toggleFeatured(previewProduct)}>
              <Star size={16} />
              {previewProduct.isFeatured ? "Unfeature" : "Feature"}
            </button>
            <button type="button" className={ghostBtn} onClick={() => toggleStatus(previewProduct)}>
              <Eye size={16} />
              {previewProduct.status === "active" ? "Deactivate" : "Activate"}
            </button>
            <button type="button" className={ghostBtn} onClick={() => openEditEditor(previewProduct)}>
              <Pencil size={16} />
              Edit
            </button>
            <button type="button" className={dangerGhostBtn} onClick={() => deleteProduct(previewProduct)}>
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </ModalShell>
      ) : null}

      {/* ── Editor drawer ── */}
      {isEditorOpen ? (
        <ModalShell onClose={closeEditor} variant="drawer">
          {/* ui-drawer-header */}
          <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-200 min-w-0 max-sm:flex-col max-sm:items-stretch shrink-0">
            <div className="min-w-0">
              <h3 className="m-0 text-base font-bold text-slate-900 ">
                {isEditing ? "Edit product" : "Create product"}
              </h3>
              <p className="m-0 text-sm text-slate-600">
                {isEditing
                  ? "Update product details, pricing, inventory, media, and visibility."
                  : "Add a new product with clean, structured product information."}
              </p>
            </div>
            <button type="button" className={iconBtn} onClick={closeEditor} aria-label="Close editor">
              <X size={18} />
            </button>
          </div>

          <form
            className="flex flex-col gap-0 overflow-y-auto flex-1 min-w-0 p-5 max-sm:p-4"
            onSubmit={submitProduct}
          >
            {/* ── form sections ── */}
            {/* Each section: form-section */}
            {[
              /* Basic info */
              <div key="basic" className="flex flex-col gap-4 pb-6 border-b border-slate-200">
                <div className="flex flex-col gap-0.5">
                  <h4 className="m-0 text-sm font-bold text-slate-900 ">Basic information</h4>
                  <p className="m-0 text-sm text-slate-600">Name, size, and product type used across the catalog.</p>
                </div>
                <div className="flex flex-col gap-3">
                  <label className={fieldLabel}>
                    <span className={fieldSpan}>Product title</span>
                    <input className={inputBase} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Example: Natural Emerald Gemstone" required />
                  </label>
                  <div className="flex gap-3 max-md:flex-col">
                    <label className={`${fieldLabel} flex-1 min-w-0`}>
                      <span className={fieldSpan}>Size / SKU</span>
                      <input className={inputBase} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Example: 5.25 Ratti" />
                    </label>
                    <label className={`${fieldLabel} flex-1 min-w-0`}>
                      <span className={fieldSpan}>Product type</span>
                      <select className={inputBase} value={form.productType} onChange={(e) => setForm({ ...form, productType: e.target.value })}>
                        <option value="gemstone">Gemstone</option>
                        <option value="rudraksha">Rudraksha</option>
                        <option value="bracelet">Bracelet</option>
                        <option value="jewellery">Jewellery</option>
                        <option value="crystal">Crystal</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>,

              /* Category */
              <div key="category" className="flex flex-col gap-4 py-6 border-b border-slate-200">
                <div className="flex flex-col gap-0.5">
                  <h4 className="m-0 text-sm font-bold text-slate-900 ">Category mapping</h4>
                  <p className="m-0 text-sm text-slate-600">This controls which carousel the product appears in.</p>
                </div>
                <div className="flex gap-3 max-md:flex-col">
                  <label className={`${fieldLabel} flex-1 min-w-0`}>
                    <span className={fieldSpan}>Category</span>
                    <select className={inputBase} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value, subCategory: "" })} required>
                      <option value="">Select category</option>
                      {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </label>
                  <label className={`${fieldLabel} flex-1 min-w-0`}>
                    <span className={fieldSpan}>Subcategory</span>
                    <select className={inputBase} value={form.subCategory} onChange={(e) => setForm({ ...form, subCategory: e.target.value })} required>
                      <option value="">Select subcategory</option>
                      {selectedSubCategories.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </label>
                </div>
              </div>,

              /* Pricing */
              <div key="pricing" className="flex flex-col gap-4 py-6 border-b border-slate-200">
                <div className="flex flex-col gap-0.5">
                  <h4 className="m-0 text-sm font-bold text-slate-900 ">Pricing and inventory</h4>
                  <p className="m-0 text-sm text-slate-600">Keep prices and stock levels accurate for the storefront.</p>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-3 max-md:flex-col">
                    <label className={`${fieldLabel} flex-1 min-w-0`}>
                      <span className={fieldSpan}>Base price</span>
                      <input className={inputBase} type="number" min="0" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
                    </label>
                    <label className={`${fieldLabel} flex-1 min-w-0`}>
                      <span className={fieldSpan}>Sale price</span>
                      <input className={inputBase} type="number" min="0" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} />
                    </label>
                  </div>
                  <div className="flex gap-3 max-md:flex-col">
                    <label className={`${fieldLabel} flex-1 min-w-0`}>
                      <span className={fieldSpan}>Stock</span>
                      <input className={inputBase} type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                    </label>
                    <label className={`${fieldLabel} flex-1 min-w-0`}>
                      <span className={fieldSpan}>Low stock threshold</span>
                      <input className={inputBase} type="number" min="0" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} />
                    </label>
                  </div>
                  <label className={fieldLabel}>
                    <span className={fieldSpan}>Status</span>
                    <select className={inputBase} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                </div>
              </div>,

              /* Visibility */
              <div key="visibility" className="flex flex-col gap-4 py-6 border-b border-slate-200">
                <div className="flex flex-col gap-0.5">
                  <h4 className="m-0 text-sm font-bold text-slate-900 ">Visibility</h4>
                  <p className="m-0 text-sm text-slate-600">Control where the product is highlighted.</p>
                </div>
                {/* check-grid → 2-col grid */}
                <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                  {[
                    { key: "isFeatured",    label: "Featured product",    desc: "Show in featured product areas.",               checked: form.isFeatured,    onChange: (v: boolean) => setForm({ ...form, isFeatured: v }) },
                    { key: "showOnHomepage", label: "Show on homepage",   desc: "Allow this product to appear on homepage sections.", checked: form.showOnHomepage, onChange: (v: boolean) => setForm({ ...form, showOnHomepage: v }) }
                  ].map((toggle) => (
                    <label
                      key={toggle.key}
                      /* toggle-card */
                      className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-indigo-50 hover:border-indigo-600/30 transition min-w-0"
                    >
                      <input
                        type="checkbox"
                        checked={toggle.checked}
                        onChange={(e) => toggle.onChange(e.target.checked)}
                        className="mt-0.5 accent-indigo-600 shrink-0"
                      />
                      <div className="min-w-0">
                        <strong className="block text-sm font-semibold text-slate-900 break-words">{toggle.label}</strong>
                        <span className="text-sm text-slate-600 break-words">{toggle.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>,

              /* Description */
              <div key="description" className="flex flex-col gap-4 py-6 border-b border-slate-200">
                <div className="flex flex-col gap-0.5">
                  <h4 className="m-0 text-sm font-bold text-slate-900 ">Description</h4>
                  <p className="m-0 text-sm text-slate-600">Write simple and helpful product content.</p>
                </div>
                <div className="flex flex-col gap-3">
                  <label className={fieldLabel}>
                    <span className={fieldSpan}>Short description</span>
                    <textarea className={classNames(inputBase, "min-h-28 resize-y")} value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} placeholder="Short description shown in product previews." />
                  </label>
                  <label className={fieldLabel}>
                    <span className={fieldSpan}>Full description</span>
                    <textarea className={classNames(inputBase, "min-h-36 resize-y")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detailed product information for customers." />
                  </label>
                </div>
              </div>,

              /* Media */
              <div key="media" className="flex flex-col gap-4 py-6">
                <div className="flex flex-col gap-0.5">
                  <h4 className="m-0 text-sm font-bold text-slate-900 ">Media</h4>
                  <p className="m-0 text-sm text-slate-600">Upload clear images and an optional product video.</p>
                </div>
                <div className="flex flex-col gap-4">
                  <label className={fieldLabel}>
                    <span className={fieldSpan}>Product images</span>
                    <input
                      className={inputBase}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      multiple
                      onChange={(e) => handleProductImageSelection(e.target.files, e.target)}
                    />
                    <small className="text-sm text-slate-500">JPG, PNG, or WEBP. Max 4MB each. Up to {MAX_PRODUCT_IMAGES} images.</small>
                  </label>

                  {mediaImageUrls.length ? (
                    /* product-media-preview-grid */
                    <div className="grid grid-cols-4 gap-3 max-md:grid-cols-3 max-sm:grid-cols-2 max-[420px]:grid-cols-1">
                      {mediaImageUrls.slice(0, MAX_PRODUCT_IMAGES).map((url, idx) => (
                        <div key={`${url}-${idx}`} className="flex flex-col gap-1.5 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                          {/* product-media-preview-visual */}
                          <div className="relative aspect-square w-full bg-slate-100">
                            <Image src={url} alt={`${form.title || "Product"} image ${idx + 1}`} fill className="object-cover" sizes="112px" unoptimized />
                          </div>
                          {/* product-media-preview-meta */}
                          <div className="flex items-center justify-between px-2 pb-2 gap-1">
                            <span className="text-[0.65rem] font-medium text-slate-500">{idx === 0 ? "Primary" : `Image ${idx + 1}`}</span>
                            {imagePreviews.length ? (
                              <button
                                type="button"
                                className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                                onClick={() => removeSelectedImage(idx)}
                                aria-label={`Remove selected image ${idx + 1}`}
                              >
                                <Trash2 size={13} />
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* product-media-empty */
                    <div className="flex items-center gap-2.5 px-4 py-5 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-500 text-sm">
                      <ImagePlus size={20} />
                      <span>No gallery images selected yet.</span>
                    </div>
                  )}

                  <label className={fieldLabel}>
                    <span className={fieldSpan}>Product video</span>
                    <input
                      className={inputBase}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      onChange={(e) => handleProductVideoSelection(e.target.files, e.target)}
                    />
                    <small className="text-sm text-slate-500">Optional. MP4, WEBM, or MOV. 2048 KB to 5120 KB.</small>
                  </label>

                  {mediaVideoUrl ? (
                    /* product-video-preview-card */
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                      <video src={mediaVideoUrl} controls preload="metadata" className="w-full max-h-56 object-contain" />
                      <div className="flex items-center justify-between px-3 py-2 gap-2">
                        <span className="text-sm font-medium text-slate-600 truncate">{selectedVideo?.name || "Product video"}</span>
                        {selectedVideo ? (
                          <button
                            type="button"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                            onClick={() => setSelectedVideo(null)}
                            aria-label="Remove selected video"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 px-4 py-5 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-500 text-sm">
                      <Video size={20} />
                      <span>No product video selected.</span>
                    </div>
                  )}
                </div>
              </div>
            ]}

            {/* drawer-footer */}
            <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-200 shrink-0 flex-wrap max-sm:flex-col max-sm:items-stretch">
              <button type="button" className={`${ghostBtn} max-sm:w-full max-sm:justify-center`} onClick={closeEditor}>
                Cancel
              </button>
              <button
                className={`${primaryBtn} max-sm:w-full max-sm:justify-center`}
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Saving..." : isEditing ? "Update product" : "Create product"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </div>
  );
}
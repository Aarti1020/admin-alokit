"use client";

import Image from "next/image";
// import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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
  if (typeof product.category !== "string" && product.category?.name) {
    return product.category.name;
  }

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
    groups.set(category._id, {
      id: category._id,
      name: category.name,
      products: []
    });
  });

  products.forEach((product) => {
    const categoryId = getCategoryId(product);
    const categoryName = getCategoryName(product, categories);

    if (!groups.has(categoryId)) {
      groups.set(categoryId, {
        id: categoryId,
        name: categoryName,
        products: []
      });
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
    <button type="button" className="product-card-compact" onClick={() => onOpen(product)}>
      <div className="product-card-compact-media">
        {showThumbnail ? (
          <Image
            src={thumbnailUrl}
            alt={productTitle}
            fill
            className="product-card-compact-image"
            sizes="(max-width: 760px) 78vw, 260px"
            unoptimized
            onError={() => onImageError(product._id)}
          />
        ) : (
          <div className="product-card-compact-fallback">
            <ImagePlus size={22} />
            <span>No image</span>
          </div>
        )}

        <span className={classNames("status-badge", product.status === "active" ? "active" : "inactive")}>
          {product.status}
        </span>
      </div>

      <div className="product-card-compact-body">
        <h4>{productTitle}</h4>
        <p>{categoryName}</p>

        <div className="product-card-compact-meta">
          <strong>{formatCurrency(getProductPrice(product))}</strong>
          <span className={classNames("stock-badge", lowStock && "low")}>Stock: {product.stock}</span>
        </div>
      </div>
    </button>
  );
}

function ModalShell({
  children,
  onClose,
  variant = "modal"
}: {
  children: ReactNode;
  onClose: () => void;
  variant?: "modal" | "drawer";
})  {
  return (
    <div className="ui-modal-overlay" role="presentation" onMouseDown={onClose}>
      <div
        className={variant === "drawer" ? "ui-drawer" : "ui-modal"}
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

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
    const activeCount = products.filter((product) => product.status === "active").length;
    const featuredCount = products.filter((product) => product.isFeatured).length;
    const lowStockCount = products.filter((product) => product.stock <= (product.lowStockThreshold || 5)).length;
    const inventoryValue = products.reduce((total, product) => total + getProductPrice(product) * product.stock, 0);

    return [
      {
        label: "Total products",
        value: products.length,
        detail: `${activeCount} active in catalog`,
        icon: Boxes,
        filter: "all" as const
      },
      {
        label: "Featured",
        value: featuredCount,
        detail: "Highlighted storefront products",
        icon: Star,
        filter: "featured" as const
      },
      {
        label: "Low stock",
        value: lowStockCount,
        detail: "Products need restock review",
        icon: AlertTriangle,
        filter: "low-stock" as const
      },
      {
        label: "Inventory value",
        value: formatCurrency(inventoryValue),
        detail: "Estimated from current stock",
        icon: BadgeIndianRupee,
        filter: "inventory" as const
      }
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

  const categoryGroups = useMemo(() => buildCategoryGroups(filteredProducts, categories), [filteredProducts, categories]);
  const allCategoryGroups = useMemo(() => buildCategoryGroups(products, categories), [products, categories]);

  const selectedProduct = useMemo(() => products.find((product) => product._id === form.id) || null, [form.id, products]);

  const existingProductImages = useMemo(
    () => (selectedProduct?.images || []).map((image) => image.url).filter(Boolean),
    [selectedProduct]
  );

  const mediaImageUrls = imagePreviews.length ? imagePreviews : existingProductImages;
  const mediaVideoUrl = videoPreview || selectedProduct?.productVideo?.url || "";

  useEffect(() => {
    const previews = selectedFiles.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);

    return () => previews.forEach((preview) => URL.revokeObjectURL(preview));
  }, [selectedFiles]);

  useEffect(() => {
    if (!selectedVideo) {
      setVideoPreview("");
      return;
    }

    const preview = URL.createObjectURL(selectedVideo);
    setVideoPreview(preview);

    return () => URL.revokeObjectURL(preview);
  }, [selectedVideo]);

  const loadMeta = async () => {
    const [categoryResponse, subCategoryResponse] = await Promise.all([
      catalogApi.categories(),
      catalogApi.subCategories()
    ]);

    setCategories(categoryResponse.data);
    setSubCategories(subCategoryResponse.data);
  };

  const loadProducts = useCallback(async () => {
    setLoading(true);

    try {
      const response = await productApi.list({ search, status, limit: 200 });
      setProducts(response.data);
      setBrokenThumbnailIds({});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to fetch products");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    void Promise.resolve()
      .then(() => Promise.all([loadMeta(), loadProducts()]))
      .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to load product data"));
  }, [loadProducts]);

  const scrollCategoryCarousel = (groupId: string, direction: "left" | "right") => {
    const carousel = document.getElementById(`carousel-${groupId}`);

    carousel?.scrollBy({
      left: direction === "left" ? -360 : 360,
      behavior: "smooth"
    });
  };

  const resetForm = () => {
    setForm(emptyProductForm);
    setSelectedFiles([]);
    setSelectedVideo(null);
  };

  const openCreateEditor = () => {
    resetForm();
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    resetForm();
  };

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
      description: product.description || "",
      isFeatured: Boolean(product.isFeatured),
      showOnHomepage: Boolean(product.showOnHomepage)
    });

    setSelectedFiles([]);
    setSelectedVideo(null);
  };

  const openEditEditor = (product: Product) => {
    fillForm(product);
    setPreviewProduct(null);
    setIsEditorOpen(true);
  };

  const handleProductImageSelection = (files: FileList | null, input: HTMLInputElement) => {
    const nextFiles = Array.from(files || []);

    if (!nextFiles.length) {
      input.value = "";
      return;
    }

    const invalidFiles = nextFiles.filter((file) => !ACCEPTED_PRODUCT_IMAGE_TYPES.has(file.type));

    if (invalidFiles.length > 0) {
      input.value = "";
      toast.error(
        `Not accepted: ${invalidFiles.map((file) => file.name).join(", ")}. Only ${ACCEPTED_PRODUCT_IMAGE_EXTENSIONS.join(
          ", "
        )} files are allowed.`
      );
      return;
    }

    const oversizedFiles = nextFiles.filter((file) => file.size > MAX_PRODUCT_IMAGE_SIZE);

    if (oversizedFiles.length > 0) {
      input.value = "";
      toast.error(`Each image must be 4MB or smaller: ${oversizedFiles.map((file) => file.name).join(", ")}`);
      return;
    }

    setSelectedFiles((currentFiles) => {
      const existingSignatures = new Set(currentFiles.map(getFileSignature));
      const filesToAdd = nextFiles.filter((file) => !existingSignatures.has(getFileSignature(file)));
      const combinedFiles = [...currentFiles, ...filesToAdd];

      if (combinedFiles.length > MAX_PRODUCT_IMAGES) {
        toast.error(`Upload up to ${MAX_PRODUCT_IMAGES} product images`);
        return currentFiles;
      }

      if (!filesToAdd.length) {
        toast.error("These images are already queued.");
        return currentFiles;
      }

      return combinedFiles;
    });

    input.value = "";
  };

  const handleProductVideoSelection = (files: FileList | null, input: HTMLInputElement) => {
    const file = files?.[0];

    if (!file) {
      setSelectedVideo(null);
      return;
    }

    if (!ACCEPTED_PRODUCT_VIDEO_TYPES.has(file.type)) {
      setSelectedVideo(null);
      input.value = "";
      toast.error(`Only ${ACCEPTED_PRODUCT_VIDEO_EXTENSIONS.join(", ")} videos are allowed.`);
      return;
    }

    if (file.size < MIN_PRODUCT_VIDEO_SIZE || file.size > MAX_PRODUCT_VIDEO_SIZE) {
      setSelectedVideo(null);
      input.value = "";
      toast.error("Video size must be between 2048 KB and 5120 KB.");
      return;
    }

    setSelectedVideo(file);
  };

  const removeSelectedImage = (index: number) => {
    setSelectedFiles((currentFiles) => currentFiles.filter((_, fileIndex) => fileIndex !== index));
  };

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

    selectedFiles.forEach((file) => body.append("images", file));

    if (selectedVideo) {
      body.set("video", selectedVideo);
    }

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

    if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
      throw new Error("Low stock threshold must be a non-negative whole number");
    }

    if (!form.id && selectedFiles.length === 0) {
      throw new Error("At least one product image is required for new products");
    }
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save product");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFeatured = async (product: Product) => {
    try {
      await productApi.updateFeatured(product._id, !product.isFeatured);
      toast.success(product.isFeatured ? "Removed from featured" : "Added to featured");
      await loadProducts();
      setPreviewProduct((current) =>
        current?._id === product._id ? { ...current, isFeatured: !product.isFeatured } : current
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  };

  const toggleStatus = async (product: Product) => {
    const nextStatus = product.status === "active" ? "inactive" : "active";

    try {
      await productApi.updateStatus(product._id, nextStatus);
      toast.success(`Product marked ${nextStatus}`);
      await loadProducts();
      setPreviewProduct((current) => (current?._id === product._id ? { ...current, status: nextStatus } : current));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Status update failed");
    }
  };

  const deleteProduct = async (product: Product) => {
    const confirmed = window.confirm(`Delete ${getProductTitle(product)}? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await productApi.remove(product._id);
      toast.success("Product deleted successfully");
      setPreviewProduct(null);
      await loadProducts();

      if (form.id === product._id) {
        resetForm();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  };

  const applyInsightFilter = (filter: ProductViewFilter) => {
    setViewFilter(filter);

    if (filter === "all" || filter === "inventory") {
      setSearch("");
      setStatus("");
      setActiveCategory("all");
    }
  };

  const previewThumbnail = previewProduct ? resolveProductThumbnail(previewProduct) : "";

  return (
    <div className="stack-lg products-page-shell">
      <section className="products-hero panel">
        <div className="products-hero-copy">
          <span className="products-page-label">Catalog Management</span>
          <h2>Products</h2>
          <p>
            Manage inventory with category-wise carousels. Click a product to preview details, then edit or delete from
            the product modal.
          </p>
        </div>

        <div className="">
          <button className="primary-button" type="button" onClick={openCreateEditor}>
            <PackagePlus size={8} />
            Add product
          </button>

          <button className="ghost-button" type="button" onClick={() => loadProducts()}>
            Refresh
          </button>
        </div>
      </section>

      <section className="stats-grid">
        {productInsights.map((item) => {
          const Icon = item.icon;
          const isActive = viewFilter === item.filter || (item.filter === "all" && viewFilter === "inventory");

          return (
            <button
              key={item.label}
              type="button"
              className={classNames(
                "panel",
                "stat-card",
                "metric-card",
                "products-insight-card",
                isActive && "products-insight-card-active"
              )}
              onClick={() => applyInsightFilter(item.filter)}
              aria-pressed={isActive}
            >
              <div className="metric-card-head">
                <div className="metric-icon" aria-hidden="true">
                  <Icon size={18} />
                </div>
                <span>{item.label}</span>
                <span className="products-card-action">
                  View
                  <ArrowRight size={16} />
                </span>
              </div>

              <strong>{item.value}</strong>
              <p className="mini-text">{item.detail}</p>
            </button>
          );
        })}
      </section>

      <section className="panel stack-md products-catalog-panel">
        <div className="section-heading">
          <div>
            <h3>Category carousels</h3>
            <p>Products are grouped by their assigned category. Use scroll, swipe, or arrow buttons to view all.</p>
          </div>

          <button className="primary-button" type="button" onClick={openCreateEditor}>
            <PackagePlus size={16} />
            Add product
          </button>
        </div>

        <div className="product-command-bar product-command-bar-enhanced">
          <label className="search-input">
            <Search size={18} />
            <input
              placeholder="Search product, size, category, or subcategory"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="category-filter-strip" aria-label="Filter products by category">
          <button
            type="button"
            className={classNames("category-filter-chip", activeCategory === "all" && "category-filter-chip-active")}
            onClick={() => setActiveCategory("all")}
          >
            All categories
            <span>{products.length}</span>
          </button>

          {allCategoryGroups.map((group) => (
            <button
              key={group.id}
              type="button"
              className={classNames("category-filter-chip", activeCategory === group.id && "category-filter-chip-active")}
              onClick={() => setActiveCategory(group.id)}
            >
              {group.name}
              <span>{group.products.length}</span>
            </button>
          ))}
        </div>

        <div className="product-command-meta">
          <div className="pill">{filteredProducts.length} products visible</div>
          <div className="pill">{categoryGroups.length} category carousels</div>
          <div className="pill">
            {viewFilter === "featured"
              ? "Featured filter active"
              : viewFilter === "low-stock"
                ? "Low stock filter active"
                : "All inventory in view"}
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Loading product inventory...</div>
        ) : categoryGroups.length === 0 ? (
          <div className="empty-state">No products match the current search, status, or category filter.</div>
        ) : (
          <div className="category-carousel-stack">
            {categoryGroups.map((group) => (
              <section key={group.id} className="category-section">
                <div className="category-section-header">
                  <div>
                    <h3>{group.name}</h3>
                    <p>{group.products.length} products</p>
                  </div>

                  <div className="category-section-actions">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => scrollCategoryCarousel(group.id, "left")}
                      aria-label={`Scroll ${group.name} left`}
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => scrollCategoryCarousel(group.id, "right")}
                      aria-label={`Scroll ${group.name} right`}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div id={`carousel-${group.id}`} className="category-products-carousel">
                  {group.products.map((product) => (
                    <ProductCompactCard
                      key={product._id}
                      product={product}
                      categories={categories}
                      brokenThumbnailIds={brokenThumbnailIds}
                      onImageError={(productId) => {
                        setBrokenThumbnailIds((current) => ({ ...current, [productId]: true }));
                      }}
                      onOpen={setPreviewProduct}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      {previewProduct ? (
        <ModalShell onClose={() => setPreviewProduct(null)}>
          <div className="ui-modal-header">
            <div>
              <h3>{getProductTitle(previewProduct)}</h3>
              <p>
                {getCategoryName(previewProduct, categories)} · {getSubCategoryName(previewProduct)}
              </p>
            </div>

            <button type="button" className="icon-button" onClick={() => setPreviewProduct(null)} aria-label="Close preview">
              <X size={18} />
            </button>
          </div>

          <div className="product-preview-content">
            <div className="product-preview-image-wrap">
              {previewThumbnail ? (
                <Image
                  src={previewThumbnail}
                  alt={getProductTitle(previewProduct)}
                  fill
                  className="product-preview-image"
                  sizes="(max-width: 760px) 90vw, 380px"
                  unoptimized
                />
              ) : (
                <div className="product-preview-fallback">
                  <ImagePlus size={26} />
                  <span>No image available</span>
                </div>
              )}
            </div>

            <div className="product-preview-details">
              <div className="preview-grid">
                <div className="preview-item">
                  <span>Price</span>
                  <strong>{formatCurrency(getProductPrice(previewProduct))}</strong>
                </div>

                <div className="preview-item">
                  <span>Stock</span>
                  <strong>{previewProduct.stock}</strong>
                </div>

                <div className="preview-item">
                  <span>Status</span>
                  <strong className="preview-status-text">{previewProduct.status}</strong>
                </div>

                <div className="preview-item">
                  <span>Featured</span>
                  <strong>{previewProduct.isFeatured ? "Yes" : "No"}</strong>
                </div>
              </div>

              <div className="preview-description">
                <span>Short description</span>
                <p>{previewProduct.shortDescription || "No short description added."}</p>
              </div>

              <div className="preview-description">
                <span>Full description</span>
                <p>{previewProduct.description || "No full description added."}</p>
              </div>
            </div>
          </div>

          <div className="ui-modal-footer">
            <button type="button" className="ghost-button" onClick={() => toggleFeatured(previewProduct)}>
              <Star size={16} />
              {previewProduct.isFeatured ? "Unfeature" : "Feature"}
            </button>

            <button type="button" className="ghost-button" onClick={() => toggleStatus(previewProduct)}>
              <Eye size={16} />
              {previewProduct.status === "active" ? "Deactivate" : "Activate"}
            </button>

            <button type="button" className="ghost-button" onClick={() => openEditEditor(previewProduct)}>
              <Pencil size={16} />
              Edit
            </button>

            <button type="button" className="ghost-button danger" onClick={() => deleteProduct(previewProduct)}>
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </ModalShell>
      ) : null}

      {isEditorOpen ? (
        <ModalShell onClose={closeEditor} variant="drawer">
          <div className="ui-drawer-header">
            <div>
              <h3>{isEditing ? "Edit product" : "Create product"}</h3>
              <p>
                {isEditing
                  ? "Update product details, pricing, inventory, media, and visibility."
                  : "Add a new product with clean, structured product information."}
              </p>
            </div>

            <button type="button" className="icon-button" onClick={closeEditor} aria-label="Close editor">
              <X size={18} />
            </button>
          </div>

          <form className="product-editor-form" onSubmit={submitProduct}>
            <div className="form-section">
              <div className="form-section-head">
                <h4>Basic information</h4>
                <p>Name, size, and product type used across the catalog.</p>
              </div>

              <div className="stack-sm">
                <label className="field">
                  <span>Product title</span>
                  <input
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    placeholder="Example: Natural Emerald Gemstone"
                    required
                  />
                </label>

                <div className="field-row">
                  <label className="field">
                    <span>Size / SKU</span>
                    <input
                      value={form.sku}
                      onChange={(event) => setForm({ ...form, sku: event.target.value })}
                      placeholder="Example: 5.25 Ratti"
                    />
                  </label>

                  <label className="field">
                    <span>Product type</span>
                    <select value={form.productType} onChange={(event) => setForm({ ...form, productType: event.target.value })}>
                      <option value="gemstone">Gemstone</option>
                      <option value="rudraksha">Rudraksha</option>
                      <option value="bracelet">Bracelet</option>
                      <option value="jewellery">Jewellery</option>
                      <option value="crystal">Crystal</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-head">
                <h4>Category mapping</h4>
                <p>This controls which carousel the product appears in.</p>
              </div>

              <div className="field-row">
                <label className="field">
                  <span>Category</span>
                  <select
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value, subCategory: "" })}
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Subcategory</span>
                  <select value={form.subCategory} onChange={(event) => setForm({ ...form, subCategory: event.target.value })} required>
                    <option value="">Select subcategory</option>
                    {selectedSubCategories.map((subCategory) => (
                      <option key={subCategory._id} value={subCategory._id}>
                        {subCategory.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-head">
                <h4>Pricing and inventory</h4>
                <p>Keep prices and stock levels accurate for the storefront.</p>
              </div>

              <div className="stack-sm">
                <div className="field-row">
                  <label className="field">
                    <span>Base price</span>
                    <input
                      type="number"
                      min="0"
                      value={form.basePrice}
                      onChange={(event) => setForm({ ...form, basePrice: event.target.value })}
                    />
                  </label>

                  <label className="field">
                    <span>Sale price</span>
                    <input
                      type="number"
                      min="0"
                      value={form.salePrice}
                      onChange={(event) => setForm({ ...form, salePrice: event.target.value })}
                    />
                  </label>
                </div>

                <div className="field-row">
                  <label className="field">
                    <span>Stock</span>
                    <input type="number" min="0" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} />
                  </label>

                  <label className="field">
                    <span>Low stock threshold</span>
                    <input
                      type="number"
                      min="0"
                      value={form.lowStockThreshold}
                      onChange={(event) => setForm({ ...form, lowStockThreshold: event.target.value })}
                    />
                  </label>
                </div>

                <label className="field">
                  <span>Status</span>
                  <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-head">
                <h4>Visibility</h4>
                <p>Control where the product is highlighted.</p>
              </div>

              <div className="check-grid">
                <label className="toggle-card">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })}
                  />
                  <div>
                    <strong>Featured product</strong>
                    <span>Show in featured product areas.</span>
                  </div>
                </label>

                <label className="toggle-card">
                  <input
                    type="checkbox"
                    checked={form.showOnHomepage}
                    onChange={(event) => setForm({ ...form, showOnHomepage: event.target.checked })}
                  />
                  <div>
                    <strong>Show on homepage</strong>
                    <span>Allow this product to appear on homepage sections.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-head">
                <h4>Description</h4>
                <p>Write simple and helpful product content.</p>
              </div>

              <div className="stack-sm">
                <label className="field">
                  <span>Short description</span>
                  <textarea
                    value={form.shortDescription}
                    onChange={(event) => setForm({ ...form, shortDescription: event.target.value })}
                    placeholder="Short description shown in product previews."
                  />
                </label>

                <label className="field">
                  <span>Full description</span>
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    placeholder="Detailed product information for customers."
                  />
                </label>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-head">
                <h4>Media</h4>
                <p>Upload clear images and an optional product video.</p>
              </div>

              <div className="stack-sm">
                <label className="field">
                  <span>Product images</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    multiple
                    onChange={(event) => handleProductImageSelection(event.target.files, event.target)}
                  />
                  <small>JPG, PNG, or WEBP. Max 4MB each. Up to {MAX_PRODUCT_IMAGES} images.</small>
                </label>

                {mediaImageUrls.length ? (
                  <div className="product-media-preview-grid">
                    {mediaImageUrls.slice(0, MAX_PRODUCT_IMAGES).map((url, index) => (
                      <div className="product-media-preview-card" key={`${url}-${index}`}>
                        <div className="product-media-preview-visual">
                          <Image src={url} alt={`${form.title || "Product"} image ${index + 1}`} fill sizes="112px" unoptimized />
                        </div>

                        <div className="product-media-preview-meta">
                          <span>{index === 0 ? "Primary" : `Image ${index + 1}`}</span>

                          {imagePreviews.length ? (
                            <button
                              type="button"
                              className="icon-button product-media-remove"
                              onClick={() => removeSelectedImage(index)}
                              aria-label={`Remove selected image ${index + 1}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="product-media-empty">
                    <ImagePlus size={20} />
                    <span>No gallery images selected yet.</span>
                  </div>
                )}

                <label className="field">
                  <span>Product video</span>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={(event) => handleProductVideoSelection(event.target.files, event.target)}
                  />
                  <small>Optional. MP4, WEBM, or MOV. 2048 KB to 5120 KB.</small>
                </label>

                {mediaVideoUrl ? (
                  <div className="product-video-preview-card">
                    <video src={mediaVideoUrl} controls preload="metadata" />

                    <div className="product-media-preview-meta">
                      <span>{selectedVideo?.name || "Product video"}</span>

                      {selectedVideo ? (
                        <button
                          type="button"
                          className="icon-button product-media-remove"
                          onClick={() => setSelectedVideo(null)}
                          aria-label="Remove selected video"
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="product-media-empty product-media-empty-video">
                    <Video size={20} />
                    <span>No product video selected.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="drawer-footer">
              <button type="button" className="ghost-button" onClick={closeEditor}>
                Cancel
              </button>

              <button className="primary-button" type="submit" disabled={submitting}>
                {submitting ? "Saving..." : isEditing ? "Update product" : "Create product"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </div>
  );
}
"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowRight,
  FolderTree,
  Layers3,
  RefreshCw,
  Search,
  ShieldCheck,
  Tag,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { catalogApi } from "@/lib/api";
import type { Category, SubCategory } from "@/lib/types";
import { classNames } from "@/lib/utils";

const emptyCategory = { id: "", name: "", description: "", isActive: true };
const emptySubCategory = {
  id: "",
  name: "",
  description: "",
  category: "",
  isActive: true,
};

type CategoryFormState = typeof emptyCategory;
type SubCategoryFormState = typeof emptySubCategory;

export default function CatalogPage() {
  const categoryEditorRef = useRef<HTMLElement | null>(null);
  const subCategoryEditorRef = useRef<HTMLElement | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [categoryForm, setCategoryForm] =
    useState<CategoryFormState>(emptyCategory);
  const [subCategoryForm, setSubCategoryForm] =
    useState<SubCategoryFormState>(emptySubCategory);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingSubCategory, setSavingSubCategory] = useState(false);
  const [activeEditor, setActiveEditor] = useState<
    "category" | "subcategory" | null
  >(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [categoryResponse, subCategoryResponse] = await Promise.all([
        catalogApi.categories(),
        catalogApi.subCategories(),
      ]);
      setCategories(categoryResponse.data);
      setSubCategories(subCategoryResponse.data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to fetch catalog data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const query = search.trim().toLowerCase();

  const filteredCategories = useMemo(
    () =>
      categories.filter((category) => {
        const values = [
          category.name,
          category.slug,
          category.description || "",
        ];
        return values.some((value) => value.toLowerCase().includes(query));
      }),
    [categories, query],
  );

  const filteredSubCategories = useMemo(
    () =>
      subCategories.filter((subCategory) => {
        const parentName =
          typeof subCategory.category === "string"
            ? subCategory.category
            : subCategory.category?.name || "";
        const values = [
          subCategory.name,
          subCategory.slug,
          subCategory.description || "",
          parentName,
        ];
        return values.some((value) => value.toLowerCase().includes(query));
      }),
    [subCategories, query],
  );

  const catalogInsights = useMemo(() => {
    const activeCategories = categories.filter(
      (category) => category.isActive !== false,
    ).length;
    const activeSubCategories = subCategories.filter(
      (subCategory) => subCategory.isActive !== false,
    ).length;
    const mappedSubCategories = subCategories.filter(
      (subCategory) => typeof subCategory.category !== "string",
    ).length;

    return [
      {
        label: "Categories",
        value: categories.length,
        detail: `${activeCategories} active roots in the catalog`,
        icon: FolderTree,
        color: "text-blue-600 bg-blue-50",
        onClick: () => {
          setSearch("");
          categoryEditorRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        },
      },
      {
        label: "Subcategories",
        value: subCategories.length,
        detail: `${activeSubCategories} active child nodes`,
        icon: Layers3,
        color: "text-violet-600 bg-violet-50",
        onClick: () => {
          setSearch("");
          subCategoryEditorRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        },
      },
      {
        label: "Mapped links",
        value: mappedSubCategories,
        detail: "Subcategories with populated parent category data",
        icon: Tag,
        color: "text-amber-600 bg-amber-50",
        onClick: () => {
          setSearch("");
          subCategoryEditorRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        },
      },
      {
        label: "Catalog ready",
        value:
          activeCategories > 0 && activeSubCategories > 0
            ? "Yes"
            : "Needs setup",
        detail: "Enough active taxonomy to support product assignment",
        icon: ShieldCheck,
        color: "text-emerald-600 bg-emerald-50",
        onClick: () => {
          setSearch("");
          categoryEditorRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        },
      },
    ];
  }, [categories, subCategories]);

  const resetCategoryForm = () => setCategoryForm(emptyCategory);
  const resetSubCategoryForm = () => setSubCategoryForm(emptySubCategory);

  const startCategoryEdit = (category: Category) => {
    setCategoryForm({
      id: category._id,
      name: category.name,
      description: category.description || "",
      isActive: category.isActive !== false,
    });
  };

  const startSubCategoryEdit = (subCategory: SubCategory) => {
    setSubCategoryForm({
      id: subCategory._id,
      name: subCategory.name,
      description: subCategory.description || "",
      category:
        typeof subCategory.category === "string"
          ? subCategory.category
          : subCategory.category?._id || "",
      isActive: subCategory.isActive !== false,
    });
  };

  const openCategoryEditor = (category: Category) => {
    startCategoryEdit(category);
    categoryEditorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const openSubCategoryEditor = (subCategory: SubCategory) => {
    startSubCategoryEdit(subCategory);
    subCategoryEditorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const openCategoryEditModal = (category: Category) => {
    startCategoryEdit(category);
    setActiveEditor("category");
  };

  const openSubCategoryEditModal = (subCategory: SubCategory) => {
    startSubCategoryEdit(subCategory);
    setActiveEditor("subcategory");
  };

  const closeEditorModal = () => {
    if (activeEditor === "category") resetCategoryForm();
    if (activeEditor === "subcategory") resetSubCategoryForm();
    setActiveEditor(null);
  };

  const handleSelectableKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    onSelect: () => void,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  };

  const submitCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingCategory(true);
    try {
      const payload = {
        name: categoryForm.name,
        description: categoryForm.description,
        isActive: categoryForm.isActive,
      };
      if (categoryForm.id) {
        await catalogApi.updateCategory(categoryForm.id, payload);
        toast.success("Category updated");
      } else {
        await catalogApi.createCategory(payload);
        toast.success("Category created");
      }
      resetCategoryForm();
      setActiveEditor(null);
      await loadData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save category",
      );
    } finally {
      setSavingCategory(false);
    }
  };

  const submitSubCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingSubCategory(true);
    try {
      const payload = {
        name: subCategoryForm.name,
        description: subCategoryForm.description,
        category: subCategoryForm.category,
        isActive: subCategoryForm.isActive,
      };
      if (subCategoryForm.id) {
        await catalogApi.updateSubCategory(subCategoryForm.id, payload);
        toast.success("Subcategory updated");
      } else {
        await catalogApi.createSubCategory(payload);
        toast.success("Subcategory created");
      }
      resetSubCategoryForm();
      setActiveEditor(null);
      await loadData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save subcategory",
      );
    } finally {
      setSavingSubCategory(false);
    }
  };

  const toggleCategoryStatus = async (category: Category) => {
    try {
      await catalogApi.updateCategory(category._id, {
        isActive: category.isActive === false,
      });
      toast.success(
        `Category marked ${category.isActive === false ? "active" : "inactive"}`,
      );
      await loadData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update category",
      );
    }
  };

  const toggleSubCategoryStatus = async (subCategory: SubCategory) => {
    try {
      await catalogApi.updateSubCategory(subCategory._id, {
        isActive: subCategory.isActive === false,
      });
      toast.success(
        `Subcategory marked ${subCategory.isActive === false ? "active" : "inactive"}`,
      );
      await loadData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update subcategory",
      );
    }
  };

  /* ── shared field label style ── */
  const fieldLabel =
    "block text-md font-semibold text-gray-500 uppercase tracking-wide mb-1";
  const inputBase =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-md text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition";

  return (
    <>
      <div className="space-y-6">
        {/* ── Insight cards ── */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {catalogInsights.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="group flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-150"
              >
                <div className="flex items-center justify-between">
                  <div
                    className={classNames(
                      "flex h-9 w-9 items-center justify-center rounded-lg",
                      item.color,
                    )}
                  >
                    <Icon size={18} />
                  </div>
                  <span className="flex items-center gap-1 text-md font-medium text-gray-400 group-hover:text-indigo-600 transition-colors">
                    Open <ArrowRight size={13} />
                  </span>
                </div>
                <div>
                  <p className="text-md font-semibold uppercase tracking-wide text-gray-400">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-2xl font-bold text-gray-900">
                    {item.value}
                  </p>
                  <p className="mt-1 text-[11px] text-gray-500 leading-snug">
                    {item.detail}
                  </p>
                </div>
              </button>
            );
          })}
        </section>

        {/* ── Search / command bar ── */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-md font-bold text-gray-900">
                Catalog command center
              </h3>
              <p className="text-md text-gray-500 mt-0.5">
                Create, edit, and audit category structure before products are
                assigned.
              </p>
            </div>
            <button
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-md font-medium text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-colors"
              type="button"
              onClick={() => loadData()}
            >
              <RefreshCw size={13} />
              Refresh taxonomy
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* search */}
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-md text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none transition"
                placeholder="Search categories, slugs, descriptions, or parent labels"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {/* pills */}
            <div className="flex gap-2 shrink-0">
              <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-md font-medium text-gray-600">
                {filteredCategories.length} categories
              </span>
              <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-md font-medium text-gray-600">
                {filteredSubCategories.length} subcategories
              </span>
            </div>
          </div>
        </section>

        {/* ── Two-column editors ── */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* ────── Categories panel ────── */}
          <section
            ref={categoryEditorRef}
            className="flex flex-col gap-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Categories
                </h3>
                <p className="mt-0.5 text-md text-gray-500">
                  Top-level taxonomy used by products and collection
                  merchandising.
                </p>
              </div>
            </div>

            {/* Category form */}
            <form className="space-y-4" onSubmit={submitCategory}>
              <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4 space-y-4">
                <div>
                  <h4 className="text-md font-semibold text-gray-800">
                    {categoryForm.id ? "Edit category" : "Create category"}
                  </h4>
                  <p className="text-md text-gray-500 mt-0.5">
                    Keep naming and live status aligned with your storefront
                    structure.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className={fieldLabel}>Name</label>
                    <input
                      className={inputBase}
                      placeholder="e.g. Electronics"
                      value={categoryForm.name}
                      onChange={(e) =>
                        setCategoryForm({
                          ...categoryForm,
                          name: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className={fieldLabel}>Description</label>
                    <textarea
                      className={classNames(inputBase, "resize-none h-20")}
                      placeholder="Optional — describe the scope of this category"
                      value={categoryForm.description}
                      onChange={(e) =>
                        setCategoryForm({
                          ...categoryForm,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  {/* toggle */}
                  <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50 transition-colors">
                    <div className="relative mt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={categoryForm.isActive}
                        onChange={(e) =>
                          setCategoryForm({
                            ...categoryForm,
                            isActive: e.target.checked,
                          })
                        }
                      />
                      <div className="h-5 w-9 rounded-full border border-gray-300 bg-gray-200 peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-colors" />
                      <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                    </div>
                    <div>
                      <strong className="text-md font-semibold text-gray-800">
                        Active category
                      </strong>
                      <span className="block text-md text-gray-500 mt-0.5">
                        Inactive categories remain in the system but should not
                        be used for new mapping.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-md font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  type="submit"
                  disabled={savingCategory}
                >
                  {savingCategory
                    ? "Saving…"
                    : categoryForm.id
                      ? "Update category"
                      : "Create category"}
                </button>
                <button
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-md font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  type="button"
                  onClick={resetCategoryForm}
                >
                  Reset
                </button>
              </div>
            </form>

            {/* Categories with subcategory carousel */}
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 py-10 text-md text-gray-400">
                  Loading category taxonomy…
                </div>
              ) : filteredCategories.length === 0 ? (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 py-10 text-md text-gray-400">
                  No categories match the current search.
                </div>
              ) : (
                filteredCategories.map((category) => {
                  const isSelected = categoryForm.id === category._id;
                  const isActive = category.isActive !== false;
                  const categoryMatchesQuery = [
                    category.name,
                    category.slug,
                    category.description || "",
                  ].some((value) => value.toLowerCase().includes(query));
                  const categorySubCategories = (
                    query && !categoryMatchesQuery
                      ? filteredSubCategories
                      : subCategories
                  ).filter((subCategory) => {
                    const parentId =
                      typeof subCategory.category === "string"
                        ? subCategory.category
                        : subCategory.category?._id || "";
                    return parentId === category._id;
                  });

                  return (
                    <article
                      key={category._id}
                      className={classNames(
                        "overflow-hidden rounded-xl border transition-all duration-150",
                        isSelected
                          ? "border-indigo-300 bg-indigo-50/50 shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm",
                      )}
                    >
                      <div className="flex flex-col gap-4 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div
                            role="button"
                            tabIndex={0}
                            className="min-w-0 flex-1 cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                            onClick={() => openCategoryEditor(category)}
                            onKeyDown={(event) =>
                              handleSelectableKeyDown(event, () =>
                                openCategoryEditor(category),
                              )
                            }
                            aria-label={`Open category ${category.name} in editor`}
                            aria-pressed={isSelected}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-lg font-bold text-gray-900">
                                {category.name}
                              </h4>
                              <span
                                className={classNames(
                                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                                  isActive
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-gray-100 text-gray-500",
                                )}
                              >
                                {isActive ? "active" : "inactive"}
                              </span>
                              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-600">
                                {categorySubCategories.length} subcategories
                              </span>
                            </div>
                            <p className="mt-1 text-md text-gray-400">
                              {category.slug}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-gray-500">
                              {category.description || "No description added yet."}
                            </p>
                          </div>

                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <button
                              type="button"
                              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-md font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                              onClick={() => openCategoryEditModal(category)}
                            >
                              Edit category
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-md font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                              onClick={() => toggleCategoryStatus(category)}
                            >
                              {isActive ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-md font-semibold text-red-600 shadow-sm transition-colors hover:bg-red-50"
                              onClick={async () => {
                                try {
                                  await catalogApi.deleteCategory(category._id);
                                  toast.success("Category deleted");
                                  if (categoryForm.id === category._id)
                                    resetCategoryForm();
                                  await loadData();
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
                        </div>

                        <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-md font-semibold uppercase tracking-wide text-gray-500">
                                Subcategories
                              </p>
                              <p className="text-md text-gray-400">
                                Scroll sideways to view and manage child taxonomy.
                              </p>
                            </div>
                          </div>

                          {categorySubCategories.length === 0 ? (
                            <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white py-8 text-sm text-gray-400">
                              No subcategories found under this category.
                            </div>
                          ) : (
                            <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-3 pt-1 [scrollbar-width:thin]">
                              {categorySubCategories.map((subCategory) => {
                                const parentLabel =
                                  typeof subCategory.category === "string"
                                    ? category.name
                                    : subCategory.category?.name || category.name;
                                const isSubSelected =
                                  subCategoryForm.id === subCategory._id;
                                const isSubActive = subCategory.isActive !== false;

                                return (
                                  <article
                                    key={subCategory._id}
                                    className={classNames(
                                      "flex w-[240px] shrink-0 snap-start flex-col rounded-lg border bg-white transition-all duration-150 sm:w-[260px]",
                                      isSubSelected
                                        ? "border-indigo-300 shadow-sm ring-2 ring-indigo-100"
                                        : "border-gray-200 hover:border-gray-300 hover:shadow-sm",
                                    )}
                                  >
                                    <div
                                      role="button"
                                      tabIndex={0}
                                      className="min-h-[132px] flex-1 cursor-pointer p-3 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                      onClick={() => openSubCategoryEditor(subCategory)}
                                      onKeyDown={(event) =>
                                        handleSelectableKeyDown(event, () =>
                                          openSubCategoryEditor(subCategory),
                                        )
                                      }
                                      aria-label={`Open subcategory ${subCategory.name} in editor`}
                                      aria-pressed={isSubSelected}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-bold text-gray-900">
                                            {subCategory.name}
                                          </p>
                                          <p className="truncate text-[11px] text-gray-400">
                                            {subCategory.slug}
                                          </p>
                                        </div>
                                        <span
                                          className={classNames(
                                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                            isSubActive
                                              ? "bg-emerald-100 text-emerald-700"
                                              : "bg-gray-100 text-gray-500",
                                          )}
                                        >
                                          {isSubActive ? "active" : "inactive"}
                                        </span>
                                      </div>
                                      <p className="mt-2 line-clamp-3 text-md leading-5 text-gray-500">
                                        {subCategory.description ||
                                          "No description added yet."}
                                      </p>
                                      <p className="mt-2 truncate text-[11px] font-medium text-indigo-500">
                                        Parent: {parentLabel}
                                      </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5 border-t border-gray-100 bg-gray-50/70 px-3 py-2">
                                      <button
                                        type="button"
                                        className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-md font-medium text-gray-600 transition-colors hover:bg-gray-100"
                                        onClick={() =>
                                          openSubCategoryEditModal(subCategory)
                                        }
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-md font-medium text-gray-600 transition-colors hover:bg-gray-100"
                                        onClick={() =>
                                          toggleSubCategoryStatus(subCategory)
                                        }
                                      >
                                        {isSubActive ? "Deactivate" : "Activate"}
                                      </button>
                                      <button
                                        type="button"
                                        className="ml-auto rounded-md border border-red-200 bg-white px-2.5 py-1 text-md font-medium text-red-600 transition-colors hover:bg-red-50"
                                        onClick={async () => {
                                          try {
                                            await catalogApi.deleteSubCategory(
                                              subCategory._id,
                                            );
                                            toast.success("Subcategory deleted");
                                            if (
                                              subCategoryForm.id ===
                                              subCategory._id
                                            )
                                              resetSubCategoryForm();
                                            await loadData();
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
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

          </section>

          {/* ────── Subcategories panel ────── */}
          <section
            ref={subCategoryEditorRef}
            className="flex flex-col gap-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Subcategories
                </h3>
                <p className="mt-0.5 text-md text-gray-500">
                  Attach granular taxonomy to a parent category so products stay
                  discoverable.
                </p>
              </div>
            </div>

            {/* Subcategory form */}
            <form className="space-y-4" onSubmit={submitSubCategory}>
              <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4 space-y-4">
                <div>
                  <h4 className="text-md font-semibold text-gray-800">
                    {subCategoryForm.id
                      ? "Edit subcategory"
                      : "Create subcategory"}
                  </h4>
                  <p className="text-md text-gray-500 mt-0.5">
                    Each subcategory belongs to a category and can be paused
                    independently.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className={fieldLabel}>Name</label>
                    <input
                      className={inputBase}
                      placeholder="e.g. Smartphones"
                      value={subCategoryForm.name}
                      onChange={(e) =>
                        setSubCategoryForm({
                          ...subCategoryForm,
                          name: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className={fieldLabel}>Parent category</label>
                    <select
                      className={inputBase}
                      value={subCategoryForm.category}
                      onChange={(e) =>
                        setSubCategoryForm({
                          ...subCategoryForm,
                          category: e.target.value,
                        })
                      }
                      required
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={fieldLabel}>Description</label>
                    <textarea
                      className={classNames(inputBase, "resize-none h-20")}
                      placeholder="Optional — describe the scope of this subcategory"
                      value={subCategoryForm.description}
                      onChange={(e) =>
                        setSubCategoryForm({
                          ...subCategoryForm,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  {/* toggle */}
                  <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50 transition-colors">
                    <div className="relative mt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={subCategoryForm.isActive}
                        onChange={(e) =>
                          setSubCategoryForm({
                            ...subCategoryForm,
                            isActive: e.target.checked,
                          })
                        }
                      />
                      <div className="h-5 w-9 rounded-full border border-gray-300 bg-gray-200 peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-colors" />
                      <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                    </div>
                    <div>
                      <strong className="text-md font-semibold text-gray-800">
                        Active subcategory
                      </strong>
                      <span className="block text-md text-gray-500 mt-0.5">
                        Keep legacy taxonomy available while preventing new
                        assignments when inactive.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-md font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  type="submit"
                  disabled={savingSubCategory}
                >
                  {savingSubCategory
                    ? "Saving…"
                    : subCategoryForm.id
                      ? "Update subcategory"
                      : "Create subcategory"}
                </button>
                <button
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-md font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  type="button"
                  onClick={resetSubCategoryForm}
                >
                  Reset
                </button>
              </div>
            </form>

            {/* Subcategory list */}
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {loading ? (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 py-10 text-md text-gray-400">
                  Loading subcategory taxonomy…
                </div>
              ) : filteredSubCategories.length === 0 ? (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 py-10 text-md text-gray-400">
                  No subcategories match the current search.
                </div>
              ) : (
                filteredSubCategories.map((subCategory) => {
                  const parentLabel =
                    typeof subCategory.category === "string"
                      ? subCategory.category
                      : subCategory.category?.name || "Unknown category";
                  const isSelected = subCategoryForm.id === subCategory._id;
                  const isActive = subCategory.isActive !== false;

                  return (
                    <article
                      key={subCategory._id}
                      className={classNames(
                        "rounded-lg border transition-all duration-150",
                        isSelected
                          ? "border-indigo-300 bg-indigo-50/60 shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm",
                      )}
                    >
                      {/* selectable top */}
                      <div
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer p-3 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-t-lg"
                        onClick={() => openSubCategoryEditor(subCategory)}
                        onKeyDown={(event) =>
                          handleSelectableKeyDown(event, () =>
                            openSubCategoryEditor(subCategory),
                          )
                        }
                        aria-label={`Open subcategory ${subCategory.name} in editor`}
                        aria-pressed={isSelected}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-md font-semibold text-gray-900 truncate">
                              {subCategory.name}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate">
                              {subCategory.slug}
                              <span className="mx-1 text-gray-300">·</span>
                              {parentLabel}
                            </p>
                          </div>
                          <span
                            className={classNames(
                              "shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              isActive
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-gray-100 text-gray-500",
                            )}
                          >
                            {isActive ? "active" : "inactive"}
                          </span>
                        </div>
                        <p className="mt-1.5 text-md text-gray-500 line-clamp-2">
                          {subCategory.description ||
                            "No description added yet."}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[11px] text-indigo-500 font-medium">
                            {isSelected
                              ? "Currently open in editor"
                              : "Click to open in editor"}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-gray-400">
                            Edit <ArrowRight size={12} />
                          </span>
                        </div>
                      </div>

                      {/* action row */}
                      <div className="flex flex-wrap items-center gap-1.5 border-t border-gray-100 px-3 py-2 bg-gray-50/50 rounded-b-lg">
                        <button
                          type="button"
                          className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-md font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                          onClick={() => openSubCategoryEditModal(subCategory)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-md font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                          onClick={() => toggleSubCategoryStatus(subCategory)}
                        >
                          {isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-md font-medium text-red-600 hover:bg-red-50 transition-colors ml-auto"
                          onClick={async () => {
                            try {
                              await catalogApi.deleteSubCategory(
                                subCategory._id,
                              );
                              toast.success("Subcategory deleted");
                              if (subCategoryForm.id === subCategory._id)
                                resetSubCategoryForm();
                              await loadData();
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
        </div>
      </div>

      {activeEditor === "category" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
              <div>
                <p className="text-md font-semibold uppercase tracking-wide text-indigo-600">
                  Edit category
                </p>
                <h3 className="mt-1 text-xl font-bold text-gray-900">
                  {categoryForm.name || "Category details"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Update the category name, description, and active status.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditorModal}
                className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitCategory} className="space-y-5 px-6 py-5">
              <div>
                <label className={fieldLabel}>Name</label>
                <input
                  className={inputBase}
                  placeholder="e.g. Electronics"
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, name: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className={fieldLabel}>Description</label>
                <textarea
                  className={classNames(inputBase, "min-h-28 resize-none")}
                  placeholder="Optional — describe the scope of this category"
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 transition hover:bg-gray-100/70">
                <div className="relative mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={categoryForm.isActive}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        isActive: e.target.checked,
                      })
                    }
                  />
                  <div className="h-5 w-9 rounded-full border border-gray-300 bg-gray-200 transition-colors peer-checked:border-indigo-600 peer-checked:bg-indigo-600" />
                  <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                </div>

                <div>
                  <strong className="text-sm font-semibold text-gray-900">
                    Active category
                  </strong>
                  <span className="mt-0.5 block text-sm text-gray-500">
                    Inactive categories remain saved but should not be used for
                    new mapping.
                  </span>
                </div>
              </label>

              <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={closeEditorModal}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingCategory}
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingCategory ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeEditor === "subcategory" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
              <div>
                <p className="text-md font-semibold uppercase tracking-wide text-indigo-600">
                  Edit subcategory
                </p>
                <h3 className="mt-1 text-xl font-bold text-gray-900">
                  {subCategoryForm.name || "Subcategory details"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Update the parent category, description, and active status.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditorModal}
                className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitSubCategory} className="space-y-5 px-6 py-5">
              <div>
                <label className={fieldLabel}>Name</label>
                <input
                  className={inputBase}
                  placeholder="e.g. Smartphones"
                  value={subCategoryForm.name}
                  onChange={(e) =>
                    setSubCategoryForm({
                      ...subCategoryForm,
                      name: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div>
                <label className={fieldLabel}>Parent category</label>
                <select
                  className={inputBase}
                  value={subCategoryForm.category}
                  onChange={(e) =>
                    setSubCategoryForm({
                      ...subCategoryForm,
                      category: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={fieldLabel}>Description</label>
                <textarea
                  className={classNames(inputBase, "min-h-28 resize-none")}
                  placeholder="Optional — describe the scope of this subcategory"
                  value={subCategoryForm.description}
                  onChange={(e) =>
                    setSubCategoryForm({
                      ...subCategoryForm,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 transition hover:bg-gray-100/70">
                <div className="relative mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={subCategoryForm.isActive}
                    onChange={(e) =>
                      setSubCategoryForm({
                        ...subCategoryForm,
                        isActive: e.target.checked,
                      })
                    }
                  />
                  <div className="h-5 w-9 rounded-full border border-gray-300 bg-gray-200 transition-colors peer-checked:border-indigo-600 peer-checked:bg-indigo-600" />
                  <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                </div>

                <div>
                  <strong className="text-sm font-semibold text-gray-900">
                    Active subcategory
                  </strong>
                  <span className="mt-0.5 block text-sm text-gray-500">
                    Inactive subcategories remain saved but should not be used
                    for new assignments.
                  </span>
                </div>
              </label>

              <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={closeEditorModal}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingSubCategory}
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingSubCategory ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

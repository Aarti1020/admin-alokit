"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, FolderTree, Layers3, Search, ShieldCheck, Tag } from "lucide-react";
import toast from "react-hot-toast";
import { catalogApi } from "@/lib/api";
import type { Category, SubCategory } from "@/lib/types";
import { classNames } from "@/lib/utils";

const emptyCategory = { id: "", name: "", description: "", isActive: true };
const emptySubCategory = { id: "", name: "", description: "", category: "", isActive: true };

type CategoryFormState = typeof emptyCategory;
type SubCategoryFormState = typeof emptySubCategory;

export default function CatalogPage() {
  const categoryEditorRef = useRef<HTMLElement | null>(null);
  const subCategoryEditorRef = useRef<HTMLElement | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategory);
  const [subCategoryForm, setSubCategoryForm] = useState<SubCategoryFormState>(emptySubCategory);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingSubCategory, setSavingSubCategory] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [categoryResponse, subCategoryResponse] = await Promise.all([
        catalogApi.categories(),
        catalogApi.subCategories()
      ]);
      setCategories(categoryResponse.data);
      setSubCategories(subCategoryResponse.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to fetch catalog data");
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
        const values = [category.name, category.slug, category.description || ""];
        return values.some((value) => value.toLowerCase().includes(query));
      }),
    [categories, query]
  );

  const filteredSubCategories = useMemo(
    () =>
      subCategories.filter((subCategory) => {
        const parentName =
          typeof subCategory.category === "string" ? subCategory.category : subCategory.category?.name || "";
        const values = [subCategory.name, subCategory.slug, subCategory.description || "", parentName];
        return values.some((value) => value.toLowerCase().includes(query));
      }),
    [subCategories, query]
  );

  const catalogInsights = useMemo(() => {
    const activeCategories = categories.filter((category) => category.isActive !== false).length;
    const activeSubCategories = subCategories.filter((subCategory) => subCategory.isActive !== false).length;
    const mappedSubCategories = subCategories.filter(
      (subCategory) => typeof subCategory.category !== "string"
    ).length;

    return [
      {
        label: "Categories",
        value: categories.length,
        detail: `${activeCategories} active roots in the catalog`,
        icon: FolderTree,
        onClick: () => {
          setSearch("");
          categoryEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      },
      {
        label: "Subcategories",
        value: subCategories.length,
        detail: `${activeSubCategories} active child nodes`,
        icon: Layers3,
        onClick: () => {
          setSearch("");
          subCategoryEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      },
      {
        label: "Mapped links",
        value: mappedSubCategories,
        detail: "Subcategories with populated parent category data",
        icon: Tag,
        onClick: () => {
          setSearch("");
          subCategoryEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      },
      {
        label: "Catalog ready",
        value: activeCategories > 0 && activeSubCategories > 0 ? "Yes" : "Needs setup",
        detail: "Enough active taxonomy to support product assignment",
        icon: ShieldCheck,
        onClick: () => {
          setSearch("");
          categoryEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    ];
  }, [categories, subCategories]);

  const resetCategoryForm = () => setCategoryForm(emptyCategory);
  const resetSubCategoryForm = () => setSubCategoryForm(emptySubCategory);

  const startCategoryEdit = (category: Category) => {
    setCategoryForm({
      id: category._id,
      name: category.name,
      description: category.description || "",
      isActive: category.isActive !== false
    });
  };

  const startSubCategoryEdit = (subCategory: SubCategory) => {
    setSubCategoryForm({
      id: subCategory._id,
      name: subCategory.name,
      description: subCategory.description || "",
      category:
        typeof subCategory.category === "string" ? subCategory.category : subCategory.category?._id || "",
      isActive: subCategory.isActive !== false
    });
  };

  const openCategoryEditor = (category: Category) => {
    startCategoryEdit(category);
    categoryEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openSubCategoryEditor = (subCategory: SubCategory) => {
    startSubCategoryEdit(subCategory);
    subCategoryEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSelectableKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    onSelect: () => void
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
        isActive: categoryForm.isActive
      };

      if (categoryForm.id) {
        await catalogApi.updateCategory(categoryForm.id, payload);
        toast.success("Category updated");
      } else {
        await catalogApi.createCategory(payload);
        toast.success("Category created");
      }

      resetCategoryForm();
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save category");
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
        isActive: subCategoryForm.isActive
      };

      if (subCategoryForm.id) {
        await catalogApi.updateSubCategory(subCategoryForm.id, payload);
        toast.success("Subcategory updated");
      } else {
        await catalogApi.createSubCategory(payload);
        toast.success("Subcategory created");
      }

      resetSubCategoryForm();
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save subcategory");
    } finally {
      setSavingSubCategory(false);
    }
  };

  const toggleCategoryStatus = async (category: Category) => {
    try {
      await catalogApi.updateCategory(category._id, {
        isActive: category.isActive === false
      });
      toast.success(`Category marked ${category.isActive === false ? "active" : "inactive"}`);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update category");
    }
  };

  const toggleSubCategoryStatus = async (subCategory: SubCategory) => {
    try {
      await catalogApi.updateSubCategory(subCategory._id, {
        isActive: subCategory.isActive === false
      });
      toast.success(`Subcategory marked ${subCategory.isActive === false ? "active" : "inactive"}`);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update subcategory");
    }
  };

  return (
    <div className="stack-lg">
      <section className="stats-grid">
        {catalogInsights.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              className="panel stat-card metric-card catalog-insight-card"
              onClick={item.onClick}
            >
              <div className="metric-card-head">
                <div className="metric-icon" aria-hidden="true">
                  <Icon size={18} />
                </div>
                <span>{item.label}</span>
                <span className="catalog-card-action">
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
            <h3>Catalog command center</h3>
            <p>Create, edit, and audit category structure before products are assigned.</p>
          </div>
          <button className="ghost-button" type="button" onClick={() => loadData()}>
            Refresh taxonomy
          </button>
        </div>

        <div className="product-command-bar">
          <label className="search-input">
            <Search size={18} />
            <input
              placeholder="Search categories, slugs, descriptions, or parent labels"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="product-command-meta">
            <div className="pill">{filteredCategories.length} categories visible</div>
            <div className="pill">{filteredSubCategories.length} subcategories visible</div>
          </div>
        </div>
      </section>

      <div className="two-column-grid">
        <section ref={categoryEditorRef} className="panel stack-md">
          <div className="section-heading">
            <div>
              <h3>Categories</h3>
              <p>Top-level taxonomy used by products and collection merchandising.</p>
            </div>
          </div>

          <form className="stack-md" onSubmit={submitCategory}>
            <div className="form-section">
              <div className="form-section-head">
                <h4>{categoryForm.id ? "Edit category" : "Create category"}</h4>
                <p>Keep naming and live status aligned with your storefront structure.</p>
              </div>
              <div className="stack-sm">
                <label className="field">
                  <span>Name</span>
                  <input
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    required
                  />
                </label>
                <label className="field">
                  <span>Description</span>
                  <textarea
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  />
                </label>
                <label className="toggle-card">
                  <input
                    type="checkbox"
                    checked={categoryForm.isActive}
                    onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                  />
                  <div>
                    <strong>Active category</strong>
                    <span>Inactive categories remain in the system but should not be used for new mapping.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="row-actions">
              <button className="primary-button" type="submit" disabled={savingCategory}>
                {savingCategory ? "Saving..." : categoryForm.id ? "Update category" : "Create category"}
              </button>
              <button className="ghost-button" type="button" onClick={resetCategoryForm}>
                Reset
              </button>
            </div>
          </form>

          <div className="stack-sm">
            {loading ? (
              <div className="empty-state">Loading category taxonomy...</div>
            ) : filteredCategories.length === 0 ? (
              <div className="empty-state">No categories match the current search.</div>
            ) : (
              filteredCategories.map((category) => {
                const isSelected = categoryForm.id === category._id;

                return (
                  <article
                    key={category._id}
                    className={classNames("list-card", "vertical", "catalog-item-card", isSelected && "catalog-item-card-selected")}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      className="catalog-item-selectable"
                      onClick={() => openCategoryEditor(category)}
                      onKeyDown={(event) => handleSelectableKeyDown(event, () => openCategoryEditor(category))}
                      aria-label={`Open category ${category.name} in editor`}
                      aria-pressed={isSelected}
                    >
                      <div className="review-head">
                        <div>
                          <strong>{category.name}</strong>
                          <div className="mini-text">{category.slug}</div>
                        </div>
                        <span
                          className={classNames(
                            "pill",
                            category.isActive === false ? "status-pill-muted" : "status-pill-positive"
                          )}
                        >
                          {category.isActive === false ? "inactive" : "active"}
                        </span>
                      </div>
                      <p className="mini-text">{category.description || "No description added yet."}</p>
                      <div className="catalog-item-footer">
                        <span className="catalog-item-hint">
                          {isSelected ? "Currently open in editor" : "Open in editor"}
                        </span>
                        <span className="catalog-card-action">
                          Edit
                          <ArrowRight size={16} />
                        </span>
                      </div>
                    </div>
                    <div className="row-actions row-actions-wrap">
                      <button type="button" className="ghost-button" onClick={() => openCategoryEditor(category)}>
                        Edit
                      </button>
                      <button type="button" className="ghost-button" onClick={() => toggleCategoryStatus(category)}>
                        {category.isActive === false ? "Activate" : "Deactivate"}
                      </button>
                      <button
                        type="button"
                        className="ghost-button danger"
                        onClick={async () => {
                          try {
                            await catalogApi.deleteCategory(category._id);
                            toast.success("Category deleted");
                            if (categoryForm.id === category._id) resetCategoryForm();
                            await loadData();
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Delete failed");
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

        <section ref={subCategoryEditorRef} className="panel stack-md">
          <div className="section-heading">
            <div>
              <h3>Subcategories</h3>
              <p>Attach granular taxonomy to a parent category so products stay discoverable.</p>
            </div>
          </div>

          <form className="stack-md" onSubmit={submitSubCategory}>
            <div className="form-section">
              <div className="form-section-head">
                <h4>{subCategoryForm.id ? "Edit subcategory" : "Create subcategory"}</h4>
                <p>Each subcategory belongs to a category and can be paused independently.</p>
              </div>
              <div className="stack-sm">
                <label className="field">
                  <span>Name</span>
                  <input
                    value={subCategoryForm.name}
                    onChange={(e) => setSubCategoryForm({ ...subCategoryForm, name: e.target.value })}
                    required
                  />
                </label>
                <label className="field">
                  <span>Parent category</span>
                  <select
                    value={subCategoryForm.category}
                    onChange={(e) => setSubCategoryForm({ ...subCategoryForm, category: e.target.value })}
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
                  <span>Description</span>
                  <textarea
                    value={subCategoryForm.description}
                    onChange={(e) => setSubCategoryForm({ ...subCategoryForm, description: e.target.value })}
                  />
                </label>
                <label className="toggle-card">
                  <input
                    type="checkbox"
                    checked={subCategoryForm.isActive}
                    onChange={(e) => setSubCategoryForm({ ...subCategoryForm, isActive: e.target.checked })}
                  />
                  <div>
                    <strong>Active subcategory</strong>
                    <span>Keep legacy taxonomy available while preventing new assignments when inactive.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="row-actions">
              <button className="primary-button" type="submit" disabled={savingSubCategory}>
                {savingSubCategory
                  ? "Saving..."
                  : subCategoryForm.id
                    ? "Update subcategory"
                    : "Create subcategory"}
              </button>
              <button className="ghost-button" type="button" onClick={resetSubCategoryForm}>
                Reset
              </button>
            </div>
          </form>

          <div className="stack-sm">
            {loading ? (
              <div className="empty-state">Loading subcategory taxonomy...</div>
            ) : filteredSubCategories.length === 0 ? (
              <div className="empty-state">No subcategories match the current search.</div>
            ) : (
              filteredSubCategories.map((subCategory) => {
                const parentLabel =
                  typeof subCategory.category === "string"
                    ? subCategory.category
                    : subCategory.category?.name || "Unknown category";
                const isSelected = subCategoryForm.id === subCategory._id;

                return (
                  <article
                    key={subCategory._id}
                    className={classNames("list-card", "vertical", "catalog-item-card", isSelected && "catalog-item-card-selected")}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      className="catalog-item-selectable"
                      onClick={() => openSubCategoryEditor(subCategory)}
                      onKeyDown={(event) =>
                        handleSelectableKeyDown(event, () => openSubCategoryEditor(subCategory))
                      }
                      aria-label={`Open subcategory ${subCategory.name} in editor`}
                      aria-pressed={isSelected}
                    >
                      <div className="review-head">
                        <div>
                          <strong>{subCategory.name}</strong>
                          <div className="mini-text">
                            {subCategory.slug} . {parentLabel}
                          </div>
                        </div>
                        <span
                          className={classNames(
                            "pill",
                            subCategory.isActive === false ? "status-pill-muted" : "status-pill-positive"
                          )}
                        >
                          {subCategory.isActive === false ? "inactive" : "active"}
                        </span>
                      </div>
                      <p className="mini-text">{subCategory.description || "No description added yet."}</p>
                      <div className="catalog-item-footer">
                        <span className="catalog-item-hint">
                          {isSelected ? "Currently open in editor" : "Open in editor"}
                        </span>
                        <span className="catalog-card-action">
                          Edit
                          <ArrowRight size={16} />
                        </span>
                      </div>
                    </div>
                    <div className="row-actions row-actions-wrap">
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => openSubCategoryEditor(subCategory)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => toggleSubCategoryStatus(subCategory)}
                      >
                        {subCategory.isActive === false ? "Activate" : "Deactivate"}
                      </button>
                      <button
                        type="button"
                        className="ghost-button danger"
                        onClick={async () => {
                          try {
                            await catalogApi.deleteSubCategory(subCategory._id);
                            toast.success("Subcategory deleted");
                            if (subCategoryForm.id === subCategory._id) resetSubCategoryForm();
                            await loadData();
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Delete failed");
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
  );
}

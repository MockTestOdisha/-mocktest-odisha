"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function HtmlCategoriesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const currentCategoryId = searchParams.get("parent");

  const [category, setCategory] = useState(null);
  const [children, setChildren] = useState([]);
  const [rootCategories, setRootCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [showRootCreate, setShowRootCreate] = useState(false);

  const [newName, setNewName] = useState("");
  const [rootAccessType, setRootAccessType] = useState("free");

  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, [currentCategoryId]);

  async function checkAdmin() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error || profile?.role !== "admin") {
      router.replace("/");
      return;
    }

    await loadPage();
  }

  async function loadPage() {
    setMessage("");

    if (!currentCategoryId) {
      await loadRootCategories();
    } else {
      await loadCategory();
    }

    setLoading(false);
  }

  async function loadRootCategories() {
    const { data, error } = await supabase
      .from("html_test_categories")
      .select(
        "id,name,access_type,parent_id,is_visible,display_order,created_at"
      )
      .is("parent_id", null)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      setMessage("Could not load categories: " + error.message);
      return;
    }

    setRootCategories(data || []);
  }

  async function loadCategory() {
    const { data: current, error: currentError } = await supabase
      .from("html_test_categories")
      .select(
        "id,name,access_type,parent_id,is_visible,display_order,created_at"
      )
      .eq("id", currentCategoryId)
      .single();

    if (currentError || !current) {
      setMessage("Category not found.");
      return;
    }

    setCategory(current);

    const { data: childRows, error: childError } = await supabase
      .from("html_test_categories")
      .select(
        "id,name,access_type,parent_id,is_visible,display_order,created_at"
      )
      .eq("parent_id", currentCategoryId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (childError) {
      setMessage("Could not load sub-cards: " + childError.message);
      return;
    }

    setChildren(childRows || []);
  }

  function openCategory(id) {
    router.push(`/admin/html-categories?parent=${id}`);
  }

  function goBack() {
    if (!category) {
      router.push("/admin");
      return;
    }

    if (category.parent_id) {
      router.push(
        `/admin/html-categories?parent=${category.parent_id}`
      );
    } else {
      router.push("/admin/html-categories");
    }
  }

  async function createRootCategory() {
    const name = newName.trim();

    if (!name) {
      setMessage("Enter a category name.");
      return;
    }

    setSaving(true);
    setMessage("");

    const freeRoots = rootCategories.filter(
      (item) => item.access_type === rootAccessType
    );

    const nextOrder =
      freeRoots.length > 0
        ? Math.max(
            ...freeRoots.map((item) => Number(item.display_order) || 0)
          ) + 1
        : 0;

    const { error } = await supabase
      .from("html_test_categories")
      .insert({
        name,
        access_type: rootAccessType,
        parent_id: null,
        is_visible: true,
        display_order: nextOrder,
      });

    if (error) {
      setMessage("Could not create main card: " + error.message);
      setSaving(false);
      return;
    }

    setNewName("");
    setShowRootCreate(false);

    await loadRootCategories();

    setMessage("Main card created.");
    setSaving(false);
  }

  async function createChild() {
    if (!category) return;

    const name = newName.trim();

    if (!name) {
      setMessage("Enter a sub-card name.");
      return;
    }

    setSaving(true);
    setMessage("");

    const nextOrder =
      children.length > 0
        ? Math.max(
            ...children.map((item) => Number(item.display_order) || 0)
          ) + 1
        : 0;

    const { error } = await supabase
      .from("html_test_categories")
      .insert({
        name,
        access_type: category.access_type,
        parent_id: category.id,
        is_visible: true,
        display_order: nextOrder,
      });

    if (error) {
      setMessage("Could not create sub-card: " + error.message);
      setSaving(false);
      return;
    }

    setNewName("");
    setShowCreate(false);


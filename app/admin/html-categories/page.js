  async function moveItem(item, direction) {
    const list = currentCategoryId
      ? [...children]
      : rootCategories.filter(
          (entry) => entry.access_type === item.access_type
        );

    const index = list.findIndex(
      (entry) => entry.id === item.id
    );

    if (index === -1) return;

    const newIndex =
      direction === "up" ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= list.length) {
      return;
    }

    const reordered = [...list];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);

    // 1. Instant local visual update so it moves on screen immediately
    const idToOrder = {};
    reordered.forEach((entry, idx) => {
      idToOrder[entry.id] = idx;
    });

    if (currentCategoryId) {
      setChildren((prev) =>
        prev
          .map((entry) =>
            idToOrder[entry.id] !== undefined
              ? { ...entry, display_order: idToOrder[entry.id] }
              : entry
          )
          .sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0))
      );
    } else {
      setRootCategories((prev) =>
        prev
          .map((entry) =>
            idToOrder[entry.id] !== undefined
              ? { ...entry, display_order: idToOrder[entry.id] }
              : entry
          )
          .sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0))
      );
    }

    setSaving(true);
    setMessage("");

    // 2. Persist to Supabase without requiring 'updated_at'
    try {
      for (let i = 0; i < reordered.length; i++) {
        const { error } = await supabase
          .from("html_test_categories")
          .update({
            display_order: i,
          })
          .eq("id", reordered[i].id);

        if (error) {
          throw error;
        }
      }

      setMessage("Order updated successfully.");
      await loadPage();
    } catch (err) {
      console.error(err);
      setMessage("Could not reorder: " + err.message);
      await loadPage();
    } finally {
      setSaving(false);
    }
  }

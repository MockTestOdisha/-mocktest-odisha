"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CreateTestPage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [testType, setTestType] = useState("free");
  const [maxReviews, setMaxReviews] = useState("10");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleCreate(e) {
    e.preventDefault();

    setErrorMessage("");

    if (!title.trim()) {
      setErrorMessage("Please enter a test title.");
      return;
    }

    if (!slug.trim()) {
      setErrorMessage("Please enter a test slug.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("tests").insert({
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      test_type: testType,
      max_reviews: Number(maxReviews) || 10,
      is_active: true,
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    router.push("/admin/tests");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "20px",
      }}
    >
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          background: "#fff",
          padding: "25px",
          borderRadius: "10px",
        }}
      >
        <h1>Create New Test</h1>

        <p>Create a new mock test.</p>

        <form onSubmit={handleCreate}>
          <div style={{ marginBottom: "18px" }}>
            <label>
              <strong>Test Title</strong>
            </label>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Example: Odisha GK Mock Test 1"
              required
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "8px",
                border: "1px solid #ccc",
                borderRadius: "6px",
              }}
            />
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label>
              <strong>Slug</strong>
            </label>

            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Example: odisha-gk-01"
              required
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "8px",
                border: "1px solid #ccc",
                borderRadius: "6px",
              }}
            />

            <p style={{ fontSize: "14px", color: "#666" }}>
              Use lowercase letters, numbers and hyphens.
            </p>
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label>
              <strong>Description</strong>
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter test description"
              rows="4"
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "8px",
                border: "1px solid #ccc",
                borderRadius: "6px",
              }}
            />
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label>
              <strong>Test Type</strong>
            </label>

            <select
              value={testType}
              onChange={(e) => setTestType(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "8px",
                border: "1px solid #ccc",
                borderRadius: "6px",
              }}
            >
              <option value="free">Free</option>
              <option value="restricted">Restricted</option>
            </select>
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label>
              <strong>Maximum Reviews</strong>
            </label>

            <input
              type="number"
              min="0"
              value={maxReviews}
              onChange={(e) => setMaxReviews(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "8px",
                border: "1px solid #ccc",
                borderRadius: "6px",
              }}
            />
          </div>

          {errorMessage && (
            <p
              style={{
                background: "#fee2e2",
                color: "#991b1b",
                padding: "12px",
                borderRadius: "6px",
              }}
            >
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px 20px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            {loading ? "Creating..." : "Create Test"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/admin/tests")}
            style={{
              marginLeft: "10px",
              padding: "12px 20px",
              background: "#6b7280",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            Cancel
          </button>
        </form>
      </div>
    </main>
  );
}

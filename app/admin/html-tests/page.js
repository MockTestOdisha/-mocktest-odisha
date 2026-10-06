"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminHtmlTestsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [tests, setTests] = useState([]);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [accessType, setAccessType] = useState("free");
  const [file, setFile] = useState(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadTests() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/admin/login");
      return;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (
      profileError ||
      !profile ||
      profile.role !== "admin"
    ) {
      await supabase.auth.signOut();
      router.replace("/admin/login");
      return;
    }

    const response = await fetch(
      "/api/admin/html-tests/list"
    );

    const result = await response.json();

    if (!response.ok) {
      setErrorMessage(
        result.error || "Could not load HTML tests."
      );
      setLoading(false);
      return;
    }

    setTests(result.tests || []);
    setLoading(false);
  }

  useEffect(() => {
    loadTests();
  }, []);

  function makeSlug(value) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function handleTitleChange(value) {
    setTitle(value);

    if (!slug) {
      setSlug(makeSlug(value));
    }
  }

  async function handleUpload(event) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!title.trim()) {
      setErrorMessage("Please enter a test title.");
      return;
    }

    if (!slug.trim()) {
      setErrorMessage("Please enter a test slug.");
      return;
    }

    if (!file) {
      setErrorMessage("Please select an HTML file.");
      return;
    }

    const fileName = file.name.toLowerCase();

    if (
      !fileName.endsWith(".html") &&
      !fileName.endsWith(".htm")
    ) {
      setErrorMessage(
        "Only .html and .htm files are allowed."
      );
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();

      formData.append("title", title.trim());
      formData.append("slug", slug.trim());
      formData.append("accessType", accessType);
      formData.append("file", file);

      const response = await fetch(
        "/api/admin/html-tests/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setErrorMessage(
          result.error || "Upload failed."
        );
        setUploading(false);
        return;
      }

      setTitle("");
      setSlug("");
      setAccessType("free");
      setFile(null);

      const fileInput =
        document.getElementById("html-file");

      if (fileInput) {
        fileInput.value = "";
      }

      setSuccessMessage(
        "HTML test uploaded successfully."
      );

      await loadTests();
    } catch {
      setErrorMessage(
        "Something went wrong during upload."
      );
    }

    setUploading(false);
  }

  async function handleDelete(test) {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${test.title}"?\n\nThis will delete the HTML file from storage and remove its database record.`
    );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setDeletingId(test.id);

    try {
      const response = await fetch(
        "/api/admin/html-tests/delete",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: test.id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setErrorMessage(
          result.error || "Delete failed."
        );
        setDeletingId(null);
        return;
      }

      setTests((currentTests) =>
        currentTests.filter(
          (item) => item.id !== test.id
        )
      );

      setSuccessMessage(
        "HTML test deleted successfully."
      );
    } catch {
      setErrorMessage(
        "Something went wrong during deletion."
      );
    }

    setDeletingId(null);
  }

  if (loading) {
    return (
      <main style={{ padding: "30px" }}>
        <h1>HTML Tests</h1>
        <p>Loading...</p>
      </main>
    );
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
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#1e3a8a",
            color: "#fff",
            padding: "20px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          <h1 style={{ marginTop: 0 }}>
            HTML Tests
          </h1>

          <p style={{ marginBottom: 0 }}>
            Upload and manage complete HTML mock tests.
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          <h2>Upload HTML Test</h2>

          <form onSubmit={handleUpload}>
            <div style={{ marginBottom: "18px" }}>
              <label>
                <strong>Test Title</strong>
              </label>

              <input
                type="text"
                value={title}
                onChange={(e) =>
                  handleTitleChange(e.target.value)
                }
                placeholder="Example: Odisha GK Mock Test 01"
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
                <strong>Test Slug</strong>
              </label>

              <input
                type="text"
                value={slug}
                onChange={(e) =>
                  setSlug(makeSlug(e.target.value))
                }
                placeholder="odisha-gk-01"
                style={{
                  width: "100%",
                  padding: "12px",
                  marginTop: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                }}
              />

              <p
                style={{
                  color: "#666",
                  fontSize: "14px",
                }}
              >
                Test URL will use:
                {" /html-test/"}
                {slug || "your-slug"}
              </p>
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label>
                <strong>Access Type</strong>
              </label>

              <select
                value={accessType}
                onChange={(e) =>
                  setAccessType(e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  marginTop: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  background: "#fff",
                  fontSize: "16px",
                }}
              >
                <option value="free">
                  🟢 Free — Anyone can attempt
                </option>

                <option value="paid">
                  🔒 Paid — Only students with access
                </option>
              </select>
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label>
                <strong>HTML File</strong>
              </label>

              <input
                id="html-file"
                type="file"
                accept=".html,.htm,text/html"
                onChange={(e) =>
                  setFile(e.target.files?.[0] || null)
                }
                style={{
                  display: "block",
                  marginTop: "8px",
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

            {successMessage && (
              <p
                style={{
                  background: "#dcfce7",
                  color: "#166534",
                  padding: "12px",
                  borderRadius: "6px",
                }}
              >
                {successMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={uploading}
              style={{
                padding: "12px 20px",
                background: "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: uploading
                  ? "not-allowed"
                  : "pointer",
                fontSize: "16px",
              }}
            >
              {uploading
                ? "Uploading..."
                : "Upload HTML Test"}
            </button>
          </form>
        </div>

        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
          }}
        >
          <h2>
            Uploaded HTML Tests ({tests.length})
          </h2>

          {tests.length === 0 ? (
            <p>No HTML tests uploaded yet.</p>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "15px",
              }}
            >
              {tests.map((test) => (
                <div
                  key={test.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "15px",
                  }}
                >
                  <h3>{test.title}</h3>

                  <p>
                    <strong>Slug:</strong>{" "}
                    {test.slug}
                  </p>

                  <p>
                    <strong>Access:</strong>{" "}
                    {test.access_type === "paid"
                      ? "🔒 Paid"
                      : "🟢 Free"}
                  </p>

                  <p>
                    <strong>Status:</strong>{" "}
                    {test.is_active
                      ? "Active"
                      : "Inactive"}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <a
                      href={`/html-test/${test.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-block",
                        padding: "9px 14px",
                        background: "#2563eb",
                        color: "#fff",
                        borderRadius: "6px",
                        textDecoration: "none",
                      }}
                    >
                      Open Test
                    </a>

                    <button
                      onClick={() => handleDelete(test)}
                      disabled={deletingId === test.id}
                      style={{
                        padding: "9px 14px",
                        background:
                          deletingId === test.id
                            ? "#9ca3af"
                            : "#dc2626",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        cursor:
                          deletingId === test.id
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {deletingId === test.id
                        ? "Deleting..."
                        : "🗑️ Delete Test"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => router.push("/admin")}
          style={{
            marginTop: "20px",
            padding: "10px 16px",
            background: "#6b7280",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          ← Back to Admin Dashboard
        </button>
      </div>
    </main>
  );
}

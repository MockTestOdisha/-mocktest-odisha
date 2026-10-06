"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ManageTestsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
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

      const { data, error } = await supabase
        .from("tests")
        .select(
          "id, title, slug, description, test_type, is_active, max_reviews, created_at"
        )
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setTests(data || []);
      setLoading(false);
    }

    loadTests();
  }, []);

  async function handleDeleteTest(test) {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${test.title}"?\n\nThis will delete the test and its related data. This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(test.id);
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "admin_delete_test",
      {
        p_test_id: test.id,
      }
    );

    if (error) {
      setErrorMessage(error.message);
      setDeletingId(null);
      return;
    }

    if (data !== true) {
      setErrorMessage("Test could not be deleted.");
      setDeletingId(null);
      return;
    }

    setTests((currentTests) =>
      currentTests.filter(
        (item) => item.id !== test.id
      )
    );

    setDeletingId(null);
  }

  if (loading) {
    return (
      <main style={{ padding: "30px" }}>
        <h1>Loading Tests...</h1>
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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1>Manage Tests</h1>
            <p>Create and manage your mock tests.</p>
          </div>

          <button
            onClick={() =>
              router.push("/admin/tests/create")
            }
            style={{
              padding: "12px 18px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            + Create New Test
          </button>
        </div>

        {errorMessage && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "15px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            {errorMessage}
          </div>
        )}

        {tests.length === 0 ? (
          <div
            style={{
              background: "#fff",
              padding: "25px",
              borderRadius: "10px",
            }}
          >
            <h2>No tests found</h2>
            <p>Create your first mock test.</p>
          </div>
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
                  background: "#fff",
                  padding: "20px",
                  borderRadius: "10px",
                  border: "1px solid #ddd",
                }}
              >
                <h2 style={{ marginTop: 0 }}>
                  {test.title}
                </h2>

                <p>
                  <strong>Slug:</strong> {test.slug}
                </p>

                <p>
                  <strong>Type:</strong>{" "}
                  {test.test_type === "free"
                    ? "Free"
                    : "Restricted"}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  {test.is_active
                    ? "Active"
                    : "Inactive"}
                </p>

                <p>
                  <strong>Maximum Reviews:</strong>{" "}
                  {test.max_reviews}
                </p>

                {test.description && (
                  <p>
                    <strong>Description:</strong>{" "}
                    {test.description}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                    marginTop: "20px",
                  }}
                >
                  <button
                    onClick={() =>
                      router.push(
                        `/admin/tests/${test.id}/questions`
                      )
                    }
                    style={{
                      padding: "10px 16px",
                      background: "#16a34a",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "15px",
                    }}
                  >
                    ❓ Manage Questions
                  </button>

                  <button
                    onClick={() =>
                      handleDeleteTest(test)
                    }
                    disabled={deletingId === test.id}
                    style={{
                      padding: "10px 16px",
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
                      fontSize: "15px",
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

        <button
          onClick={() => router.push("/admin")}
          style={{
            marginTop: "25px",
            padding: "10px 16px",
            background: "#6b7280",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          ← Back to Dashboard
        </button>
      </div>
    </main>
  );
}

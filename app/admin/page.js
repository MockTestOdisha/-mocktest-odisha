"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    async function checkAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error || !profile || profile.role !== "admin") {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      setUserEmail(user.email || "");
      setLoading(false);
    }

    checkAdmin();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  if (loading) {
    return (
      <main className="loading-page">
        <div className="loading-card">
          <div className="loading-icon">🎓</div>
          <h2>Loading Admin Dashboard...</h2>
          <p>Please wait...</p>
        </div>

        <style jsx>{`
          .loading-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: #eef5ff;
            font-family: Arial, sans-serif;
          }

          .loading-card {
            width: 100%;
            max-width: 420px;
            background: white;
            padding: 35px 25px;
            border-radius: 20px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(30, 58, 138, 0.08);
          }

          .loading-icon {
            font-size: 42px;
            margin-bottom: 10px;
          }

          .loading-card h2 {
            margin: 0 0 8px;
            color: #172554;
          }

          .loading-card p {
            margin: 0;
            color: #64748b;
          }
        `}</style>
      </main>
    );
  }

  const menuItems = [
    {
      icon: "📝",
      title: "Manage Tests",
      description: "Create and manage mock tests.",
      route: "/admin/tests",
      className: "blue",
    },
    {
      icon: "❓",
      title: "Questions",
      description: "Add and manage questions for tests.",
      route: "/admin/tests",
      className: "purple",
    },
    {
      icon: "👨‍🎓",
      title: "Students",
      description: "Manage student accounts.",
      route: "/admin/students",
      className: "green",
    },
    {
      icon: "🔐",
      title: "Test Access",
      description: "Give restricted tests to students.",
      route: "/admin/access",
      className: "gold",
    },
    {
      icon: "📈",
      title: "Attempts & Results",
      description: "View student attempts and results.",
      route: "/admin/attempts",
      className: "orange",
    },
    {
      icon: "📄",
      title: "HTML Tests",
      description: "Upload and manage complete HTML tests.",
      route: "/admin/html-tests",
      className: "pink",
    },
  ];

  return (
    <main className="admin-page">
      <div className="admin-container">

        {/* Header */}
        <header className="top-header">
          <div className="brand-area">
            <div className="brand-icon">🎓</div>

            <div>
              <h1>Mock Test Odisha</h1>
              <p>Admin Dashboard</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="header-logout"
          >
            Logout
          </button>
        </header>

        {/* Welcome Card */}
        <section className="welcome-card">
          <div>
            <span className="welcome-label">
              ADMIN CONTROL CENTER
            </span>

            <h2>Welcome, Admin 👋</h2>

            <p>
              Manage your tests, students, access,
              results and HTML mock tests from one place.
            </p>

            <div className="email-box">
              <span>Logged in as</span>
              <strong>{userEmail}</strong>
            </div>
          </div>

          <div className="welcome-icon">
            ⚙️
          </div>
        </section>

        {/* Dashboard Title */}
        <div className="section-heading">
          <div>
            <h2>Dashboard</h2>
            <p>Select an option to continue</p>
          </div>
        </div>

        {/* Admin Cards */}
        <section className="dashboard-grid">
          {menuItems.map((item) => (
            <button
              key={item.title}
              onClick={() => router.push(item.route)}
              className={`dashboard-card ${item.className}`}
            >
              <div className="card-top">
                <div className="card-icon">
                  {item.icon}
                </div>

                <span className="arrow">
                  →
                </span>
              </div>

              <h3>{item.title}</h3>

              <p>{item.description}</p>

              <div className="open-label">
                Open
              </div>
            </button>
          ))}
        </section>

        {/* Quick Information */}
        <section className="info-card">
          <div className="info-icon">
            💡
          </div>

          <div>
            <h3>Admin Tip</h3>
            <p>
              Use <strong>HTML Tests</strong> to manage
              your uploaded interactive mock tests and
              organize them into Free and Paid categories.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer>
          <p>
            Mock Test Odisha • Admin Panel
          </p>
        </footer>

      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .admin-page {
          min-height: 100vh;
          background:
            linear-gradient(
              180deg,
              #eef5ff 0%,
              #f8fbff 45%,
              #ffffff 100%
            );
          padding: 18px;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
          color: #172554;
        }

        .admin-container {
          width: 100%;
          max-width: 1050px;
          margin: 0 auto;
        }

        /* Header */

        .top-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 18px 20px;
          background: #ffffff;
          border: 1px solid #dbeafe;
          border-radius: 18px;
          box-shadow:
            0 8px 25px rgba(30, 58, 138, 0.07);
          margin-bottom: 18px;
        }

        .brand-area {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .brand-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 14px;
          background: #eff6ff;
          font-size: 27px;
        }

        .brand-area h1 {
          margin: 0;
          font-size: 21px;
          line-height: 1.2;
          color: #172554;
        }

        .brand-area p {
          margin: 4px 0 0;
          font-size: 13px;
          color: #64748b;
        }

        .header-logout {
          border: none;
          background: #fee2e2;
          color: #b91c1c;
          font-weight: 700;
          padding: 10px 15px;
          border-radius: 10px;
          cursor: pointer;
          white-space: nowrap;
          transition: 0.2s;
        }

        .header-logout:hover {
          background: #fecaca;
        }

        /* Welcome */

        .welcome-card {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          min-height: 190px;
          padding: 28px 30px;
          border-radius: 20px;
          background:
            linear-gradient(
              135deg,
              #172554 0%,
              #1d4ed8 60%,
              #4f46e5 100%
            );
          color: white;
          box-shadow:
            0 12px 30px rgba(30, 64, 175, 0.18);
          margin-bottom: 28px;
        }

        .welcome-card::after {
          content: "";
          position: absolute;
          width: 190px;
          height: 190px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          right: -55px;
          top: -60px;
        }

        .welcome-label {
          display: inline-block;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.4px;
          color: #bfdbfe;
          margin-bottom: 8px;
        }

        .welcome-card h2 {
          position: relative;
          z-index: 1;
          margin: 0 0 8px;
          font-size: 27px;
        }

        .welcome-card p {
          position: relative;
          z-index: 1;
          margin: 0;
          max-width: 650px;
          color: #dbeafe;
          line-height: 1.6;
          font-size: 14px;
        }

        .email-box {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 17px;
          padding: 8px 12px;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.12);
          font-size: 12px;
        }

        .email-box span {
          color: #bfdbfe;
        }

        .email-box strong {
          color: white;
          word-break: break-word;
        }

        .welcome-icon {
          position: relative;
          z-index: 2;
          width: 75px;
          height: 75px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.12);
          font-size: 38px;
        }

        /* Section */

        .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .section-heading h2 {
          margin: 0;
          font-size: 22px;
          color: #172554;
        }

        .section-heading p {
          margin: 4px 0 0;
          font-size: 13px;
          color: #64748b;
        }

        /* Grid */

        .dashboard-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 15px;
        }

        .dashboard-card {
          width: 100%;
          min-height: 190px;
          padding: 19px;
          text-align: left;
          border: 1px solid #e2e8f0;
          border-radius: 17px;
          background: white;
          cursor: pointer;
          box-shadow:
            0 5px 18px rgba(15, 23, 42, 0.05);
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            border-color 0.18s ease;
        }

        .dashboard-card:hover {
          transform: translateY(-3px);
          box-shadow:
            0 10px 25px rgba(15, 23, 42, 0.09);
        }

        .dashboard-card:active {
          transform: translateY(0);
        }

        .card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 17px;
        }

        .card-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          font-size: 25px;
        }

        .arrow {
          font-size: 21px;
          font-weight: 700;
          color: #94a3b8;
        }

        .dashboard-card h3 {
          margin: 0 0 7px;
          font-size: 17px;
          color: #172554;
        }

        .dashboard-card p {
          min-height: 42px;
          margin: 0;
          font-size: 13px;
          line-height: 1.55;
          color: #64748b;
        }

        .open-label {
          margin-top: 15px;
          font-size: 12px;
          font-weight: 700;
          color: #2563eb;
        }

        /* Card Colors */

        .blue .card-icon {
          background: #dbeafe;
        }

        .blue:hover {
          border-color: #93c5fd;
        }

        .purple .card-icon {
          background: #ede9fe;
        }

        .purple:hover {
          border-color: #c4b5fd;
        }

        .green .card-icon {
          background: #dcfce7;
        }

        .green:hover {
          border-color: #86efac;
        }

        .gold .card-icon {
          background: #fef3c7;
        }

        .gold:hover {
          border-color: #fcd34d;
        }

        .orange .card-icon {
          background: #ffedd5;
        }

        .orange:hover {
          border-color: #fdba74;
        }

        .pink .card-icon {
          background: #fce7f3;
        }

        .pink:hover {
          border-color: #f9a8d4;
        }

        /* Info */

        .info-card {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          margin-top: 22px;
          padding: 18px;
          border: 1px solid #dbeafe;
          border-radius: 16px;
          background: #f8fbff;
        }

        .info-icon {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 12px;
          background: #dbeafe;
          font-size: 21px;
        }

        .info-card h3 {
          margin: 0 0 5px;
          font-size: 15px;
          color: #172554;
        }

        .info-card p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.55;
        }

        footer {
          padding: 25px 0 10px;
          text-align: center;
        }

        footer p {
          margin: 0;
          color: #94a3b8;
          font-size: 12px;
        }

        /* Tablet */

        @media (max-width: 800px) {
          .dashboard-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        /* Mobile */

        @media (max-width: 560px) {
          .admin-page {
            padding: 11px;
          }

          .top-header {
            padding: 14px;
            border-radius: 15px;
          }

          .brand-icon {
            width: 42px;
            height: 42px;
            border-radius: 12px;
            font-size: 23px;
          }

          .brand-area h1 {
            font-size: 17px;
          }

          .brand-area p {
            font-size: 11px;
          }

          .header-logout {
            padding: 8px 11px;
            font-size: 12px;
          }

          .welcome-card {
            min-height: 0;
            padding: 22px 20px;
            border-radius: 17px;
          }

          .welcome-card h2 {
            font-size: 23px;
          }

          .welcome-card p {
            font-size: 13px;
          }

          .welcome-icon {
            display: none;
          }

          .email-box {
            display: flex;
          }

          .section-heading h2 {
            font-size: 20px;
          }

          .dashboard-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .dashboard-card {
            min-height: 0;
            padding: 17px;
          }

          .dashboard-card p {
            min-height: 0;
          }

          .card-top {
            margin-bottom: 13px;
          }

          .info-card {
            padding: 15px;
          }
        }
      `}</style>
    </main>
  );
}

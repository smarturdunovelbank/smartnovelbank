"use client";

import { Suspense } from "react";
import AdminDashboard from "./AdminDashboard";

export default function MasterAdminPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            textAlign: "center",
            padding: "80px 16px",
            color: "var(--sn-text-sub)",
            fontSize: "0.95rem",
          }}
        >
          Loading Admin Control Center...
        </div>
      }
    >
      <AdminDashboard defaultTab="catalog" />
    </Suspense>
  );
}

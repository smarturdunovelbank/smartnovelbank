"use client";

import { useState, useEffect } from "react";

export default function ToastContainer() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let timer;

    const handleShowToast = (e) => {
      const { message, icon } = e.detail;
      setToast({ message, icon, id: Date.now() });

      clearTimeout(timer);
      timer = setTimeout(() => {
        setToast(null);
      }, 2500);
    };

    window.addEventListener("showToast", handleShowToast);
    return () => {
      window.removeEventListener("showToast", handleShowToast);
      clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;

  return (
    <div className="toast-container" aria-live="polite">
      <div className="toast-message" key={toast.id}>
        {toast.icon && <span className="toast-icon">{toast.icon}</span>}
        <span className="toast-text">{toast.message}</span>
      </div>
    </div>
  );
}

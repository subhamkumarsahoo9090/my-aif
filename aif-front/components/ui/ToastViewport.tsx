"use client";

type Toast = {
  id: string;
  message: string;
  tone: "error" | "success";
};

export default function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => onDismiss(toast.id)}
          role="alert"
          className={`pointer-events-auto w-full max-w-sm rounded-lg border px-4 py-3 text-left text-sm shadow-lg ${
            toast.tone === "error"
              ? "border-rose-200 bg-rose-50 text-rose-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}

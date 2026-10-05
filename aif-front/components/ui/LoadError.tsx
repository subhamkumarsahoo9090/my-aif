import { secondaryButtonClass } from "@/components/ui/classes";
import EmptyState from "@/components/ui/EmptyState";

export default function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      title="This page could not be loaded"
      body="Check your connection and try again. If your session has ended, sign in again."
      action={
        <button type="button" onClick={onRetry} className={secondaryButtonClass}>
          Try again
        </button>
      }
    />
  );
}

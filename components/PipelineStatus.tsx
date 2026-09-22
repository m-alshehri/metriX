"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
type Job = {
  status: string;
  state: { stage?: string };
  error?: string;
  next_retry_at?: string;
};
export default function PipelineStatus({
  projectId,
  locale,
}: {
  projectId: string;
  locale: string;
}) {
  const [job, setJob] = useState<Job | null>(null),
    [error, setError] = useState(false);
  const router = useRouter(),
    ar = locale === "ar";
  useEffect(() => {
    let stopped = false,
      wasActive = false;
    const controller = new AbortController();
    async function update() {
      try {
        const r = await fetch(`/api/projects/${projectId}/jobs`, {
          signal: controller.signal,
        });
        if (!r.ok) throw new Error();
        const { job: next } = await r.json();
        if (stopped) return;
        setJob(next);
        setError(false);
        const active =
          next && ["queued", "running", "retry"].includes(next.status);
        if (wasActive && !active) router.refresh();
        wasActive = active;
      } catch {
        if (!stopped) setError(true);
      }
    }
    void update();
    const timer = setInterval(update, 5000);
    return () => {
      stopped = true;
      controller.abort();
      clearInterval(timer);
    };
  }, [projectId, router]);
  const names: Record<string, string> = ar
    ? {
        queued: "في الانتظار",
        running: "قيد التنفيذ",
        retry: "بانتظار إعادة المحاولة",
        failed: "فشل ويحتاج مراجعة",
        completed: "اكتمل",
      }
    : {};
  return (
    <div className="my-4 rounded-xl border bg-white p-4" role="status">
      {error ? (
        ar ? (
          "تعذر تحميل حالة التشغيل."
        ) : (
          "Could not load run status."
        )
      ) : job ? (
        <>
          <span>
            {ar ? "حالة المهمة: " : "Job status: "}
            {names[job.status] || job.status}
          </span>
          {["queued", "retry"].includes(job.status) && (
            <button
              className="mx-3 rounded border px-3 py-1"
              onClick={async () => {
                const r = await fetch(`/api/projects/${projectId}/jobs`, {
                  method: "POST",
                });
                if (!r.ok) setError(true);
              }}
            >
              {ar ? "استكمال المهمة" : "Continue job"}
            </button>
          )}
          {job.status === "retry" && job.next_retry_at && (
            <span className="ms-3 text-sm">
              {ar ? "المحاولة متاحة بعد: " : "Retry available after: "}
              {new Date(job.next_retry_at).toLocaleString(
                ar ? "ar-SA" : "en-US",
              )}
            </span>
          )}
        </>
      ) : ar ? (
        "لم يبدأ تشغيل بعد."
      ) : (
        "No run yet."
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useRef, useState } from "react";

type Project = {
  id: string;
  name: string;
  description?: string | null;
  avatar_url?: string | null;
};

export default function ProjectCardManager({
  project,
  locale,
}: {
  project: Project;
  locale: string;
}) {
  const ar = locale === "ar";
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [busy, setBusy] = useState(false);
  const [avatar, setAvatar] = useState(project.avatar_url || "");

  async function rename() {
    const next = name.trim();
    if (!next) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Rename failed");
      setEditing(false);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Rename failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeProject() {
    if (!confirm(ar ? "هل أنت متأكد من حذف المشروع وجميع بياناته؟" : "Delete this project and all of its data?")) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Delete failed");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function uploadAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch(`/api/projects/${project.id}/avatar`, {
        method: "POST",
        body: form,
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Upload failed");
      setAvatar(j.url || "");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <article className="group relative overflow-hidden rounded-[1.7rem] border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 text-lg font-black text-zinc-500"
          title={ar ? "تغيير الشعار" : "Change project logo"}
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            project.name.slice(0, 2).toUpperCase()
          )}
        </button>

        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={uploadAvatar} />

        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-zinc-300 px-3 py-2 text-sm font-bold"
                autoFocus
              />
              <button disabled={busy} onClick={rename} className="rounded-xl bg-[#330033] px-3 text-xs font-bold text-white">
                {ar ? "حفظ" : "Save"}
              </button>
            </div>
          ) : (
            <h3 className="truncate text-lg font-black text-zinc-900">{project.name}</h3>
          )}
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-500">{project.description || (ar ? "مشروع رصد وتحليل" : "Monitoring & analytics project")}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4">
        <Link href={`/${locale}/projects/${project.id}`} className="text-sm font-black text-[#330033]">
          {ar ? "فتح اللوحة ←" : "Open dashboard →"}
        </Link>
        <div className="flex gap-1">
          <button disabled={busy} onClick={() => setEditing((x) => !x)} className="rounded-full px-3 py-1.5 text-xs font-bold text-zinc-600 hover:bg-zinc-100">
            {ar ? "تعديل الاسم" : "Rename"}
          </button>
          <button disabled={busy} onClick={removeProject} className="rounded-full px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">
            {ar ? "حذف" : "Delete"}
          </button>
        </div>
      </div>
    </article>
  );
}

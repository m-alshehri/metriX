"use client";

import { useEffect, useMemo, useState } from "react";

declare global {
  interface Window {
    FB?: {
      init: (options: Record<string, unknown>) => void;
      login: (
        callback: (response: MetaLoginResponse) => void,
        options?: Record<string, unknown>
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

type MetaLoginResponse = {
  status?: string;
  authResponse?: {
    accessToken?: string;
    expiresIn?: number;
    userID?: string;
  };
};

type MetaAsset = {
  id: string;
  asset_type: "facebook_page" | "instagram_account";
  external_id: string;
  name?: string | null;
  username?: string | null;
  parent_external_id?: string | null;
  selected: boolean;
  project_id?: string | null;
};

type Project = {
  id: string;
  name: string;
};

const CONFIG_ID =
  process.env.NEXT_PUBLIC_META_CONFIG_ID || "1095242176288378";

export default function MetaConnect({ locale }: { locale: string }) {
  const ar = locale === "ar";
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;

  const [sdkReady, setSdkReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [assets, setAssets] = useState<MetaAsset[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [draftAssignments, setDraftAssignments] = useState<
    Record<string, string>
  >({});
  const [savingAssetId, setSavingAssetId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const pages = useMemo(
    () => assets.filter((a) => a.asset_type === "facebook_page"),
    [assets]
  );

  const instagramByPage = useMemo(() => {
    const map = new Map<string, MetaAsset>();
    for (const asset of assets) {
      if (
        asset.asset_type === "instagram_account" &&
        asset.parent_external_id
      ) {
        map.set(asset.parent_external_id, asset);
      }
    }
    return map;
  }, [assets]);

  const loadData = async () => {
    try {
      const [connectionResponse, projectsResponse] = await Promise.all([
        fetch("/api/meta/connection", { cache: "no-store" }),
        fetch("/api/meta/projects", { cache: "no-store" }),
      ]);

      const connectionData = await connectionResponse.json();
      const projectsData = await projectsResponse.json();

      if (connectionData.ok) {
        const returnedAssets: MetaAsset[] = connectionData.assets || [];
        setConnected(Boolean(connectionData.connected));
        setAssets(returnedAssets);

        const assignments: Record<string, string> = {};
        for (const asset of returnedAssets) {
          if (asset.asset_type === "facebook_page") {
            assignments[asset.id] = asset.project_id || "";
          }
        }
        setDraftAssignments(assignments);
      }

      if (projectsData.ok) {
        setProjects(projectsData.projects || []);
      }
    } catch {
      setError(
        ar
          ? "تعذر تحميل إعدادات Meta."
          : "Could not load Meta settings."
      );
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!appId) return;

    const initialize = () => {
      if (!window.FB) return;

      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version: "v24.0",
      });

      setSdkReady(true);
    };

    window.fbAsyncInit = initialize;

    if (window.FB) {
      initialize();
      return;
    }

    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.onerror = () =>
        setError(
          ar ? "تعذر تحميل Meta SDK." : "Meta SDK could not be loaded."
        );
      document.body.appendChild(script);
    }
  }, [appId, ar]);

  const saveConnection = async (token: string, expiresIn?: number) => {
    try {
      const response = await fetch("/api/meta/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token, expiresIn }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Connection failed");
      }

      setConnected(true);
      setMessage(
        ar
          ? "تم ربط Meta. اختر الصفحة والمشروع."
          : "Meta connected. Choose a Page and project."
      );

      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setBusy(false);
    }
  };

  const connect = () => {
    setError("");
    setMessage("");

    if (!appId || !sdkReady || !window.FB) {
      setError(ar ? "Meta SDK غير جاهز." : "Meta SDK is not ready.");
      return;
    }

    setBusy(true);

    try {
      window.FB.login(
        (response) => {
          const token = response.authResponse?.accessToken;

          if (!token) {
            setBusy(false);
            setError(
              ar
                ? "لم يكتمل تسجيل الدخول إلى Meta."
                : "Meta login did not complete."
            );
            return;
          }

          void saveConnection(token, response.authResponse?.expiresIn);
        },
        { config_id: CONFIG_ID }
      );
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Meta login failed");
    }
  };

  const assignProject = async (assetId: string) => {
    setSavingAssetId(assetId);
    setError("");
    setMessage("");

    try {
      const projectId = draftAssignments[assetId] || null;

      const response = await fetch("/api/meta/assets/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, projectId }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Could not save assignment");
      }

      setMessage(
        projectId
          ? ar
            ? "تم ربط الصفحة بالمشروع."
            : "Page linked to project."
          : ar
          ? "تم إلغاء ربط الصفحة بالمشروع."
          : "Page assignment removed."
      );

      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save assignment");
    } finally {
      setSavingAssetId(null);
    }
  };

  return (
    <div className="mt-10 rounded-[2rem] border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-metrix-700">
            {ar ? "تكاملات المنصات" : "PLATFORM INTEGRATIONS"}
          </div>

          <h2 className="mt-2 text-2xl font-black">
            {ar ? "ربط Meta" : "Connect Meta"}
          </h2>

          <p className="mt-2 max-w-2xl text-sm text-zinc-500">
            {connected
              ? ar
                ? "اختر صفحة Facebook ثم اربطها بالمشروع الذي تريد تحليله."
                : "Choose a Facebook Page and link it to the project you want to analyze."
              : ar
              ? "اربط حساب Meta للوصول إلى الصفحات التي تديرها."
              : "Connect Meta to access the Pages you manage."}
          </p>
        </div>

        {!connected && (
          <button
            type="button"
            onClick={connect}
            disabled={busy || !sdkReady}
            className="rounded-full bg-metrix-900 px-6 py-3 font-black text-white disabled:opacity-50"
          >
            {busy
              ? ar
                ? "جارٍ الربط..."
                : "Connecting..."
              : ar
              ? "ربط Meta"
              : "Connect Meta"}
          </button>
        )}
      </div>

      {connected && (
        <div className="mt-6 space-y-3">
          {pages.length === 0 && (
            <div className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              {ar
                ? "تم الاتصال بـ Meta، لكن لم يتم العثور على Facebook Pages متاحة."
                : "Meta is connected, but no accessible Facebook Pages were found."}
            </div>
          )}

          {pages.map((page) => {
            const instagram = instagramByPage.get(page.external_id);

            return (
              <div
                key={page.id}
                className="rounded-2xl border border-zinc-200 p-4"
              >
                <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                  <div>
                    <div className="text-xs font-bold uppercase text-zinc-400">
                      Facebook Page
                    </div>
                    <div className="mt-1 font-black text-zinc-900">
                      {page.name || page.external_id}
                    </div>

                    {instagram && (
                      <div className="mt-1 text-sm text-zinc-500">
                        Instagram:{" "}
                        {instagram.username
                          ? `@${instagram.username}`
                          : instagram.name || instagram.external_id}
                      </div>
                    )}
                  </div>

                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-zinc-500">
                      {ar ? "مشروع metriX" : "metriX Project"}
                    </span>

                    <select
                      value={draftAssignments[page.id] || ""}
                      onChange={(e) =>
                        setDraftAssignments((current) => ({
                          ...current,
                          [page.id]: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="">
                        {ar ? "اختر المشروع" : "Select project"}
                      </option>

                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={() => assignProject(page.id)}
                    disabled={savingAssetId === page.id}
                    className="rounded-xl bg-metrix-900 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"
                  >
                    {savingAssetId === page.id
                      ? ar
                        ? "حفظ..."
                        : "Saving..."
                      : ar
                      ? "حفظ"
                      : "Save"}
                  </button>
                </div>

                {page.project_id && (
                  <div className="mt-3 text-xs font-semibold text-emerald-700">
                    {ar ? "✓ الصفحة مرتبطة بمشروع" : "✓ Page assigned to a project"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {message && (
        <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

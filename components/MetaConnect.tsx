"use client";

import { useEffect, useState } from "react";

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
    code?: string;
  };
};

type PageResult = {
  id: string;
  name: string;
  instagram_business_account?: {
    id: string;
    username?: string;
    name?: string;
  } | null;
};

type TestResult = {
  ok: boolean;
  pages?: PageResult[];
  error?: string;
};

const CONFIG_ID =
  process.env.NEXT_PUBLIC_META_CONFIG_ID || "1095242176288378";

export default function MetaConnect({ locale }: { locale: string }) {
  const ar = locale === "ar";
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const [sdkReady, setSdkReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

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
      script.onerror = () => {
        setSdkReady(false);
        setResult({
          ok: false,
          error: ar
            ? "تعذر تحميل Meta JavaScript SDK. تحقق من إعدادات المتصفح ثم أعد المحاولة."
            : "Meta JavaScript SDK could not be loaded. Check browser settings and try again.",
        });
      };
      document.body.appendChild(script);
    }
  }, [appId, ar]);

  const testToken = async (token: string) => {
    try {
      const res = await fetch("/api/meta/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token }),
      });

      const data = (await res.json()) as TestResult;
      setResult(data);
    } catch {
      setResult({
        ok: false,
        error: ar
          ? "تم تسجيل الدخول إلى Meta، لكن تعذر اختبار الاتصال من خادم metriX."
          : "Meta login completed, but metriX could not test the connection from the server.",
      });
    } finally {
      setBusy(false);
    }
  };

  const connect = () => {
    setResult(null);

    if (!appId) {
      setResult({
        ok: false,
        error: ar
          ? "أضف NEXT_PUBLIC_META_APP_ID في Vercel أولاً."
          : "Add NEXT_PUBLIC_META_APP_ID in Vercel first.",
      });
      return;
    }

    if (!sdkReady || !window.FB) {
      setResult({
        ok: false,
        error: ar
          ? "Meta SDK لم يجهز بعد. أعد المحاولة بعد لحظة."
          : "Meta SDK is not ready yet. Try again in a moment.",
      });
      return;
    }

    setBusy(true);

    let callbackReceived = false;

    const timeout = window.setTimeout(() => {
      if (callbackReceived) return;

      setBusy(false);
      setResult({
        ok: false,
        error: ar
          ? `لم يرجع Meta نتيجة خلال 20 ثانية. Configuration ID: ${CONFIG_ID}. اسمح بالنوافذ المنبثقة وجرّب مرة أخرى.`
          : `Meta did not return a login result within 20 seconds. Configuration ID: ${CONFIG_ID}. Allow pop-ups and try again.`,
      });
    }, 20000);

    try {
      window.FB.login(
        (response) => {
          callbackReceived = true;
          window.clearTimeout(timeout);

          const token = response.authResponse?.accessToken;

          if (!token) {
            setBusy(false);
            setResult({
              ok: false,
              error: ar
                ? `لم يكتمل تسجيل الدخول. Meta status: ${
                    response.status || "unknown"
                  }. Configuration ID: ${CONFIG_ID}.`
                : `Login did not complete. Meta status: ${
                    response.status || "unknown"
                  }. Configuration ID: ${CONFIG_ID}.`,
            });
            return;
          }

          void testToken(token);
        },
        {
          config_id: CONFIG_ID,
        }
      );
    } catch (error) {
      callbackReceived = true;
      window.clearTimeout(timeout);
      setBusy(false);

      const message =
        error instanceof Error
          ? error.message
          : "Unknown JavaScript SDK error";

      setResult({
        ok: false,
        error: ar
          ? `فشل استدعاء Meta Login: ${message}`
          : `Meta Login invocation failed: ${message}`,
      });
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

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            {ar
              ? "اربط Facebook Pages وInstagram Professional عبر Facebook Login for Business. هذه النسخة تختبر الاتصال فقط ولا تحفظ Access Token في قاعدة البيانات."
              : "Connect Facebook Pages and Instagram Professional through Facebook Login for Business. This first version tests the connection only and does not store the access token in the database."}
          </p>

          <div className="mt-2 text-xs text-zinc-400">
            {ar ? "معرّف إعداد Meta المستخدم:" : "Meta configuration in use:"}{" "}
            <span className="font-mono">{CONFIG_ID}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={connect}
          disabled={busy || !sdkReady}
          className="rounded-full bg-metrix-900 px-6 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy
            ? ar
              ? "جارٍ الربط..."
              : "Connecting..."
            : ar
            ? "ربط Meta"
            : "Connect Meta"}
        </button>
      </div>

      {!appId && (
        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          {ar
            ? "قبل التجربة أضف NEXT_PUBLIC_META_APP_ID في Vercel ثم أعد النشر."
            : "Before testing, add NEXT_PUBLIC_META_APP_ID in Vercel and redeploy."}
        </div>
      )}

      {result?.error && (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
          {result.error}
        </div>
      )}

      {result?.ok && (
        <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="font-black">
            {ar ? "تم الاتصال بـ Meta بنجاح." : "Meta connection succeeded."}
          </div>

          <div className="mt-3 space-y-2">
            {(result.pages || []).length === 0 ? (
              <div>
                {ar
                  ? "تم تسجيل الدخول، لكن لم ترجع أي Facebook Pages لهذا الحساب."
                  : "Login succeeded, but no Facebook Pages were returned for this account."}
              </div>
            ) : (
              (result.pages || []).map((page) => (
                <div key={page.id} className="rounded-xl bg-white/70 p-3">
                  <b>{page.name}</b>
                  {page.instagram_business_account && (
                    <span className="ms-2 text-zinc-600">
                      Instagram: @
                      {page.instagram_business_account.username ||
                        page.instagram_business_account.id}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./tests/browser',use:{baseURL:'http://127.0.0.1:3100'},
 webServer:{command:'pnpm start --port 3100',url:'http://127.0.0.1:3100/en/login',reuseExistingServer:!process.env.CI,
 env:{NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'test-placeholder',APP_URL:'https://example.test'}},
});

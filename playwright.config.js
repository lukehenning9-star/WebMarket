import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
    testDir: 'tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: 'retain-on-failure',
    },
    projects: [
        { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
        { name: 'mobile', use: { ...devices['Pixel 7'] } },
    ],
    webServer: [
        {
            // The deployed site: only public/ is served, as on Vercel.
            command: `python3 scripts/build.py && python3 -m http.server ${PORT} --bind 127.0.0.1 --directory public`,
            url: `http://localhost:${PORT}/`,
            reuseExistingServer: !process.env.CI,
        },
        {
            // The repo root, for the local-only admin tool in tools/.
            command: 'python3 -m http.server 4174 --bind 127.0.0.1',
            url: 'http://localhost:4174/tools/admin.html',
            reuseExistingServer: !process.env.CI,
        },
    ],
});

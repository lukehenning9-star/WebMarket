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
    webServer: {
        command: `python3 scripts/build.py && python3 -m http.server ${PORT} --directory public`,
        url: `http://localhost:${PORT}/`,
        reuseExistingServer: !process.env.CI,
    },
});

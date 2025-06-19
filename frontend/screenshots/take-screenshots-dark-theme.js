import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pages = [
  { name: 'dashboard', path: '/', title: 'Dashboard' },
  { name: 'call-logs', path: '/call-logs', title: 'Call Logs' },
  { name: 'live-calls', path: '/live-calls', title: 'Live Calls' },
  { name: 'recordings', path: '/recordings', title: 'Recordings' },
  { name: 'make-call', path: '/make-call', title: 'Make Call' },
  { name: 'analytics', path: '/analytics', title: 'Analytics' },
  { name: 'campaigns', path: '/campaigns', title: 'Campaigns' },
  { name: 'contacts', path: '/contacts', title: 'Contacts' },
  { name: 'reports', path: '/reports', title: 'Reports' },
  { name: 'settings', path: '/settings', title: 'Settings' }
];

async function takeScreenshots() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  
  const page = await context.newPage();

  for (const pageInfo of pages) {
    try {
      console.log(`📸 Taking screenshot of ${pageInfo.title} page...`);
      
      await page.goto(`http://localhost:3001${pageInfo.path}`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      // Wait a bit for any animations to complete
      await page.waitForTimeout(2000);
      
      // Take full page screenshot
      await page.screenshot({
        path: path.join(__dirname, `dark-theme-${pageInfo.name}.png`),
        fullPage: true
      });
      
      console.log(`✅ Screenshot saved: dark-theme-${pageInfo.name}.png`);
    } catch (error) {
      console.error(`❌ Error taking screenshot of ${pageInfo.title}:`, error);
    }
  }

  await browser.close();
  console.log('\n🎉 All screenshots taken successfully!');
}

takeScreenshots().catch(console.error);
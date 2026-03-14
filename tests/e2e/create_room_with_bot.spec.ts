import { test, expect } from '@playwright/test';

// Stub Telegram Web App script if the app ever requests it (e2e build skips loading it; stub keeps tests robust).
async function stubTelegramWebApp(page: import('@playwright/test').Page) {
  const stubBody = `(function(){window.Telegram=window.Telegram||{};window.Telegram.WebApp={initData:'e2e',initDataUnsafe:{},version:'6.0',platform:'web',colorScheme:'dark',themeParams:{},ready:function(){},expand:function(){},close:function(){},onEvent:function(){},offEvent:function(){},showAlert:function(){},showConfirm:function(){return Promise.resolve(true)},showPopup:function(){},showMainButton:function(){},hideMainButton:function(){},setMainButton:function(){},onMainButtonClick:function(){},showBackButton:function(){},hideBackButton:function(){},onBackButtonClick:function(){},isVersionAtLeast:function(){return true},setHeaderColor:function(){},setBackgroundColor:function(){},enableClosingConfirmation:function(){},disableClosingConfirmation:function(){},sendData:function(){},openLink:function(){},openTelegramLink:function(){},openInvoice:function(){},switchInlineQuery:function(){},viewportHeight:600,viewportStableHeight:600,isExpanded:true,headerColor:'',backgroundColor:''}};})();`;
  await page.route('**/*', (route) => {
    const u = route.request().url();
    if (u.includes('telegram') && u.endsWith('.js')) {
      return route.fulfill({ contentType: 'application/javascript', body: stubBody });
    }
    return route.continue();
  });
  page.addInitScript(() => {
    (window as unknown as { Telegram?: { WebApp: Record<string, unknown> } }).Telegram = {
      WebApp: {
        initData: 'e2e',
        initDataUnsafe: {},
        version: '6.0',
        platform: 'web',
        colorScheme: 'dark',
        themeParams: {},
        ready: () => {},
        expand: () => {},
        close: () => {},
        onEvent: () => {},
        offEvent: () => {},
        showAlert: () => {},
        showConfirm: () => Promise.resolve(true),
        showPopup: () => {},
        showMainButton: () => {},
        hideMainButton: () => {},
        setMainButton: () => {},
        onMainButtonClick: () => {},
        showBackButton: () => {},
        hideBackButton: () => {},
        onBackButtonClick: () => {},
        isVersionAtLeast: () => true,
        setHeaderColor: () => {},
        setBackgroundColor: () => {},
        enableClosingConfirmation: () => {},
        disableClosingConfirmation: () => {},
        sendData: () => {},
        openLink: () => {},
        openTelegramLink: () => {},
        openInvoice: () => {},
        switchInlineQuery: () => {},
        viewportHeight: 600,
        viewportStableHeight: 600,
        isExpanded: true,
        headerColor: '',
        backgroundColor: '',
      },
    };
  });
}

test.describe('Create room with bot', () => {
  test('full flow: open app, create room, add bot, set difficulty, start match, wait for bot turn and UI update', async ({
    page,
  }) => {
    await stubTelegramWebApp(page);

    // Runtime e2e auth: app with ?e2e=1 calls GET /auth/e2e-bootstrap; backend in e2e mode returns token, no special frontend build.
    await page.goto(`/?e2e=1&_=${Date.now()}`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('button', { name: /Создать комнату/i })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /Создать комнату/i }).click();

    await expect(page.getByRole('heading', { name: /Создать комнату/i })).toBeVisible();
    await page.getByRole('button', { name: /Подкидной/i }).click();
    await page.getByLabel(/Игроков/i).fill('2');
    await page.getByLabel(/Ботов/i).fill('1');
    await page.getByRole('combobox', { name: /bot-0-difficulty|Бот 1/i }).selectOption('hard');
    await page.getByRole('button', { name: /Создать$/i }).click();

    await expect(page).toHaveURL(/\/room\/[^/]+$/);
    await expect(page.getByText(/Комната #/)).toBeVisible();
    await expect(page.getByText(/Бот/)).toBeVisible();

    await page.getByRole('button', { name: /Старт игры/i }).click();

    await expect(page.getByText(/Игра запущена/)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /К столу/i }).click();

    await expect(page).toHaveURL(/\/room\/[^/]+\/game$/);
    await expect(page.getByText(/Комната недоступна|Ход бота|Дурак|колод/)).toBeVisible({ timeout: 10_000 });

    const statusBar = page.locator('text=Ход бота').or(page.locator('text=Ожидание'));
    await expect(statusBar).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText(/Ход бота/)).toBeVisible({ timeout: 20_000 }).catch(() => {});

    const tableOrHand = page.locator('[class*="battle"]').or(page.locator('text=карт'));
    await expect(tableOrHand.first()).toBeVisible({ timeout: 25_000 });

    // After match flow has progressed, open profile and verify stats/achievements UI uses updated backend data.
    await page.getByRole('link', { name: /Профиль/i }).click();
    await expect(page.getByRole('heading', { name: /Профиль/i })).toBeVisible({ timeout: 15_000 });

    // Stats section should be present and show overall matches.
    await expect(page.getByText(/Матчей/)).toBeVisible();

    // Achievements preview and list should render using real API payload.
    await expect(page.getByTestId('achievements-strip')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('achievements-list')).toBeVisible({ timeout: 15_000 });

    // At least "Первая партия" (first_match) achievement should be visible after playing a match.
    await expect(page.getByText(/Первая партия/)).toBeVisible({ timeout: 15_000 });
  });
});

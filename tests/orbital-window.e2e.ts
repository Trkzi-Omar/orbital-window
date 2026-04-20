import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const screenshotDir = path.join(process.cwd(), 'project-assets', 'screenshots');

test('renders the orbital board and captures portfolio screenshots', async ({ page }) => {
	await page.goto('/?query=Casablanca%2C%20Morocco');

	await expect(
		page.getByRole('heading', {
			name: /find the next satellite pass/i
		})
	).toBeVisible();

	await expect(page.getByText('Observation board', { exact: true })).toBeVisible();
	await expect(page.getByText(/compare what is flying overhead/i)).toBeVisible();

	await fs.mkdir(screenshotDir, {
		recursive: true
	});

	await page.screenshot({
		path: path.join(screenshotDir, 'orbital-window-home.png'),
		fullPage: true
	});
});

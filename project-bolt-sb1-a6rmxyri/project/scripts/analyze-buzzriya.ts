import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://buzzriya.com/sozai', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const data = await page.evaluate(() => {
    const sections = Array.from(document.querySelectorAll('main section')).map((section, index) => {
      const heading = section.querySelector('h1, h2, h3');
      const title = heading ? heading.textContent?.trim() : null;
      const videos = Array.from(section.querySelectorAll('video')).length;
      const cards = Array.from(section.querySelectorAll('a, article, div')).filter(el => el.querySelector('video') || el.querySelector('img[alt]')).length;
      const description = section.querySelector('p')?.textContent?.trim();
      return {
        index,
        title,
        videos,
        cards,
        description,
        textSample: section.innerText.slice(0, 200)
      };
    });

    const videoCards = Array.from(document.querySelectorAll('a, article')).filter(el => el.querySelector('video'))
      .map(card => {
        const video = card.querySelector('video');
        const title = card.querySelector('h3, h4, h5, p')?.textContent?.trim();
        const tags = Array.from(card.querySelectorAll('span, button')).map(el => el.textContent?.trim()).filter(Boolean).slice(0,5);
        const src = video?.getAttribute('src') || video?.getAttribute('data-src');
        return { title, tags, src };
      });

    const filters = Array.from(document.querySelectorAll('button, a')).filter(el => el.textContent && /カテゴリ|女性|男性|美容|エンタメ|スポーツ|ダイエット|ビジネス/i.test(el.textContent)).map(el => el.textContent.trim());

    return { sections, videoCards: videoCards.slice(0, 20), filters: Array.from(new Set(filters)) };
  });

  console.log(JSON.stringify(data, null, 2));

  await browser.close();
})();

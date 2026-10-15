// Browser-level regression test for the public NADMO Studio sales funnel.
// Runs ONLY against a static site with all API submissions intercepted.
// No production data is written, and external WhatsApp links are not opened.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = new URL(process.env.QA_BASE_URL || 'http://127.0.0.1:8765/');
const isLocal = ['localhost', '127.0.0.1', '::1'].includes(base.hostname);
if (!isLocal) throw new Error('QA_BASE_URL must be localhost; never run mock forms against production.');
const browser = await chromium.launch({headless:true, args:['--no-sandbox']});
let completed = 0;
const views = [
  {name:'desktop', viewport:{width:1440,height:900}, isMobile:false},
  {name:'mobile', viewport:{width:390,height:844}, isMobile:true}
];
async function open(page, path='/') {
  const response = await page.goto(new URL(path,base).toString(), {waitUntil:'domcontentloaded'});
  assert.equal(response?.status(),200,'Page must return 200');
}
async function openNav(page, mobile) {
  if (mobile) await page.locator('#menuBtn').click();
}
try {
  for (const view of views) {
    const context = await browser.newContext({viewport:view.viewport, isMobile:view.isMobile, hasTouch:view.isMobile, reducedMotion:'reduce'});
    const page = await context.newPage();
    const errors = [];
    let intercepted = 0;
    page.on('pageerror', err => errors.push(err.message));
    await page.route('**/api/event',route => route.fulfill({status:204}));
    await page.route('**/api/start-project', async route => {
      const request = route.request();
      assert.equal(request.method(),'POST');
      const payload = request.postDataJSON();
      assert.ok(payload.name && (payload.phone || payload.email), 'Lead must contain valid contact');
      intercepted += 1;
      await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,code:'QA-MOCK-'+intercepted})});
    });
    try {
      // Business nav must lead to the actual pricing section, not a generic services section.
      await open(page);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://nadmo.id/');
      assert.equal((await page.locator('.floating-contact').getAttribute('href'))?.startsWith('https://wa.me/'),true);
      assert.equal(await page.locator('#business-portfolio .personal-sample').count()>=2,true);
      const body = await page.locator('body').innerText();
      assert.ok(!/KAI\s+(?:TRADE|KASINO)/i.test(body),'Retired products must not appear publicly');
      await openNav(page,view.isMobile);
      await page.locator('#navMenu a[href="#pricing"]').click();
      assert.equal(new URL(page.url()).hash,'#pricing');
      const business = page.locator('#pricing .price-card').filter({has:page.locator('h3', {hasText:'Business Website'})});
      assert.equal(await business.count(),1,'Business Website must have a unique pricing card');
      await business.locator('a[href*="checkout.html"]').click();
      assert.equal(new URL(page.url()).pathname,'/checkout.html');
      assert.equal(await page.locator('#summaryName').innerText(),'Business Website');
      assert.equal(await page.locator('#selectedService').inputValue(),'Business Website');
      assert.match(await page.locator('#summaryPrice').innerText(),/7\.500\.000/);
      assert.equal(await page.locator('a[href^="https://wa.me/"]').count()>0,true,'Checkout admin contact must exist');

      // Form test: all calls are mocked, never forwarded to CRM or notification providers.
      await page.locator('#checkoutForm input[name="name"]').fill('NADMO QA TEST');
      await page.locator('#checkoutForm input[name="phone"]').fill('+6200000000');
      await page.locator('#checkoutForm textarea[name="notes"]').fill('Automated mock test: no CRM entry.');
      await page.locator('#checkoutSubmit').click();
      await page.locator('#checkoutStatus').getByText('QA-MOCK-1',{exact:false}).waitFor();
      assert.equal(intercepted,1,'One order should create exactly one mocked request');

      // Personal Branding stays separate from Business Website.
      await open(page);
      await openNav(page,view.isMobile);
      await page.locator('#navMenu a[href="#personal-branding"]').click();
      assert.equal(new URL(page.url()).hash,'#personal-branding');
      await page.locator('#personal-branding a.package-order-link').first().click();
      assert.equal(new URL(page.url()).pathname,'/checkout.html');
      assert.equal(await page.locator('#summaryName').innerText(),'Personal Branding Starter');
      assert.match(await page.locator('#summaryPrice').innerText(),/799\.000/);
      assert.deepEqual(errors,[],'No JavaScript page errors');
      console.log('PASS '+view.name+': nav -> pricing -> checkout -> mock lead; Personal Branding -> checkout');
      completed++;
    } catch (err) {
      console.error('FAIL '+view.name+': '+err.stack);
      throw err;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
assert.equal(completed,views.length);
console.log('PASS: '+completed+' viewports; zero production submissions.');

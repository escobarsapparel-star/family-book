import { chromium } from "playwright";
import fs from "node:fs";

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1600,height:1000}});
const page=await context.newPage();
page.setDefaultTimeout(5000);

const log=[];
page.on("console",msg=>{
  if(["warning","error"].includes(msg.type())) log.push(`console:${msg.type()}: ${msg.text()}`);
});
page.on("pageerror",err=>log.push(`pageerror: ${err.message}`));

async function responsive(label){
  const started=Date.now();
  await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,100)));
  const elapsed=Date.now()-started;
  console.log(`RESPONSIVE ${label}: ${elapsed}ms`);
  if(elapsed>2500)throw new Error(`Main thread responsiveness failed at ${label}: ${elapsed}ms`);
}

try{
  await page.goto("http://127.0.0.1:4173/demo/",{waitUntil:"domcontentloaded",timeout:30000});
  await page.waitForSelector(".desktop-top-nav");
  await responsive("home");

  const visualTheme=await page.getAttribute("html","data-fb-visual-theme");
  console.log("VISUAL_THEME",visualTheme);
  if(visualTheme!=="midnight-aurora")throw new Error(`Expected midnight-aurora, got ${visualTheme}`);

  await page.locator('[data-desktop-route="tree"]').click();
  await page.waitForSelector(".coordinate-tree-page");
  await responsive("tree-loaded");

  await page.locator("#topProfileButton").click();
  await page.waitForSelector("#profilePopover:not([hidden])");
  await responsive("profile-popover");

  await page.locator('#profilePopover [data-profile-route="settings"]').click();
  await page.waitForSelector(".settings-page");
  await responsive("settings-loaded");

  await page.waitForSelector("#settingsVisualThemes");
  await responsive("settings-theme-card");

  await page.screenshot({path:"midnight-preview-qa.png",fullPage:true});
  console.log("QA_PASS");
}catch(err){
  console.error("QA_FAIL",err?.stack||err);
  try{await page.screenshot({path:"midnight-preview-qa-failure.png",fullPage:true,timeout:3000})}catch(_){}
  fs.writeFileSync("midnight-preview-browser.log",log.join("\n")+"\n");
  await browser.close();
  process.exit(1);
}

fs.writeFileSync("midnight-preview-browser.log",log.join("\n")+"\n");
await browser.close();

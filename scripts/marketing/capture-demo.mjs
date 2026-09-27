import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const out=path.join(root,"marketing","screenshots");
const videoOut=path.join(root,"marketing","video");
fs.mkdirSync(out,{recursive:true});
fs.mkdirSync(videoOut,{recursive:true});

const base="http://127.0.0.1:4173/demo/";

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function ready(page){
  await page.goto(base,{waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForSelector("#screen",{timeout:60000});
  await page.waitForFunction(()=>!!document.querySelector(".topbar"),null,{timeout:60000});
  await page.evaluate(async()=>{try{await document.fonts.ready}catch(_){}});
  await sleep(1400);
  await page.evaluate(()=>{
    document.querySelector(".fb-demo-badge")?.remove();
    document.querySelector("#androidInstallSplash")?.remove();
    document.body.classList.remove("android-release-open");
  });
}

async function go(page,route,wait=1100){
  await page.evaluate(r=>{ window.scrollTo(0,0); if(typeof window.go==="function") window.go(r); },route);
  await sleep(wait);
  await page.evaluate(()=>window.scrollTo(0,0));
  await sleep(250);
}

async function shot(page,name){
  await page.screenshot({path:path.join(out,name),fullPage:false});
}

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
await ready(page);

await go(page,"home");
await shot(page,"01-dashboard-navigation.png");

const wall=page.locator(".family-wall-panel").first();
if(await wall.count()){
  await wall.scrollIntoViewIfNeeded();
  await sleep(350);
}
await shot(page,"02-family-wall.png");

await go(page,"members");
await shot(page,"03-family-profiles.png");

await go(page,"tree",1400);
await shot(page,"04-family-tree.png");

await go(page,"memories",1500);
await page.waitForSelector(".memory-card",{timeout:15000}).catch(()=>{});
await shot(page,"05-memories.png");

const firstMemoryId=await page.locator(".memory-card").first().getAttribute("data-r").catch(()=>"");
if(firstMemoryId){
  await page.evaluate(r=>{ if(typeof window.go==="function") window.go(r); },firstMemoryId);
  await sleep(900);
  await page.evaluate(()=>window.scrollTo(0,0));
}
await shot(page,"06-memory-detail.png");

await go(page,"calendar",1200);
await shot(page,"07-calendar.png");

await go(page,"family-fun",900);
await shot(page,"08-family-fun.png");

await page.evaluate(()=>{
  const panel=document.querySelector("#funCameraPanel");
  if(panel){
    panel.hidden=false;
    panel.removeAttribute("hidden");
    panel.style.display="";
    panel.classList.add("fun-camera-fullscreen");
    document.documentElement.classList.add("fun-camera-open");
    document.body.classList.add("fun-camera-open");
  }
});
await sleep(400);
await shot(page,"09-family-camera.png");

await page.evaluate(()=>{
  document.documentElement.classList.remove("fun-camera-open");
  document.body.classList.remove("fun-camera-open");
});
await go(page,"profile",900);
await shot(page,"10-profile.png");

await page.close();

const ctx=await browser.newContext({
  viewport:{width:1920,height:1080},
  recordVideo:{dir:videoOut,size:{width:1920,height:1080}}
});
const tour=await ctx.newPage();
await ready(tour);
const hold=async(route,ms=3800)=>{
  await go(tour,route,900);
  await sleep(ms);
};
await hold("home",4200);
const tourWall=tour.locator(".family-wall-panel").first();
if(await tourWall.count()){await tourWall.scrollIntoViewIfNeeded();await sleep(3800)}
await hold("members",3400);
await hold("tree",4000);
await hold("memories",3800);
await hold("calendar",3800);
await hold("family-fun",3400);
await tour.evaluate(()=>{
  const panel=document.querySelector("#funCameraPanel");
  if(panel){
    panel.hidden=false;panel.removeAttribute("hidden");panel.style.display="";
    panel.classList.add("fun-camera-fullscreen");
    document.documentElement.classList.add("fun-camera-open");
    document.body.classList.add("fun-camera-open");
  }
});
await sleep(4200);
await ctx.close();

const videos=fs.readdirSync(videoOut).filter(f=>f.endsWith(".webm")).sort((a,b)=>fs.statSync(path.join(videoOut,b)).mtimeMs-fs.statSync(path.join(videoOut,a)).mtimeMs);
if(videos[0]){
  fs.renameSync(path.join(videoOut,videos[0]),path.join(videoOut,"FamilyBook-Demo-Navigation.webm"));
}
await browser.close();

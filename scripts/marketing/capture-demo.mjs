import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const out=path.join(root,"marketing","screenshots");
fs.mkdirSync(out,{recursive:true});
const base="http://127.0.0.1:4173/demo/";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
page.setDefaultTimeout(5000);

async function clean(){
  await page.evaluate(()=>{
    document.querySelector(".fb-demo-badge")?.remove();
    document.querySelector("#androidInstallSplash")?.remove();
    document.body.classList.remove("android-release-open");
  }).catch(()=>{});
}
async function shot(name){
  await clean();
  await page.screenshot({path:path.join(out,name),fullPage:false});
  console.log("captured",name);
}
async function route(routeName,name,wait=900){
  console.log("route",routeName);
  await page.evaluate(r=>{window.scrollTo(0,0); if(typeof window.go==="function") window.go(r);},routeName).catch(()=>{});
  await sleep(wait);
  await page.evaluate(()=>window.scrollTo(0,0)).catch(()=>{});
  await shot(name);
}

console.log("open demo");
await page.goto(base,{waitUntil:"domcontentloaded",timeout:30000});
await page.waitForSelector("#screen",{timeout:30000});
await page.waitForFunction(()=>!!document.querySelector(".topbar"),null,{timeout:30000});
await page.evaluate(async()=>{try{await document.fonts.ready}catch(_){}}).catch(()=>{});
await sleep(900);

await route("home","01-dashboard-navigation.png",1000);

console.log("family wall");
const wall=page.locator(".family-wall-panel").first();
if(await wall.count().catch(()=>0)){
  await wall.scrollIntoViewIfNeeded().catch(()=>{});
  await sleep(300);
}
await shot("02-family-wall.png");

await route("members","03-family-profiles.png",900);
await route("tree","04-family-tree.png",1200);
await route("memories","05-memories.png",1200);

console.log("memory detail");
let memoryRoute="";
try{
  memoryRoute=await page.locator(".memory-card").first().getAttribute("data-r",{timeout:3000})||"";
}catch(_){}
if(memoryRoute){
  await page.evaluate(r=>{if(typeof window.go==="function")window.go(r)},memoryRoute).catch(()=>{});
  await sleep(700);
}
await page.evaluate(()=>window.scrollTo(0,0)).catch(()=>{});
await shot("06-memory-detail.png");

await route("calendar","07-calendar.png",1000);
await route("family-fun","08-family-fun.png",800);

console.log("family camera");
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
}).catch(()=>{});
await sleep(300);
await shot("09-family-camera.png");
await page.evaluate(()=>{
  document.documentElement.classList.remove("fun-camera-open");
  document.body.classList.remove("fun-camera-open");
}).catch(()=>{});

await route("profile","10-profile.png",800);
await browser.close();
console.log("FamilyBook marketing screenshots captured.");

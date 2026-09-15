(()=>{
  if(window.__fbWeatherLocationLabel)return;
  window.__fbWeatherLocationLabel=true;

  function condition(code){
    const c=Number(code);
    if(c===0)return "Clear sky";
    if([1,2,3].includes(c))return "Partly cloudy";
    if([45,48].includes(c))return "Foggy";
    if([51,53,55,56,57].includes(c))return "Drizzle";
    if([61,63,65,66,67,80,81,82].includes(c))return "Rain";
    if([71,73,75,77,85,86].includes(c))return "Snow";
    if([95,96,99].includes(c))return "Thunderstorms";
    return "Current conditions";
  }

  function placeLabel(data){
    const city=String(data?.city||data?.locality||data?.principalSubdivision||"").trim();
    const region=String(data?.principalSubdivision||"").trim();
    const country=String(data?.countryName||"").trim();
    const parts=[];
    [city,region].forEach(v=>{if(v&&!parts.some(x=>x.toLowerCase()===v.toLowerCase()))parts.push(v)});
    if(!parts.length&&country)parts.push(country);
    return parts.join(", ")||"Your location";
  }

  async function reversePlace(lat,lng){
    const url=`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&localityLanguage=en`;
    const res=await fetch(url,{headers:{Accept:"application/json"}});
    if(!res.ok)throw new Error("Place lookup failed");
    return placeLabel(await res.json());
  }

  function ensureLocationLine(){
    const copy=document.querySelector("#desktopWeatherWidget .desktop-weather-copy");
    if(!copy)return null;
    let el=copy.querySelector("#desktopWeatherLocation");
    if(!el){
      el=document.createElement("small");
      el.id="desktopWeatherLocation";
      el.className="desktop-weather-location";
      const conditionEl=copy.querySelector("#desktopWeatherText");
      copy.insertBefore(el,conditionEl||null);
    }
    return el;
  }

  function runWeather(ev){
    ev?.preventDefault?.();
    ev?.stopImmediatePropagation?.();
    const btn=document.querySelector("#desktopWeatherButton");
    const temp=document.querySelector("#desktopWeatherTemp");
    const text=document.querySelector("#desktopWeatherText");
    const location=ensureLocationLine();
    if(!navigator.geolocation){if(text)text.textContent="Location is unavailable in this browser.";return}
    if(btn){btn.disabled=true;btn.textContent="Getting weather…"}
    if(location)location.textContent="Finding your location…";

    navigator.geolocation.getCurrentPosition(async pos=>{
      const lat=pos.coords.latitude,lng=pos.coords.longitude;
      try{
        const weatherUrl=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&current=temperature_2m,weather_code&timezone=auto`;
        const [weatherResult,placeResult]=await Promise.allSettled([
          fetch(weatherUrl,{headers:{Accept:"application/json"}}).then(async r=>{if(!r.ok)throw new Error();return r.json()}),
          reversePlace(lat,lng)
        ]);

        if(weatherResult.status!=="fulfilled")throw new Error("Weather failed");
        const cur=weatherResult.value?.current||{};
        if(temp)temp.textContent=Number.isFinite(Number(cur.temperature_2m))?`${Math.round(Number(cur.temperature_2m))}°C`:"Weather";
        if(text)text.textContent=condition(cur.weather_code);
        if(location)location.textContent=placeResult.status==="fulfilled"?placeResult.value:"Your location";
        if(btn)btn.textContent="Refresh weather";
      }catch(_){
        if(text)text.textContent="Could not load weather right now.";
        if(location&&!location.textContent)location.textContent="Your location";
        if(btn)btn.textContent="Try again";
      }finally{
        if(btn)btn.disabled=false;
      }
    },()=>{
      if(text)text.textContent="Location permission was not granted.";
      if(location)location.textContent="";
      if(btn){btn.disabled=false;btn.textContent="Show local weather"}
    },{enableHighAccuracy:false,timeout:9000,maximumAge:600000});
  }

  function bind(){
    const btn=document.querySelector("#desktopWeatherButton");
    if(!btn||btn.dataset.weatherLocationBound==="1")return;
    btn.dataset.weatherLocationBound="1";
    btn.addEventListener("click",runWeather,true);
  }

  const root=document.getElementById("app");
  const observer=new MutationObserver(()=>bind());
  if(root)observer.observe(root,{childList:true,subtree:true});
  bind();
})();
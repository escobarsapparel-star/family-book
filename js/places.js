(()=>{
  let loadPromise=null;

  function cfg(){return window.FB_CONFIG||{}}
  function apiKey(){return String(cfg().googleMapsApiKey||"").trim()}
  function region(){return String(cfg().googleMapsRegion||"").trim().toLowerCase()}

  function loadGoogle(){
    if(window.google?.maps?.importLibrary)return Promise.resolve(window.google);
    if(loadPromise)return loadPromise;
    const key=apiKey();
    if(!key)return Promise.resolve(null);

    loadPromise=new Promise((resolve,reject)=>{
      const cb=`fbMapsReady_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
      window[cb]=()=>{
        delete window[cb];
        resolve(window.google||null);
      };
      const s=document.createElement("script");
      s.async=true;s.defer=true;
      s.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&libraries=places&callback=${encodeURIComponent(cb)}`;
      s.onerror=()=>{
        delete window[cb];
        reject(new Error("Google Maps could not be loaded."));
      };
      document.head.appendChild(s);
    });
    return loadPromise;
  }

  function latLngValue(location){
    if(!location)return {lat:null,lng:null};
    const lat=typeof location.lat==="function"?location.lat():location.lat;
    const lng=typeof location.lng==="function"?location.lng():location.lng;
    return {
      lat:Number.isFinite(Number(lat))?Number(lat):null,
      lng:Number.isFinite(Number(lng))?Number(lng):null
    };
  }

  function ensureSelectedLabel(wrap,input){
    let label=wrap.querySelector(".fb-place-selected");
    if(!label){
      label=document.createElement("div");
      label.className="fb-place-selected";
      wrap.appendChild(label);
    }
    label.textContent=input.value?`Selected: ${input.value}`:"";
    label.hidden=!input.value;
    return label;
  }

  async function attach(input,{latInput=null,lngInput=null,onSelect=null,label="Search address or place"}={}){
    if(!input||input.dataset.fbPlacesAttached==="1")return false;
    input.dataset.fbPlacesAttached="1";

    const key=apiKey();
    if(!key){
      input.dataset.placeMode="manual";
      return false;
    }

    try{
      await loadGoogle();
      const {PlaceAutocompleteElement}=await google.maps.importLibrary("places");

      const originalType=input.type||"text";
      const wrap=document.createElement("div");
      wrap.className="fb-place-wrap";
      input.parentNode.insertBefore(wrap,input);
      wrap.appendChild(input);

      const pac=new PlaceAutocompleteElement();
      pac.className="fb-place-autocomplete";
      pac.placeholder=input.value?input.value:(input.placeholder||label);

      const reg=region();
      if(reg){
        try{pac.includedRegionCodes=[reg]}catch(_){}
      }

      input.type="hidden";
      input.dataset.placeMode="google";
      wrap.insertBefore(pac,input);

      const selected=ensureSelectedLabel(wrap,input);

      const toggle=document.createElement("button");
      toggle.type="button";
      toggle.className="fb-place-manual-toggle";
      toggle.textContent="Type address manually";
      wrap.appendChild(toggle);

      let manual=false;
      toggle.onclick=()=>{
        manual=!manual;
        if(manual){
          pac.hidden=true;
          input.type=originalType==="hidden"?"text":originalType;
          input.classList.add("fb-place-manual-input");
          toggle.textContent="Use address suggestions";
          input.focus();
        }else{
          input.type="hidden";
          input.classList.remove("fb-place-manual-input");
          pac.hidden=false;
          pac.placeholder=input.value||input.placeholder||label;
          toggle.textContent="Type address manually";
        }
        ensureSelectedLabel(wrap,input);
      };

      input.addEventListener("input",()=>{
        if(latInput)latInput.value="";
        if(lngInput)lngInput.value="";
        ensureSelectedLabel(wrap,input);
        onSelect?.({
          address:input.value.trim(),
          name:input.value.trim(),
          lat:null,lng:null,placeId:null,manual:true
        });
      });

      pac.addEventListener("gmp-select",async({placePrediction})=>{
        try{
          const place=placePrediction.toPlace();
          await place.fetchFields({fields:["id","displayName","formattedAddress","location"]});
          const ll=latLngValue(place.location);
          const address=place.formattedAddress||place.displayName||"";
          input.value=address;
          if(latInput)latInput.value=ll.lat==null?"":String(ll.lat);
          if(lngInput)lngInput.value=ll.lng==null?"":String(ll.lng);
          ensureSelectedLabel(wrap,input);
          onSelect?.({
            address,
            name:place.displayName||address,
            lat:ll.lat,lng:ll.lng,placeId:place.id||null,manual:false
          });
        }catch(err){
          console.warn("Family Book place selection failed:",err);
        }
      });

      return true;
    }catch(err){
      console.warn("Family Book Google Places unavailable:",err);
      input.dataset.placeMode="manual";
      return false;
    }
  }

  function isConfigured(){return !!apiKey()}

  window.FB_PLACES={attach,isConfigured,loadGoogle};
})();
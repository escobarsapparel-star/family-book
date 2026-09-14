(()=>{
  let urls=[];
  function e(v=""){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
  function user(){return window.FB_AUTH?.get?.()||{}}
  function familyKey(){return window.FB_AUTH?.familyStorageKey?.()||String(user().family||"family").toLowerCase().replace(/[^a-z0-9]+/g,"_")}
  function key(){return `fb_albums_${familyKey()}`}
  function cleanup(){urls.forEach(u=>{try{URL.revokeObjectURL(u)}catch(_){}});urls=[]}
  function blobUrl(blob){if(!blob)return "";if(typeof blob==="string")return blob;try{const u=URL.createObjectURL(blob);urls.push(u);return u}catch(_){return ""}}
  function getAll(){
    try{const v=JSON.parse(localStorage.getItem(key())||"[]");return Array.isArray(v)?v.sort((a,b)=>(Number(b.updatedAt)||0)-(Number(a.updatedAt)||0)):[]}
    catch(_){return []}
  }
  function getOne(id){return getAll().find(a=>a.id===id)||null}
  function write(list){localStorage.setItem(key(),JSON.stringify(list||[]))}
  function save(album){
    const all=getAll(),now=Date.now(),id=album.id||`alb_${now}_${Math.random().toString(36).slice(2,7)}`;
    const prev=all.find(a=>a.id===id);
    const row={id,name:String(album.name||"Untitled album").trim().slice(0,80),description:String(album.description||"").trim().slice(0,300),memoryIds:[...new Set((album.memoryIds||[]).filter(Boolean))],createdAt:prev?.createdAt||now,updatedAt:now};
    const next=[row,...all.filter(a=>a.id!==id)];write(next);return row;
  }
  function remove(id){write(getAll().filter(a=>a.id!==id))}
  function idsForMemory(memoryId){return getAll().filter(a=>(a.memoryIds||[]).includes(memoryId)).map(a=>a.id)}
  function countForMemory(memoryId){return idsForMemory(memoryId).length}
  function pageShell(){
    return `<section class="albums-page"><div class="albums-head"><div><p class="eyebrow">${e((window.familyLabel?.()||"Family").toUpperCase())}</p><h1>Family Albums</h1><p>Group existing Memories into collections without duplicating the photos.</p></div><div class="albums-head-actions"><button class="secondary" data-r="memories"><i data-lucide="images"></i>Memories</button><button class="primary" data-r="new-album"><i data-lucide="folder-plus"></i>New album</button></div></div><div id="albumLibrary" class="album-loading">Loading albums…</div></section>`;
  }
  function editorShell(id=""){
    return `<section class="album-editor-page" data-album-editor-id="${e(id)}"><button class="back-link" data-r="albums"><i data-lucide="arrow-left"></i>Back to albums</button><div id="albumEditorMount" class="album-loading">Opening album editor…</div></section>`;
  }
  function detailShell(id){
    return `<section class="album-detail-page" data-album-detail-id="${e(id)}"><button class="back-link" data-r="albums"><i data-lucide="arrow-left"></i>Back to albums</button><div id="albumDetailMount" class="album-loading">Opening album…</div></section>`;
  }
  async function coverData(album,byId,limit=4){
    const out=[];
    for(const id of (album.memoryIds||[])){
      const m=byId[id];if(!m)continue;
      const p=window.FB_MEMORIES?.getPhotos?.(m)?.[0];
      if(p){const u=blobUrl(p.thumb||p.image);if(u)out.push({url:u,caption:m.caption||"Family memory"})}
      if(out.length>=limit)break;
    }
    return out;
  }
  function collageHtml(photos){
    if(!photos.length)return `<span class="album-empty-cover"><i data-lucide="images"></i></span>`;
    return `<span class="album-collage count-${Math.min(photos.length,4)}">${photos.map(p=>`<img src="${p.url}" alt="${e(p.caption)}">`).join("")}</span>`;
  }
  async function mountLibrary(){
    cleanup();const mount=document.querySelector('#albumLibrary');if(!mount)return;
    const albums=getAll(),memories=await window.FB_MEMORIES.getAll(),byId=Object.fromEntries(memories.map(m=>[m.id,m]));
    if(!albums.length){mount.className='album-empty-state';mount.innerHTML=`<i data-lucide="folder-heart"></i><h2>Create your first family album</h2><p>Collect existing Memories into albums such as holidays, birthdays, weddings or old family photos.</p><button class="primary" data-r="new-album"><i data-lucide="folder-plus"></i>Create album</button>`;bindRoutes();window.icons?.();return}
    const cards=[];
    for(const a of albums){
      const photos=await coverData(a,byId,4),valid=(a.memoryIds||[]).filter(id=>byId[id]).length;
      cards.push(`<button class="album-card" data-r="album:${e(a.id)}"><span class="album-card-cover">${collageHtml(photos)}</span><span class="album-card-copy"><strong>${e(a.name)}</strong><small>${valid} ${valid===1?'memory':'memories'}</small>${a.description?`<span>${e(a.description)}</span>`:''}</span></button>`)
    }
    mount.className='album-grid';mount.innerHTML=cards.join('');bindRoutes();window.icons?.();
  }
  async function mountEditor(id=""){
    cleanup();const mount=document.querySelector('#albumEditorMount');if(!mount)return;
    const existing=id?getOne(id):null,memories=await window.FB_MEMORIES.getAll(),selected=new Set(existing?.memoryIds||[]);
    mount.className='album-editor-card';
    mount.innerHTML=`<div class="album-editor-heading"><p class="eyebrow">${existing?'EDIT ALBUM':'NEW ALBUM'}</p><h1>${existing?'Update family album':'Create family album'}</h1><p>Albums reference your saved Memories. Photos are not duplicated.</p></div><form id="albumForm"><label class="field"><span>Album name</span><input id="albumName" maxlength="80" required placeholder="e.g. Christmas 2026" value="${e(existing?.name||'')}"></label><label class="field"><span>Description <small>optional</small></span><textarea id="albumDescription" maxlength="300" rows="3" placeholder="What is this album about?">${e(existing?.description||'')}</textarea></label><div class="album-picker-head"><div><strong>Choose Memories</strong><small id="albumSelectedCount">${selected.size} selected</small></div><label class="album-picker-search"><i data-lucide="search"></i><input id="albumMemorySearch" type="search" placeholder="Search Memories…"></label></div><div class="album-memory-picker" id="albumMemoryPicker"></div><div class="album-form-actions"><button type="button" class="secondary" data-r="albums">Cancel</button><button type="submit" class="primary"><i data-lucide="check"></i>${existing?'Save changes':'Create album'}</button></div></form>`;
    const picker=mount.querySelector('#albumMemoryPicker'),search=mount.querySelector('#albumMemorySearch'),count=mount.querySelector('#albumSelectedCount');
    function renderPicker(){
      cleanup();const q=(search?.value||'').trim().toLowerCase(),rows=memories.filter(m=>!q||`${m.caption||''} ${m.date||''}`.toLowerCase().includes(q));
      if(!rows.length){picker.innerHTML=`<div class="album-picker-empty"><i data-lucide="image-off"></i><span>${memories.length?'No Memories match your search.':'Add some Memories first.'}</span></div>`;window.icons?.();return}
      picker.innerHTML=rows.map(m=>{const p=window.FB_MEMORIES.getPhotos(m)?.[0],u=p?blobUrl(p.thumb||p.image):'';return `<label class="album-memory-choice"><input type="checkbox" value="${e(m.id)}" ${selected.has(m.id)?'checked':''}><span class="album-memory-thumb ${p?.kind==="video"?"has-video":""}">${u?`<img src="${u}" alt="">`:`<i data-lucide="image"></i>`}${p?.kind==="video"?`<b><i data-lucide="play"></i></b>`:""}</span><span class="album-memory-choice-copy"><strong>${e(m.caption||'Family memory')}</strong><small>${e(m.date||'Date unknown')}</small></span><i class="album-choice-check" data-lucide="check"></i></label>`}).join('');
      picker.querySelectorAll('input[type="checkbox"]').forEach(box=>box.onchange=()=>{box.checked?selected.add(box.value):selected.delete(box.value);if(count)count.textContent=`${selected.size} selected`});window.icons?.();
    }
    search?.addEventListener('input',renderPicker);renderPicker();bindRoutes();window.icons?.();
    mount.querySelector('#albumForm').onsubmit=ev=>{ev.preventDefault();const name=mount.querySelector('#albumName').value.trim();if(!name){mount.querySelector('#albumName').focus();return}const row=save({id:existing?.id,name,description:mount.querySelector('#albumDescription').value,memoryIds:[...selected]});window.go?.(`album:${row.id}`)};
  }
  async function mountDetail(id){
    cleanup();const mount=document.querySelector('#albumDetailMount');if(!mount)return;const album=getOne(id);
    if(!album){mount.className='album-empty-state';mount.innerHTML=`<i data-lucide="folder-x"></i><h2>Album not found</h2><button class="secondary" data-r="albums">Back to albums</button>`;bindRoutes();window.icons?.();return}
    const all=await window.FB_MEMORIES.getAll(),byId=Object.fromEntries(all.map(m=>[m.id,m])),memories=(album.memoryIds||[]).map(mid=>byId[mid]).filter(Boolean);
    const cover=await coverData(album,byId,4);
    mount.className='album-detail-card';
    mount.innerHTML=`<div class="album-detail-hero">${collageHtml(cover)}<div class="album-detail-overlay"><p class="eyebrow">FAMILY ALBUM</p><h1>${e(album.name)}</h1><p>${e(album.description||`${memories.length} ${memories.length===1?'memory':'memories'} in this album`)}</p></div></div><div class="album-detail-toolbar"><span><i data-lucide="images"></i>${memories.length} ${memories.length===1?'memory':'memories'}</span><div><button class="secondary" data-r="edit-album:${e(album.id)}"><i data-lucide="pencil"></i>Edit album</button><button class="album-delete" id="deleteAlbum"><i data-lucide="trash-2"></i>Delete</button></div></div><div id="albumMemoryGrid" class="album-memory-grid"></div>`;
    const grid=mount.querySelector('#albumMemoryGrid');
    if(!memories.length)grid.innerHTML=`<div class="album-detail-empty"><i data-lucide="images"></i><h2>This album is empty</h2><p>Edit the album and choose Memories to add.</p><button class="primary" data-r="edit-album:${e(album.id)}">Add Memories</button></div>`;
    else grid.innerHTML=memories.map(m=>{const p=window.FB_MEMORIES.getPhotos(m)?.[0],u=p?blobUrl(p.thumb||p.image):'';return `<button class="album-memory-card" data-r="view-memory:${e(m.id)}"><span class="${p?.kind==="video"?"has-video":""}">${u?`<img src="${u}" alt="${e(m.caption||'Family memory')}">`:`<i data-lucide="image"></i>`}${p?.kind==="video"?`<b><i data-lucide="play"></i></b>`:""}</span><strong>${e(m.caption||'Family memory')}</strong><small>${e(m.date||'Date unknown')}</small></button>`}).join('');
    bindRoutes();window.icons?.();mount.querySelector('#deleteAlbum').onclick=()=>{if(!confirm(`Delete the album “${album.name}”? The Memories themselves will not be deleted.`))return;remove(album.id);window.go?.('albums')};
  }
  function bindRoutes(){document.querySelectorAll('#screen [data-r]').forEach(b=>b.onclick=()=>window.go?.(b.dataset.r))}
  async function bindRoute(r){if(r==='albums')return mountLibrary();if(r==='new-album')return mountEditor('');if(r.startsWith('edit-album:'))return mountEditor(r.split(':')[1]);if(r.startsWith('album:'))return mountDetail(r.split(':')[1])}
  window.FB_ALBUMS={pageShell,editorShell,detailShell,bindRoute,getAll,getOne,save,remove,idsForMemory,countForMemory};
})();
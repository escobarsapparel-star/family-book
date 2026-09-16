(()=>{
 const sb=()=>window.FB_SUPABASE?.client;
 async function load(){
   const page=document.querySelector('.member-profile-view:not(.history-profile-view):not(.account-profile-view)');
   const cover=page?.querySelector('[data-basic-cover]');
   const edit=page?.querySelector('[data-edit-member]');
   if(!page||!cover||!edit)return;
   const id=edit.dataset.editMember;if(!id||cover.dataset.loadedFor===id)return;cover.dataset.loadedFor=id;
   try{
     const {data,error}=await sb().from('person_covers').select('storage_path,position_x,position_y').eq('person_id',id).maybeSingle();
     if(error)throw error;
     if(!data?.storage_path)return;
     const url=await window.FB_MEDIA.getSignedUrl(data.storage_path,7200);
     if(!url)return;
     cover.innerHTML='';
     const img=document.createElement('img');img.src=url;img.alt='Cover photo';img.style.objectPosition=`${Number(data.position_x)||50}% ${Number(data.position_y)||50}%`;cover.appendChild(img);
   }catch(err){console.warn('Basic member cover:',err)}
 }
 document.addEventListener('click',()=>setTimeout(load,20));
 window.addEventListener('load',()=>setTimeout(load,100));
 window.addEventListener('familybook:basic-member-profile-ready',load);
 window.addEventListener('familybook:family-data-updated',()=>setTimeout(load,50));
})();
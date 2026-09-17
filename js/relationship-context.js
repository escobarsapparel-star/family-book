(()=>{
  if(window.__fbRelationshipContextInstalled)return;
  window.__fbRelationshipContextInstalled=true;

  const LEGACY={
    father_of:'parent_of',mother_of:'parent_of',son_of:'child_of',daughter_of:'child_of',
    husband_of:'spouse_of',wife_of:'spouse_of',partner_of:'spouse_of',
    brother_of:'sibling_of',sister_of:'sibling_of',
    grandfather_of:'grandparent_of',grandmother_of:'grandparent_of',
    grandson_of:'grandchild_of',granddaughter_of:'grandchild_of'
  };

  const GENERIC={
    spouse:'Spouse',parent:'Parent',child:'Child',sibling:'Sibling',
    grandparent:'Grandparent',grandchild:'Grandchild',family:'Family member'
  };
  const MALE={
    spouse:'Husband',parent:'Father',child:'Son',sibling:'Brother',
    grandparent:'Grandfather',grandchild:'Grandson',family:'Family member'
  };
  const FEMALE={
    spouse:'Wife',parent:'Mother',child:'Daughter',sibling:'Sister',
    grandparent:'Grandmother',grandchild:'Granddaughter',family:'Family member'
  };

  function people(){
    try{return window.FB_FAMILY_DATA?.getPeople?.()||[]}catch(_){return []}
  }
  function relationships(){
    try{return (window.FB_FAMILY_DATA?.getRelationships?.()||[]).map(r=>({...r,type:LEGACY[r.type]||r.type}))}catch(_){return []}
  }
  function viewerId(){return String(window.FB_AUTH?.get?.()?.memberId||'owner')}
  function norm(v){return String(v||'').trim().toLowerCase().replace(/\s+/g,' ')}
  function sexFor(id){
    const direct=window.FB_PERSON_SEX?.get?.(id);
    if(direct==='male'||direct==='female')return direct;
    const person=people().find(p=>String(p.id)===String(id));
    return person?.sex==='male'||person?.sex==='female'?person.sex:'';
  }

  function parentGraph(){
    const parentsOf={};
    relationships().forEach(r=>{
      const from=String(r.from||''),to=String(r.to||'');
      if(!from||!to)return;
      if(r.type==='parent_of') (parentsOf[to]??=[]).push(from);
      else if(r.type==='child_of') (parentsOf[from]??=[]).push(to);
    });
    Object.keys(parentsOf).forEach(k=>parentsOf[k]=[...new Set(parentsOf[k])]);
    return parentsOf;
  }

  function directKind(viewer,target){
    for(const r of relationships()){
      const from=String(r.from||''),to=String(r.to||''),type=r.type;
      if(from===viewer&&to===target){
        if(type==='spouse_of')return 'spouse';
        if(type==='parent_of')return 'child';
        if(type==='child_of')return 'parent';
        if(type==='sibling_of')return 'sibling';
        if(type==='grandparent_of')return 'grandchild';
        if(type==='grandchild_of')return 'grandparent';
      }
      if(from===target&&to===viewer){
        if(type==='spouse_of')return 'spouse';
        if(type==='parent_of')return 'parent';
        if(type==='child_of')return 'child';
        if(type==='sibling_of')return 'sibling';
        if(type==='grandparent_of')return 'grandparent';
        if(type==='grandchild_of')return 'grandchild';
      }
    }
    return '';
  }

  function derivedKind(viewer,target){
    const parentsOf=parentGraph();
    const viewerParents=parentsOf[viewer]||[];
    const targetParents=parentsOf[target]||[];

    if(targetParents.includes(viewer))return 'child';
    if(viewerParents.includes(target))return 'parent';
    if(viewerParents.some(id=>targetParents.includes(id)))return 'sibling';
    if(viewerParents.some(parent=>(parentsOf[parent]||[]).includes(target)))return 'grandparent';
    if(targetParents.some(parent=>(parentsOf[parent]||[]).includes(viewer)))return 'grandchild';
    return '';
  }

  function kindFor(targetId,fromViewer=viewerId()){
    const viewer=String(fromViewer||''),target=String(targetId||'');
    if(!viewer||!target)return 'family';
    if(viewer===target)return 'self';
    return directKind(viewer,target)||derivedKind(viewer,target)||'family';
  }

  function labelFor(targetId,fromViewer=viewerId()){
    const kind=kindFor(targetId,fromViewer);
    if(kind==='self')return '';
    const sex=sexFor(targetId);
    if(sex==='male')return MALE[kind]||GENERIC[kind]||GENERIC.family;
    if(sex==='female')return FEMALE[kind]||GENERIC[kind]||GENERIC.family;
    return GENERIC[kind]||GENERIC.family;
  }

  function sentenceLabel(targetId,fromViewer=viewerId()){
    const label=labelFor(targetId,fromViewer);
    return label?label.toLowerCase():'';
  }

  function personByName(name){
    const wanted=norm(name);
    if(!wanted)return null;
    return people().find(p=>norm(p.name)===wanted)||null;
  }

  function mentionedPerson(text){
    const hay=norm(text);
    if(!hay)return null;
    const me=viewerId();
    return people()
      .filter(p=>String(p.id)!==me&&norm(p.name)&&hay.includes(norm(p.name)))
      .sort((a,b)=>norm(b.name).length-norm(a.name).length)[0]||null;
  }

  function decorateNotificationItem(item){
    if(!item)return item;
    const person=item.actorId?people().find(p=>String(p.id)===String(item.actorId)):mentionedPerson(`${item.title||''} ${item.text||''}`);
    if(!person)return {...item,__fbRelationshipDecorated:true};
    const relation=labelFor(person.id);
    if(!relation)return {...item,__fbRelationshipDecorated:true};

    const original=String(item.originalRelationshipText??item.text||'');
    const name=String(person.name||'').trim();
    let text=original;
    if(name&&norm(original).startsWith(norm(name))){
      text=`Your ${relation.toLowerCase()} ${original}`;
    }else if(original){
      text=`${relation} · ${original}`;
    }else{
      text=relation;
    }
    return {...item,text,originalRelationshipText:original,relationship:relation,actorId:String(person.id),__fbRelationshipDecorated:true};
  }

  function decorateWall(root=document){
    root.querySelectorAll?.('.wall-post-head').forEach(head=>{
      const strong=head.querySelector('strong');
      if(!strong)return;
      const person=personByName(strong.textContent);
      const existing=head.querySelector('.wall-relationship-badge');
      if(!person||String(person.id)===viewerId()){
        existing?.remove();
        return;
      }
      const relation=labelFor(person.id);
      if(!relation){existing?.remove();return}
      const badge=existing||document.createElement('small');
      badge.className='wall-relationship-badge';
      badge.textContent=relation;
      badge.title=`Relationship to you: ${relation}`;
      if(!existing)strong.insertAdjacentElement('afterend',badge);
    });
  }

  function wrapNotifications(){
    const data=window.FB_NOTIFICATION_DATA;
    if(!data||data.__fbRelationshipWrapped||typeof data.getAll!=='function')return;
    const original=data.getAll.bind(data);
    data.getAll=()=>original().map(decorateNotificationItem);
    data.__fbRelationshipWrapped=true;
  }

  function wrapBrowserNotifications(){
    const proto=window.ServiceWorkerRegistration?.prototype;
    if(!proto||proto.__fbRelationshipWrapped||typeof proto.showNotification!=='function')return;
    const original=proto.showNotification;
    proto.showNotification=function(title,options={}){
      try{
        const item=decorateNotificationItem({title,text:options?.body||''});
        return original.call(this,title,{...options,body:item.text||options?.body||''});
      }catch(_){return original.call(this,title,options)}
    };
    proto.__fbRelationshipWrapped=true;
  }

  let scheduled=false;
  function scheduleDecorate(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      wrapNotifications();
      decorateWall(document);
    });
  }

  const app=document.getElementById('app');
  if(app)new MutationObserver(scheduleDecorate).observe(app,{childList:true,subtree:true});
  window.addEventListener('familybook:family-data-updated',scheduleDecorate);
  window.addEventListener('familybook:notifications-changed',scheduleDecorate);
  window.addEventListener('familybook:person-sex-updated',scheduleDecorate);

  window.FB_RELATIONSHIP_CONTEXT={
    kindFor,labelFor,sentenceLabel,personByName,decorateNotificationItem,decorateWall
  };

  wrapNotifications();
  wrapBrowserNotifications();
  scheduleDecorate();
})();

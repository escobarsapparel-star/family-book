/* Family Book Guest Demo
   Uses the real Family Book UI while replacing authentication and family reads with safe fictional data.
   Loaded only by the demo build/route. */
(function(){
  const DEMO_USER={backend:'demo',needsSetup:false,supabaseUserId:'demo-user',email:'guest@familybook.demo',name:'Daniel Williams',family:'Williams Family',familyId:'demo-williams-family',memberId:'demo-daniel',membershipId:'demo-membership',role:'admin',photo:''};
  const members=[
    {id:'demo-robert',first:'Robert',last:'Williams',firstName:'Robert',surname:'Williams',gender:'Male',sex:'Male',relation:'Grandfather',dob:'1954-03-18'},
    {id:'demo-grace',first:'Grace',last:'Williams',firstName:'Grace',surname:'Williams',gender:'Female',sex:'Female',relation:'Grandmother',dob:'1957-08-09'},
    {id:'demo-daniel',first:'Daniel',last:'Williams',firstName:'Daniel',surname:'Williams',gender:'Male',sex:'Male',relation:'Father',dob:'1984-05-11'},
    {id:'demo-sarah',first:'Sarah',last:'Williams',firstName:'Sarah',surname:'Williams',gender:'Female',sex:'Female',relation:'Mother',dob:'1986-11-02'},
    {id:'demo-olivia',first:'Olivia',last:'Williams',firstName:'Olivia',surname:'Williams',gender:'Female',sex:'Female',relation:'Aunt',dob:'1988-02-22'},
    {id:'demo-ethan',first:'Ethan',last:'Williams',firstName:'Ethan',surname:'Williams',gender:'Male',sex:'Male',relation:'Son',dob:'2012-07-14'},
    {id:'demo-mia',first:'Mia',last:'Williams',firstName:'Mia',surname:'Williams',gender:'Female',sex:'Female',relation:'Daughter',dob:'2016-10-12'}
  ];
  const relationships=[
    {type:'spouse',a:'demo-robert',b:'demo-grace',marriageDate:'1978-09-28'},
    {type:'spouse',a:'demo-daniel',b:'demo-sarah',marriageDate:'2009-11-21'},
    {type:'parent',parent:'demo-robert',child:'demo-daniel'},{type:'parent',parent:'demo-grace',child:'demo-daniel'},
    {type:'parent',parent:'demo-robert',child:'demo-olivia'},{type:'parent',parent:'demo-grace',child:'demo-olivia'},
    {type:'parent',parent:'demo-daniel',child:'demo-ethan'},{type:'parent',parent:'demo-sarah',child:'demo-ethan'},
    {type:'parent',parent:'demo-daniel',child:'demo-mia'},{type:'parent',parent:'demo-sarah',child:'demo-mia'}
  ];
  window.FB_DEMO_MODE=true;
  window.FB_DEMO={user:DEMO_USER,members,relationships};
  // Replace auth before the application bootstraps. No Supabase session is created.
  window.FB_AUTH={
    init:async()=>DEMO_USER,refresh:async()=>DEMO_USER,get:()=>DEMO_USER,isAuthenticated:()=>true,
    update:patch=>Object.assign(DEMO_USER,patch||{}),logout:async()=>{location.href='../'},familyStorageKey:()=> 'demo_williams_family',
    signInWithPassword:async()=>DEMO_USER,signInWithGoogle:async()=>DEMO_USER,signUp:async()=>({current:DEMO_USER}),
    pendingInvite:()=>'',renderSetup:()=>{}
  };
  // Seed the legacy/static data consumed by several production renderers.
  window.FB_DATA={
    family:'Williams Family',
    memories:[['Beach Day','Williams family'],['Old family album','Three generations'],['Sunday together','Family memory']],
    events:[['04','OCT','Family Braai','Family event'],['12','OCT',"Mia's Birthday",'Birthday'],['21','NOV','Daniel & Sarah Anniversary','Anniversary']],
    people:['Daniel','Sarah','Ethan','Mia','Robert','Grace','Olivia']
  };
  // A demo family-data adapter. The real production UI can call reload/get without reaching Supabase.
  window.FB_FAMILY_DATA={
    reload:async()=>({members,relationships}),get:()=>({members,relationships}),members:()=>members,relationships:()=>relationships,
    save:async()=>({demo:true}),remove:async()=>({demo:true})
  };
  document.documentElement.dataset.demoMode='true';
})();
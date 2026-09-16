(()=>{
  function enhance(){
    const page=document.querySelector('.member-profile-view:not(.history-profile-view):not(.account-profile-view)');
    const card=page?.querySelector('.profile-view-card');
    if(!card||card.dataset.socialProfileReady==='1')return;
    const details=card.querySelector('.profile-details');
    const activity=card.querySelector('.member-activity-card');
    if(!details||!activity)return;
    card.dataset.socialProfileReady='1';

    const title=document.createElement('h2');
    title.className='fb-member-about-title';
    title.textContent='About';
    details.before(title);

    const tabs=document.createElement('div');
    tabs.className='fb-member-profile-tabs';
    tabs.setAttribute('role','tablist');
    tabs.innerHTML='<button type="button" class="active" data-member-tab="overview">Overview</button><button type="button" data-member-tab="activity">Memories & activity</button>';
    title.before(tabs);

    const activityHead=activity.querySelector('.member-activity-head');
    if(activityHead){
      const label=activityHead.querySelector('h2');
      if(label)label.textContent='Recent memories & activity';
    }

    function select(tab){
      tabs.querySelectorAll('[data-member-tab]').forEach(b=>b.classList.toggle('active',b.dataset.memberTab===tab));
      const activityOnly=tab==='activity';
      title.classList.toggle('fb-member-tab-hidden',activityOnly);
      details.classList.toggle('fb-member-tab-hidden',activityOnly);
      activity.classList.remove('fb-member-tab-hidden');
      if(!activityOnly){
        const posts=activity.querySelectorAll('.wall-post');
        posts.forEach((post,i)=>post.classList.toggle('fb-member-tab-hidden',i>1));
      }else{
        activity.querySelectorAll('.wall-post').forEach(post=>post.classList.remove('fb-member-tab-hidden'));
      }
    }
    tabs.addEventListener('click',e=>{const b=e.target.closest('[data-member-tab]');if(b)select(b.dataset.memberTab)});
    select('overview');
  }

  // Route rendering is synchronous. Enhance after Family Book navigation clicks settle.
  document.addEventListener('click',()=>setTimeout(enhance,0));
  window.addEventListener('load',()=>setTimeout(enhance,0));
})();

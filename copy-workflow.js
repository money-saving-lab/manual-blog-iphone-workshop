'use strict';
// 순서 계산은 원문/사진 내용을 변경하지 않는다.
function copyWorkflowPlan(post, photos) {
  let prepared;
  try{prepared=JSON.parse(post.copy_plan||'null');}catch{}
  if(prepared?.version===1&&prepared.body===String(post.body||'')&&Array.isArray(prepared.items)){
    const byId=new Map(photos.map(i=>[i.id,i]));
    const joined=prepared.items.filter(i=>i.kind==='text').map(i=>i.text).join('\n\n');
    const photoIds=prepared.items.filter(i=>i.kind==='photo').map(i=>i.image_id);
    const valid=joined===String(post.body||'').trim()&&prepared.items.every(i=>i.kind==='text'?typeof i.text==='string'&&!!i.text.trim():i.kind==='photo'&&byId.has(i.image_id))&&new Set(photoIds).size===photoIds.length&&photos.every(i=>photoIds.includes(i.id));
    if(valid){let textNumber=0,photoNumber=0;return [{key:'title',kind:'title',text:post.title||''},...prepared.items.map(i=>i.kind==='text'?{key:'text:'+textNumber++,kind:'text',text:i.text}:{key:'photo:'+i.image_id,kind:'photo',image:byId.get(i.image_id),number:++photoNumber})];}
  }
  const paragraphs=String(post.body||'').split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean);
  const blocks=[];
  for(let n=0;n<paragraphs.length;n++){
    const p=paragraphs[n];
    if(/^#{2,3} /.test(p)&&n+1<paragraphs.length&&!/^#{2,3} /.test(paragraphs[n+1]))blocks.push(p+'\n\n'+paragraphs[++n]);
    else blocks.push(p);
  }
  const plan=[{key:'title',kind:'title',text:post.title||''}];
  let nextPhoto=0;
  function addPhoto(n){const image=photos[n];plan.push({key:'photo:'+image.id,kind:'photo',image,number:n+1});}
  blocks.forEach((text,n)=>{
    plan.push({key:'text:'+n,kind:'text',text});
    while(nextPhoto<photos.length&&Math.ceil((nextPhoto+1)*blocks.length/(photos.length+1))<=n+1)addPhoto(nextPhoto++);
  });
  while(nextPhoto<photos.length)addPhoto(nextPhoto++);
  return plan;
}
function copyWorkflowHtml(text,seed=''){
  const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let hash=0;for(const c of String(seed))hash=(hash*31+c.charCodeAt(0))>>>0;
  const styles=[['#17634b','sans-serif',24],['#243d79','serif',26],['#71408b','sans-serif',25],['#995031','serif',24]];
  const [color,font,size]=styles[hash%styles.length];
  return text.split(/\n\s*\n/).map(p=>p.startsWith('### ')?'<h3 style="font-size:'+(size-4)+'px;line-height:1.8;color:'+color+';font-family:'+font+';font-weight:700">'+esc(p.slice(4))+'</h3>':p.startsWith('## ')?'<h2 style="font-size:'+size+'px;line-height:1.8;color:'+color+';font-family:'+font+';font-weight:700">'+esc(p.slice(3))+'</h2>':'<p style="font-size:15px;line-height:1.8;margin-bottom:18px">'+esc(p).replaceAll('\n','<br>')+'</p>').join('');
}
if(typeof module!=='undefined')module.exports={copyWorkflowPlan,copyWorkflowHtml};

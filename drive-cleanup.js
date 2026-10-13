(function(root){
 'use strict';
 function valid(c,account,ids){
  return !!c&&c.schema==='manual-blog-cleanup/v1'&&c.account_id===account&&
   /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,200}\/exec$/.test(c.endpoint||'')&&
   /^[A-Za-z0-9_-]{10,150}$/.test(c.file_id||'')&&/^[a-f0-9]{64}$/.test(c.token||'')&&
   Array.isArray(c.task_ids)&&c.task_ids.length===5&&new Set(c.task_ids).size===5&&
   ids.length===5&&ids.every(id=>c.task_ids.includes(id));
 }
 function post(batch,receipts){
  const payload=JSON.stringify({schema:'manual-blog-receipt/v1',file_id:batch.file_id,account_id:batch.account_id,token:batch.token,receipts});
  if(root.NativeBridge){
   if(!root.NativeBridge.cleanupDrive) return Promise.reject(Error('자동정리를 지원하는 새 앱으로 업데이트해 주세요.'));
   return new Promise((resolve,reject)=>{const id=crypto.randomUUID();const timer=setTimeout(()=>{delete nativeJobs[id];reject(Error('연결 지연'));},30000);nativeJobs[id]={resolve,reject,timer};root.NativeBridge.cleanupDrive(batch.endpoint,payload,id);});
  }
  return new Promise((resolve,reject)=>{
   const nonce=crypto.randomUUID(),frame=document.createElement('iframe'),form=document.createElement('form');
   frame.name='cleanup-'+nonce;frame.hidden=true;form.hidden=true;form.method='POST';form.action=batch.endpoint;form.target=frame.name;
   const finish=(error,result)=>{clearTimeout(timer);root.removeEventListener('message',listener);form.remove();frame.remove();error?reject(error):resolve(result);};
   const listener=event=>{
    let origin;try{origin=new URL(event.origin);}catch{return;}
    if(origin.protocol!=='https:'||!(origin.hostname==='script.googleusercontent.com'||origin.hostname.endsWith('-script.googleusercontent.com')))return;
    const data=event.data;if(data?.type!=='manual-blog-cleanup/v1'||data.nonce!==nonce)return;
    if(!data.result?.ok||data.result.file_id!==batch.file_id){finish(Error('Drive 정리 요청이 확인되지 않았습니다.'));return;}
    finish(null,data.result);
   };
   const timer=setTimeout(()=>finish(Error('Drive 연결 지연 · 발행 기록은 기기에 보관됩니다.')),30000);
   root.addEventListener('message',listener);
   for(const [name,value] of Object.entries({payload,nonce})){const input=document.createElement('input');input.type='hidden';input.name=name;input.value=value;form.append(input);}
   document.body.append(frame,form);form.submit();
  });
 }
 const nativeJobs={};
 root.manualBlogCleanupResult=(id,value)=>{const job=nativeJobs[id];if(!job)return;delete nativeJobs[id];clearTimeout(job.timer);try{const result=JSON.parse(value);result.ok?job.resolve(result):job.reject(Error('Drive 정리 실패'));}catch{job.reject(Error('Drive 응답 확인 실패'));}};
 let running=false,retry;
 function status(text){const element=document.getElementById('cleanupStatus');if(element)element.textContent=text;}
 async function sync(){
  if(running||!root.offlineCleanupJobs)return;running=true;clearTimeout(retry);
  try{
   const jobs=await root.offlineCleanupJobs();
   for(const job of jobs){
    if(!job.receipts.length||job.trashed)continue;
    status('발행 기록 전송 중 · 5편 완료 후 Drive 파일 자동 정리');
    const result=await post(job,job.receipts);
    if(!Number.isInteger(result.completed)||result.completed<0||result.completed>5||result.file_id!==job.file_id||result.trashed&&result.completed!==5)throw Error('Drive 정리 결과를 확인할 수 없습니다.');
    await root.offlineCleanupAck(job.account_id,job.file_id,result);
    status(result.trashed?'5편 발행 완료 · Drive 전달 파일을 휴지통으로 옮겼어요. 앱 원고·사진은 보관됩니다.':`발행 기록 ${result.completed}/5편 확인 · 5편 모두 완료하면 자동 정리됩니다.`);
   }
  }catch(e){status('Drive 자동정리 대기 · '+e.message);retry=setTimeout(sync,60000);}
  finally{running=false;}
 }
 root.DriveCleanup={valid,sync,post};root.addEventListener('online',sync);
 document.addEventListener('DOMContentLoaded',()=>{sync();});
})(window);

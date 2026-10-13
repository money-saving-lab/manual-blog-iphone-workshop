/* All clipboard representations are local. Source photos are never uploaded. */
(function(root){
 'use strict';
 const pending=new Map();
 function png(source){
  if(pending.has(source))return pending.get(source);
  const job=new Promise((resolve,reject)=>{
   const image=new Image();image.onload=()=>{
    const width=image.naturalWidth,height=image.naturalHeight;
    if(!width||!height||width*height>40000000){reject(Error('사진 크기를 확인하세요.'));return;}
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d');if(!context){reject(Error('사진 복사를 준비할 수 없습니다.'));return;}
    context.drawImage(image,0,0);canvas.toBlob(blob=>blob?resolve(blob):reject(Error('사진 변환에 실패했습니다.')),'image/png');
   };image.onerror=()=>reject(Error('사진을 읽을 수 없습니다.'));image.src=source;
  });
  // Keep only a few current photos. The source and original pixels remain intact.
  if(pending.size>=3)pending.delete(pending.keys().next().value);pending.set(source,job);
  job.catch(()=>{pending.delete(source);});return job;
 }
 function copy(source){
  if(!navigator.clipboard?.write||!root.ClipboardItem)throw Error('이 환경에서는 사진 복사를 지원하지 않습니다. Safari에서 작업실을 열어 주세요.');
  // write MUST happen during the click; Safari accepts asynchronous PNG data.
  return navigator.clipboard.write([new root.ClipboardItem({'image/png':png(source)})]);
 }
 root.PhotoClipboard={prepare:png,copy};
})(window);

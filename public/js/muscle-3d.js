// Interactive 3D muscle atlas for Training Journal.
// Model: Free Muscle / Z-Anatomy, CC BY-SA 4.0. Keep attribution visible.
const MODEL_URL='https://cdn.jsdelivr.net/gh/tiralonghipol/free-muscles@main/public/anatomy.glb';
const DRACO_URL='https://cdn.jsdelivr.net/gh/tiralonghipol/free-muscles@main/public/draco/';
let THREE_PROMISE;
async function threeModules(){
 if(!THREE_PROMISE)THREE_PROMISE=Promise.all([
  import('https://esm.sh/three@0.170.0'),
  import('https://esm.sh/three@0.170.0/examples/jsm/loaders/GLTFLoader.js')
 ]);
 return THREE_PROMISE;
}
export async function mountMuscle3D(host,{loads={},onStatus=()=>{},onSelect=()=>{}}={}){
 let renderer,observer,removalObserver,disposed=false,scene,camera,body,raf=0,dragging=false,lastX=0,dragStartX=0,dragMoved=false,selectedMuscle=null,THREE_REF,raycaster,pointer,cameraTarget,initialCameraPosition,cameraMotion=null;
 const pointers=new Map();let pinchDistance=0,lastPinchMidpoint=null;
 const animateCameraTo=(position,target,duration=720)=>{if(!camera||!cameraTarget)return;cameraMotion={fromPosition:camera.position.clone(),toPosition:position.clone(),fromTarget:cameraTarget.clone(),toTarget:target.clone(),started:performance.now(),duration};};
 const updateCameraMotion=()=>{if(!cameraMotion||!camera||!cameraTarget)return;const t=Math.min(1,(performance.now()-cameraMotion.started)/cameraMotion.duration),eased=1-Math.pow(1-t,3);camera.position.lerpVectors(cameraMotion.fromPosition,cameraMotion.toPosition,eased);cameraTarget.lerpVectors(cameraMotion.fromTarget,cameraMotion.toTarget,eased);camera.lookAt(cameraTarget);if(t>=1)cameraMotion=null;};
 const focusOnMuscle=obj=>{if(!obj||!camera||!cameraTarget||!THREE_REF)return;body.updateMatrixWorld(true);const bounds=new THREE_REF.Box3().setFromObject(obj),sphere=bounds.getBoundingSphere(new THREE_REF.Sphere()),target=sphere.center.clone();const direction=camera.position.clone().sub(cameraTarget).normalize();const distance=Math.max(2.15,Math.min(4.2,sphere.radius*4.2));animateCameraTo(target.clone().add(direction.multiplyScalar(distance)),target,760);};
 const zoomAt=(clientX,clientY,amount)=>{cameraMotion=null;if(!camera||!raycaster||!pointer||!cameraTarget||!body)return;const rect=renderer.domElement.getBoundingClientRect();pointer.x=((clientX-rect.left)/rect.width)*2-1;pointer.y=-((clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);let focus=raycaster.intersectObject(body,true)[0]?.point;if(!focus){const plane=new THREE_REF.Plane(new THREE_REF.Vector3(0,0,1),0);focus=raycaster.ray.intersectPlane(plane,new THREE_REF.Vector3())}if(!focus)return;amount=Math.max(-.28,Math.min(.28,amount));const nextPosition=camera.position.clone().lerp(focus,amount),nextTarget=cameraTarget.clone().lerp(focus,amount);const offset=nextPosition.clone().sub(nextTarget),distance=offset.length(),clamped=Math.max(2.0,Math.min(14,distance));if(distance>0)nextPosition.copy(nextTarget).add(offset.multiplyScalar(clamped/distance));camera.position.copy(nextPosition);cameraTarget.copy(nextTarget);camera.lookAt(cameraTarget)};
 const zoomBy=delta=>{if(!camera||!renderer)return;const rect=renderer.domElement.getBoundingClientRect();zoomAt(rect.left+rect.width/2,rect.top+rect.height/2,delta<0?.12:-.12)};
 const setStatus=text=>{if(!disposed)onStatus(text)};
 const clearSelectedMuscle=()=>{if(selectedMuscle){const mat=selectedMuscle.material,base=selectedMuscle.userData.tjBaseColor;if(mat?.color&&base)mat.color.copy(base);if(mat?.emissive)mat.emissive.setHex(0x16b9b3);if(mat)mat.emissiveIntensity=selectedMuscle.userData.tjBaseEmissive??.025;selectedMuscle=null}};
 const reset=()=>{if(body)body.rotation.y=0;if(camera&&initialCameraPosition)animateCameraTo(initialCameraPosition,new THREE_REF.Vector3(0,-.08,0),650);clearSelectedMuscle()};
 const cleanup=()=>{if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer?.disconnect();removalObserver?.disconnect();if(body)body.traverse(obj=>{obj.geometry?.dispose();if(Array.isArray(obj.material))obj.material.forEach(x=>x.dispose());else obj.material?.dispose()});renderer?.dispose();renderer?.domElement.remove();window.removeEventListener('muscle3d:reset',reset);window.removeEventListener('muscle3d:zoom',onZoom)};
 window.addEventListener('muscle3d:reset',reset);
 const onZoom=event=>zoomBy(Number(event.detail?.delta)||0);window.addEventListener('muscle3d:zoom',onZoom);
 try{
  const [THREE,{GLTFLoader}]=await threeModules();if(disposed)return;
  THREE_REF=THREE;scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.set(0,0,8.5);cameraTarget=new THREE.Vector3(0,-.08,0);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.domElement.className='muscle-3d-canvas';renderer.domElement.setAttribute('aria-label','3D-модель мышц. Перетаскивайте для вращения.');
  host.insertBefore(renderer.domElement,host.firstChild);
  scene.add(new THREE.HemisphereLight(0xe8f5f5,0x39464a,2));
  const key=new THREE.DirectionalLight(0xffffff,3.1);key.position.set(3,5,6);scene.add(key);
  const fill=new THREE.DirectionalLight(0x8ce4e2,1.25);fill.position.set(-4,1,-4);scene.add(fill);
  const loader=new GLTFLoader();
  const {DRACOLoader}=await import('https://esm.sh/three@0.170.0/examples/jsm/loaders/DRACOLoader.js');
  const draco=new DRACOLoader();draco.setDecoderPath(DRACO_URL);loader.setDRACOLoader(draco);
  setStatus('Загружаем анатомическую модель…');
  const gltf=await loader.loadAsync(MODEL_URL);draco.dispose();if(disposed)return;
  body=gltf.scene;
  body.traverse(obj=>{
   if(!obj.isMesh)return;
   const meta=obj.userData||{},isMuscle=meta.kind==='muscle';obj.userData.tjMuscle=isMuscle;
   if(isMuscle){
    const group=String(meta.group||'').toLowerCase(),count=Math.max(0,Number(loads[group])||0),maxLoad=Math.max(1,...Object.values(loads).map(value=>Math.max(0,Number(value)||0))),intensity=count>0?Math.pow(count/maxLoad,.72):0;
    const stops=[new THREE.Color(0x16b9b3),new THREE.Color(0xf0d64e),new THREE.Color(0xf28a38),new THREE.Color(0xe34b4b)];
    const neutral=new THREE.Color(0x9da7aa);let color=neutral.clone();
    if(intensity>0){const scaled=intensity*3,index=Math.min(2,Math.floor(scaled)),blend=Math.min(1,scaled-index);color.copy(stops[index]).lerp(stops[index+1],blend);}
    const emissive=color.clone();obj.material=new THREE.MeshStandardMaterial({color,roughness:.52,metalness:.22,emissive,emissiveIntensity:.018+intensity*.12});
   }else obj.material=new THREE.MeshStandardMaterial({color:0x667276,roughness:.82,metalness:.12,transparent:true,opacity:.18});
   obj.material.side=THREE.DoubleSide;
   if(isMuscle){obj.userData.tjBaseColor=obj.material.color.clone();obj.userData.tjBaseEmissive=obj.material.emissiveIntensity;}
  });
  const box=new THREE.Box3().setFromObject(body),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  body.position.sub(center);body.scale.setScalar(2.55/Math.max(size.x,size.y,size.z));body.position.y-=.42;scene.add(body);
  body.updateMatrixWorld(true);
  const fittedBox=new THREE.Box3().setFromObject(body),sphere=fittedBox.getBoundingSphere(new THREE.Sphere());
  camera.position.set(0,0,sphere.radius/Math.sin(THREE.MathUtils.degToRad(camera.fov/2))*1.08);initialCameraPosition=camera.position.clone();camera.lookAt(cameraTarget);
  raycaster=new THREE.Raycaster();pointer=new THREE.Vector2();
  renderer.domElement.addEventListener('pointerdown',event=>{cameraMotion=null;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(pointers.size===1){dragging=true;lastX=event.clientX;dragStartX=event.clientX;dragMoved=false}else if(pointers.size===2){dragging=false;const pts=[...pointers.values()];pinchDistance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);lastPinchMidpoint={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};dragMoved=true}renderer.domElement.setPointerCapture?.(event.pointerId)});
  renderer.domElement.addEventListener('pointermove',event=>{if(!pointers.has(event.pointerId))return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(pointers.size>=2){const pts=[...pointers.values()],distance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),mid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};if(lastPinchMidpoint&&camera&&cameraTarget){camera.updateMatrixWorld(true);const right=new THREE_REF.Vector3().setFromMatrixColumn(camera.matrix,0),up=new THREE_REF.Vector3().setFromMatrixColumn(camera.matrix,1),scale=camera.position.distanceTo(cameraTarget)*.0018,shift=right.clone().multiplyScalar(-(mid.x-lastPinchMidpoint.x)*scale).add(up.multiplyScalar((mid.y-lastPinchMidpoint.y)*scale));camera.position.add(shift);cameraTarget.add(shift);camera.lookAt(cameraTarget)}if(pinchDistance&&distance){zoomAt(mid.x,mid.y,1-pinchDistance/distance)}pinchDistance=distance;lastPinchMidpoint=mid;dragMoved=true;return}if(dragging){if(Math.abs(event.clientX-dragStartX)>5)dragMoved=true;body.rotation.y+=(event.clientX-lastX)*.008;lastX=event.clientX}});
  const endDrag=event=>{if(event?.pointerId!=null)pointers.delete(event.pointerId);dragging=false;pinchDistance=0;lastPinchMidpoint=null};renderer.domElement.addEventListener('pointerup',endDrag);renderer.domElement.addEventListener('pointercancel',endDrag);renderer.domElement.addEventListener('lostpointercapture',endDrag);
  renderer.domElement.addEventListener('wheel',event=>{event.preventDefault();zoomAt(event.clientX,event.clientY,event.deltaY>0?-.14:.14)},{passive:false});
  renderer.domElement.addEventListener('click',event=>{
   if(dragMoved){dragMoved=false;return}
   const rect=renderer.domElement.getBoundingClientRect();pointer.x=((event.clientX-rect.left)/rect.width)*2-1;pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;
   raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObject(body,true).find(x=>x.object.userData.tjMuscle);
   if(hit){clearSelectedMuscle();selectedMuscle=hit.object;selectedMuscle.material.color.set(0x62f3df);selectedMuscle.material.emissive.set(0x20d9c9);selectedMuscle.material.emissiveIntensity=.62;focusOnMuscle(selectedMuscle);const m=hit.object.userData||{};onSelect({label:m.label||hit.object.name,group:String(m.group||'').toLowerCase(),side:m.side||''})}
  });
  const resize=()=>{if(!renderer||disposed)return;const w=Math.max(1,host.clientWidth),h=Math.max(420,Math.min(680,w*.95));camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)};
  observer=new ResizeObserver(resize);observer.observe(host);resize();
  removalObserver=new MutationObserver(()=>{if(!host.isConnected)cleanup()});removalObserver.observe(document.body,{childList:true,subtree:true});
  const animate=()=>{if(disposed)return;raf=requestAnimationFrame(animate);updateCameraMotion();renderer.render(scene,camera)};animate();
  setStatus('');
 }catch(error){setStatus('Ошибка загрузки 3D-модели');console.error('Muscle 3D:',error)}
 return cleanup;
}

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
 let renderer,observer,removalObserver,disposed=false,scene,camera,body,raf=0,dragging=false,lastX=0,dragStartX=0,dragMoved=false,selectedMuscle=null;
 const pointers=new Map();let pinchDistance=0,initialCameraZ=8.5;const minCameraZ=3.2,maxCameraZ=18;
 const zoomBy=delta=>{if(!camera)return;camera.position.z=Math.max(minCameraZ,Math.min(maxCameraZ,camera.position.z+delta))};
 const setStatus=text=>{if(!disposed)onStatus(text)};
 const clearSelectedMuscle=()=>{if(selectedMuscle){const mat=selectedMuscle.material,base=selectedMuscle.userData.tjBaseColor;if(mat?.color&&base)mat.color.copy(base);if(mat?.emissive)mat.emissive.setHex(0x16b9b3);if(mat)mat.emissiveIntensity=selectedMuscle.userData.tjBaseEmissive??.025;selectedMuscle=null}};
 const reset=()=>{if(body)body.rotation.y=0;if(camera)camera.position.z=initialCameraZ;clearSelectedMuscle()};
 const cleanup=()=>{if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer?.disconnect();removalObserver?.disconnect();if(body)body.traverse(obj=>{obj.geometry?.dispose();if(Array.isArray(obj.material))obj.material.forEach(x=>x.dispose());else obj.material?.dispose()});renderer?.dispose();renderer?.domElement.remove();window.removeEventListener('muscle3d:reset',reset);window.removeEventListener('muscle3d:zoom',onZoom)};
 window.addEventListener('muscle3d:reset',reset);
 const onZoom=event=>zoomBy(Number(event.detail?.delta)||0);window.addEventListener('muscle3d:zoom',onZoom);
 try{
  const [THREE,{GLTFLoader}]=await threeModules();if(disposed)return;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.set(0,0,8.5);
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
    const group=String(meta.group||'').toLowerCase(),count=Number(loads[group])||0,intensity=Math.min(1,count/18);
    const base=new THREE.Color(0x9da7aa),teal=new THREE.Color(0x16b9b3),color=base.clone().lerp(teal,.10+intensity*.72);
    obj.material=new THREE.MeshStandardMaterial({color,roughness:.52,metalness:.32,emissive:teal,emissiveIntensity:.025+intensity*.16});
   }else obj.material=new THREE.MeshStandardMaterial({color:0x667276,roughness:.82,metalness:.12,transparent:true,opacity:.18});
   obj.material.side=THREE.DoubleSide;
   if(isMuscle){obj.userData.tjBaseColor=obj.material.color.clone();obj.userData.tjBaseEmissive=obj.material.emissiveIntensity;}
  });
  const box=new THREE.Box3().setFromObject(body),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  body.position.sub(center);body.scale.setScalar(2.55/Math.max(size.x,size.y,size.z));body.position.y-=.30;scene.add(body);
  body.updateMatrixWorld(true);
  const fittedBox=new THREE.Box3().setFromObject(body),sphere=fittedBox.getBoundingSphere(new THREE.Sphere());
  camera.position.set(0,0,sphere.radius/Math.sin(THREE.MathUtils.degToRad(camera.fov/2))*1.08);initialCameraZ=camera.position.z;camera.lookAt(0,-.08,0);
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  renderer.domElement.addEventListener('pointerdown',event=>{pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(pointers.size===1){dragging=true;lastX=event.clientX;dragStartX=event.clientX;dragMoved=false}else if(pointers.size===2){dragging=false;const pts=[...pointers.values()];pinchDistance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)}renderer.domElement.setPointerCapture?.(event.pointerId)});
  renderer.domElement.addEventListener('pointermove',event=>{if(!pointers.has(event.pointerId))return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(pointers.size>=2){const pts=[...pointers.values()],distance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);if(pinchDistance&&distance)zoomBy((pinchDistance-distance)*.018);pinchDistance=distance;dragMoved=true;return}if(dragging){if(Math.abs(event.clientX-dragStartX)>5)dragMoved=true;body.rotation.y+=(event.clientX-lastX)*.008;lastX=event.clientX}});
  const endDrag=event=>{if(event?.pointerId!=null)pointers.delete(event.pointerId);dragging=false;pinchDistance=0};renderer.domElement.addEventListener('pointerup',endDrag);renderer.domElement.addEventListener('pointercancel',endDrag);renderer.domElement.addEventListener('lostpointercapture',endDrag);
  renderer.domElement.addEventListener('wheel',event=>{event.preventDefault();zoomBy(event.deltaY>0?.45:-.45)},{passive:false});
  renderer.domElement.addEventListener('click',event=>{
   if(dragMoved){dragMoved=false;return}
   const rect=renderer.domElement.getBoundingClientRect();pointer.x=((event.clientX-rect.left)/rect.width)*2-1;pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;
   raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObject(body,true).find(x=>x.object.userData.tjMuscle);
   if(hit){clearSelectedMuscle();selectedMuscle=hit.object;selectedMuscle.material.color.set(0x62f3df);selectedMuscle.material.emissive.set(0x20d9c9);selectedMuscle.material.emissiveIntensity=.62;const m=hit.object.userData||{};onSelect({label:m.label||hit.object.name,group:String(m.group||'').toLowerCase(),side:m.side||''})}
  });
  const resize=()=>{if(!renderer||disposed)return;const w=Math.max(1,host.clientWidth),h=Math.max(420,Math.min(680,w*.95));camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)};
  observer=new ResizeObserver(resize);observer.observe(host);resize();
  removalObserver=new MutationObserver(()=>{if(!host.isConnected)cleanup()});removalObserver.observe(document.body,{childList:true,subtree:true});
  const animate=()=>{if(disposed)return;raf=requestAnimationFrame(animate);renderer.render(scene,camera)};animate();
  setStatus('');
 }catch(error){setStatus('Ошибка загрузки 3D-модели');console.error('Muscle 3D:',error)}
 return cleanup;
}

const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/OrbitControls-BzlmK-pT.js","assets/index-DhYLPUlP.js"])))=>i.map(i=>d[i]);
import{_ as qe,g as Ke}from"./index-DhbZHNht.js";import{q as Xe,L as Ze,r as Je,s as Qe,f as $e,E as et,H as tt,R as ot,B as nt,b as at,G as rt,a5 as st,C as H,l as it,m as lt,y as ct,h as mt,o as dt,M as ut,aD as pt,S as ft,aE as ht,aF as vt,aG as gt,aH as Ee,w as Mt,aI as wt,d as u,I as te,aJ as Et}from"./index-DhYLPUlP.js";import{G as yt,M as ye,b as bt}from"./MeshSurfaceSampler-j0sZzhtL.js";import{B as Tt,a as Pt,b as _t,u as Ot}from"./defaults-CDcI8644.js";const be=Math.PI/180,k=3e4,oe=2.7,Ft=1,St=.4,Te=1.015,At=.45,Ct=-.575,Lt=oe-1,Dt=oe+1,Rt=.18,It="#7dffe0",xt="#064b34",Nt="#2fe6b4",Bt=1.01,zt=2,Ut=.625,Gt=.7,Pe=.72,Ht=1.15,kt=new wt(-Math.PI/2,0,0),Vt=-1,Wt=0,Yt=Math.PI,jt=4e3,qt=.01,Kt=1,Xt=1,Zt=2.6,Jt="power2.inOut";function Qt(h,L,D,R){const F=(90-h)*be,M=(L*D+R)*be;return new u(Math.sin(F)*Math.cos(M),Math.cos(F),Math.sin(F)*Math.sin(M))}function ro(h,L,D={}){var we;const{autoCycleMs:R=5e3,initialId:F}=D,M=D.loop??!0,s=new Xe({canvas:h,antialias:!1,alpha:!0,powerPreference:"high-performance",stencil:!1});s.setPixelRatio(Math.min(window.devicePixelRatio,2)),s.setClearColor(0,0),s.outputColorSpace=Ze,s.toneMapping=Je;const ne=h.getBoundingClientRect();let w=Math.max(1,ne.width),E=Math.max(1,ne.height);s.setSize(w,E,!1);const V=new Qe,n=new $e(35,w/E,.1,100),i=new u(0,0,0);n.position.set(0,Ft,oe);let _e=St,ae=0;const re=new u,W=new u,Y=new u,se=new u,ie=()=>{n.lookAt(i),n.updateMatrixWorld(),re.setFromMatrixColumn(n.matrixWorld,0).normalize(),W.copy(i).sub(n.position).normalize(),Y.set(0,_e,0).sub(n.position).normalize();const e=W.angleTo(Y);se.crossVectors(W,Y),ae=e*(Math.sign(se.dot(re))||1)},S=()=>{n.rotateX(ae)};ie(),S();const _=new et(s,{frameBufferType:tt});_.addPass(new ot(V,n));const Oe=new nt({intensity:Tt,luminanceThreshold:Pt,luminanceSmoothing:_t,mipmapBlur:!0,radius:.45});_.addPass(new at(n,Oe)),_.setSize(w,E);const O=new rt;V.add(O);const g=L.map(e=>({...e,anchor:new st}));let I;const Fe=new Promise(e=>{I=e});let T=null,j=null,x=F??((we=L[0])==null?void 0:we.id)??"",v=null,N=null,q=null,K=1,l=null,P=null,le=Yt,Se=Xt,Ae=Vt,Ce=Wt;const X=e=>Qt(e.lat,e.lon,Ae,Ce);let A=Math.PI/2;const ce={value:At},me={value:Ct},Le={value:Lt},De={value:Dt},Re={value:Rt},Ie={value:new H(It)},xe={value:new H(xt)},Ne={value:new H(Nt)},Be={value:zt},ze={value:Ut},Ue={value:Gt},a=new u,p=new Et,Ge=()=>{l&&(l.minPolarAngle=Math.max(.001,A-le),l.maxPolarAngle=Math.min(Math.PI-.001,A+le))},He=()=>{a.copy(n.position).sub(i);const e=a.length()||1;A=Math.acos(te.clamp(a.y/e,-1,1)),Ge()},de=e=>{const t=X(e);return Math.atan2(t.x,t.z)},ke=e=>{a.copy(n.position).sub(i),p.setFromVector3(a),p.theta=e,p.makeSafe(),a.setFromSpherical(p),n.position.copy(i).add(a),l?l.update():n.lookAt(i),S()},Ve=(e,t)=>{a.copy(n.position).sub(i),p.setFromVector3(a),p.theta=e,p.phi=t,p.makeSafe(),a.setFromSpherical(p),n.position.copy(i).add(a),l?l.update():n.lookAt(i),S()},We=e=>{const t=X(e).sub(i);return Math.acos(te.clamp(t.y/(t.length()||1),-1,1))},ue=e=>{const t=g.find(G=>G.id===e);if(!t)return;x=e,T==null||T(e);const c=de(t),r=A+Se*(We(t)-A);a.copy(n.position).sub(i);const m=Math.atan2(a.x,a.z);p.setFromVector3(a);const f=p.phi;let d=c-m;d=Math.atan2(Math.sin(d),Math.cos(d)),v==null||v.kill();const b={t:0};v=Ke.to(b,{t:1,duration:Zt,ease:Jt,onUpdate:()=>Ve(m+d*b.t,f+(r-f)*b.t)})};new yt().load(ye,e=>{let t=null;if(e.scene.traverse(o=>{!t&&o.isMesh&&(t=o)}),!t){console.error("[trading-globe] no mesh to sample in",ye),I();return}const c=new bt(t).build(),r=new u,m=new Float32Array(k*3);for(let o=0;o<k;o++)c.sample(r),m[o*3]=r.x,m[o*3+1]=r.y,m[o*3+2]=r.z;const f=new it;f.setAttribute("position",new lt(m,3)),f.computeBoundingSphere();const d=f.boundingSphere;f.translate(-d.center.x,-d.center.y,-d.center.z),f.scale(1/d.radius,1/d.radius,1/d.radius);let b=0;for(let o=0;o<k;o++)b+=Math.hypot(m[o*3],m[o*3+1],m[o*3+2]);K=b/k;const G=new ct({color:new H(Ot),size:.01,transparent:!0,depthWrite:!1,alphaMap:new mt().load("/images/glow.png")});G.onBeforeCompile=o=>{o.uniforms.uFadeTop=ce,o.uniforms.uFadeBottom=me,o.uniforms.uDepthNear=Le,o.uniforms.uDepthFar=De,o.uniforms.uDepthMin=Re,o.uniforms.uColorNear=Ie,o.uniforms.uColorFar=xe,o.vertexShader=o.vertexShader.replace("#include <common>",`#include <common>
varying float vFadeY;
varying float vDepth;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vec4 vGlobeView = modelViewMatrix * vec4( transformed, 1.0 );
vFadeY = vGlobeView.y;
vDepth = -vGlobeView.z;`),o.fragmentShader=o.fragmentShader.replace("#include <common>",`#include <common>
varying float vFadeY;
varying float vDepth;
uniform float uFadeTop;
uniform float uFadeBottom;
uniform float uDepthNear;
uniform float uDepthFar;
uniform float uDepthMin;
uniform vec3 uColorNear;
uniform vec3 uColorFar;`).replace("#include <map_particle_fragment>",`#include <map_particle_fragment>
float vDepthT = smoothstep( uDepthFar, uDepthNear, vDepth );
diffuseColor.rgb = mix( uColorFar, uColorNear, vDepthT );
diffuseColor.a *= smoothstep( uFadeBottom, uFadeTop, vFadeY );
diffuseColor.a *= mix( uDepthMin, 1.0, vDepthT );`)},N=new dt(f,G),N.setRotationFromEuler(kt),O.add(N),q=new ut(new pt(1,64,64),new ft({uniforms:{uColor:Ne,uPower:Be,uIntensity:ze,uEdge:Ue,uFadeTop:ce,uFadeBottom:me},vertexShader:`
            varying vec3 vWorldNormal;
            varying vec3 vViewDir;
            varying float vFadeY;
            void main() {
              vec4 worldPos = modelMatrix * vec4( position, 1.0 );
              vWorldNormal = normalize( mat3( modelMatrix ) * normal );
              vViewDir = normalize( cameraPosition - worldPos.xyz );
              vec4 mvPos = viewMatrix * worldPos;
              vFadeY = mvPos.y;
              gl_Position = projectionMatrix * mvPos;
            }
          `,fragmentShader:`
            varying vec3 vWorldNormal;
            varying vec3 vViewDir;
            varying float vFadeY;
            uniform vec3 uColor;
            uniform float uPower;
            uniform float uIntensity;
            uniform float uEdge;
            uniform float uFadeTop;
            uniform float uFadeBottom;
            void main() {
              float f = 1.0 - abs( dot( vWorldNormal, vViewDir ) );
              float rim = pow( f, uPower );
              // Feather the outermost edge back to 0 so the halo dissolves into
              // the background instead of hard-cutting at the silhouette.
              float outer = 1.0 - smoothstep( uEdge, 1.0, f );
              float fade = smoothstep( uFadeBottom, uFadeTop, vFadeY );
              float glow = rim * outer * fade;
              // Drive ALPHA with the same fresnel so zero-glow areas (centre,
              // feathered edge, faded bottom) stay transparent instead of stamping
              // an opaque black disc. Colour is premultiplied by glow, so the
              // custom One/One blend below is a true additive glow that can still
              // overdrive past 1 (uIntensity) into the bloom pass.
              gl_FragColor = vec4( uColor * glow * uIntensity, glow );
            }
          `,transparent:!0,side:ht,blending:vt,blendEquation:gt,blendSrc:Ee,blendDst:Ee,depthWrite:!1})),q.scale.setScalar(Bt),O.add(q),g.forEach(o=>{o.anchor.position.copy(X(o)).multiplyScalar(K*Te),O.add(o.anchor)}),ke(de(g.find(o=>o.id===x)??g[0])),T==null||T(x),M||ee(),I()},void 0,e=>{console.error("[trading-globe] failed to load GLB",e),I()});const y=new u,Z=new u,pe=new u,fe=new u,Ye=()=>{if(!j||!N)return;O.getWorldPosition(Z);const e=K*Te*O.scale.x,t=n.position.distanceTo(Z),c=g.map(r=>{r.anchor.getWorldPosition(y),pe.copy(y).sub(Z).normalize(),fe.copy(n.position).sub(y).normalize();const m=pe.dot(fe),f=m>.12,d=n.position.distanceTo(y),b=te.clamp((t+e-d)/(2*e),0,1);return y.project(n),{id:r.id,x:(y.x*.5+.5)*w,y:(-y.y*.5+.5)*E,visible:f&&y.z<1,facing:m,scale:Pe+(Ht-Pe)*b}});j(c)},J=new Mt;let B=!1;const Q=()=>{J.update();const e=Math.min(J.getDelta(),.05);l?l.update():n.lookAt(i),S(),_.render(e),Ye()};let z=!1;const je=()=>{B||(B=!0,J.reset(),s.setAnimationLoop(Q))},$=()=>{B&&(B=!1,s.setAnimationLoop(null))},ee=()=>{z&&Q()};let C=null;const he=()=>{C||R<=0||g.length<2||(C=setInterval(()=>{const e=g.findIndex(t=>t.id===x);ue(g[(e+1)%g.length].id)},R))},U=()=>{C&&clearInterval(C),C=null};h.style.cursor="grab",h.style.touchAction="none",qe(async()=>{const{OrbitControls:e}=await import("./OrbitControls-BzlmK-pT.js");return{OrbitControls:e}},__vite__mapDeps([0,1])).then(({OrbitControls:e})=>{const t=new e(n,s.domElement);if(t.enableDamping=!0,t.dampingFactor=qt,t.rotateSpeed=Kt,t.enableZoom=!1,t.enablePan=!1,t.target.copy(i),t.addEventListener("start",()=>{v==null||v.kill(),U(),P&&clearTimeout(P),h.style.cursor="grabbing"}),t.addEventListener("end",()=>{h.style.cursor="grab",P&&clearTimeout(P),P=setTimeout(()=>he(),jt)}),l=t,He(),ie(),t.update(),S(),!M){let c;const r=()=>{s.setAnimationLoop(Q),clearTimeout(c),c=setTimeout(()=>s.setAnimationLoop(null),700)};t.addEventListener("start",r),t.addEventListener("change",r)}});const ve=new IntersectionObserver(e=>{z=e.some(t=>t.isIntersecting)&&!document.hidden,z?M?(je(),he()):ee():M&&($(),U())},{threshold:.05});ve.observe(h);const ge=()=>{document.hidden&&(z=!1,$(),U())};document.addEventListener("visibilitychange",ge);const Me=new ResizeObserver(e=>{for(const t of e)w=Math.max(1,Math.floor(t.contentRect.width)),E=Math.max(1,Math.floor(t.contentRect.height)),s.setSize(w,E,!1),_.setSize(w,E),n.aspect=w/E,n.updateProjectionMatrix(),M||ee()});return Me.observe(h),{ready:Fe,focus:ue,onFocusChange:e=>{T=e},onFrame:e=>{j=e},dispose:()=>{v==null||v.kill(),$(),U(),P&&clearTimeout(P),l==null||l.dispose(),ve.disconnect(),Me.disconnect(),document.removeEventListener("visibilitychange",ge),_.dispose(),s.dispose(),V.traverse(e=>{const t=e;t.geometry&&t.geometry.dispose();const c=t.material;Array.isArray(c)?c.forEach(r=>r.dispose()):c&&c.dispose()})}}}export{ro as initTradingGlobe};

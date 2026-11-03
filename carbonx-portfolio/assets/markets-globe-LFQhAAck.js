import{q as G,L as z,r as V,s as k,f as W,E as q,H as j,R as U,B as Y,b as J,G as K,l as Q,m as X,y as Z,C as g,h as $,o as ee,M as oe,aD as te,S as re,aE as ne,aF as ae,aG as se,aH as L,aI as ie,d as le}from"./index-DhYLPUlP.js";import{G as ce,M as x,b as ue}from"./MeshSurfaceSampler-j0sZzhtL.js";import{B as me,a as de,b as fe,u as pe}from"./defaults-CDcI8644.js";const N=3e4,he=35,D=3.9,ve=2*Math.PI/22.5,we=D-1,ge=D+1,Ee=.18,Me="#7dffe0",Se="#064b34",be="#2fe6b4",Pe=1.01,Ce=2,De=.625,ye=.7,Oe=new ie(-Math.PI/2,0,0);function xe(f){const r=new G({canvas:f,antialias:!1,alpha:!0,powerPreference:"high-performance",stencil:!1});r.setPixelRatio(Math.min(window.devicePixelRatio,2)),r.setClearColor(0,0),r.outputColorSpace=z,r.toneMapping=V;const y=f.getBoundingClientRect();let n=Math.max(1,y.width),a=Math.max(1,y.height);r.setSize(n,a,!1);const E=new k,s=new W(he,n/a,.1,100);s.position.set(0,0,D),s.lookAt(0,0,0);const i=new q(r,{frameBufferType:j});i.addPass(new U(E,s));const F=new Y({intensity:me,luminanceThreshold:de,luminanceSmoothing:fe,mipmapBlur:!0,radius:.45});i.addPass(new J(s,F)),i.setSize(n,a);const p=new K;E.add(p);let O,M;const I=new Promise((o,t)=>{O=o,M=t});let S=null,b=null;new ce().load(x,o=>{let t=null;if(o.scene.traverse(e=>{!t&&e.isMesh&&(t=e)}),!t){console.error("[markets-globe] no mesh to sample in",x),M(new Error("no mesh to sample"));return}const c=new ue(t).build(),u=new le,w=new Float32Array(N*3);for(let e=0;e<N;e++)c.sample(u),w[e*3]=u.x,w[e*3+1]=u.y,w[e*3+2]=u.z;const m=new Q;m.setAttribute("position",new X(w,3)),m.computeBoundingSphere();const d=m.boundingSphere;m.translate(-d.center.x,-d.center.y,-d.center.z),m.scale(1/d.radius,1/d.radius,1/d.radius);const A=new Z({color:new g(pe),size:.01,transparent:!0,depthWrite:!1,alphaMap:new $().load("/images/glow.png")});A.onBeforeCompile=e=>{e.uniforms.uDepthNear={value:we},e.uniforms.uDepthFar={value:ge},e.uniforms.uDepthMin={value:Ee},e.uniforms.uColorNear={value:new g(Me)},e.uniforms.uColorFar={value:new g(Se)},e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
varying float vDepth;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vec4 vGlobeView = modelViewMatrix * vec4( transformed, 1.0 );
vDepth = -vGlobeView.z;`),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
varying float vDepth;
uniform float uDepthNear;
uniform float uDepthFar;
uniform float uDepthMin;
uniform vec3 uColorNear;
uniform vec3 uColorFar;`).replace("#include <map_particle_fragment>",`#include <map_particle_fragment>
float vDepthT = smoothstep( uDepthFar, uDepthNear, vDepth );
diffuseColor.rgb = mix( uColorFar, uColorNear, vDepthT );
diffuseColor.a *= mix( uDepthMin, 1.0, vDepthT );`)},S=new ee(m,A),S.setRotationFromEuler(Oe),p.add(S),b=new oe(new te(1,64,64),new re({uniforms:{uColor:{value:new g(be)},uPower:{value:Ce},uIntensity:{value:De},uEdge:{value:ye}},vertexShader:`
            varying vec3 vWorldNormal;
            varying vec3 vViewDir;
            void main() {
              vec4 worldPos = modelMatrix * vec4( position, 1.0 );
              vWorldNormal = normalize( mat3( modelMatrix ) * normal );
              vViewDir = normalize( cameraPosition - worldPos.xyz );
              gl_Position = projectionMatrix * viewMatrix * worldPos;
            }
          `,fragmentShader:`
            varying vec3 vWorldNormal;
            varying vec3 vViewDir;
            uniform vec3 uColor;
            uniform float uPower;
            uniform float uIntensity;
            uniform float uEdge;
            void main() {
              float f = 1.0 - abs( dot( vWorldNormal, vViewDir ) );
              float rim = pow( f, uPower );
              // Feather the outermost edge back to 0 so the halo dissolves into
              // the background instead of hard-cutting at the silhouette.
              float outer = 1.0 - smoothstep( uEdge, 1.0, f );
              float glow = rim * outer;
              // Drive ALPHA with the same fresnel so zero-glow areas stay transparent
              // (no opaque black disc); colour is premultiplied by glow for the
              // additive One/One blend below.
              gl_FragColor = vec4( uColor * glow * uIntensity, glow );
            }
          `,transparent:!0,side:ne,blending:ae,blendEquation:se,blendSrc:L,blendDst:L,depthWrite:!1})),b.scale.setScalar(Pe),p.add(b),O()},void 0,o=>{console.error("[markets-globe] failed to load GLB",o),M(o)});let P=!1,l=0,h=0;const B=o=>{l=0;const t=h?Math.min((o-h)/1e3,.1):0;h=o,p.rotation.y+=ve*t,i.render(),v()},v=()=>{l||!P||document.hidden||(l=requestAnimationFrame(B))},C=()=>{l&&cancelAnimationFrame(l),l=0,h=0},R=new IntersectionObserver(o=>{P=o.some(t=>t.isIntersecting),P?v():C()},{threshold:0});R.observe(f);const _=()=>document.hidden?C():v();document.addEventListener("visibilitychange",_);const H=()=>{const o=f.getBoundingClientRect();n=Math.max(1,o.width),a=Math.max(1,o.height),r.setSize(n,a,!1),i.setSize(n,a),s.aspect=n/a,s.updateProjectionMatrix(),v()},T=new ResizeObserver(H);return T.observe(f),{ready:I,dispose:()=>{C(),R.disconnect(),T.disconnect(),document.removeEventListener("visibilitychange",_),E.traverse(o=>{const t=o;t.geometry&&t.geometry.dispose();const c=t.material;Array.isArray(c)?c.forEach(u=>u.dispose()):c&&c.dispose()}),i.dispose(),r.dispose()}}}export{xe as initMarketsGlobe};

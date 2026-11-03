import{d as E,l as G,m as H,n as L,C as I,S as U,A as q,o as N,q as J,s as K,f as Q,E as X,H as Z,R as $,B as ee,V as te,b as oe,w as ie}from"./index-DhYLPUlP.js";import{g as D,b as ae}from"./index-DhbZHNht.js";const re={bodyWidth:1,bodyDepth:1,bodyHeight:3,wickRadius:.12,upperWickHeight:1.2,lowerWickHeight:1,color:"#19f5b0",particleCount:6e3};function R(n,i){return n+Math.random()*(i-n)}function ne(n,i,a,u){const c=2*i,s=2*a;let r=n*2*(c+s);if(r<s){u[0]=i,u[1]=-a+r;return}if(r-=s,r<c){u[0]=i-r,u[1]=a;return}if(r-=c,r<s){u[0]=-i,u[1]=a-r;return}r-=s,u[0]=-i+r,u[1]=-a}const se=`
  uniform float uTime;
  uniform float uProgress;
  uniform float uSizeScale;
  uniform float uPixelRatio;
  uniform float uFlowSpeed;
  uniform float uWobbleAmp;
  uniform float uWobbleSpeed;
  uniform float uHalfH;   // body half height (y)
  uniform float uYBottom; // bottom of lower wick
  uniform float uYTop;    // top of upper wick
  uniform float uBand;    // blend band around the body/wick joins

  attribute vec3 aOrigin; // scattered start point for the fly-in
  attribute vec2 aRect;   // baked point on the body rectangle perimeter (x,z)
  attribute vec2 aCirc;   // baked point on the wick circle (x,z)
  attribute float aPhase; // starting height phase [0,1)
  attribute float aSize;
  attribute vec3 aSeed;   // .x speed var, .y color mix, .z scatter/wobble jitter

  varying float vMix;
  varying float vSeam;

  void main() {
    float p = smoothstep(0.0, 1.0, uProgress);

    // Rising height, looped and scattered per particle.
    float spd = mix(0.6, 1.4, aSeed.x * 0.5 + 0.5);
    float u = fract(aPhase + uTime * uFlowSpeed * spd);
    float y = mix(uYBottom, uYTop, u);

    // Rectangle outline in the body, circle in the wicks, blended at the joins.
    float inBox = smoothstep(-uHalfH - uBand, -uHalfH + uBand, y)
                * (1.0 - smoothstep(uHalfH - uBand, uHalfH + uBand, y));
    vec2 xz = mix(aCirc, aRect, inBox);
    xz *= 1.0 + aSeed.z * 0.04; // slight scatter so it's a shell, not a wire

    vec3 flowPos = vec3(xz.x, y, xz.y);

    // Tiny lateral wobble for life.
    float ph = aSeed.z * 6.2831853;
    flowPos.x += sin(uTime * uWobbleSpeed + ph) * uWobbleAmp;
    flowPos.z += cos(uTime * uWobbleSpeed * 1.1 + ph) * uWobbleAmp;

    vec3 pos = mix(aOrigin, flowPos, p);

    vMix = aSeed.y * 0.5 + 0.5;
    // Fade particles in/out at the top & bottom of the loop so the wrap is hidden
    // (only once formed — the assemble keeps them all visible).
    float seam = smoothstep(0.0, 0.06, u) * (1.0 - smoothstep(0.94, 1.0, u));
    vSeam = mix(1.0, seam, p);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * uSizeScale * uPixelRatio / max(0.0001, -mvPosition.z);
  }
`,le=`
  uniform vec3 uColor;
  uniform float uOpacity;

  varying float vMix;
  varying float vSeam;

  void main() {
    if (uOpacity < 0.01) discard;
    float d = length(gl_PointCoord - 0.5);
    float a = 1.0 - smoothstep(0.4, 0.5, d);
    float alpha = a * uOpacity * vSeam;
    if (alpha <= 0.0) discard;
    // Subtle per-particle brightness variation so the cloud doesn't read flat.
    vec3 col = uColor * mix(0.7, 1.15, vMix);
    gl_FragColor = vec4(col, alpha);
  }
`;function ce(n,i={}){const a={...re,...i},u=i.offset??new E,c=a.bodyWidth/2,s=a.bodyDepth/2,r=a.bodyHeight/2,f=-(r+a.lowerWickHeight),b=r+a.upperWickHeight,W=b-f,m=a.particleCount,g=new Float32Array(m*3),S=new Float32Array(m*2),w=new Float32Array(m*2),A=new Float32Array(m),M=new Float32Array(m),k=new Float32Array(m*3),C=Math.max(a.bodyWidth,W),p=[0,0];for(let e=0;e<m;e++){ne(Math.random(),c,s,p),S[e*2+0]=p[0],S[e*2+1]=p[1],g[e*3+0]=p[0]*R(.85,1.1),g[e*3+1]=R(f,b)-R(W*.24,W*.56),g[e*3+2]=p[1]*R(.85,1.1);const v=Math.hypot(p[0],p[1])||1;w[e*2+0]=p[0]/v*a.wickRadius,w[e*2+1]=p[1]/v*a.wickRadius,A[e]=Math.random(),M[e]=R(.6,1.6),k[e*3+0]=Math.random()*2-1,k[e*3+1]=Math.random(),k[e*3+2]=Math.random()*2-1}const d=new G;d.setAttribute("position",new H(new Float32Array(m*3),3)),d.setAttribute("aOrigin",new H(g,3)),d.setAttribute("aRect",new H(S,2)),d.setAttribute("aCirc",new H(w,2)),d.setAttribute("aPhase",new H(A,1)),d.setAttribute("aSize",new H(M,1)),d.setAttribute("aSeed",new H(k,3)),d.boundingSphere=new L(new E,Math.max(C,W)*1.2);const h={uTime:{value:0},uProgress:{value:0},uSizeScale:{value:10},uPixelRatio:{value:Math.min(window.devicePixelRatio,2)},uFlowSpeed:{value:.12},uWobbleAmp:{value:.02},uWobbleSpeed:{value:1.2},uColor:{value:new I(a.color)},uOpacity:{value:0},uHalfH:{value:r},uYBottom:{value:f},uYTop:{value:b},uBand:{value:.12}},x=new U({vertexShader:se,fragmentShader:le,uniforms:h,transparent:!0,depthWrite:!1,blending:q}),y=new N(d,x);return y.frustumCulled=!1,y.position.copy(u),n.add(y),{object:y,setProgress:e=>{h.uProgress.value=e},setOpacity:e=>{h.uOpacity.value=e},setColor:e=>{h.uColor.value.set(e)},setSizeScale:e=>{h.uSizeScale.value=e},setFlowSpeed:e=>{h.uFlowSpeed.value=e},setWobble:(e,v)=>{h.uWobbleAmp.value=e,h.uWobbleSpeed.value=v},tick:e=>{h.uTime.value+=e},dispose:()=>{n.remove(y),d.dispose(),x.dispose()}}}D.registerPlugin(ae);const P="#19f5b0",de=[{x:-3.2,z:.4,centerY:-.9,bodyWidth:.5,bodyDepth:.5,bodyHeight:2.6,wickRadius:.075,upperWickHeight:.7,lowerWickHeight:.9,color:P},{x:-2,z:-.9,centerY:-.5,bodyWidth:.5,bodyDepth:.5,bodyHeight:2,wickRadius:.075,upperWickHeight:.9,lowerWickHeight:.6,color:P},{x:-.8,z:-1.7,centerY:0,bodyWidth:.5,bodyDepth:.5,bodyHeight:1.4,wickRadius:.12,upperWickHeight:.6,lowerWickHeight:1.2,color:P},{x:.4,z:-1.7,centerY:.5,bodyWidth:.5,bodyDepth:.5,bodyHeight:2.8,wickRadius:.12,upperWickHeight:.5,lowerWickHeight:.7,color:P},{x:1.4,z:-.9,centerY:.9,bodyWidth:.5,bodyDepth:.5,bodyHeight:1.1,wickRadius:.12,upperWickHeight:1.1,lowerWickHeight:.5,color:P},{x:2.2,z:.4,centerY:1.3,bodyWidth:.5,bodyDepth:.5,bodyHeight:2.2,wickRadius:.12,upperWickHeight:.8,lowerWickHeight:.4,color:P}];function he(n){const i=new J({canvas:n,alpha:!0,antialias:!0,powerPreference:"high-performance"});i.setPixelRatio(Math.min(window.devicePixelRatio,2));const{width:a,height:u}=n.getBoundingClientRect();let c=Math.max(1,a),s=Math.max(1,u);i.setSize(c,s,!1);const r=new K,f=new Q(35,c/s,.1,100);f.position.set(.8,-4.5,12.5),f.lookAt(0,.5,0);const b=new X(i,{frameBufferType:Z});b.addPass(new $(r,f));const W=new ee({intensity:1.2,luminanceThreshold:.15,luminanceSmoothing:.3,mipmapBlur:!0,radius:.7}),m=new te({offset:.325,darkness:.9});b.addPass(new oe(f,W,m)),b.setSize(c,s);const g={sizeScale:10,flowSpeed:.12,wobbleAmp:.02,wobbleSpeed:1.2,particleCount:1800},S=de.map(o=>({...o})),w=[],A=o=>{const t=S[o],l=ce(r,{bodyWidth:t.bodyWidth,bodyDepth:t.bodyDepth,bodyHeight:t.bodyHeight,wickRadius:t.wickRadius,upperWickHeight:t.upperWickHeight,lowerWickHeight:t.lowerWickHeight,color:t.color,particleCount:g.particleCount,offset:new E(t.x,t.centerY,t.z)});return l.setSizeScale(g.sizeScale),l.setFlowSpeed(g.flowSpeed),l.setWobble(g.wobbleAmp,g.wobbleSpeed),l};for(let o=0;o<S.length;o++)w[o]=A(o);const M=.12,k=1.6,C=Math.PI*.55,p=window.matchMedia("(prefers-reduced-motion: reduce)").matches,d=1,h=.25,x=D.timeline({scrollTrigger:{trigger:n,start:"top+=50% bottom",endTrigger:n.closest("section")??n,end:"bottom bottom-=10%",id:"candles-assemble",scrub:.5}});S.forEach((o,t)=>{const l={p:0,o:0},z=t*h;x.to(l,{p:1,duration:d,ease:"power1.out",onUpdate:()=>w[t].setProgress(l.p)},z),x.to(l,{o:1,duration:d,ease:"power1.in",onUpdate:()=>w[t].setOpacity(l.o)},z)});const y=new ie,e=()=>{y.update();const o=y.getDelta(),t=y.getElapsed();for(let l=0;l<w.length;l++){const z=w[l];if(!p){const T=S[l],j=T.centerY+Math.sin(t*k-l*C)*M;z.object.position.set(T.x,j,T.z)}z.tick(o)}b.render(o)};let v=!1;const _=()=>{v||(v=!0,i.setAnimationLoop(e))},B=()=>{v=!1,i.setAnimationLoop(null)};let F=!1,V;const O=new IntersectionObserver(([o])=>{F=o.isIntersecting;{F?_():B();return}});O.observe(n);const Y=new ResizeObserver(o=>{for(const t of o)c=Math.max(1,Math.floor(t.contentRect.width)),s=Math.max(1,Math.floor(t.contentRect.height)),i.setSize(c,s,!1),b.setSize(c,s),f.aspect=c/s,f.updateProjectionMatrix()});return Y.observe(n),()=>{var o;(o=x.scrollTrigger)==null||o.kill(),x.kill(),O.disconnect(),Y.disconnect(),clearTimeout(V),B(),b.dispose();for(const t of w)t.dispose();i.dispose()}}export{he as attachCandleScene};

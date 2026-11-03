import{E as Qe,H as De,R as Je,B as et,V as tt,T as at,a as ot,b as rt,M as Re,C as k,c as ue,W as je,S as ce,U as Pe,P as Ee,d as M,e as xe,F as it,f as Ve,g as ke,G as ze,h as we,i as nt,j as _e,D as Ne,k as Ue,l as Fe,m as Q,n as Xe,o as Le,N as st,p as Te,A as Ze,Q as lt,q as ut,L as ct,r as dt,s as ht,t as pt,u as ft,v as mt,w as vt,x as Me,y as gt,z as wt,I as xt}from"./index-DhYLPUlP.js";import{W as bt,a as ge,G as St,M as Ge,b as yt,c as Mt,I as Ae}from"./MeshSurfaceSampler-j0sZzhtL.js";import{g as At}from"./index-DhbZHNht.js";import{B as Ct,a as Pt,b as _t,c as Tt,V as Dt,d as Ke,W as Rt,e as Et,f as zt,g as Ft,h as He,i as Lt,j as Wt,k as Ot,l as It,m as Bt,C as kt,n as Nt,P as Ut,o as Gt,p as Ht,q as Yt,r as qt,s as jt,t as Vt,u as $e,v as Xt,w as Zt,x as Kt,y as $,E as $t,z as Qt,A as Jt,D as ea,T as ta,F as aa,G as oa,H as ra,K as ia,I as na,J as sa,L as la}from"./defaults-CDcI8644.js";function ua(A,a,t,r,e){const l=new Qe(A,{frameBufferType:De});l.addPass(new Je(a,t));const o=new et({intensity:Ct,luminanceThreshold:Pt,luminanceSmoothing:_t,mipmapBlur:!0,radius:Tt}),u=new tt({offset:Dt,darkness:Ke}),C=new at({mode:ot.ACES_FILMIC});return l.addPass(new rt(t,o,u,C)),l.setSize(r,e),{composer:l,bloom:o,vignette:u,tonemap:C}}class be extends Re{constructor(a,t={}){super(a),this.isReflector=!0,this.type="Reflector",this.forceUpdate=!1,this._reflectionCameras=new WeakMap;const r=this,e=t.color!==void 0?new k(t.color):new k(8355711),l=t.textureWidth||512,o=t.textureHeight||512,u=t.clipBias||0,C=t.shader||be.ReflectorShader,F=t.multisample!==void 0?t.multisample:4,w=new Ee,R=new M,E=new M,O=new M,B=new ue,U=new M(0,0,-1),n=new xe,m=new M,i=new M,d=new xe,v=new ue,y=new je(l,o,{samples:F,type:De}),I=new ce({name:C.name!==void 0?C.name:"unspecified",uniforms:Pe.clone(C.uniforms),fragmentShader:C.fragmentShader,vertexShader:C.vertexShader});I.uniforms.tDiffuse.value=y.texture,I.uniforms.color.value=e,I.uniforms.textureMatrix.value=v,this.material=I,this.onBeforeRender=function(p,f,P){const x=this._getReflectionCamera(P);if(E.setFromMatrixPosition(r.matrixWorld),O.setFromMatrixPosition(P.matrixWorld),B.extractRotation(r.matrixWorld),R.set(0,0,1),R.applyMatrix4(B),m.subVectors(E,O),m.dot(R)>0===!0&&this.forceUpdate===!1)return;m.reflect(R).negate(),m.add(E),B.extractRotation(P.matrixWorld),U.set(0,0,-1),U.applyMatrix4(B),U.add(O),i.subVectors(E,U),i.reflect(R).negate(),i.add(E),x.position.copy(m),x.up.set(0,1,0),x.up.applyMatrix4(B),x.up.reflect(R),x.lookAt(i),x.far=P.far,x.updateMatrixWorld(),x.projectionMatrix.copy(P.projectionMatrix),v.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),v.multiply(x.projectionMatrix),v.multiply(x.matrixWorldInverse),v.multiply(r.matrixWorld),w.setFromNormalAndCoplanarPoint(R,E),w.applyMatrix4(x.matrixWorldInverse),n.set(w.normal.x,w.normal.y,w.normal.z,w.constant);const g=x.projectionMatrix;x.isOrthographicCamera?(d.x=(Math.sign(n.x)+g.elements[8])/g.elements[0],d.y=(Math.sign(n.y)+g.elements[9])/g.elements[5],d.z=-P.far,d.w=1):(d.x=(Math.sign(n.x)+g.elements[8])/g.elements[0],d.y=(Math.sign(n.y)+g.elements[9])/g.elements[5],d.z=-1,d.w=(1+g.elements[10])/g.elements[14]),n.multiplyScalar(2/n.dot(d)),g.elements[2]=n.x,g.elements[6]=n.y,x.isOrthographicCamera?(g.elements[10]=n.z-u,g.elements[14]=n.w-1):(g.elements[10]=n.z+1-u,g.elements[14]=n.w),r.visible=!1;const H=p.getRenderTarget(),G=p.xr.enabled,z=p.shadowMap.autoUpdate;p.xr.enabled=!1,p.shadowMap.autoUpdate=!1,p.setRenderTarget(y),p.state.buffers.depth.setMask(!0),p.autoClear===!1&&p.clear(),p.render(f,x),p.xr.enabled=G,p.shadowMap.autoUpdate=z,p.setRenderTarget(H);const T=P.viewport;T!==void 0&&p.state.viewport(T),r.visible=!0,this.forceUpdate=!1},this.getRenderTarget=function(){return y},this.dispose=function(){y.dispose(),r.material.dispose()},this._getReflectionCamera=function(p){let f=this._reflectionCameras.get(p);return f===void 0&&(f=p.clone(),this._reflectionCameras.set(p,f)),f}}}be.ReflectorShader={name:"ReflectorShader",uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null}},vertexShader:`
		uniform mat4 textureMatrix;
		varying vec4 vUv;

		#include <common>
		#include <logdepthbuf_pars_vertex>

		void main() {

			vUv = textureMatrix * vec4( position, 1.0 );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

			#include <logdepthbuf_vertex>

		}`,fragmentShader:`
		uniform vec3 color;
		uniform sampler2D tDiffuse;
		varying vec4 vUv;

		#include <logdepthbuf_pars_fragment>

		float blendOverlay( float base, float blend ) {

			return( base < 0.5 ? ( 2.0 * base * blend ) : ( 1.0 - 2.0 * ( 1.0 - base ) * ( 1.0 - blend ) ) );

		}

		vec3 blendOverlay( vec3 base, vec3 blend ) {

			return vec3( blendOverlay( base.r, blend.r ), blendOverlay( base.g, blend.g ), blendOverlay( base.b, blend.b ) );

		}

		void main() {

			#include <logdepthbuf_fragment>

			vec4 base = texture2DProj( tDiffuse, vUv );
			gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>

		}`};class ca extends Re{constructor(a,t={}){super(a),this.isWater=!0;const r=this,e=t.textureWidth!==void 0?t.textureWidth:512,l=t.textureHeight!==void 0?t.textureHeight:512,o=t.clipBias!==void 0?t.clipBias:0,u=t.alpha!==void 0?t.alpha:1,C=t.time!==void 0?t.time:0,F=t.waterNormals!==void 0?t.waterNormals:null,w=t.sunDirection!==void 0?t.sunDirection:new M(.70707,.70707,0),R=new k(t.sunColor!==void 0?t.sunColor:16777215),E=new k(t.waterColor!==void 0?t.waterColor:8355711),O=t.eye!==void 0?t.eye:new M(0,0,0),B=t.distortionScale!==void 0?t.distortionScale:20,U=t.side!==void 0?t.side:it,n=t.fog!==void 0?t.fog:!1,m=new Ee,i=new M,d=new M,v=new M,y=new ue,I=new M(0,0,-1),p=new xe,f=new M,P=new M,x=new xe,q=new ue,g=new Ve,H=new je(e,l,{type:De}),G={name:"MirrorShader",uniforms:Pe.merge([ke.fog,ke.lights,{normalSampler:{value:null},mirrorSampler:{value:null},alpha:{value:1},time:{value:0},size:{value:1},distortionScale:{value:20},textureMatrix:{value:new ue},sunColor:{value:new k(8355711)},sunDirection:{value:new M(.70707,.70707,0)},eye:{value:new M},waterColor:{value:new k(5592405)}}]),vertexShader:`
				uniform mat4 textureMatrix;
				uniform float time;

				varying vec4 mirrorCoord;
				varying vec4 worldPosition;

				#include <common>
				#include <fog_pars_vertex>
				#include <shadowmap_pars_vertex>
				#include <logdepthbuf_pars_vertex>

				void main() {
					mirrorCoord = modelMatrix * vec4( position, 1.0 );
					worldPosition = mirrorCoord.xyzw;
					mirrorCoord = textureMatrix * mirrorCoord;
					vec4 mvPosition =  modelViewMatrix * vec4( position, 1.0 );
					gl_Position = projectionMatrix * mvPosition;

				#include <beginnormal_vertex>
				#include <defaultnormal_vertex>
				#include <logdepthbuf_vertex>
				#include <fog_vertex>
				#include <shadowmap_vertex>
			}`,fragmentShader:`
				uniform sampler2D mirrorSampler;
				uniform float alpha;
				uniform float time;
				uniform float size;
				uniform float distortionScale;
				uniform sampler2D normalSampler;
				uniform vec3 sunColor;
				uniform vec3 sunDirection;
				uniform vec3 eye;
				uniform vec3 waterColor;

				varying vec4 mirrorCoord;
				varying vec4 worldPosition;

				vec4 getNoise( vec2 uv ) {
					vec2 uv0 = ( uv / 103.0 ) + vec2(time / 17.0, time / 29.0);
					vec2 uv1 = uv / 107.0-vec2( time / -19.0, time / 31.0 );
					vec2 uv2 = uv / vec2( 8907.0, 9803.0 ) + vec2( time / 101.0, time / 97.0 );
					vec2 uv3 = uv / vec2( 1091.0, 1027.0 ) - vec2( time / 109.0, time / -113.0 );
					vec4 noise = texture2D( normalSampler, uv0 ) +
						texture2D( normalSampler, uv1 ) +
						texture2D( normalSampler, uv2 ) +
						texture2D( normalSampler, uv3 );
					return noise * 0.5 - 1.0;
				}

				void sunLight( const vec3 surfaceNormal, const vec3 eyeDirection, float shiny, float spec, float diffuse, inout vec3 diffuseColor, inout vec3 specularColor ) {
					vec3 reflection = normalize( reflect( -sunDirection, surfaceNormal ) );
					float direction = max( 0.0, dot( eyeDirection, reflection ) );
					specularColor += pow( direction, shiny ) * sunColor * spec;
					diffuseColor += max( dot( sunDirection, surfaceNormal ), 0.0 ) * sunColor * diffuse;
				}

				#include <common>
				#include <packing>
				#include <bsdfs>
				#include <fog_pars_fragment>
				#include <logdepthbuf_pars_fragment>
				#include <lights_pars_begin>
				#include <shadowmap_pars_fragment>
				#include <shadowmask_pars_fragment>

				void main() {

					#include <logdepthbuf_fragment>
					vec4 noise = getNoise( worldPosition.xz * size );
					vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );

					vec3 diffuseLight = vec3(0.0);
					vec3 specularLight = vec3(0.0);

					vec3 worldToEye = eye-worldPosition.xyz;
					vec3 eyeDirection = normalize( worldToEye );
					sunLight( surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight );

					float distance = length(worldToEye);

					vec2 distortion = surfaceNormal.xz * ( 0.001 + 1.0 / distance ) * distortionScale;
					vec3 reflectionSample = vec3( texture2D( mirrorSampler, mirrorCoord.xy / mirrorCoord.w + distortion ) );

					float theta = max( dot( eyeDirection, surfaceNormal ), 0.0 );
					float rf0 = 0.02;
					float reflectance = rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 );
					vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;
					vec3 albedo = mix( ( sunColor * diffuseLight * 0.3 + scatter ) * getShadowMask(), reflectionSample + specularLight, reflectance );
					vec3 outgoingLight = albedo;
					gl_FragColor = vec4( outgoingLight, alpha );

					#include <tonemapping_fragment>
					#include <colorspace_fragment>
					#include <fog_fragment>	
				}`},z=new ce({name:G.name,uniforms:Pe.clone(G.uniforms),vertexShader:G.vertexShader,fragmentShader:G.fragmentShader,lights:!0,side:U,fog:n});z.uniforms.mirrorSampler.value=H.texture,z.uniforms.textureMatrix.value=q,z.uniforms.alpha.value=u,z.uniforms.time.value=C,z.uniforms.normalSampler.value=F,z.uniforms.sunColor.value=R,z.uniforms.waterColor.value=E,z.uniforms.sunDirection.value=w,z.uniforms.distortionScale.value=B,z.uniforms.eye.value=O,r.material=z,r.onBeforeRender=function(T,J,j){if(d.setFromMatrixPosition(r.matrixWorld),v.setFromMatrixPosition(j.matrixWorld),y.extractRotation(r.matrixWorld),i.set(0,0,1),i.applyMatrix4(y),f.subVectors(d,v),f.dot(i)>0)return;f.reflect(i).negate(),f.add(d),y.extractRotation(j.matrixWorld),I.set(0,0,-1),I.applyMatrix4(y),I.add(v),P.subVectors(d,I),P.reflect(i).negate(),P.add(d),g.position.copy(f),g.up.set(0,1,0),g.up.applyMatrix4(y),g.up.reflect(i),g.lookAt(P),g.far=j.far,g.updateMatrixWorld(),g.projectionMatrix.copy(j.projectionMatrix),q.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),q.multiply(g.projectionMatrix),q.multiply(g.matrixWorldInverse),m.setFromNormalAndCoplanarPoint(i,d),m.applyMatrix4(g.matrixWorldInverse),p.set(m.normal.x,m.normal.y,m.normal.z,m.constant);const N=g.projectionMatrix;x.x=(Math.sign(p.x)+N.elements[8])/N.elements[0],x.y=(Math.sign(p.y)+N.elements[9])/N.elements[5],x.z=-1,x.w=(1+N.elements[10])/N.elements[14],p.multiplyScalar(2/p.dot(x)),N.elements[2]=p.x,N.elements[6]=p.y,N.elements[10]=p.z+1-o,N.elements[14]=p.w,O.setFromMatrixPosition(j.matrixWorld);const ae=T.getRenderTarget(),s=T.xr.enabled,b=T.shadowMap.autoUpdate;r.visible=!1,T.xr.enabled=!1,T.shadowMap.autoUpdate=!1,T.setRenderTarget(H),T.state.buffers.depth.setMask(!0),T.autoClear===!1&&T.clear(),T.render(J,g),r.visible=!0,T.xr.enabled=s,T.shadowMap.autoUpdate=b,T.setRenderTarget(ae);const S=j.viewport;S!==void 0&&T.state.viewport(S)}}}const da=0,ha=-8;function pa(A,a){const t=new ze;A.add(t);const r={mode:Rt,posX:Et,posY:zt,posZ:Ft,rotX:0,rotY:0,rotZ:0,reflectorColor:He,distortionScale:Lt,waterColor:Wt,sunColor:Ot,size:It,timeScale:Bt},e=new we().load(bt);e.wrapS=e.wrapT=nt;let l=null,o=null,u=0;const C={value:1};return{group:t,state:r,reflectionStrengthUniform:C,getReflector:()=>l,getWaterMesh:()=>o,initReflector:n=>{const m=new _e(n,n);l=new be(m,{color:new k(He),textureWidth:ge,textureHeight:ge,clipBias:.003}),l.rotation.x=-Math.PI/2,l.renderOrder=1,l.visible=r.mode==="reflector",t.add(l);const i=new _e(n,n);o=new ca(i,{textureWidth:ge,textureHeight:ge,waterNormals:e,sunDirection:a.position.clone().normalize(),sunColor:new k(r.sunColor),waterColor:new k(r.waterColor),distortionScale:r.distortionScale,fog:!1}),o.rotation.x=-Math.PI/2,o.renderOrder=1,o.visible=r.mode==="water";const d=o.material;d.transparent=!0,d.uniforms.size.value=r.size,d.uniforms.uReflectionStrength=C,d.onBeforeCompile=v=>{v.fragmentShader=v.fragmentShader.replace("uniform float alpha;",`uniform float alpha;
				uniform float uReflectionStrength;`).replace("reflectionSample + specularLight, reflectance","( reflectionSample + specularLight ) * uReflectionStrength, reflectance").replace("gl_FragColor = vec4( outgoingLight, alpha );",`float _fade = smoothstep(${ha.toFixed(1)}, ${da.toFixed(1)}, worldPosition.z);
           gl_FragColor = vec4(outgoingLight, alpha * _fade);`)},d.needsUpdate=!0,t.add(o)},setMode:n=>{r.mode=n,l&&(l.visible=n==="reflector"),o&&(o.visible=n==="water")},setPosition:(n,m,i)=>{r.posX=n,r.posY=m,r.posZ=i,t.position.set(n,u+m,i)},setRotation:(n,m,i)=>{r.rotX=n,r.rotY=m,r.rotZ=i,t.rotation.set(n,m,i)},setGroupBaseY:n=>{u=n,t.position.set(r.posX,u+r.posY,r.posZ)},tickTime:n=>{o&&r.mode==="water"&&(o.material.uniforms.time.value+=n*r.timeScale)},dispose:()=>{var n,m;l==null||l.geometry.dispose(),(n=l==null?void 0:l.material)==null||n.dispose(),o==null||o.geometry.dispose(),(m=o==null?void 0:o.material)==null||m.dispose(),A.remove(t)}}}const fa=`
  vec4 sn_mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  float sn_mod289(float x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 sn_permute(vec4 x) { return sn_mod289(((x * 34.0) + 1.0) * x); }
  float sn_permute(float x) { return sn_mod289(((x * 34.0) + 1.0) * x); }
  vec4 sn_taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float sn_taylorInvSqrt(float r) { return 1.79284291400159 - 0.85373472095314 * r; }

  vec4 sn_grad4(float j, vec4 ip) {
    const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
    vec4 p, s;
    p.xyz = floor(fract(vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
    p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
    s = vec4(lessThan(p, vec4(0.0)));
    p.xyz = p.xyz + (s.xyz * 2.0 - 1.0) * s.www;
    return p;
  }

  float snoise4(vec4 v) {
    const vec4 C = vec4(
      0.138196601125011,  // (5 - sqrt(5))/20 = G4
      0.276393202250021,  // 2 * G4
      0.414589803375032,  // 3 * G4
      -0.447213595499958  // -1 + 4 * G4
    );
    const float F4 = 0.309016994374947451;

    // First corner
    vec4 i  = floor(v + dot(v, vec4(F4)));
    vec4 x0 = v - i + dot(i, C.xxxx);

    // Rank the components of x0 to find which simplex cell we are in.
    vec4 i0;
    vec3 isX = step(x0.yzw, x0.xxx);
    vec3 isYZ = step(x0.zww, x0.yyz);
    i0.x = isX.x + isX.y + isX.z;
    i0.yzw = 1.0 - isX;
    i0.y += isYZ.x + isYZ.y;
    i0.zw += 1.0 - isYZ.xy;
    i0.z += isYZ.z;
    i0.w += 1.0 - isYZ.z;

    // i0 now holds the values 0, 1, 2, 3 in some permutation across the channels.
    vec4 i3 = clamp(i0, 0.0, 1.0);
    vec4 i2 = clamp(i0 - 1.0, 0.0, 1.0);
    vec4 i1 = clamp(i0 - 2.0, 0.0, 1.0);

    vec4 x1 = x0 - i1 + C.xxxx;
    vec4 x2 = x0 - i2 + C.yyyy;
    vec4 x3 = x0 - i3 + C.zzzz;
    vec4 x4 = x0 + C.wwww;

    // Permutations
    i = sn_mod289(i);
    float j0 = sn_permute(sn_permute(sn_permute(sn_permute(i.w) + i.z) + i.y) + i.x);
    vec4 j1 = sn_permute(sn_permute(sn_permute(sn_permute(
                 i.w + vec4(i1.w, i2.w, i3.w, 1.0))
               + i.z + vec4(i1.z, i2.z, i3.z, 1.0))
               + i.y + vec4(i1.y, i2.y, i3.y, 1.0))
               + i.x + vec4(i1.x, i2.x, i3.x, 1.0));

    // Gradients: 7x7x6 points over a cube, mapped onto a 4-cross polytope
    vec4 ip = vec4(1.0 / 294.0, 1.0 / 49.0, 1.0 / 7.0, 0.0);

    vec4 p0 = sn_grad4(j0,   ip);
    vec4 p1 = sn_grad4(j1.x, ip);
    vec4 p2 = sn_grad4(j1.y, ip);
    vec4 p3 = sn_grad4(j1.z, ip);
    vec4 p4 = sn_grad4(j1.w, ip);

    // Normalise gradients
    vec4 norm = sn_taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    p4 *= sn_taylorInvSqrt(dot(p4, p4));

    // Mix contributions from the five corners
    vec3 m0 = max(0.6 - vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2)), 0.0);
    vec2 m1 = max(0.6 - vec2(dot(x3, x3), dot(x4, x4)), 0.0);
    m0 = m0 * m0;
    m1 = m1 * m1;
    return 49.0 * (
        dot(m0 * m0, vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2)))
      + dot(m1 * m1, vec2(dot(p3, x3), dot(p4, x4)))
    );
  }

  // Gradient of snoise4 with respect to its SPATIAL xyz only, holding the time axis w
  // fixed — which is what a surface normal wants (the field's rate of change through
  // time doesn't tilt the surface).
  //
  // Four taps at the corners of a regular tetrahedron, rather than the six a central
  // difference would need. eps trades precision against detail: too small and float
  // error swamps the difference, too large and the result smooths over real features.
  vec3 snoise4Grad(vec3 p, float w, float eps) {
    const vec2 k = vec2(1.0, -1.0);
    return (
        k.xyy * snoise4(vec4(p + k.xyy * eps, w))
      + k.yyx * snoise4(vec4(p + k.yyx * eps, w))
      + k.yxy * snoise4(vec4(p + k.yxy * eps, w))
      + k.xxx * snoise4(vec4(p + k.xxx * eps, w))
    ) / (4.0 * eps);
  }
`,ma=`
  uniform float uTime;
  uniform float uWobbleAmp;
  uniform float uWobbleFreq;
  uniform float uWobbleSpeed;
  // Fine grain on the wobble's clamped outer surface — see the crest grain block in
  // main(). uCrestFreq is a multiplier on uWobbleFreq, not an absolute frequency.
  uniform float uCrestAmp;
  uniform float uCrestFreq;
  uniform float uSizeScale;
  uniform float uPixelRatio;
  uniform float uMorph;
  uniform float uPlaneHalf;
  uniform float uTexAspect;
  uniform float uStatueDotSize;
  // How strongly the depth map drives statue dot SIZE (a head-on depth cue: raised dots
  // bloom larger, recessed dots shrink). 0 = uniform size; 0.4 = the lab's 0.6×..1.4× spread.
  uniform float uStatueDepthSize;
  uniform sampler2D uMap;
  // Depth-map relief for the formed statue: in plane state each particle is pushed
  // along Z by a grayscale depth map (white = toward the camera), so the flat grid
  // gains real 3D volume instead of reading as a poster. Sphere state is untouched
  // (planePos is mixed in by uMorph). uDepthDisplace = world-space push at full
  // white→black range; uDepthInvert flips maps whose near = black.
  uniform sampler2D uDepthMap;
  uniform float uDepthDisplace;
  uniform float uDepthInvert;
  // Vertical framing lift for the formed statue only (× uPlaneHalf, morph-gated), so the
  // statue can sit higher in frame — like the lab's centred framing — without moving the
  // shared camera (whose Z the intro/scroll animate) or shifting the sphere/earth state.
  uniform float uStatueLift;
  // Horizontal framing offset for the statue only (× uPlaneHalf, morph-gated): shifts the
  // statue left/right in world so it can be centred in the layout. Sphere state untouched.
  uniform float uStatueOffsetX;
  // Statue-only uniform scale (morph-gated): multiplies the whole plane extent so the STATUE
  // can be larger/smaller than the sphere/earth without changing the shared orbit radius.
  // 1.0 = same size as the base cloud; the sphere state is untouched.
  uniform float uStatueScale;
  uniform vec3 uPointer;
  uniform float uPointerStrength;
  uniform float uPointerRadius;
  uniform float uPointerAttn;
  // Hologram-style size scan: a soft band on the vertical axis whose smoothstep EDGES
  // sweep upward, ENLARGING the dots it passes (points don't move — only the edge values
  // do). It races bottom→top over uHoloSweepDur seconds, then pauses uHoloInterval
  // seconds before the next pass. width = band softness, boost = extra size in the band.
  uniform float uHoloSweepDur;
  uniform float uHoloInterval;
  uniform float uHoloWidth;
  uniform float uHoloSizeBoost;
  // Dispersal exit: 0 = formed statue, 1 = particles flung up and out of the viewport.
  uniform float uDisperse;
  // Fresnel/rim visibility: dims particles whose sphere normal faces the camera (or
  // directly away) and keeps those at grazing angles (the silhouette / sides) bright, so
  // the cloud reads as a rim-lit shell. uFresnelPower = rim tightness, uFresnelFloor =
  // min visibility of the front-facing dots. Sphere state only (faded out by uMorph).
  uniform float uFresnelPower;
  uniform float uFresnelFloor;

  attribute vec3 aOrbit;   // (radius, theta, phi) — fixed angular position on sphere
  attribute float aSize;
  attribute vec3 aSeed;    // .z used for color mix
  attribute vec2 aPlanePos; // unit-square (x, y) in [-1, 1]

  varying float vMix;
  varying vec3 vTexColor;
  varying float vTexAlpha;
  varying float vFresnel;
  varying float vStatueDepth;
  // World-space Y of this particle, handed to the fragment shader so it can dim dots
  // that sit below the water plane's surface (the "submerged" cue).
  varying float vWorldY;

  ${fa}

  // ---- Wobble height field ------------------------------------------------------
  // Fractal Brownian motion over the 4D simplex noise above: each octave doubles the
  // frequency and halves the weight, so the shell gets large slow swells WITH fine
  // detail riding on them — a single-scale field (which is all two sine waves can give
  // you) is what reads as a repeating corrugation.
  const int WOBBLE_OCTAVES = 3;
  const float WOBBLE_LACUNARITY = 2.0; // frequency step per octave
  const float WOBBLE_GAIN = 0.5;       // weight step per octave

  float wobbleFbm(vec3 p, float w) {
    float sum = 0.0;
    float amp = 1.0;
    float norm = 0.0;
    for (int i = 0; i < WOBBLE_OCTAVES; i++) {
      sum += amp * snoise4(vec4(p, w));
      norm += amp;
      p *= WOBBLE_LACUNARITY;
      // Shove each octave off the origin so their zero-crossings don't stack up there
      // (simplex noise is always 0 at lattice corners; unoffset octaves would leave a
      // visibly flat, detail-free patch wherever those coincide).
      p += 17.3;
      w *= WOBBLE_LACUNARITY;
      amp *= WOBBLE_GAIN;
    }
    return sum / norm; // back to ~[-1, 1]
  }

  // Gradient of wobbleFbm, by the tetrahedron finite-difference trick: four taps at the
  // corners of a regular tetrahedron rather than the six a central difference needs.
  // Noise has no cheap analytic derivative (the sines this replaced did — that was the
  // old dArgA_dt / dArgB_dt block), and the Fresnel rim needs the surface normal.
  // eps is a compromise: too small and float precision eats the difference, too large
  // and the normal smooths over the finest octave.
  vec3 wobbleFbmGrad(vec3 p, float w) {
    const vec2 k = vec2(1.0, -1.0);
    const float eps = 0.02;
    return (
        k.xyy * wobbleFbm(p + k.xyy * eps, w)
      + k.yyx * wobbleFbm(p + k.yyx * eps, w)
      + k.yxy * wobbleFbm(p + k.yxy * eps, w)
      + k.xxx * wobbleFbm(p + k.xxx * eps, w)
    ) / (4.0 * eps);
  }

  void main() {
    float r     = aOrbit.x;
    float theta = aOrbit.y;
    float phi   = aOrbit.z;

    // Fixed point on sphere surface, plus its parametric tangents (needed for the wave
    // normal further down).
    float su = sin(theta), cu = cos(theta);
    float sv = sin(phi),   cv = cos(phi);
    vec3 normal   = vec3(su * cv, cu, su * sv);
    vec3 dN_dtheta = vec3(cu * cv, -su, cu * sv);
    vec3 dN_dphi   = vec3(-su * sv, 0.0, su * cv);

    // Radial displacement (height field), from fbm simplex noise over this particle's
    // direction on the sphere, with TIME as the 4th noise dimension.
    //
    // This used to be two summed sine waves. Each was LINEAR in position, which makes it
    // a plane wave: one over normal.y gave latitude rings, one over (normal.x - normal.z)
    // gave diagonals, and their sum was a fixed interference lattice — only ~3 cycles
    // each way, so ~9 identical dimples covering the whole globe. Time entered as a pure
    // additive phase, so that lattice could only slide past rigidly, never change shape,
    // and the rational frequency ratios (0.7, 1.3) made the whole thing loop exactly
    // every ~126s. Noise is non-linear in position (no lattice) and the time dimension
    // makes the field evolve in place, so nothing repeats.
    vec3 nP = normal * uWobbleFreq;
    float nW = uTime * uWobbleSpeed;
    float h = wobbleFbm(nP, nW); // ~[-1, 1]

    // Keep only the NEGATIVE half of the field: crests clamp flat AT the base radius r
    // and only troughs carve inward, so the shell reads as pocked/cratered. (The previous
    // version remapped the full range into [-1, 0] instead of restricting to it, which
    // sank every particle by amp/2 on average and meant the surface essentially never
    // reached r.) uWobbleAmp is the max inward dip; particles never pass outside r.
    float relief = min(h, 0.0); // [-1, 0]

    // Crest grain. min() above clamps EVERY crest to exactly r, which lands a large share
    // of the cloud on a mathematically perfect sphere — that plateau is what reads as a
    // hard, uniform outer edge. This is a second, finer noise that roughens it.
    //
    // It is offset into a far corner of the noise domain (+41.7) so it is statistically
    // independent of the relief field rather than a scaled copy of it, and it is remapped
    // to [-1, 0] the same way, so it can only ever pull inward: r stays a hard ceiling
    // that nothing crosses, but nothing sits exactly on it either.
    //
    // Applied everywhere, not just on the crest — real surfaces carry grain into their
    // hollows too, and gating it to the plateau would only trade one visible boundary for
    // another. Costs a mean uCrestAmp/2 of overall shrink, since the field averages -0.5.
    float grainScale = uWobbleFreq * uCrestFreq;
    vec3 gP = normal * grainScale + 41.7;
    float gW = nW * 1.7; // finer detail churns faster than the swells it rides on
    float g = snoise4(vec4(gP, gW));
    float grain = (g - 1.0) * 0.5; // [-1, 0]

    float radius = r + relief * uWobbleAmp + grain * uCrestAmp;
    vec3 spherePos = normal * radius;

    // Perturbed normal of the WAVE surface (not the base sphere) — this is what the
    // Fresnel rim below uses, so wave flanks anywhere in the cloud light up when they
    // tilt toward the sides of the view, regardless of how near/far the particle is.
    // Tangents of P = normal * radius: dP = dNormal*radius + normal*dRadius. The field's
    // own 3D gradient comes from finite differences (see wobbleFbmGrad); the chain rule
    // back to the sphere's (theta, phi) params is a dot with the base normal's tangents,
    // scaled by uWobbleFreq = d(nP)/d(normal).
    vec3 gradH = wobbleFbmGrad(nP, nW);
    float dh_dt = dot(gradH, dN_dtheta * uWobbleFreq);
    float dh_dp = dot(gradH, dN_dphi   * uWobbleFreq);
    // min(h, 0) has zero slope wherever the field is clamped, so the flat crests must get
    // a flat normal too — step() gates the relief's radial term rather than branching.
    float reliefGate = uWobbleAmp * step(h, 0.0);

    // The grain's slope, on the same chain rule but through its own (coarser-to-finer)
    // domain scale. This is what actually breaks up the Fresnel rim: the grain's amplitude
    // is small but its frequency is high, and slope goes as amplitude x frequency, so it
    // perturbs the normal far more than its depth alone suggests. That is deliberate —
    // the rim reading uniform was the complaint. Turn uCrestAmp down if it sparkles.
    vec3 gradG = snoise4Grad(gP, gW, 0.01);
    float dg_dt = dot(gradG, dN_dtheta * grainScale);
    float dg_dp = dot(gradG, dN_dphi   * grainScale);
    float grainGate = uCrestAmp * 0.5; // d(grain)/dg = 0.5, from the [-1, 0] remap

    float dRad_dt = reliefGate * dh_dt + grainGate * dg_dt;
    float dRad_dp = reliefGate * dh_dp + grainGate * dg_dp;
    vec3 dP_dtheta = dN_dtheta * radius + normal * dRad_dt;
    vec3 dP_dphi   = dN_dphi   * radius + normal * dRad_dp;
    vec3 waveCross = cross(dP_dtheta, dP_dphi);
    float waveLen = length(waveCross);
    // Guard the poles (tangents degenerate there) by falling back to the radial normal.
    vec3 waveNormal = waveLen > 1e-5 ? waveCross / waveLen : normal;
    if (dot(waveNormal, normal) < 0.0) waveNormal = -waveNormal;
    // Depth-map Z relief. Sample the depth at this particle's plane UV and push it
    // along Z, centred on 0 so the statue stays put (near features come toward the
    // camera, far ones recede). Only the plane state uses this — pos mixes it in by uMorph.
    vec2 planeUv = aPlanePos * 0.5 + 0.5;
    float planeDepth = texture2D(uDepthMap, planeUv).r;
    planeDepth = mix(planeDepth, 1.0 - planeDepth, uDepthInvert);
    float planeZ = (planeDepth - 0.5) * uDepthDisplace;
    vStatueDepth = planeDepth; // 0 = recessed/far, 1 = raised/near — drives the depth shading
    vec3 planePos  = vec3(aPlanePos.x * uPlaneHalf * uTexAspect + uStatueOffsetX * uPlaneHalf, aPlanePos.y * uPlaneHalf + uStatueLift * uPlaneHalf, planeZ) * uStatueScale;
    vec3 pos = mix(spherePos, planePos, uMorph);

    // Dispersal exit (experiment): as uDisperse 0→1, fling each particle upward with a
    // per-particle random lateral scatter and speed, so the FORMED statue flies up and
    // out of the viewport. Gated by uMorph so it only affects the statue state — the
    // earth/sphere reuse is untouched when uMorph = 0.
    float rndX = fract(aSeed.x * 1.7) - 0.5;
    float rndZ = fract(aSeed.y * 1.3) - 0.5;
    float rndSpd = 0.6 + fract(aSeed.x + aSeed.y * 2.0); // ~0.6 .. 1.6 per particle
    vec3 disp = vec3(rndX * 2.5, rndSpd * 9.0, rndZ * 2.5);
    pos += disp * (uDisperse * uMorph);

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vec3 toPointer = worldPos.xyz - uPointer;
    float d2 = dot(toPointer, toPointer);
    float falloff = exp(-d2 / max(0.0001, uPointerRadius * uPointerRadius));
    worldPos.xyz += normalize(toPointer + vec3(1e-4)) * falloff * uPointerStrength * uPointerAttn * mix(0.04, 0.35, uMorph);

    // Hand the final world height to the fragment shader for the submerge dimming.
    vWorldY = worldPos.y;

    vMix = aSeed.z * 0.5 + 0.5;

    // Sample the statue texture at this particle's plane UV — used by the fragment
    // shader to colour and alpha-mask the particle when in plane state.
    vec2 uv = aPlanePos * 0.5 + 0.5;
    vec4 tex = texture2D(uMap, uv);
    vTexColor = tex.rgb;
    vTexAlpha = tex.a;

    // UNIFORM sizing for the statue: every dot is the same base size (uStatueDotSize),
    // gently enlarged with depth so the
    // nearer relief reads slightly bigger — it does NOT encode luminance. The image now
    // reads from COLOUR + the depth-map Z relief, not from dot size. Silhouette-gated by
    // tex.a below so cells outside the statue collapse to nothing. Sphere state (uMorph = 0)
    // keeps the per-particle random aSize.
    // Depth→size cue: centred on 1.0 (mid-depth), spreading to 1±uStatueDepthSize so raised
    // dots are larger and recessed smaller. At uStatueDepthSize = 0.4 this equals the lab's
    // 0.6 + depth·0.8. Scaled by uStatueDotSize below.
    float lit = mix(1.0 - uStatueDepthSize, 1.0 + uStatueDepthSize, planeDepth);
    // Hologram size scan: a soft band races up the vertical (uv.y) axis then pauses.
    // Over uHoloSweepDur seconds scanPos travels from just below the bottom to just past
    // the top (dots in the band grow by uHoloSizeBoost); for the remaining uHoloInterval
    // seconds it sits off the top edge — NO wrap — so the band is idle between passes.
    // Folded into statueSize (× tex.a here, × uMorph below) so it's silhouette-gated and
    // only fires on the formed statue.
    float holoPeriod = uHoloSweepDur + uHoloInterval;
    float sweep = mod(uTime, holoPeriod) / max(0.0001, uHoloSweepDur); // 0..1 sweep, >1 idle
    float scanPos = mix(-uHoloWidth, 1.0 + uHoloWidth, sweep);
    float dEdge = abs(uv.y - scanPos);
    float scanBand = 1.0 - smoothstep(0.0, uHoloWidth, dEdge);
    // uStatueDotSize scales the whole statue size (base + holo boost) so the scan stays
    // proportional to the dot size regardless of how small/large the dots are set.
    float statueSize = tex.a * uStatueDotSize * (lit + scanBand * uHoloSizeBoost);
    // Sphere keeps the per-particle random aSize; the statue swaps to the uniform
    // statueSize (no aSize), so plane-state dots are all one size like the lab.
    float sizeFactor = mix(aSize, statueSize, uMorph);

    vec4 mvPosition = viewMatrix * worldPos;

    // Rim / Fresnel driven by the WAVE normal: bright where a wave flank faces the sides
    // of the view (normal perpendicular to the eye), dim where it faces the camera (or
    // away). abs() so both facings dim equally. Because it uses the wave normal — not the
    // sphere silhouette or the particle's depth — every wave across the cloud is
    // emphasized, near or far. morph-gated so the flat statue is unaffected. normalMatrix
    // is three's auto-injected model-view normal matrix.
    vec3 nView = normalize(normalMatrix * waveNormal);
    vec3 vDir = normalize(-mvPosition.xyz);
    float fres = pow(1.0 - abs(dot(nView, vDir)), uFresnelPower);
    vFresnel = mix(mix(uFresnelFloor, 1.0, fres), 1.0, uMorph);

    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = sizeFactor * uSizeScale * uPixelRatio / max(0.0001, -mvPosition.z);
  }
`,va=`
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uTint;
  uniform float uOpacity;
  uniform float uMorph;
  uniform float uStatueColorGain;
  uniform float uCloudColorGain;
  uniform float uCloudBrightness;
  uniform float uHexShape;
  uniform float uStatueDepthDim;
  // Submerge dimming (earth/atmosphere reused behind #account-steps, and the hero water
  // rise): dots below the water surface fade toward uSubmergeAlpha. uWaterY = the water
  // plane's world height (fed per-frame from globe.ts); uSubmergeBand = the soft fade
  // depth below the surface; uSubmergeAlpha = alpha of a fully-submerged dot (1 = off).
  uniform float uWaterY;
  uniform float uSubmergeBand;
  uniform float uSubmergeAlpha;

  varying float vMix;
  varying vec3 vTexColor;
  varying float vTexAlpha;
  varying float vFresnel;
  varying float vStatueDepth;
  varying float vWorldY;

  void main() {
    if (uOpacity < 0.01) discard;
    // Sprite mask: round dot, or a pointy-top hexagon for the formed statue. The hex
    // is gated by uMorph so the sphere/earth dots stay round; both hit their edge at 0.5.
    vec2 pc = gl_PointCoord - 0.5;
    vec2 pa = abs(pc);
    float hexD = max(pa.y * 0.8660254 + pa.x * 0.5, pa.x);
    float d = mix(length(pc), hexD, uHexShape * uMorph);
    float a = 1.0 - smoothstep(0.4, 0.5, d);
    if (a <= 0.0) discard;
    vec3 baseCol = mix(uColorA, uColorB, vMix);
    // Sphere/earth-state colour intensity. Two SEPARATE knobs, because "more intense"
    // pulls two ways under ACES tone mapping:
    //   uCloudColorGain — extrapolates away from grey to raise SATURATION (same trick
    //     as uStatueColorGain below). This is what actually makes the green greener.
    //   uCloudBrightness — raises luminance to feed the bloom pass. Past ~1.5 ACES rolls
    //     saturated highlights toward WHITE, so over-cranking this de-greens the cloud.
    // Applied to baseCol only, so the statue (vTexColor) keeps its own grading.
    float baseLum = dot(baseCol, vec3(0.299, 0.587, 0.114));
    baseCol = mix(vec3(baseLum), baseCol, uCloudColorGain) * uCloudBrightness;
    vec3 col = mix(baseCol, vTexColor, uMorph);
    col = col * mix(vec3(1.0), uTint, uMorph);
    // In plane state, push colour intensity: extrapolate away from grey to raise
    // saturation so the statue's dots read vivid rather than washed out. Blended in by
    // uMorph so the sphere state is untouched. uStatueColorGain tunable in the debug GUI.
    float cl = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, mix(vec3(cl), col, uStatueColorGain), uMorph);
    // Depth shading: dim the RECESSED dots (low vStatueDepth) and keep RAISED dots bright,
    // so brightness encodes the relief. Because the statue is viewed head-on (Z relief along
    // the view axis, no parallax) and blends additively (no occlusion), this shading is what
    // actually makes the 3D read. uStatueDepthDim = brightness of the deepest dots (1 = off).
    // Morph-gated so the sphere/earth state is untouched.
    float depthShade = mix(1.0, mix(uStatueDepthDim, 1.0, vStatueDepth), uMorph);
    col *= depthShade;
    // Sculpt with luminance: silhouette alpha gates outside the statue,
    // a sqrt-lifted, floored luminance modulates inside so highlights pop
    // without dark interiors being fully discarded.
    float intensity = dot(vTexColor, vec3(0.299, 0.587, 0.114));
    float lum = mix(0.4, 1.0, sqrt(intensity));
    float silhouette = mix(1.0, vTexAlpha * lum, uMorph);
    float alpha = a * uOpacity * silhouette * vFresnel;
    // "Submerged" dimming: fade dots that sit below the water surface (vWorldY < uWaterY)
    // toward uSubmergeAlpha over a soft band, so the earth/atmosphere reads as sinking
    // under the risen water plane. Earth/sphere state only (× (1.0 - uMorph)) so the
    // statue phase — where the water is cleared — is untouched.
    float submerged = smoothstep(uWaterY, uWaterY - uSubmergeBand, vWorldY) * (1.0 - uMorph);
    // Dim COLOUR as well as alpha. Alpha alone barely changes the bright, bloomed front
    // dots (bloom dominates) while the already-dark far side vanishes — which reads as a
    // depth/backside effect instead of a horizontal waterline. Dimming colour makes the
    // front respond too, so the cut reads as vertical on both hemispheres.
    float submergeDim = mix(1.0, uSubmergeAlpha, submerged);
    col *= submergeDim;
    alpha *= submergeDim;
    if (alpha <= 0.0) discard;
    gl_FragColor = vec4(col, alpha);
  }
`,ga=`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,wa=`
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    // Broad, soft radial falloff from centre (elliptical, following the plane's shape).
    float d = length(vUv - 0.5) * 2.0;
    float glow = smoothstep(1.0, 0.0, d);
    glow = pow(glow, 1.1);
    // Additive: rgb carries the light, alpha kept at 1 (AdditiveBlending uses srcAlpha·rgb).
    gl_FragColor = vec4(uColor * glow * uIntensity, 1.0);
  }
`;function xa(A,a){return A+Math.random()*(a-A)}function ba(A){const a={wobbleAmp:Ut,wobbleFreq:Gt,wobbleSpeed:Ht,crestAmp:Yt,crestFreq:qt,size:jt,opacity:Vt,colorA:$e,colorB:Xt,rMult:Zt,morph:Kt},t=new Ne(new Uint8Array([0,0,0,0]),1,1,Ue);t.needsUpdate=!0;const r=new Ne(new Uint8Array([128,128,128,255]),1,1,Ue);r.needsUpdate=!0;const e={uTime:{value:0},uWobbleAmp:{value:a.wobbleAmp},uWobbleFreq:{value:a.wobbleFreq},uWobbleSpeed:{value:a.wobbleSpeed},uCrestAmp:{value:a.crestAmp},uCrestFreq:{value:a.crestFreq},uSizeScale:{value:a.size},uPixelRatio:{value:Math.min(window.devicePixelRatio,2)},uColorA:{value:new k(a.colorA)},uColorB:{value:new k(a.colorB)},uTint:{value:new k(1,1,1)},uOpacity:{value:a.opacity},uMorph:{value:a.morph},uPlaneHalf:{value:1},uMap:{value:t},uTexAspect:{value:1},uDepthMap:{value:r},uDepthDisplace:{value:.6},uDepthInvert:{value:0},uStatueLift:{value:0},uStatueOffsetX:{value:.15},uStatueScale:{value:1.12},uStatueDepthDim:{value:1.5},uStatueDepthSize:{value:.35},uHexShape:{value:1},uStatueDotSize:{value:2.65},uStatueColorGain:{value:1.4},uCloudColorGain:{value:kt},uCloudBrightness:{value:Nt},uHoloSweepDur:{value:.6},uHoloInterval:{value:2.5},uHoloWidth:{value:.05},uHoloSizeBoost:{value:.6},uDisperse:{value:0},uFresnelPower:{value:2},uFresnelFloor:{value:.2},uPointer:{value:new M},uPointerStrength:{value:0},uPointerRadius:{value:.6},uPointerAttn:{value:1},uWaterY:{value:-1e3},uSubmergeBand:{value:.27},uSubmergeAlpha:{value:.2}},l=new ce({vertexShader:ma,fragmentShader:va,uniforms:e,transparent:!0,depthWrite:!1});let o=null,u=null,C=1,F=null,w=null;const R=new k("#0e5a3c"),E={value:.65};let O=null,B=!0;const U=new M,n=new M;let m=0,i=0;const d=new Te,v=new Te,y={yaw:.4,pitch:.3,leftLimit:-.25,rightLimit:.15,bottomLimit:-.2,topLimit:.35},I=()=>{if(!o)return;const s=C*a.rMult,b=o.getAttribute("aOrbit");for(let S=0;S<$;S++)b.setX(S,s);b.needsUpdate=!0,e.uPlaneHalf.value=s},p=s=>{C=s;const b=C*a.rMult,S=new Float32Array($*3),_=new Float32Array($),D=new Float32Array($*3),V=new Float32Array($*2);for(let W=0;W<$;W++){const Z=Math.acos(2*Math.random()-1),ee=Math.random()*Math.PI*2;S[W*3+0]=b,S[W*3+1]=Z,S[W*3+2]=ee,_[W]=xa(.6,1.6),D[W*3+0]=Math.random()*100,D[W*3+1]=Math.random()*100,D[W*3+2]=Math.random()*2-1,V[W*2+0]=Math.random()*2-1,V[W*2+1]=Math.random()*2-1}o=new Fe,o.setAttribute("position",new Q(new Float32Array($*3),3)),o.setAttribute("aOrbit",new Q(S,3)),o.setAttribute("aSize",new Q(_,1)),o.setAttribute("aSeed",new Q(D,3)),o.setAttribute("aPlanePos",new Q(V,2));const X=Math.max(b+a.wobbleAmp,b*Math.SQRT2)+1;o.boundingSphere=new Xe(new M,X),e.uPlaneHalf.value=b,u=new Le(o,l),u.frustumCulled=!1,A.add(u),F&&(T(),F=null)},f=s=>{a.rMult=s,I()},P=s=>{e.uTime.value+=s,e.uWobbleAmp.value=a.wobbleAmp,e.uWobbleFreq.value=a.wobbleFreq,e.uWobbleSpeed.value=a.wobbleSpeed,e.uCrestAmp.value=a.crestAmp,e.uCrestFreq.value=a.crestFreq,e.uSizeScale.value=a.size,e.uOpacity.value=a.opacity,e.uMorph.value=a.morph;const b=1-Math.exp(-s*6),S=1-Math.exp(-s*4);if(n.lerp(U,b),i+=(m-i)*S,e.uPointer.value.copy(n),e.uPointerStrength.value=i,u){u.visible=a.opacity>0;const _=e.uTime.value,D=a.morph;v.lerp(d,b),u.rotation.y=Math.sin(_)*.05+D*(Math.sin(_*.35)*.14+v.x*y.yaw),u.rotation.x=D*(Math.sin(_*.27)*.07-v.y*y.pitch)}if(w&&u){const _=w.material;_.uniforms.uIntensity.value=E.value*a.morph*a.opacity,w.visible=_.uniforms.uIntensity.value>.001,w.rotation.set(-u.rotation.x,-u.rotation.y,0)}},x=s=>{s?(U.copy(s),m=1):(m=0,d.set(0,0))},q=(s,b)=>{d.set(y.leftLimit+(s+1)*.5*(y.rightLimit-y.leftLimit),y.bottomLimit+(b+1)*.5*(y.topLimit-y.bottomLimit))},g=()=>{w&&(w.geometry.dispose(),w.material.dispose()),u&&A.remove(u),o==null||o.dispose(),l.dispose()},H=s=>{a.colorA=s,e.uColorA.value.set(s)},G=s=>{a.colorB=s,e.uColorB.value.set(s)},z=s=>{const b=s.image;if(!b)return;const S=b.naturalWidth||b.width,_=b.naturalHeight||b.height;if(!S||!_)return;const D=document.createElement("canvas");D.width=S,D.height=_;const V=D.getContext("2d",{willReadFrequently:!0});if(!V)return;V.drawImage(b,0,0,S,_);const X=V.getImageData(0,0,S,_).data;let W=0;for(let Z=3;Z<X.length;Z+=4)X[Z]>=128&&W++;O={data:X,w:S,h:_,frac:Math.max(.05,W/(S*_))}},T=()=>{if(!o)return;const s=e.uTexAspect.value||1,b=o.getAttribute("aPlanePos");if(O){const{data:S,w:_,h:D}=O,V=Math.floor($*.97/O.frac),X=Math.max(2,Math.round(Math.sqrt(V*s*.8660254))),W=s,Z=2*W/(X-1),ee=Z*.8660254,de=Math.floor(2/ee)+1,re=[],se=[];for(let Y=0;Y<de;Y++){const oe=B?Y%2*.5*Z:0,le=-1+Y*ee,he=(le+1)/2,pe=Math.min(D-1,Math.max(0,Math.floor((1-he)*D)));for(let fe=0;fe<X;fe++){const c=(-W+fe*Z+oe)/W,L=c*.5+.5,K=Math.min(_-1,Math.max(0,Math.floor(L*_)));S[(pe*_+K)*4+3]<128||(re.push(c),se.push(le))}}const ie=re.length;for(let Y=0;Y<$;Y++){const oe=Y<ie?Y:Math.floor(Math.random()*ie);b.setXY(Y,re[oe]??0,se[oe]??0)}}else{const S=Math.max(1,Math.round(Math.sqrt($*s))),_=Math.ceil($/S);for(let D=0;D<$;D++){const V=D%S,X=Math.floor(D/S),W=B?X%2*.5:0,Z=(V+.5+W)/S,ee=1-(X+.5)/_;b.setXY(D,Z*2-1,ee*2-1)}}b.needsUpdate=!0,J()},J=()=>{if(w||!u)return;const s=e.uPlaneHalf.value,b=new _e(s*3.6,s*2.8),S=new ce({vertexShader:ga,fragmentShader:wa,uniforms:{uColor:{value:R},uIntensity:{value:0}},transparent:!0,depthWrite:!1,blending:Ze});w=new Re(b,S),w.position.set(0,e.uStatueLift.value*s+s*.2,-s*.5),w.renderOrder=-1,u.add(w)};return{state:a,get object(){return u},get colorUniformA(){return e.uColorA.value},get colorUniformB(){return e.uColorB.value},get tintUniform(){return e.uTint.value},get pointerAttnUniform(){return e.uPointerAttn},get statueDotSizeUniform(){return e.uStatueDotSize},get statueColorGainUniform(){return e.uStatueColorGain},get cloudColorGainUniform(){return e.uCloudColorGain},get cloudBrightnessUniform(){return e.uCloudBrightness},get holoSweepDurUniform(){return e.uHoloSweepDur},get holoIntervalUniform(){return e.uHoloInterval},get holoWidthUniform(){return e.uHoloWidth},get holoSizeBoostUniform(){return e.uHoloSizeBoost},get disperseUniform(){return e.uDisperse},get fresnelPowerUniform(){return e.uFresnelPower},get fresnelFloorUniform(){return e.uFresnelFloor},get depthDisplaceUniform(){return e.uDepthDisplace},get depthInvertUniform(){return e.uDepthInvert},get statueLiftUniform(){return e.uStatueLift},get statueOffsetXUniform(){return e.uStatueOffsetX},get statueScaleUniform(){return e.uStatueScale},get statueDepthDimUniform(){return e.uStatueDepthDim},get statueDepthSizeUniform(){return e.uStatueDepthSize},get statueGlowColorUniform(){return R},get statueGlowIntensityUniform(){return E},get waterYUniform(){return e.uWaterY},get submergeBandUniform(){return e.uSubmergeBand},get submergeAlphaUniform(){return e.uSubmergeAlpha},get statueTilt(){return y},get hexShapeUniform(){return e.uHexShape},init:p,tick:P,setRadius:f,setColorA:H,setColorB:G,setStatueTexture:(s,b)=>{e.uMap.value=s,e.uTexAspect.value=b,z(s),o?T():F=s},setDepthTexture:s=>{s.colorSpace=st,e.uDepthMap.value=s},setHexPack:s=>{B=s,T()},setPointer:x,setPointerScreen:q,get raycastRadius(){return C*a.rMult},dispose:g}}const ne=700,Sa=.4,ya=2,Ma=.6,Aa=1.4,Ca=.045,Pa=.28,_a=.05,Ye=.14,Ta="#8feede",Da="#f7fffb",Ra=.9,Ea=.75,za=1.75,Fa=.06,La=1.35,Wa=.14,Oa=.3,Ia=.45,Ba=.35,ka=.65,Na=`
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSizeScale;
  uniform float uShellRadius;
  uniform float uStartRadius;
  uniform float uEndRadius;
  uniform float uDriftSpeed;
  uniform float uDriftEase;
  uniform float uOrbitTurns;
  uniform float uOrbitEase;
  uniform float uBirthFade;
  uniform float uDeathFade;
  uniform float uFarShrink;

  attribute float aSize;
  attribute float aPhase;
  attribute float aSeed;
  attribute float aSpeed;

  varying float vDepthAlpha;
  varying float vTwinkle;
  varying float vLifeAlpha;
  varying float vMix;

  void main() {
    // Looping lifetime, 0 (born at the surface) → 1 (dissolved at the far edge).
    float life = fract(uTime * uDriftSpeed * aSpeed + aSeed);
    // Ease so particles linger near the surface then accelerate away as they recede.
    float eased = pow(life, uDriftEase);
    float radius = mix(uStartRadius, uEndRadius, eased);

    // Orbit: sweep each particle around the cloud's Y axis as it lives, so it arcs
    // around the globe instead of only fleeing it.
    //
    // The angle is driven by LIFE, not raw uTime. Deriving an angular velocity from the
    // current radius and multiplying by elapsed time would jitter badly: as radius
    // drifts, a tiny change in that rate multiplied by an ever-growing uTime swings the
    // angle wildly frame to frame. Anchoring to life keeps every particle's path a
    // continuous function of its own cycle. The wrap at life 1 -> 0 is invisible because
    // the birth/death fades already pin alpha to 0 at both ends.
    //
    // uOrbitEase < 1 front-loads the sweep into the slow, near-surface part of the
    // drift, so the stream shears into trailing arms as it recedes. Per-particle
    // variation is free: aSeed staggers the phase and aSpeed the rate, so no extra
    // attribute is needed to break the lockstep a rigid tumble suffers from.
    float ang = uOrbitTurns * 6.2831853 * pow(life, uOrbitEase);
    float ca = cos(ang);
    float sa = sin(ang);
    // position holds the unit outward direction; rotate it, then scale by the drifting
    // radius. The tumble still lives in modelMatrix on top of this.
    vec3 dir = vec3(
      position.x * ca - position.z * sa,
      position.y,
      position.x * sa + position.z * ca
    );
    vec3 localPos = dir * radius;
    vec4 worldPos = modelMatrix * vec4(localPos, 1.0);

    vec4 mvPosition = viewMatrix * worldPos;
    // Sphere-center depth in view space. The cloud is centred on the globe (origin),
    // so this is just the camera→origin distance regardless of spin/parallax.
    vec4 centerView = viewMatrix * modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);

    // The cloud's scale, read straight off the model matrix: parallax/tumble are pure
    // rotations, which don't change a column's length, so this column length IS the
    // scale scroll.ts tweens onto the group. Everything below that mixes world-space
    // quantities with the local-space uniforms has to divide it back out.
    float mscale = length(modelMatrix[0].xyz);

    // rel > 0 : particle is nearer the camera than centre (front) → fade out.
    // rel < 0 : particle is behind the centre (back) → full alpha.
    // rel is world-space (already scaled) but uShellRadius is a local-space radius, so
    // without mscale the ratio drifts as the globe shrinks and the fade over-shoots.
    float rel = mvPosition.z - centerView.z;
    float depthT = clamp(rel / max(1e-4, uShellRadius * mscale), -1.0, 1.0);
    vDepthAlpha = 1.0 - smoothstep(-0.5, 0.5, depthT);

    // Fade in at birth (no pop at the surface) and out at death (dissolve into distance).
    float birth = smoothstep(0.0, uBirthFade, life);
    float death = 1.0 - smoothstep(1.0 - uDeathFade, 1.0, life);
    vLifeAlpha = birth * death;

    vTwinkle = 0.7 + 0.3 * sin(uTime * 0.6 + aPhase * 6.2831853);
    vMix = aPhase;

    // Shrink as it recedes to reinforce the "going further away" read.
    float sizeLife = mix(1.0, uFarShrink, life);

    gl_Position = projectionMatrix * mvPosition;
    // mscale keeps the dots shrinking WITH the cloud. gl_PointSize is a screen-space
    // size, so distance attenuation alone leaves every dot the same pixel size as the
    // group scales down — the cloud would contract but read as denser, not smaller.
    // (Same trap as PointsMaterial.size on the earth dots.)
    gl_PointSize = aSize * sizeLife * mscale * uSizeScale * uPixelRatio / max(0.0001, -mvPosition.z);
  }
`,Ua=`
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;

  varying float vDepthAlpha;
  varying float vTwinkle;
  varying float vLifeAlpha;
  varying float vMix;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = 1.0 - smoothstep(0.35, 0.5, d);
    if (a <= 0.0) discard;
    float alpha = a * uOpacity * vDepthAlpha * vTwinkle * vLifeAlpha;
    if (alpha <= 0.001) discard;
    vec3 col = mix(uColorA, uColorB, vMix);
    gl_FragColor = vec4(col, alpha);
  }
`;function qe(A,a){return A+Math.random()*(a-A)}function Ga(A){const a=new ze;A.add(a);const t={startMult:Ea,endMult:za,driftSpeed:Fa,driftEase:La,orbitTurns:Ba,orbitEase:ka,birthFade:Wa,deathFade:Oa,farShrink:Ia,sizeScale:11},r={uTime:{value:0},uPixelRatio:{value:Math.min(window.devicePixelRatio,2)},uSizeScale:{value:t.sizeScale},uShellRadius:{value:1},uStartRadius:{value:1},uEndRadius:{value:1},uDriftSpeed:{value:t.driftSpeed},uDriftEase:{value:t.driftEase},uOrbitTurns:{value:t.orbitTurns},uOrbitEase:{value:t.orbitEase},uBirthFade:{value:t.birthFade},uDeathFade:{value:t.deathFade},uFarShrink:{value:t.farShrink},uColorA:{value:new k(Ta)},uColorB:{value:new k(Da)},uOpacity:{value:Ra}},e=new ce({vertexShader:Na,fragmentShader:Ua,uniforms:r,transparent:!0,depthWrite:!1,depthTest:!0,blending:Ze});let l=null,o=null,u=1,C=0;const F=new M(0,1,0),w=new lt;let R=0,E=0;const O=()=>{r.uStartRadius.value=u*t.startMult,r.uEndRadius.value=u*t.endMult,r.uShellRadius.value=u*t.endMult,r.uDriftSpeed.value=t.driftSpeed,r.uDriftEase.value=t.driftEase,r.uOrbitTurns.value=t.orbitTurns,r.uOrbitEase.value=t.orbitEase,r.uBirthFade.value=t.birthFade,r.uDeathFade.value=t.deathFade,r.uFarShrink.value=t.farShrink,r.uSizeScale.value=t.sizeScale},B=i=>{u=i;const d=new Float32Array(ne*3),v=new Float32Array(ne),y=new Float32Array(ne),I=new Float32Array(ne),p=new Float32Array(ne);for(let f=0;f<ne;f++){const P=Math.acos(2*Math.random()-1),x=Math.random()*Math.PI*2;d[f*3+0]=Math.sin(P)*Math.cos(x),d[f*3+1]=Math.cos(P),d[f*3+2]=Math.sin(P)*Math.sin(x),v[f]=qe(Sa,ya),y[f]=Math.random(),I[f]=Math.random(),p[f]=qe(Ma,Aa)}l=new Fe,l.setAttribute("position",new Q(d,3)),l.setAttribute("aSize",new Q(v,1)),l.setAttribute("aPhase",new Q(y,1)),l.setAttribute("aSeed",new Q(I,1)),l.setAttribute("aSpeed",new Q(p,1)),O(),o=new Le(l,e),o.frustumCulled=!1,a.add(o)},U=i=>{C+=i,r.uTime.value=C;const d=Pa*(.5*Math.sin(C*.13)+.5*Math.sin(C*.29+1.3)),v=C*_a;F.set(Math.sin(d)*Math.cos(v),Math.cos(d),Math.sin(d)*Math.sin(v)).normalize(),o&&(w.setFromAxisAngle(F,Ca*i),o.quaternion.premultiply(w));const y=1-Math.exp(-i*3);a.rotation.x+=(R-a.rotation.x)*y,a.rotation.y+=(E-a.rotation.y)*y},n=(i,d)=>{R=-d*Ye,E=i*Ye},m=()=>{A.remove(a),l==null||l.dispose(),e.dispose()};return{group:a,get object(){return o},opacityUniform:r.uOpacity,state:t,init:B,tick:U,setParallax:n,applyState:O,dispose:m}}const Ha=.35,Ce=160,Ya=10;function qa(A,a,t,r=Ya){const e=new Float32Array(a*3),l=t.getSize(new M),o=t.min,u=Math.max(l.x,l.y,l.z)*.5,C=4*Math.PI*u*u*Ha,F=Math.max(Math.sqrt(C/Math.max(1,a)),1e-6),w=Math.min(Ce,Math.max(1,Math.ceil(l.x/F))),R=Math.min(Ce,Math.max(1,Math.ceil(l.y/F))),E=Math.min(Ce,Math.max(1,Math.ceil(l.z/F))),O=l.x/w||1,B=l.y/R||1,U=l.z/E||1,n=new Int32Array(w*R*E).fill(-1),m=new Int32Array(a).fill(-1),i=(f,P)=>f<0?0:f>=P?P-1:f,d=(f,P,x)=>{const q=i(Math.floor((f-o.x)/O),w),g=i(Math.floor((P-o.y)/B),R),H=i(Math.floor((x-o.z)/U),E);let G=1/0;for(let z=-1;z<=1;z++){const T=H+z;if(!(T<0||T>=E))for(let J=-1;J<=1;J++){const j=g+J;if(!(j<0||j>=R))for(let N=-1;N<=1;N++){const ae=q+N;if(ae<0||ae>=w)continue;let s=n[(T*R+j)*w+ae];for(;s!==-1;){const b=e[s*3]-f,S=e[s*3+1]-P,_=e[s*3+2]-x,D=b*b+S*S+_*_;D<G&&(G=D),s=m[s]}}}}return G},v=new M;let y=0,I=0,p=0;for(let f=0;f<a;f++){let P=-1;for(let G=0;G<r;G++){A.sample(v);const z=d(v.x,v.y,v.z);z>P&&(P=z,y=v.x,I=v.y,p=v.z)}e[f*3]=y,e[f*3+1]=I,e[f*3+2]=p;const x=i(Math.floor((y-o.x)/O),w),q=i(Math.floor((I-o.y)/B),R),H=(i(Math.floor((p-o.z)/U),E)*R+q)*w+x;m[f]=n[H],n[H]=f}return e}function ja(){return{colorNear:{value:new k($t)},colorFar:{value:new k(Qt)},colorGain:{value:Jt},brightness:{value:ea},center:{value:new M},radius:{value:1},waterY:{value:-1e3},submergeBand:{value:.27},submergeAlpha:{value:.2}}}function Va(A,a,t){a.computeBoundingSphere();const r=a.boundingSphere;r&&(t.center.value.copy(r.center),t.radius.value=r.radius),A.onBeforeCompile=e=>{e.uniforms.uDepthCenter=t.center,e.uniforms.uDepthRadius=t.radius,e.uniforms.uColorNear=t.colorNear,e.uniforms.uColorFar=t.colorFar,e.uniforms.uColorGain=t.colorGain,e.uniforms.uBrightness=t.brightness,e.uniforms.uSubWaterY=t.waterY,e.uniforms.uSubBand=t.submergeBand,e.uniforms.uSubAlpha=t.submergeAlpha,e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
varying float vEarthDepthT;
varying float vSubWorldY;
uniform vec3 uDepthCenter;
uniform float uDepthRadius;`).replace("#include <begin_vertex>",["#include <begin_vertex>","vec4 earthView = modelViewMatrix * vec4( transformed, 1.0 );","vec4 earthCenterView = modelViewMatrix * vec4( uDepthCenter, 1.0 );","float earthScale = length( modelViewMatrix[0].xyz );","float earthR = max( 1e-4, uDepthRadius * earthScale );","vEarthDepthT = smoothstep( -earthR, earthR, earthView.z - earthCenterView.z );","vSubWorldY = ( modelMatrix * vec4( transformed, 1.0 ) ).y;"].join(`
`)),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
varying float vEarthDepthT;
varying float vSubWorldY;
uniform vec3 uColorNear;
uniform vec3 uColorFar;
uniform float uColorGain;
uniform float uBrightness;
uniform float uSubWaterY;
uniform float uSubBand;
uniform float uSubAlpha;`).replace("#include <map_particle_fragment>",["#include <map_particle_fragment>","vec3 earthCol = mix( uColorFar, uColorNear, vEarthDepthT );","float earthLum = dot( earthCol, vec3( 0.299, 0.587, 0.114 ) );","earthCol = mix( vec3( earthLum ), earthCol, uColorGain ) * uBrightness;","diffuseColor.rgb = earthCol;","float earthSubmerged = smoothstep( uSubWaterY, uSubWaterY - uSubBand, vSubWorldY );","float earthSubDim = mix( 1.0, uSubAlpha, earthSubmerged );","diffuseColor.rgb *= earthSubDim;","diffuseColor.a *= earthSubDim;"].join(`
`))}}function Ja(A){const a=new ut({powerPreference:"high-performance",canvas:A,antialias:!1,stencil:!1});a.setPixelRatio(Math.min(window.devicePixelRatio,2)),a.outputColorSpace=ct,a.toneMapping=dt,a.toneMappingExposure=ta;const{width:t,height:r}=A.getBoundingClientRect(),e=Math.max(1,t),l=Math.max(1,r);a.setSize(e,l,!1);const o=new ht;o.background=new k(aa);const u=new Ve(35,e/l,.1,100);u.position.set(0,0,5);const C=new wt,F=new Te;o.add(new pt(oa,ra));const w=new ft(ia,na);w.position.set(0,2,0),o.add(w),new mt(1);const R=ua(a,o,u,e,l),{composer:E,vignette:O,bloom:B}=R,U=new St,n=new ze;n.rotation.y=-Math.PI/2,o.add(n);const m=pa(o,w),i=ba(o),d=Ga(o);let v=null;const y=ja();let I=u.position.z,p=null,f=!1;const P=.2;let x=null;const q=h=>{document.readyState==="complete"?setTimeout(h,0):window.addEventListener("load",()=>h(),{once:!0})};let g,H;const G=new Promise((h,c)=>{g=h,H=c}),z=new Promise(h=>{q(()=>{new we().load("/images/scene/green_statue.webp",c=>{const L=c.image.width/c.image.height;i.setStatueTexture(c,L),h()},void 0,c=>{console.error("[globe] failed to load statue texture",c),h()}),new we().load("/images/scene/depth.png",c=>i.setDepthTexture(c),void 0,c=>console.error("[globe] failed to load statue depth map",c))})}),T=Promise.all([G,z]).then(([h])=>h),J=()=>{if(!v)return;const h=new Me().setFromObject(v),c=h.getSize(new M),L=h.getCenter(new M);v.position.sub(L),x={halfW:c.x/2,halfH:c.y/2,baseY:h.min.y-L.y},m.setGroupBaseY(x.baseY)},j=()=>{if(!x)return;const h=xt.degToRad(u.fov),c=Math.max(u.aspect,A.clientWidth/Math.max(1,A.clientHeight)),L=x.halfH/Math.tan(h/2),K=x.halfW/Math.tan(h/2)/c,te=Math.max(L,K)*1.3;I=te,u.position.set(0,0,te),u.lookAt(0,0,0)},N=new vt,ae=.05,s=.15,b=.003,S=6;let _=1,D=0,V=window.scrollY;const X=()=>{const h=window.scrollY,c=h-V;c>0?_=1:c<0&&(_=-1),D+=c,V=h};window.addEventListener("scroll",X,{passive:!0});const W=()=>A.style.opacity!==""&&Number(A.style.opacity)===0,Z=()=>{N.update();const h=Math.min(N.getDelta(),ae);if(W())return;n.rotation.y+=h*(_*s+D*b),D*=Math.exp(-h*S),m.tickTime(h);const c=m.group.position.y;i.waterYUniform.value=c,y.waterY.value=c,i.tick(h),d.tick(h),f&&(u.position.y=-P*i.state.morph,u.lookAt(0,0,0)),E.render(h)};a.setAnimationLoop(Z);const ee=()=>{a.setAnimationLoop(document.hidden?null:Z)};document.addEventListener("visibilitychange",ee),q(()=>U.load(Ge,h=>{let c=null;if(h.scene.traverse(Be=>{!c&&Be.isMesh&&(c=Be)}),!c){console.error("[globe] no mesh found in model to sample",Ge),H(new Error("no mesh to sample"));return}const L=c,K=new yt(L).build();L.geometry.computeBoundingBox();const te=L.geometry.boundingBox??new Me(new M(-1,-1,-1),new M(1,1,1)),me=qa(K,la,te),Se=new Fe;Se.setAttribute("position",new Q(me,3));const We=new gt({color:new k($e),size:sa,transparent:!0,depthWrite:!1,alphaMap:new we().load("/images/glow.png")});Va(We,Se,y);const ye=new Le(Se,We);ye.rotation.set(-Math.PI/2,0,0),n.add(ye),v=ye,J(),j();const ve=new Me().setFromObject(v).getSize(new M);m.initReflector(ve.x*Mt);const Oe=Math.max(ve.x,ve.y,ve.z)*.5;i.init(Oe),d.init(Oe),g(n);const Ie=I;p=At.timeline({onComplete:()=>f=!0}),p.fromTo(v.scale,{x:.85,y:.85,z:.85},{x:1,y:1,z:1,duration:Ae,ease:"power3.out"},0).fromTo(u.position,{z:Ie*1.35,y:.25},{z:Ie,y:0,duration:Ae,ease:"power2.out"},0).fromTo(O,{darkness:1},{darkness:Ke,duration:Ae,ease:"power2.out"},0)},void 0,h=>{console.error("[globe] failed to load GLB",h),H(h)}));let de=e,re=l;const se=new ResizeObserver(h=>{for(const c of h){const L=Math.max(1,Math.floor(c.contentRect.width)),K=Math.max(1,Math.floor(c.contentRect.height));L===de&&K===re||(de=L,re=K,a.setPixelRatio(Math.min(window.devicePixelRatio,2)),a.setSize(L,K,!1),E.setSize(L,K),u.aspect=L/K,u.updateProjectionMatrix(),v&&j())}});se.observe(A);const ie=new Xe,Y=new M,oe=new M,le=new Ee,he=h=>{var me;const c=A.getBoundingClientRect();if(h.clientX<c.left||h.clientX>c.right||h.clientY<c.top||h.clientY>c.bottom){i.setPointer(null);return}F.x=(h.clientX-c.left)/c.width*2-1,F.y=-((h.clientY-c.top)/c.height)*2+1,C.setFromCamera(F,u),d.setParallax(F.x,F.y),i.setPointerScreen(F.x,F.y);const L=((me=i.object)==null?void 0:me.position)??n.position,K=i.raycastRadius||1.2;ie.center.copy(L),ie.radius=K;let te=null;C.ray.intersectSphere(ie,Y)?te=Y:(u.getWorldDirection(oe).negate(),le.setFromNormalAndCoplanarPoint(oe,L),C.ray.intersectPlane(le,Y)&&(te=Y)),te&&i.setPointer(te)},pe=()=>{i.setPointer(null)};return window.addEventListener("pointermove",he),window.addEventListener("pointerleave",pe),{scene:o,camera:u,composer:E,bloom:B,vignette:O,water:m,particles:i,bgParticles:d,ready:T,get intro(){return p},getGlobeRoot:()=>v,dispose:()=>{p==null||p.kill(),window.removeEventListener("pointermove",he),window.removeEventListener("pointerleave",pe),window.removeEventListener("scroll",X),document.removeEventListener("visibilitychange",ee),i.dispose(),d.dispose(),m.dispose(),se.disconnect(),a.setAnimationLoop(null),E.dispose(),a.dispose(),o.traverse(h=>{h.geometry&&h.geometry.dispose();const c=h.material;Array.isArray(c)?c.forEach(L=>L.dispose()):c&&c.dispose()})}}}export{Ja as initGlobe};

var an=Object.defineProperty,sn=Object.defineProperties;var cn=Object.getOwnPropertyDescriptors;var me=Object.getOwnPropertySymbols;var nt=Object.prototype.hasOwnProperty,ot=Object.prototype.propertyIsEnumerable;var tt=(e,t,n)=>t in e?an(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,x=(e,t)=>{for(var n in t||(t={}))nt.call(t,n)&&tt(e,n,t[n]);if(me)for(var n of me(t))ot.call(t,n)&&tt(e,n,t[n]);return e},A=(e,t)=>sn(e,cn(t));var q=(e,t)=>{var n={};for(var o in e)nt.call(e,o)&&t.indexOf(o)<0&&(n[o]=e[o]);if(e!=null&&me)for(var o of me(e))t.indexOf(o)<0&&ot.call(e,o)&&(n[o]=e[o]);return n};import{r as h,o as te,a as gt,v as ln,R as dn}from"./react-vendor-BmCe25aj.js";var xt={exports:{}},Ce={};/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var fn=h,un=Symbol.for("react.element"),hn=Symbol.for("react.fragment"),yn=Object.prototype.hasOwnProperty,pn=fn.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,mn={key:!0,ref:!0,__self:!0,__source:!0};function kt(e,t,n){var o,r={},i=null,a=null;n!==void 0&&(i=""+n),t.key!==void 0&&(i=""+t.key),t.ref!==void 0&&(a=t.ref);for(o in t)yn.call(t,o)&&!mn.hasOwnProperty(o)&&(r[o]=t[o]);if(e&&e.defaultProps)for(o in t=e.defaultProps,t)r[o]===void 0&&(r[o]=t[o]);return{$$typeof:un,type:e,key:i,ref:a,props:r,_owner:pn.current}}Ce.Fragment=hn;Ce.jsx=kt;Ce.jsxs=kt;xt.exports=Ce;var L=xt.exports;function Ee(e,t,{checkForDefaultPrevented:n=!0}={}){return function(r){if(e==null||e(r),n===!1||!r.defaultPrevented)return t==null?void 0:t(r)}}function rt(e,t){if(typeof e=="function")return e(t);e!=null&&(e.current=t)}function vt(...e){return t=>{let n=!1;const o=e.map(r=>{const i=rt(r,t);return!n&&typeof i=="function"&&(n=!0),i});if(n)return()=>{for(let r=0;r<o.length;r++){const i=o[r];typeof i=="function"?i():rt(e[r],null)}}}}function ne(...e){return h.useCallback(vt(...e),e)}function wt(e,t=[]){let n=[];function o(i,a){const s=h.createContext(a),l=n.length;n=[...n,a];const c=u=>{var w;const k=u,{scope:y,children:p}=k,m=q(k,["scope","children"]),g=((w=y==null?void 0:y[e])==null?void 0:w[l])||s,v=h.useMemo(()=>m,Object.values(m));return L.jsx(g.Provider,{value:v,children:p})};c.displayName=i+"Provider";function f(u,y){var g;const p=((g=y==null?void 0:y[e])==null?void 0:g[l])||s,m=h.useContext(p);if(m)return m;if(a!==void 0)return a;throw new Error(`\`${u}\` must be used within \`${i}\``)}return[c,f]}const r=()=>{const i=n.map(a=>h.createContext(a));return function(s){const l=(s==null?void 0:s[e])||i;return h.useMemo(()=>({[`__scope${e}`]:A(x({},s),{[e]:l})}),[s,l])}};return r.scopeName=e,[o,gn(r,...t)]}function gn(...e){const t=e[0];if(e.length===1)return t;const n=()=>{const o=e.map(r=>({useScope:r(),scopeName:r.scopeName}));return function(i){const a=o.reduce((s,{useScope:l,scopeName:c})=>{const u=l(i)[`__scope${c}`];return x(x({},s),u)},{});return h.useMemo(()=>({[`__scope${t.scopeName}`]:a}),[a])}};return n.scopeName=t.scopeName,n}function Te(e){const t=xn(e),n=h.forwardRef((o,r)=>{const c=o,{children:i}=c,a=q(c,["children"]),s=h.Children.toArray(i),l=s.find(kn);if(l){const f=l.props.children,u=s.map(y=>y===l?h.Children.count(f)>1?h.Children.only(null):h.isValidElement(f)?f.props.children:null:y);return L.jsx(t,A(x({},a),{ref:r,children:h.isValidElement(f)?h.cloneElement(f,void 0,u):null}))}return L.jsx(t,A(x({},a),{ref:r,children:i}))});return n.displayName=`${e}.Slot`,n}function xn(e){const t=h.forwardRef((n,o)=>{const a=n,{children:r}=a,i=q(a,["children"]);if(h.isValidElement(r)){const s=wn(r),l=vn(i,r.props);return r.type!==h.Fragment&&(l.ref=o?vt(o,s):s),h.cloneElement(r,l)}return h.Children.count(r)>1?h.Children.only(null):null});return t.displayName=`${e}.SlotClone`,t}var Mt=Symbol("radix.slottable");function ur(e){const t=({children:n})=>L.jsx(L.Fragment,{children:n});return t.displayName=`${e}.Slottable`,t.__radixId=Mt,t}function kn(e){return h.isValidElement(e)&&typeof e.type=="function"&&"__radixId"in e.type&&e.type.__radixId===Mt}function vn(e,t){const n=x({},t);for(const o in t){const r=e[o],i=t[o];/^on[A-Z]/.test(o)?r&&i?n[o]=(...s)=>{const l=i(...s);return r(...s),l}:r&&(n[o]=r):o==="style"?n[o]=x(x({},r),i):o==="className"&&(n[o]=[r,i].filter(Boolean).join(" "))}return x(x({},e),n)}function wn(e){var o,r;let t=(o=Object.getOwnPropertyDescriptor(e.props,"ref"))==null?void 0:o.get,n=t&&"isReactWarning"in t&&t.isReactWarning;return n?e.ref:(t=(r=Object.getOwnPropertyDescriptor(e,"ref"))==null?void 0:r.get,n=t&&"isReactWarning"in t&&t.isReactWarning,n?e.props.ref:e.props.ref||e.ref)}function hr(e){const t=e+"CollectionProvider",[n,o]=wt(t),[r,i]=n(t,{collectionRef:{current:null},itemMap:new Map}),a=g=>{const{scope:v,children:k}=g,w=te.useRef(null),b=te.useRef(new Map).current;return L.jsx(r,{scope:v,itemMap:b,collectionRef:w,children:k})};a.displayName=t;const s=e+"CollectionSlot",l=Te(s),c=te.forwardRef((g,v)=>{const{scope:k,children:w}=g,b=i(s,k),M=ne(v,b.collectionRef);return L.jsx(l,{ref:M,children:w})});c.displayName=s;const f=e+"CollectionItemSlot",u="data-radix-collection-item",y=Te(f),p=te.forwardRef((g,v)=>{const P=g,{scope:k,children:w}=P,b=q(P,["scope","children"]),M=te.useRef(null),C=ne(v,M),S=i(f,k);return te.useEffect(()=>(S.itemMap.set(M,x({ref:M},b)),()=>void S.itemMap.delete(M))),L.jsx(y,{[u]:"",ref:C,children:w})});p.displayName=f;function m(g){const v=i(e+"CollectionConsumer",g);return te.useCallback(()=>{const w=v.collectionRef.current;if(!w)return[];const b=Array.from(w.querySelectorAll(`[${u}]`));return Array.from(v.itemMap.values()).sort((S,P)=>b.indexOf(S.ref.current)-b.indexOf(P.ref.current))},[v.collectionRef,v.itemMap])}return[{Provider:a,Slot:c,ItemSlot:p},m,o]}var Mn=["a","button","div","form","h2","h3","img","input","label","li","nav","ol","p","select","span","svg","ul"],ie=Mn.reduce((e,t)=>{const n=Te(`Primitive.${t}`),o=h.forwardRef((r,i)=>{const c=r,{asChild:a}=c,s=q(c,["asChild"]),l=a?n:t;return typeof window!="undefined"&&(window[Symbol.for("radix-ui")]=!0),L.jsx(l,A(x({},s),{ref:i}))});return o.displayName=`Primitive.${t}`,A(x({},e),{[t]:o})},{});function bn(e,t){e&&gt.flushSync(()=>e.dispatchEvent(t))}function Ae(e){const t=h.useRef(e);return h.useEffect(()=>{t.current=e}),h.useMemo(()=>(...n)=>{var o;return(o=t.current)==null?void 0:o.call(t,...n)},[])}function Cn(e,t=globalThis==null?void 0:globalThis.document){const n=Ae(e);h.useEffect(()=>{const o=r=>{r.key==="Escape"&&n(r)};return t.addEventListener("keydown",o,{capture:!0}),()=>t.removeEventListener("keydown",o,{capture:!0})},[n,t])}var An="DismissableLayer",De="dismissableLayer.update",Sn="dismissableLayer.pointerDownOutside",Pn="dismissableLayer.focusOutside",it,bt=h.createContext({layers:new Set,layersWithOutsidePointerEventsDisabled:new Set,branches:new Set}),Ct=h.forwardRef((e,t)=>{var T;const P=e,{disableOutsidePointerEvents:n=!1,onEscapeKeyDown:o,onPointerDownOutside:r,onFocusOutside:i,onInteractOutside:a,onDismiss:s}=P,l=q(P,["disableOutsidePointerEvents","onEscapeKeyDown","onPointerDownOutside","onFocusOutside","onInteractOutside","onDismiss"]),c=h.useContext(bt),[f,u]=h.useState(null),y=(T=f==null?void 0:f.ownerDocument)!=null?T:globalThis==null?void 0:globalThis.document,[,p]=h.useState({}),m=ne(t,R=>u(R)),g=Array.from(c.layers),[v]=[...c.layersWithOutsidePointerEventsDisabled].slice(-1),k=g.indexOf(v),w=f?g.indexOf(f):-1,b=c.layersWithOutsidePointerEventsDisabled.size>0,M=w>=k,C=En(R=>{const O=R.target,j=[...c.branches].some(D=>D.contains(O));!M||j||(r==null||r(R),a==null||a(R),R.defaultPrevented||s==null||s())},y),S=On(R=>{const O=R.target;[...c.branches].some(D=>D.contains(O))||(i==null||i(R),a==null||a(R),R.defaultPrevented||s==null||s())},y);return Cn(R=>{w===c.layers.size-1&&(o==null||o(R),!R.defaultPrevented&&s&&(R.preventDefault(),s()))},y),h.useEffect(()=>{if(f)return n&&(c.layersWithOutsidePointerEventsDisabled.size===0&&(it=y.body.style.pointerEvents,y.body.style.pointerEvents="none"),c.layersWithOutsidePointerEventsDisabled.add(f)),c.layers.add(f),at(),()=>{n&&c.layersWithOutsidePointerEventsDisabled.size===1&&(y.body.style.pointerEvents=it)}},[f,y,n,c]),h.useEffect(()=>()=>{f&&(c.layers.delete(f),c.layersWithOutsidePointerEventsDisabled.delete(f),at())},[f,c]),h.useEffect(()=>{const R=()=>p({});return document.addEventListener(De,R),()=>document.removeEventListener(De,R)},[]),L.jsx(ie.div,A(x({},l),{ref:m,style:x({pointerEvents:b?M?"auto":"none":void 0},e.style),onFocusCapture:Ee(e.onFocusCapture,S.onFocusCapture),onBlurCapture:Ee(e.onBlurCapture,S.onBlurCapture),onPointerDownCapture:Ee(e.onPointerDownCapture,C.onPointerDownCapture)}))});Ct.displayName=An;var Rn="DismissableLayerBranch",At=h.forwardRef((e,t)=>{const n=h.useContext(bt),o=h.useRef(null),r=ne(t,o);return h.useEffect(()=>{const i=o.current;if(i)return n.branches.add(i),()=>{n.branches.delete(i)}},[n.branches]),L.jsx(ie.div,A(x({},e),{ref:r}))});At.displayName=Rn;function En(e,t=globalThis==null?void 0:globalThis.document){const n=Ae(e),o=h.useRef(!1),r=h.useRef(()=>{});return h.useEffect(()=>{const i=s=>{if(s.target&&!o.current){let l=function(){St(Sn,n,c,{discrete:!0})};const c={originalEvent:s};s.pointerType==="touch"?(t.removeEventListener("click",r.current),r.current=l,t.addEventListener("click",r.current,{once:!0})):l()}else t.removeEventListener("click",r.current);o.current=!1},a=window.setTimeout(()=>{t.addEventListener("pointerdown",i)},0);return()=>{window.clearTimeout(a),t.removeEventListener("pointerdown",i),t.removeEventListener("click",r.current)}},[t,n]),{onPointerDownCapture:()=>o.current=!0}}function On(e,t=globalThis==null?void 0:globalThis.document){const n=Ae(e),o=h.useRef(!1);return h.useEffect(()=>{const r=i=>{i.target&&!o.current&&St(Pn,n,{originalEvent:i},{discrete:!1})};return t.addEventListener("focusin",r),()=>t.removeEventListener("focusin",r)},[t,n]),{onFocusCapture:()=>o.current=!0,onBlurCapture:()=>o.current=!1}}function at(){const e=new CustomEvent(De);document.dispatchEvent(e)}function St(e,t,n,{discrete:o}){const r=n.originalEvent.target,i=new CustomEvent(e,{bubbles:!1,cancelable:!0,detail:n});t&&r.addEventListener(e,t,{once:!0}),o?bn(r,i):r.dispatchEvent(i)}var yr=Ct,pr=At,oe=globalThis!=null&&globalThis.document?h.useLayoutEffect:()=>{},Ln="Portal",Tn=h.forwardRef((e,t)=>{var l;const s=e,{container:n}=s,o=q(s,["container"]),[r,i]=h.useState(!1);oe(()=>i(!0),[]);const a=n||r&&((l=globalThis==null?void 0:globalThis.document)==null?void 0:l.body);return a?ln.createPortal(L.jsx(ie.div,A(x({},o),{ref:t})),a):null});Tn.displayName=Ln;function Dn(e,t){return h.useReducer((n,o)=>{const r=t[n][o];return r!=null?r:n},e)}var Nn=e=>{const{present:t,children:n}=e,o=zn(t),r=typeof n=="function"?n({present:o.isPresent}):h.Children.only(n),i=ne(o.ref,Hn(r));return typeof n=="function"||o.isPresent?h.cloneElement(r,{ref:i}):null};Nn.displayName="Presence";function zn(e){const[t,n]=h.useState(),o=h.useRef(null),r=h.useRef(e),i=h.useRef("none"),a=e?"mounted":"unmounted",[s,l]=Dn(a,{mounted:{UNMOUNT:"unmounted",ANIMATION_OUT:"unmountSuspended"},unmountSuspended:{MOUNT:"mounted",ANIMATION_END:"unmounted"},unmounted:{MOUNT:"mounted"}});return h.useEffect(()=>{const c=ge(o.current);i.current=s==="mounted"?c:"none"},[s]),oe(()=>{const c=o.current,f=r.current;if(f!==e){const y=i.current,p=ge(c);e?l("MOUNT"):p==="none"||(c==null?void 0:c.display)==="none"?l("UNMOUNT"):l(f&&y!==p?"ANIMATION_OUT":"UNMOUNT"),r.current=e}},[e,l]),oe(()=>{var c;if(t){let f;const u=(c=t.ownerDocument.defaultView)!=null?c:window,y=m=>{const v=ge(o.current).includes(m.animationName);if(m.target===t&&v&&(l("ANIMATION_END"),!r.current)){const k=t.style.animationFillMode;t.style.animationFillMode="forwards",f=u.setTimeout(()=>{t.style.animationFillMode==="forwards"&&(t.style.animationFillMode=k)})}},p=m=>{m.target===t&&(i.current=ge(o.current))};return t.addEventListener("animationstart",p),t.addEventListener("animationcancel",y),t.addEventListener("animationend",y),()=>{u.clearTimeout(f),t.removeEventListener("animationstart",p),t.removeEventListener("animationcancel",y),t.removeEventListener("animationend",y)}}else l("ANIMATION_END")},[t,l]),{isPresent:["mounted","unmountSuspended"].includes(s),ref:h.useCallback(c=>{o.current=c?getComputedStyle(c):null,n(c)},[])}}function ge(e){return(e==null?void 0:e.animationName)||"none"}function Hn(e){var o,r;let t=(o=Object.getOwnPropertyDescriptor(e.props,"ref"))==null?void 0:o.get,n=t&&"isReactWarning"in t&&t.isReactWarning;return n?e.ref:(t=(r=Object.getOwnPropertyDescriptor(e,"ref"))==null?void 0:r.get,n=t&&"isReactWarning"in t&&t.isReactWarning,n?e.props.ref:e.props.ref||e.ref)}var jn=dn[" useInsertionEffect ".trim().toString()]||oe;function mr({prop:e,defaultProp:t,onChange:n=()=>{},caller:o}){const[r,i,a]=qn({defaultProp:t,onChange:n}),s=e!==void 0,l=s?e:r;{const f=h.useRef(e!==void 0);h.useEffect(()=>{const u=f.current;u!==s&&console.warn(`${o} is changing from ${u?"controlled":"uncontrolled"} to ${s?"controlled":"uncontrolled"}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`),f.current=s},[s,o])}const c=h.useCallback(f=>{var u;if(s){const y=Vn(f)?f(e):f;y!==e&&((u=a.current)==null||u.call(a,y))}else i(f)},[s,e,i,a]);return[l,c]}function qn({defaultProp:e,onChange:t}){const[n,o]=h.useState(e),r=h.useRef(n),i=h.useRef(t);return jn(()=>{i.current=t},[t]),h.useEffect(()=>{var a;r.current!==n&&((a=i.current)==null||a.call(i,n),r.current=n)},[n,r]),[n,o,i]}function Vn(e){return typeof e=="function"}var _n=Object.freeze({position:"absolute",border:0,width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",wordWrap:"normal"}),In="VisuallyHidden",Pt=h.forwardRef((e,t)=>L.jsx(ie.span,A(x({},e),{ref:t,style:x(x({},_n),e.style)})));Pt.displayName=In;var gr=Pt;/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fn=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),Rt=(...e)=>e.filter((t,n,o)=>!!t&&t.trim()!==""&&o.indexOf(t)===n).join(" ").trim();/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var Bn={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $n=h.forwardRef((c,l)=>{var f=c,{color:e="currentColor",size:t=24,strokeWidth:n=2,absoluteStrokeWidth:o,className:r="",children:i,iconNode:a}=f,s=q(f,["color","size","strokeWidth","absoluteStrokeWidth","className","children","iconNode"]);return h.createElement("svg",x(A(x({ref:l},Bn),{width:t,height:t,stroke:e,strokeWidth:o?Number(n)*24/Number(t):n,className:Rt("lucide",r)}),s),[...a.map(([u,y])=>h.createElement(u,y)),...Array.isArray(i)?i:[i]])});/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=(e,t)=>{const n=h.forwardRef((a,i)=>{var s=a,{className:o}=s,r=q(s,["className"]);return h.createElement($n,x({ref:i,iconNode:t,className:Rt(`lucide-${Fn(e)}`,o)},r))});return n.displayName=`${e}`,n};/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xr=d("Activity",[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kr=d("AlignCenter",[["path",{d:"M17 12H7",key:"16if0g"}],["path",{d:"M19 18H5",key:"18s9l3"}],["path",{d:"M21 6H3",key:"1jwq7v"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vr=d("AlignJustify",[["path",{d:"M3 12h18",key:"1i2n21"}],["path",{d:"M3 18h18",key:"1h113x"}],["path",{d:"M3 6h18",key:"d0wm0j"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wr=d("AlignLeft",[["path",{d:"M15 12H3",key:"6jk70r"}],["path",{d:"M17 18H3",key:"1amg6g"}],["path",{d:"M21 6H3",key:"1jwq7v"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mr=d("AlignRight",[["path",{d:"M21 12H9",key:"dn1m92"}],["path",{d:"M21 18H7",key:"1ygte8"}],["path",{d:"M21 6H3",key:"1jwq7v"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const br=d("Archive",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cr=d("ArrowLeft",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ar=d("ArrowRight",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sr=d("ArrowUpDown",[["path",{d:"m21 16-4 4-4-4",key:"f6ql7i"}],["path",{d:"M17 20V4",key:"1ejh1v"}],["path",{d:"m3 8 4-4 4 4",key:"11wl7u"}],["path",{d:"M7 4v16",key:"1glfcx"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pr=d("Ban",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m4.9 4.9 14.2 14.2",key:"1m5liu"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rr=d("Bell",[["path",{d:"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9",key:"1qo2s2"}],["path",{d:"M10.3 21a1.94 1.94 0 0 0 3.4 0",key:"qgo35s"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Er=d("Bold",[["path",{d:"M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8",key:"mg9rjx"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Or=d("BookMarked",[["path",{d:"M10 2v8l3-3 3 3V2",key:"sqw3rj"}],["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20",key:"k3hazp"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lr=d("BookOpen",[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tr=d("Building2",[["path",{d:"M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z",key:"1b4qmf"}],["path",{d:"M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2",key:"i71pzd"}],["path",{d:"M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2",key:"10jefs"}],["path",{d:"M10 6h4",key:"1itunk"}],["path",{d:"M10 10h4",key:"tcdvrf"}],["path",{d:"M10 14h4",key:"kelpxr"}],["path",{d:"M10 18h4",key:"1ulq68"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dr=d("Calendar",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nr=d("Camera",[["path",{d:"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",key:"1tc9qg"}],["circle",{cx:"12",cy:"13",r:"3",key:"1vg3eu"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zr=d("ChartColumn",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hr=d("ChartNoAxesColumn",[["line",{x1:"18",x2:"18",y1:"20",y2:"10",key:"1xfpm4"}],["line",{x1:"12",x2:"12",y1:"20",y2:"4",key:"be30l9"}],["line",{x1:"6",x2:"6",y1:"20",y2:"14",key:"1r4le6"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jr=d("CheckCheck",[["path",{d:"M18 6 7 17l-5-5",key:"116fxf"}],["path",{d:"m22 10-7.5 7.5L13 16",key:"ke71qq"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qr=d("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vr=d("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _r=d("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ir=d("ChevronUp",[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fr=d("CircleCheckBig",[["path",{d:"M21.801 10A10 10 0 1 1 17 3.335",key:"yps3ct"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Br=d("CircleUser",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}],["path",{d:"M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662",key:"154egf"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $r=d("CircleX",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wr=d("ClipboardList",[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ur=d("Clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yr=d("CodeXml",[["path",{d:"m18 16 4-4-4-4",key:"1inbqp"}],["path",{d:"m6 8-4 4 4 4",key:"15zrgr"}],["path",{d:"m14.5 4-5 16",key:"e7oirm"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zr=d("Copy",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xr=d("Cpu",[["rect",{width:"16",height:"16",x:"4",y:"4",rx:"2",key:"14l7u7"}],["rect",{width:"6",height:"6",x:"9",y:"9",rx:"1",key:"5aljv4"}],["path",{d:"M15 2v2",key:"13l42r"}],["path",{d:"M15 20v2",key:"15mkzm"}],["path",{d:"M2 15h2",key:"1gxd5l"}],["path",{d:"M2 9h2",key:"1bbxkp"}],["path",{d:"M20 15h2",key:"19e6y8"}],["path",{d:"M20 9h2",key:"19tzq7"}],["path",{d:"M9 2v2",key:"165o2o"}],["path",{d:"M9 20v2",key:"i2bqo8"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kr=d("Database",[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gr=d("DollarSign",[["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",key:"1b0p4s"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jr=d("Download",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qr=d("ExternalLink",[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ei=d("EyeOff",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ti=d("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ni=d("FileCheck",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"m9 15 2 2 4-4",key:"1grp1n"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oi=d("FileSpreadsheet",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M8 13h2",key:"yr2amv"}],["path",{d:"M14 13h2",key:"un5t4a"}],["path",{d:"M8 17h2",key:"2yhykz"}],["path",{d:"M14 17h2",key:"10kma7"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ri=d("FileText",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ii=d("File",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ai=d("Filter",[["polygon",{points:"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3",key:"1yg77f"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const si=d("FolderOpen",[["path",{d:"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",key:"usdka0"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ci=d("Gavel",[["path",{d:"m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8",key:"15492f"}],["path",{d:"m16 16 6-6",key:"vzrcl6"}],["path",{d:"m8 8 6-6",key:"18bi4p"}],["path",{d:"m9 7 8 8",key:"5jnvq1"}],["path",{d:"m21 11-8-8",key:"z4y7zo"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const li=d("Globe",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const di=d("HardDrive",[["line",{x1:"22",x2:"2",y1:"12",y2:"12",key:"1y58io"}],["path",{d:"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",key:"oot6mr"}],["line",{x1:"6",x2:"6.01",y1:"16",y2:"16",key:"sgf278"}],["line",{x1:"10",x2:"10.01",y1:"16",y2:"16",key:"1l4acy"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fi=d("House",[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"1d0kgt"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ui=d("Image",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hi=d("Info",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yi=d("Italic",[["line",{x1:"19",x2:"10",y1:"4",y2:"4",key:"15jd3p"}],["line",{x1:"14",x2:"5",y1:"20",y2:"20",key:"bu0au3"}],["line",{x1:"15",x2:"9",y1:"4",y2:"20",key:"uljnxc"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pi=d("Key",[["path",{d:"m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4",key:"g0fldk"}],["path",{d:"m21 2-9.6 9.6",key:"1j0ho8"}],["circle",{cx:"7.5",cy:"15.5",r:"5.5",key:"yqb3hr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mi=d("Layers",[["path",{d:"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",key:"8b97xw"}],["path",{d:"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65",key:"dd6zsq"}],["path",{d:"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65",key:"ep9fru"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gi=d("LayoutDashboard",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xi=d("ListOrdered",[["path",{d:"M10 12h11",key:"6m4ad9"}],["path",{d:"M10 18h11",key:"11hvi2"}],["path",{d:"M10 6h11",key:"c7qv1k"}],["path",{d:"M4 10h2",key:"16xx2s"}],["path",{d:"M4 6h1v4",key:"cnovpq"}],["path",{d:"M6 18H4c0-1 2-2 2-3s-1-1.5-2-1",key:"m9a95d"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ki=d("List",[["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M3 18h.01",key:"1tta3j"}],["path",{d:"M3 6h.01",key:"1rqtza"}],["path",{d:"M8 12h13",key:"1za7za"}],["path",{d:"M8 18h13",key:"1lx6n3"}],["path",{d:"M8 6h13",key:"ik3vkj"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vi=d("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wi=d("LockOpen",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 9.9-1",key:"1mm8w8"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mi=d("Lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bi=d("LogIn",[["path",{d:"M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4",key:"u53s6r"}],["polyline",{points:"10 17 15 12 10 7",key:"1ail0h"}],["line",{x1:"15",x2:"3",y1:"12",y2:"12",key:"v6grx8"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ci=d("LogOut",[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}],["polyline",{points:"16 17 21 12 16 7",key:"1gabdz"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12",key:"1uyos4"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ai=d("Mail",[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2",key:"18n3k1"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7",key:"1ocrg3"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Si=d("MapPin",[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",key:"1r0f0z"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pi=d("Megaphone",[["path",{d:"m3 11 18-5v12L3 14v-3z",key:"n962bs"}],["path",{d:"M11.6 16.8a3 3 0 1 1-5.8-1.6",key:"1yl0tm"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ri=d("MessageSquare",[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",key:"1lielz"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ei=d("Monitor",[["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2",key:"48i651"}],["line",{x1:"8",x2:"16",y1:"21",y2:"21",key:"1svkeh"}],["line",{x1:"12",x2:"12",y1:"17",y2:"21",key:"vw1qmm"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Oi=d("Move",[["path",{d:"M12 2v20",key:"t6zp3m"}],["path",{d:"m15 19-3 3-3-3",key:"11eu04"}],["path",{d:"m19 9 3 3-3 3",key:"1mg7y2"}],["path",{d:"M2 12h20",key:"9i4pu4"}],["path",{d:"m5 9-3 3 3 3",key:"j64kie"}],["path",{d:"m9 5 3-3 3 3",key:"l8vdw6"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Li=d("Network",[["rect",{x:"16",y:"16",width:"6",height:"6",rx:"1",key:"4q2zg0"}],["rect",{x:"2",y:"16",width:"6",height:"6",rx:"1",key:"8cvhb9"}],["rect",{x:"9",y:"2",width:"6",height:"6",rx:"1",key:"1egb70"}],["path",{d:"M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3",key:"1jsf9p"}],["path",{d:"M12 12V8",key:"2874zd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ti=d("Package",[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["path",{d:"m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7",key:"yx3hmr"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Di=d("Palette",[["circle",{cx:"13.5",cy:"6.5",r:".5",fill:"currentColor",key:"1okk4w"}],["circle",{cx:"17.5",cy:"10.5",r:".5",fill:"currentColor",key:"f64h9f"}],["circle",{cx:"8.5",cy:"7.5",r:".5",fill:"currentColor",key:"fotxhn"}],["circle",{cx:"6.5",cy:"12.5",r:".5",fill:"currentColor",key:"qy21gx"}],["path",{d:"M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z",key:"12rzf8"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ni=d("PanelsTopLeft",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 9h18",key:"1pudct"}],["path",{d:"M9 21V9",key:"1oto5p"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zi=d("PenLine",[["path",{d:"M12 20h9",key:"t2du7b"}],["path",{d:"M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z",key:"1ykcvy"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hi=d("Pen",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ji=d("PhoneCall",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}],["path",{d:"M14.05 2a9 9 0 0 1 8 7.94",key:"vmijpz"}],["path",{d:"M14.05 6A5 5 0 0 1 18 10",key:"13nbpp"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qi=d("Phone",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vi=d("PiggyBank",[["path",{d:"M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z",key:"1ivx2i"}],["path",{d:"M2 9v1c0 1.1.9 2 2 2h1",key:"nm575m"}],["path",{d:"M16 11h.01",key:"xkw8gn"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _i=d("Play",[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ii=d("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fi=d("Power",[["path",{d:"M12 2v10",key:"mnfbl"}],["path",{d:"M18.4 6.6a9 9 0 1 1-12.77.04",key:"obofu9"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bi=d("Printer",[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $i=d("Radio",[["path",{d:"M4.9 19.1C1 15.2 1 8.8 4.9 4.9",key:"1vaf9d"}],["path",{d:"M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5",key:"u1ii0m"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5",key:"1j5fej"}],["path",{d:"M19.1 4.9C23 8.8 23 15.1 19.1 19",key:"10b0cb"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wi=d("Receipt",[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",key:"q3az6g"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 17.5v-11",key:"1jc1ny"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ui=d("Redo",[["path",{d:"M21 7v6h-6",key:"3ptur4"}],["path",{d:"M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7",key:"1kgawr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yi=d("RefreshCw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zi=d("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xi=d("Satellite",[["path",{d:"M13 7 9 3 5 7l4 4",key:"vyckw6"}],["path",{d:"m17 11 4 4-4 4-4-4",key:"rchckc"}],["path",{d:"m8 12 4 4 6-6-4-4Z",key:"1sshf7"}],["path",{d:"m16 8 3-3",key:"x428zp"}],["path",{d:"M9 21a6 6 0 0 0-6-6",key:"1iajcf"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ki=d("Save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gi=d("Scale",[["path",{d:"m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"7g6ntu"}],["path",{d:"m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"ijws7r"}],["path",{d:"M7 21h10",key:"1b0cd5"}],["path",{d:"M12 3v18",key:"108xh3"}],["path",{d:"M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2",key:"3gwbw2"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ji=d("ScanBarcode",[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2",key:"aa7l1z"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2",key:"4qcy5o"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2",key:"6vwrx8"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2",key:"ioqczr"}],["path",{d:"M8 7v10",key:"23sfjj"}],["path",{d:"M12 7v10",key:"jspqdw"}],["path",{d:"M17 7v10",key:"578dap"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qi=d("Scan",[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2",key:"aa7l1z"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2",key:"4qcy5o"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2",key:"6vwrx8"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2",key:"ioqczr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ea=d("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ta=d("Send",[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const na=d("Server",[["rect",{width:"20",height:"8",x:"2",y:"2",rx:"2",ry:"2",key:"ngkwjq"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",ry:"2",key:"iecqi9"}],["line",{x1:"6",x2:"6.01",y1:"6",y2:"6",key:"16zg32"}],["line",{x1:"6",x2:"6.01",y1:"18",y2:"18",key:"nzw8ys"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oa=d("Settings2",[["path",{d:"M20 7h-9",key:"3s1dr2"}],["path",{d:"M14 17H5",key:"gfn3mx"}],["circle",{cx:"17",cy:"17",r:"3",key:"18b49y"}],["circle",{cx:"7",cy:"7",r:"3",key:"dfmy0x"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ra=d("Settings",[["path",{d:"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",key:"1qme2f"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ia=d("Shield",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const aa=d("ShoppingCart",[["circle",{cx:"8",cy:"21",r:"1",key:"jimo8o"}],["circle",{cx:"19",cy:"21",r:"1",key:"13723u"}],["path",{d:"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12",key:"9zh506"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sa=d("Signal",[["path",{d:"M2 20h.01",key:"4haj6o"}],["path",{d:"M7 20v-4",key:"j294jx"}],["path",{d:"M12 20v-8",key:"i3yub9"}],["path",{d:"M17 20V8",key:"1tkaf5"}],["path",{d:"M22 4v16",key:"sih9yq"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ca=d("SlidersVertical",[["line",{x1:"4",x2:"4",y1:"21",y2:"14",key:"1p332r"}],["line",{x1:"4",x2:"4",y1:"10",y2:"3",key:"gb41h5"}],["line",{x1:"12",x2:"12",y1:"21",y2:"12",key:"hf2csr"}],["line",{x1:"12",x2:"12",y1:"8",y2:"3",key:"1kfi7u"}],["line",{x1:"20",x2:"20",y1:"21",y2:"16",key:"1lhrwl"}],["line",{x1:"20",x2:"20",y1:"12",y2:"3",key:"16vvfq"}],["line",{x1:"2",x2:"6",y1:"14",y2:"14",key:"1uebub"}],["line",{x1:"10",x2:"14",y1:"8",y2:"8",key:"1yglbp"}],["line",{x1:"18",x2:"22",y1:"16",y2:"16",key:"1jxqpz"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const la=d("Smartphone",[["rect",{width:"14",height:"20",x:"5",y:"2",rx:"2",ry:"2",key:"1yt0o3"}],["path",{d:"M12 18h.01",key:"mhygvu"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const da=d("SquarePen",[["path",{d:"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",key:"1m0v6g"}],["path",{d:"M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z",key:"ohrbg2"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fa=d("Square",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ua=d("Star",[["path",{d:"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",key:"r04s7s"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ha=d("Table2",[["path",{d:"M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18",key:"gugj83"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ya=d("Table",[["path",{d:"M12 3v18",key:"108xh3"}],["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 9h18",key:"1pudct"}],["path",{d:"M3 15h18",key:"5xshup"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pa=d("Tablet",[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",ry:"2",key:"76otgf"}],["line",{x1:"12",x2:"12.01",y1:"18",y2:"18",key:"1dp563"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ma=d("Terminal",[["polyline",{points:"4 17 10 11 4 5",key:"akl6gq"}],["line",{x1:"12",x2:"20",y1:"19",y2:"19",key:"q2wloq"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ga=d("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xa=d("TrendingDown",[["polyline",{points:"22 17 13.5 8.5 8.5 13.5 2 7",key:"1r2t7k"}],["polyline",{points:"16 17 22 17 22 11",key:"11uiuu"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ka=d("TrendingUp",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const va=d("TriangleAlert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wa=d("Truck",[["path",{d:"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2",key:"wrbu53"}],["path",{d:"M15 18H9",key:"1lyqi6"}],["path",{d:"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14",key:"lysw3i"}],["circle",{cx:"17",cy:"18",r:"2",key:"332jqn"}],["circle",{cx:"7",cy:"18",r:"2",key:"19iecd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ma=d("Type",[["polyline",{points:"4 7 4 4 20 4 20 7",key:"1nosan"}],["line",{x1:"9",x2:"15",y1:"20",y2:"20",key:"swin9y"}],["line",{x1:"12",x2:"12",y1:"4",y2:"20",key:"1tx1rr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ba=d("Underline",[["path",{d:"M6 4v6a6 6 0 0 0 12 0V4",key:"9kb039"}],["line",{x1:"4",x2:"20",y1:"20",y2:"20",key:"nun2al"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ca=d("Undo",[["path",{d:"M3 7v6h6",key:"1v2h90"}],["path",{d:"M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13",key:"1r6uu6"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Aa=d("Upload",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"17 8 12 3 7 8",key:"t8dd8p"}],["line",{x1:"12",x2:"12",y1:"3",y2:"15",key:"widbto"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sa=d("User",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pa=d("Users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75",key:"1da9ce"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ra=d("Wifi",[["path",{d:"M12 20h.01",key:"zekei9"}],["path",{d:"M2 8.82a15 15 0 0 1 20 0",key:"dnpr2z"}],["path",{d:"M5 12.859a10 10 0 0 1 14 0",key:"1x1e6c"}],["path",{d:"M8.5 16.429a5 5 0 0 1 7 0",key:"1bycff"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ea=d("Wrench",[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",key:"cbrjhi"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Oa=d("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const La=d("Zap",[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]]),Wn=["top","right","bottom","left"],Q=Math.min,B=Math.max,ve=Math.round,xe=Math.floor,Z=e=>({x:e,y:e}),Un={left:"right",right:"left",bottom:"top",top:"bottom"},Yn={start:"end",end:"start"};function Ne(e,t,n){return B(e,Q(t,n))}function G(e,t){return typeof e=="function"?e(t):e}function J(e){return e.split("-")[0]}function le(e){return e.split("-")[1]}function je(e){return e==="x"?"y":"x"}function qe(e){return e==="y"?"height":"width"}const Zn=new Set(["top","bottom"]);function Y(e){return Zn.has(J(e))?"y":"x"}function Ve(e){return je(Y(e))}function Xn(e,t,n){n===void 0&&(n=!1);const o=le(e),r=Ve(e),i=qe(r);let a=r==="x"?o===(n?"end":"start")?"right":"left":o==="start"?"bottom":"top";return t.reference[i]>t.floating[i]&&(a=we(a)),[a,we(a)]}function Kn(e){const t=we(e);return[ze(e),t,ze(t)]}function ze(e){return e.replace(/start|end/g,t=>Yn[t])}const st=["left","right"],ct=["right","left"],Gn=["top","bottom"],Jn=["bottom","top"];function Qn(e,t,n){switch(e){case"top":case"bottom":return n?t?ct:st:t?st:ct;case"left":case"right":return t?Gn:Jn;default:return[]}}function eo(e,t,n,o){const r=le(e);let i=Qn(J(e),n==="start",o);return r&&(i=i.map(a=>a+"-"+r),t&&(i=i.concat(i.map(ze)))),i}function we(e){return e.replace(/left|right|bottom|top/g,t=>Un[t])}function to(e){return x({top:0,right:0,bottom:0,left:0},e)}function Et(e){return typeof e!="number"?to(e):{top:e,right:e,bottom:e,left:e}}function Me(e){const{x:t,y:n,width:o,height:r}=e;return{width:o,height:r,top:n,left:t,right:t+o,bottom:n+r,x:t,y:n}}function lt(e,t,n){let{reference:o,floating:r}=e;const i=Y(t),a=Ve(t),s=qe(a),l=J(t),c=i==="y",f=o.x+o.width/2-r.width/2,u=o.y+o.height/2-r.height/2,y=o[s]/2-r[s]/2;let p;switch(l){case"top":p={x:f,y:o.y-r.height};break;case"bottom":p={x:f,y:o.y+o.height};break;case"right":p={x:o.x+o.width,y:u};break;case"left":p={x:o.x-r.width,y:u};break;default:p={x:o.x,y:o.y}}switch(le(t)){case"start":p[a]-=y*(n&&c?-1:1);break;case"end":p[a]+=y*(n&&c?-1:1);break}return p}const no=async(e,t,n)=>{const{placement:o="bottom",strategy:r="absolute",middleware:i=[],platform:a}=n,s=i.filter(Boolean),l=await(a.isRTL==null?void 0:a.isRTL(t));let c=await a.getElementRects({reference:e,floating:t,strategy:r}),{x:f,y:u}=lt(c,o,l),y=o,p={},m=0;for(let g=0;g<s.length;g++){const{name:v,fn:k}=s[g],{x:w,y:b,data:M,reset:C}=await k({x:f,y:u,initialPlacement:o,placement:y,strategy:r,middlewareData:p,rects:c,platform:a,elements:{reference:e,floating:t}});f=w!=null?w:f,u=b!=null?b:u,p=A(x({},p),{[v]:x(x({},p[v]),M)}),C&&m<=50&&(m++,typeof C=="object"&&(C.placement&&(y=C.placement),C.rects&&(c=C.rects===!0?await a.getElementRects({reference:e,floating:t,strategy:r}):C.rects),{x:f,y:u}=lt(c,y,l)),g=-1)}return{x:f,y:u,placement:y,strategy:r,middlewareData:p}};async function ue(e,t){var n;t===void 0&&(t={});const{x:o,y:r,platform:i,rects:a,elements:s,strategy:l}=e,{boundary:c="clippingAncestors",rootBoundary:f="viewport",elementContext:u="floating",altBoundary:y=!1,padding:p=0}=G(t,e),m=Et(p),v=s[y?u==="floating"?"reference":"floating":u],k=Me(await i.getClippingRect({element:(n=await(i.isElement==null?void 0:i.isElement(v)))==null||n?v:v.contextElement||await(i.getDocumentElement==null?void 0:i.getDocumentElement(s.floating)),boundary:c,rootBoundary:f,strategy:l})),w=u==="floating"?{x:o,y:r,width:a.floating.width,height:a.floating.height}:a.reference,b=await(i.getOffsetParent==null?void 0:i.getOffsetParent(s.floating)),M=await(i.isElement==null?void 0:i.isElement(b))?await(i.getScale==null?void 0:i.getScale(b))||{x:1,y:1}:{x:1,y:1},C=Me(i.convertOffsetParentRelativeRectToViewportRelativeRect?await i.convertOffsetParentRelativeRectToViewportRelativeRect({elements:s,rect:w,offsetParent:b,strategy:l}):w);return{top:(k.top-C.top+m.top)/M.y,bottom:(C.bottom-k.bottom+m.bottom)/M.y,left:(k.left-C.left+m.left)/M.x,right:(C.right-k.right+m.right)/M.x}}const oo=e=>({name:"arrow",options:e,async fn(t){const{x:n,y:o,placement:r,rects:i,platform:a,elements:s,middlewareData:l}=t,{element:c,padding:f=0}=G(e,t)||{};if(c==null)return{};const u=Et(f),y={x:n,y:o},p=Ve(r),m=qe(p),g=await a.getDimensions(c),v=p==="y",k=v?"top":"left",w=v?"bottom":"right",b=v?"clientHeight":"clientWidth",M=i.reference[m]+i.reference[p]-y[p]-i.floating[m],C=y[p]-i.reference[p],S=await(a.getOffsetParent==null?void 0:a.getOffsetParent(c));let P=S?S[b]:0;(!P||!await(a.isElement==null?void 0:a.isElement(S)))&&(P=s.floating[b]||i.floating[m]);const T=M/2-C/2,R=P/2-g[m]/2-1,O=Q(u[k],R),j=Q(u[w],R),D=O,N=P-g[m]-j,z=P/2-g[m]/2+T,V=Ne(D,z,N),_=!l.arrow&&le(r)!=null&&z!==V&&i.reference[m]/2-(z<D?O:j)-g[m]/2<0,I=_?z<D?z-D:z-N:0;return{[p]:y[p]+I,data:x({[p]:V,centerOffset:z-V-I},_&&{alignmentOffset:I}),reset:_}}}),ro=function(e){return e===void 0&&(e={}),{name:"flip",options:e,async fn(t){var n,o;const{placement:r,middlewareData:i,rects:a,initialPlacement:s,platform:l,elements:c}=t,z=G(e,t),{mainAxis:f=!0,crossAxis:u=!0,fallbackPlacements:y,fallbackStrategy:p="bestFit",fallbackAxisSideDirection:m="none",flipAlignment:g=!0}=z,v=q(z,["mainAxis","crossAxis","fallbackPlacements","fallbackStrategy","fallbackAxisSideDirection","flipAlignment"]);if((n=i.arrow)!=null&&n.alignmentOffset)return{};const k=J(r),w=Y(s),b=J(s)===s,M=await(l.isRTL==null?void 0:l.isRTL(c.floating)),C=y||(b||!g?[we(s)]:Kn(s)),S=m!=="none";!y&&S&&C.push(...eo(s,g,m,M));const P=[s,...C],T=await ue(t,v),R=[];let O=((o=i.flip)==null?void 0:o.overflows)||[];if(f&&R.push(T[k]),u){const V=Xn(r,a,M);R.push(T[V[0]],T[V[1]])}if(O=[...O,{placement:r,overflows:R}],!R.every(V=>V<=0)){var j,D;const V=(((j=i.flip)==null?void 0:j.index)||0)+1,_=P[V];if(_&&(!(u==="alignment"?w!==Y(_):!1)||O.every(H=>H.overflows[0]>0&&Y(H.placement)===w)))return{data:{index:V,overflows:O},reset:{placement:_}};let I=(D=O.filter(E=>E.overflows[0]<=0).sort((E,H)=>E.overflows[1]-H.overflows[1])[0])==null?void 0:D.placement;if(!I)switch(p){case"bestFit":{var N;const E=(N=O.filter(H=>{if(S){const F=Y(H.placement);return F===w||F==="y"}return!0}).map(H=>[H.placement,H.overflows.filter(F=>F>0).reduce((F,ae)=>F+ae,0)]).sort((H,F)=>H[1]-F[1])[0])==null?void 0:N[0];E&&(I=E);break}case"initialPlacement":I=s;break}if(r!==I)return{reset:{placement:I}}}return{}}}};function dt(e,t){return{top:e.top-t.height,right:e.right-t.width,bottom:e.bottom-t.height,left:e.left-t.width}}function ft(e){return Wn.some(t=>e[t]>=0)}const io=function(e){return e===void 0&&(e={}),{name:"hide",options:e,async fn(t){const{rects:n}=t,i=G(e,t),{strategy:o="referenceHidden"}=i,r=q(i,["strategy"]);switch(o){case"referenceHidden":{const a=await ue(t,A(x({},r),{elementContext:"reference"})),s=dt(a,n.reference);return{data:{referenceHiddenOffsets:s,referenceHidden:ft(s)}}}case"escaped":{const a=await ue(t,A(x({},r),{altBoundary:!0})),s=dt(a,n.floating);return{data:{escapedOffsets:s,escaped:ft(s)}}}default:return{}}}}},Ot=new Set(["left","top"]);async function ao(e,t){const{placement:n,platform:o,elements:r}=e,i=await(o.isRTL==null?void 0:o.isRTL(r.floating)),a=J(n),s=le(n),l=Y(n)==="y",c=Ot.has(a)?-1:1,f=i&&l?-1:1,u=G(t,e);let{mainAxis:y,crossAxis:p,alignmentAxis:m}=typeof u=="number"?{mainAxis:u,crossAxis:0,alignmentAxis:null}:{mainAxis:u.mainAxis||0,crossAxis:u.crossAxis||0,alignmentAxis:u.alignmentAxis};return s&&typeof m=="number"&&(p=s==="end"?m*-1:m),l?{x:p*f,y:y*c}:{x:y*c,y:p*f}}const so=function(e){return e===void 0&&(e=0),{name:"offset",options:e,async fn(t){var n,o;const{x:r,y:i,placement:a,middlewareData:s}=t,l=await ao(t,e);return a===((n=s.offset)==null?void 0:n.placement)&&(o=s.arrow)!=null&&o.alignmentOffset?{}:{x:r+l.x,y:i+l.y,data:A(x({},l),{placement:a})}}}},co=function(e){return e===void 0&&(e={}),{name:"shift",options:e,async fn(t){const{x:n,y:o,placement:r}=t,v=G(e,t),{mainAxis:i=!0,crossAxis:a=!1,limiter:s={fn:k=>{let{x:w,y:b}=k;return{x:w,y:b}}}}=v,l=q(v,["mainAxis","crossAxis","limiter"]),c={x:n,y:o},f=await ue(t,l),u=Y(J(r)),y=je(u);let p=c[y],m=c[u];if(i){const k=y==="y"?"top":"left",w=y==="y"?"bottom":"right",b=p+f[k],M=p-f[w];p=Ne(b,p,M)}if(a){const k=u==="y"?"top":"left",w=u==="y"?"bottom":"right",b=m+f[k],M=m-f[w];m=Ne(b,m,M)}const g=s.fn(A(x({},t),{[y]:p,[u]:m}));return A(x({},g),{data:{x:g.x-n,y:g.y-o,enabled:{[y]:i,[u]:a}}})}}},lo=function(e){return e===void 0&&(e={}),{options:e,fn(t){const{x:n,y:o,placement:r,rects:i,middlewareData:a}=t,{offset:s=0,mainAxis:l=!0,crossAxis:c=!0}=G(e,t),f={x:n,y:o},u=Y(r),y=je(u);let p=f[y],m=f[u];const g=G(s,t),v=typeof g=="number"?{mainAxis:g,crossAxis:0}:x({mainAxis:0,crossAxis:0},g);if(l){const b=y==="y"?"height":"width",M=i.reference[y]-i.floating[b]+v.mainAxis,C=i.reference[y]+i.reference[b]-v.mainAxis;p<M?p=M:p>C&&(p=C)}if(c){var k,w;const b=y==="y"?"width":"height",M=Ot.has(J(r)),C=i.reference[u]-i.floating[b]+(M&&((k=a.offset)==null?void 0:k[u])||0)+(M?0:v.crossAxis),S=i.reference[u]+i.reference[b]+(M?0:((w=a.offset)==null?void 0:w[u])||0)-(M?v.crossAxis:0);m<C?m=C:m>S&&(m=S)}return{[y]:p,[u]:m}}}},fo=function(e){return e===void 0&&(e={}),{name:"size",options:e,async fn(t){var n,o;const{placement:r,rects:i,platform:a,elements:s}=t,O=G(e,t),{apply:l=()=>{}}=O,c=q(O,["apply"]),f=await ue(t,c),u=J(r),y=le(r),p=Y(r)==="y",{width:m,height:g}=i.floating;let v,k;u==="top"||u==="bottom"?(v=u,k=y===(await(a.isRTL==null?void 0:a.isRTL(s.floating))?"start":"end")?"left":"right"):(k=u,v=y==="end"?"top":"bottom");const w=g-f.top-f.bottom,b=m-f.left-f.right,M=Q(g-f[v],w),C=Q(m-f[k],b),S=!t.middlewareData.shift;let P=M,T=C;if((n=t.middlewareData.shift)!=null&&n.enabled.x&&(T=b),(o=t.middlewareData.shift)!=null&&o.enabled.y&&(P=w),S&&!y){const j=B(f.left,0),D=B(f.right,0),N=B(f.top,0),z=B(f.bottom,0);p?T=m-2*(j!==0||D!==0?j+D:B(f.left,f.right)):P=g-2*(N!==0||z!==0?N+z:B(f.top,f.bottom))}await l(A(x({},t),{availableWidth:T,availableHeight:P}));const R=await a.getDimensions(s.floating);return m!==R.width||g!==R.height?{reset:{rects:!0}}:{}}}};function Se(){return typeof window!="undefined"}function de(e){return Lt(e)?(e.nodeName||"").toLowerCase():"#document"}function $(e){var t;return(e==null||(t=e.ownerDocument)==null?void 0:t.defaultView)||window}function K(e){var t;return(t=(Lt(e)?e.ownerDocument:e.document)||window.document)==null?void 0:t.documentElement}function Lt(e){return Se()?e instanceof Node||e instanceof $(e).Node:!1}function W(e){return Se()?e instanceof Element||e instanceof $(e).Element:!1}function X(e){return Se()?e instanceof HTMLElement||e instanceof $(e).HTMLElement:!1}function ut(e){return!Se()||typeof ShadowRoot=="undefined"?!1:e instanceof ShadowRoot||e instanceof $(e).ShadowRoot}const uo=new Set(["inline","contents"]);function ye(e){const{overflow:t,overflowX:n,overflowY:o,display:r}=U(e);return/auto|scroll|overlay|hidden|clip/.test(t+o+n)&&!uo.has(r)}const ho=new Set(["table","td","th"]);function yo(e){return ho.has(de(e))}const po=[":popover-open",":modal"];function Pe(e){return po.some(t=>{try{return e.matches(t)}catch(n){return!1}})}const mo=["transform","translate","scale","rotate","perspective"],go=["transform","translate","scale","rotate","perspective","filter"],xo=["paint","layout","strict","content"];function _e(e){const t=Ie(),n=W(e)?U(e):e;return mo.some(o=>n[o]?n[o]!=="none":!1)||(n.containerType?n.containerType!=="normal":!1)||!t&&(n.backdropFilter?n.backdropFilter!=="none":!1)||!t&&(n.filter?n.filter!=="none":!1)||go.some(o=>(n.willChange||"").includes(o))||xo.some(o=>(n.contain||"").includes(o))}function ko(e){let t=ee(e);for(;X(t)&&!ce(t);){if(_e(t))return t;if(Pe(t))return null;t=ee(t)}return null}function Ie(){return typeof CSS=="undefined"||!CSS.supports?!1:CSS.supports("-webkit-backdrop-filter","none")}const vo=new Set(["html","body","#document"]);function ce(e){return vo.has(de(e))}function U(e){return $(e).getComputedStyle(e)}function Re(e){return W(e)?{scrollLeft:e.scrollLeft,scrollTop:e.scrollTop}:{scrollLeft:e.scrollX,scrollTop:e.scrollY}}function ee(e){if(de(e)==="html")return e;const t=e.assignedSlot||e.parentNode||ut(e)&&e.host||K(e);return ut(t)?t.host:t}function Tt(e){const t=ee(e);return ce(t)?e.ownerDocument?e.ownerDocument.body:e.body:X(t)&&ye(t)?t:Tt(t)}function he(e,t,n){var o;t===void 0&&(t=[]),n===void 0&&(n=!0);const r=Tt(e),i=r===((o=e.ownerDocument)==null?void 0:o.body),a=$(r);if(i){const s=He(a);return t.concat(a,a.visualViewport||[],ye(r)?r:[],s&&n?he(s):[])}return t.concat(r,he(r,[],n))}function He(e){return e.parent&&Object.getPrototypeOf(e.parent)?e.frameElement:null}function Dt(e){const t=U(e);let n=parseFloat(t.width)||0,o=parseFloat(t.height)||0;const r=X(e),i=r?e.offsetWidth:n,a=r?e.offsetHeight:o,s=ve(n)!==i||ve(o)!==a;return s&&(n=i,o=a),{width:n,height:o,$:s}}function Fe(e){return W(e)?e:e.contextElement}function se(e){const t=Fe(e);if(!X(t))return Z(1);const n=t.getBoundingClientRect(),{width:o,height:r,$:i}=Dt(t);let a=(i?ve(n.width):n.width)/o,s=(i?ve(n.height):n.height)/r;return(!a||!Number.isFinite(a))&&(a=1),(!s||!Number.isFinite(s))&&(s=1),{x:a,y:s}}const wo=Z(0);function Nt(e){const t=$(e);return!Ie()||!t.visualViewport?wo:{x:t.visualViewport.offsetLeft,y:t.visualViewport.offsetTop}}function Mo(e,t,n){return t===void 0&&(t=!1),!n||t&&n!==$(e)?!1:t}function re(e,t,n,o){t===void 0&&(t=!1),n===void 0&&(n=!1);const r=e.getBoundingClientRect(),i=Fe(e);let a=Z(1);t&&(o?W(o)&&(a=se(o)):a=se(e));const s=Mo(i,n,o)?Nt(i):Z(0);let l=(r.left+s.x)/a.x,c=(r.top+s.y)/a.y,f=r.width/a.x,u=r.height/a.y;if(i){const y=$(i),p=o&&W(o)?$(o):o;let m=y,g=He(m);for(;g&&o&&p!==m;){const v=se(g),k=g.getBoundingClientRect(),w=U(g),b=k.left+(g.clientLeft+parseFloat(w.paddingLeft))*v.x,M=k.top+(g.clientTop+parseFloat(w.paddingTop))*v.y;l*=v.x,c*=v.y,f*=v.x,u*=v.y,l+=b,c+=M,m=$(g),g=He(m)}}return Me({width:f,height:u,x:l,y:c})}function Be(e,t){const n=Re(e).scrollLeft;return t?t.left+n:re(K(e)).left+n}function zt(e,t,n){n===void 0&&(n=!1);const o=e.getBoundingClientRect(),r=o.left+t.scrollLeft-(n?0:Be(e,o)),i=o.top+t.scrollTop;return{x:r,y:i}}function bo(e){let{elements:t,rect:n,offsetParent:o,strategy:r}=e;const i=r==="fixed",a=K(o),s=t?Pe(t.floating):!1;if(o===a||s&&i)return n;let l={scrollLeft:0,scrollTop:0},c=Z(1);const f=Z(0),u=X(o);if((u||!u&&!i)&&((de(o)!=="body"||ye(a))&&(l=Re(o)),X(o))){const p=re(o);c=se(o),f.x=p.x+o.clientLeft,f.y=p.y+o.clientTop}const y=a&&!u&&!i?zt(a,l,!0):Z(0);return{width:n.width*c.x,height:n.height*c.y,x:n.x*c.x-l.scrollLeft*c.x+f.x+y.x,y:n.y*c.y-l.scrollTop*c.y+f.y+y.y}}function Co(e){return Array.from(e.getClientRects())}function Ao(e){const t=K(e),n=Re(e),o=e.ownerDocument.body,r=B(t.scrollWidth,t.clientWidth,o.scrollWidth,o.clientWidth),i=B(t.scrollHeight,t.clientHeight,o.scrollHeight,o.clientHeight);let a=-n.scrollLeft+Be(e);const s=-n.scrollTop;return U(o).direction==="rtl"&&(a+=B(t.clientWidth,o.clientWidth)-r),{width:r,height:i,x:a,y:s}}function So(e,t){const n=$(e),o=K(e),r=n.visualViewport;let i=o.clientWidth,a=o.clientHeight,s=0,l=0;if(r){i=r.width,a=r.height;const c=Ie();(!c||c&&t==="fixed")&&(s=r.offsetLeft,l=r.offsetTop)}return{width:i,height:a,x:s,y:l}}const Po=new Set(["absolute","fixed"]);function Ro(e,t){const n=re(e,!0,t==="fixed"),o=n.top+e.clientTop,r=n.left+e.clientLeft,i=X(e)?se(e):Z(1),a=e.clientWidth*i.x,s=e.clientHeight*i.y,l=r*i.x,c=o*i.y;return{width:a,height:s,x:l,y:c}}function ht(e,t,n){let o;if(t==="viewport")o=So(e,n);else if(t==="document")o=Ao(K(e));else if(W(t))o=Ro(t,n);else{const r=Nt(e);o={x:t.x-r.x,y:t.y-r.y,width:t.width,height:t.height}}return Me(o)}function Ht(e,t){const n=ee(e);return n===t||!W(n)||ce(n)?!1:U(n).position==="fixed"||Ht(n,t)}function Eo(e,t){const n=t.get(e);if(n)return n;let o=he(e,[],!1).filter(s=>W(s)&&de(s)!=="body"),r=null;const i=U(e).position==="fixed";let a=i?ee(e):e;for(;W(a)&&!ce(a);){const s=U(a),l=_e(a);!l&&s.position==="fixed"&&(r=null),(i?!l&&!r:!l&&s.position==="static"&&!!r&&Po.has(r.position)||ye(a)&&!l&&Ht(e,a))?o=o.filter(f=>f!==a):r=s,a=ee(a)}return t.set(e,o),o}function Oo(e){let{element:t,boundary:n,rootBoundary:o,strategy:r}=e;const a=[...n==="clippingAncestors"?Pe(t)?[]:Eo(t,this._c):[].concat(n),o],s=a[0],l=a.reduce((c,f)=>{const u=ht(t,f,r);return c.top=B(u.top,c.top),c.right=Q(u.right,c.right),c.bottom=Q(u.bottom,c.bottom),c.left=B(u.left,c.left),c},ht(t,s,r));return{width:l.right-l.left,height:l.bottom-l.top,x:l.left,y:l.top}}function Lo(e){const{width:t,height:n}=Dt(e);return{width:t,height:n}}function To(e,t,n){const o=X(t),r=K(t),i=n==="fixed",a=re(e,!0,i,t);let s={scrollLeft:0,scrollTop:0};const l=Z(0);function c(){l.x=Be(r)}if(o||!o&&!i)if((de(t)!=="body"||ye(r))&&(s=Re(t)),o){const p=re(t,!0,i,t);l.x=p.x+t.clientLeft,l.y=p.y+t.clientTop}else r&&c();i&&!o&&r&&c();const f=r&&!o&&!i?zt(r,s):Z(0),u=a.left+s.scrollLeft-l.x-f.x,y=a.top+s.scrollTop-l.y-f.y;return{x:u,y,width:a.width,height:a.height}}function Oe(e){return U(e).position==="static"}function yt(e,t){if(!X(e)||U(e).position==="fixed")return null;if(t)return t(e);let n=e.offsetParent;return K(e)===n&&(n=n.ownerDocument.body),n}function jt(e,t){const n=$(e);if(Pe(e))return n;if(!X(e)){let r=ee(e);for(;r&&!ce(r);){if(W(r)&&!Oe(r))return r;r=ee(r)}return n}let o=yt(e,t);for(;o&&yo(o)&&Oe(o);)o=yt(o,t);return o&&ce(o)&&Oe(o)&&!_e(o)?n:o||ko(e)||n}const Do=async function(e){const t=this.getOffsetParent||jt,n=this.getDimensions,o=await n(e.floating);return{reference:To(e.reference,await t(e.floating),e.strategy),floating:{x:0,y:0,width:o.width,height:o.height}}};function No(e){return U(e).direction==="rtl"}const zo={convertOffsetParentRelativeRectToViewportRelativeRect:bo,getDocumentElement:K,getClippingRect:Oo,getOffsetParent:jt,getElementRects:Do,getClientRects:Co,getDimensions:Lo,getScale:se,isElement:W,isRTL:No};function qt(e,t){return e.x===t.x&&e.y===t.y&&e.width===t.width&&e.height===t.height}function Ho(e,t){let n=null,o;const r=K(e);function i(){var s;clearTimeout(o),(s=n)==null||s.disconnect(),n=null}function a(s,l){s===void 0&&(s=!1),l===void 0&&(l=1),i();const c=e.getBoundingClientRect(),{left:f,top:u,width:y,height:p}=c;if(s||t(),!y||!p)return;const m=xe(u),g=xe(r.clientWidth-(f+y)),v=xe(r.clientHeight-(u+p)),k=xe(f),b={rootMargin:-m+"px "+-g+"px "+-v+"px "+-k+"px",threshold:B(0,Q(1,l))||1};let M=!0;function C(S){const P=S[0].intersectionRatio;if(P!==l){if(!M)return a();P?a(!1,P):o=setTimeout(()=>{a(!1,1e-7)},1e3)}P===1&&!qt(c,e.getBoundingClientRect())&&a(),M=!1}try{n=new IntersectionObserver(C,A(x({},b),{root:r.ownerDocument}))}catch(S){n=new IntersectionObserver(C,b)}n.observe(e)}return a(!0),i}function jo(e,t,n,o){o===void 0&&(o={});const{ancestorScroll:r=!0,ancestorResize:i=!0,elementResize:a=typeof ResizeObserver=="function",layoutShift:s=typeof IntersectionObserver=="function",animationFrame:l=!1}=o,c=Fe(e),f=r||i?[...c?he(c):[],...he(t)]:[];f.forEach(k=>{r&&k.addEventListener("scroll",n,{passive:!0}),i&&k.addEventListener("resize",n)});const u=c&&s?Ho(c,n):null;let y=-1,p=null;a&&(p=new ResizeObserver(k=>{let[w]=k;w&&w.target===c&&p&&(p.unobserve(t),cancelAnimationFrame(y),y=requestAnimationFrame(()=>{var b;(b=p)==null||b.observe(t)})),n()}),c&&!l&&p.observe(c),p.observe(t));let m,g=l?re(e):null;l&&v();function v(){const k=re(e);g&&!qt(g,k)&&n(),g=k,m=requestAnimationFrame(v)}return n(),()=>{var k;f.forEach(w=>{r&&w.removeEventListener("scroll",n),i&&w.removeEventListener("resize",n)}),u==null||u(),(k=p)==null||k.disconnect(),p=null,l&&cancelAnimationFrame(m)}}const qo=so,Vo=co,_o=ro,Io=fo,Fo=io,pt=oo,Bo=lo,$o=(e,t,n)=>{const o=new Map,r=x({platform:zo},n),i=A(x({},r.platform),{_c:o});return no(e,t,A(x({},r),{platform:i}))};var Wo=typeof document!="undefined",Uo=function(){},ke=Wo?h.useLayoutEffect:Uo;function be(e,t){if(e===t)return!0;if(typeof e!=typeof t)return!1;if(typeof e=="function"&&e.toString()===t.toString())return!0;let n,o,r;if(e&&t&&typeof e=="object"){if(Array.isArray(e)){if(n=e.length,n!==t.length)return!1;for(o=n;o--!==0;)if(!be(e[o],t[o]))return!1;return!0}if(r=Object.keys(e),n=r.length,n!==Object.keys(t).length)return!1;for(o=n;o--!==0;)if(!{}.hasOwnProperty.call(t,r[o]))return!1;for(o=n;o--!==0;){const i=r[o];if(!(i==="_owner"&&e.$$typeof)&&!be(e[i],t[i]))return!1}return!0}return e!==e&&t!==t}function Vt(e){return typeof window=="undefined"?1:(e.ownerDocument.defaultView||window).devicePixelRatio||1}function mt(e,t){const n=Vt(e);return Math.round(t*n)/n}function Le(e){const t=h.useRef(e);return ke(()=>{t.current=e}),t}function Yo(e){e===void 0&&(e={});const{placement:t="bottom",strategy:n="absolute",middleware:o=[],platform:r,elements:{reference:i,floating:a}={},transform:s=!0,whileElementsMounted:l,open:c}=e,[f,u]=h.useState({x:0,y:0,strategy:n,placement:t,middlewareData:{},isPositioned:!1}),[y,p]=h.useState(o);be(y,o)||p(o);const[m,g]=h.useState(null),[v,k]=h.useState(null),w=h.useCallback(E=>{E!==S.current&&(S.current=E,g(E))},[]),b=h.useCallback(E=>{E!==P.current&&(P.current=E,k(E))},[]),M=i||m,C=a||v,S=h.useRef(null),P=h.useRef(null),T=h.useRef(f),R=l!=null,O=Le(l),j=Le(r),D=Le(c),N=h.useCallback(()=>{if(!S.current||!P.current)return;const E={placement:t,strategy:n,middleware:y};j.current&&(E.platform=j.current),$o(S.current,P.current,E).then(H=>{const F=A(x({},H),{isPositioned:D.current!==!1});z.current&&!be(T.current,F)&&(T.current=F,gt.flushSync(()=>{u(F)}))})},[y,t,n,j,D]);ke(()=>{c===!1&&T.current.isPositioned&&(T.current.isPositioned=!1,u(E=>A(x({},E),{isPositioned:!1})))},[c]);const z=h.useRef(!1);ke(()=>(z.current=!0,()=>{z.current=!1}),[]),ke(()=>{if(M&&(S.current=M),C&&(P.current=C),M&&C){if(O.current)return O.current(M,C,N);N()}},[M,C,N,O,R]);const V=h.useMemo(()=>({reference:S,floating:P,setReference:w,setFloating:b}),[w,b]),_=h.useMemo(()=>({reference:M,floating:C}),[M,C]),I=h.useMemo(()=>{const E={position:n,left:0,top:0};if(!_.floating)return E;const H=mt(_.floating,f.x),F=mt(_.floating,f.y);return s?x(A(x({},E),{transform:"translate("+H+"px, "+F+"px)"}),Vt(_.floating)>=1.5&&{willChange:"transform"}):{position:n,left:H,top:F}},[n,s,_.floating,f.x,f.y]);return h.useMemo(()=>A(x({},f),{update:N,refs:V,elements:_,floatingStyles:I}),[f,N,V,_,I])}const Zo=e=>{function t(n){return{}.hasOwnProperty.call(n,"current")}return{name:"arrow",options:e,fn(n){const{element:o,padding:r}=typeof e=="function"?e(n):e;return o&&t(o)?o.current!=null?pt({element:o.current,padding:r}).fn(n):{}:o?pt({element:o,padding:r}).fn(n):{}}}},Xo=(e,t)=>A(x({},qo(e)),{options:[e,t]}),Ko=(e,t)=>A(x({},Vo(e)),{options:[e,t]}),Go=(e,t)=>A(x({},Bo(e)),{options:[e,t]}),Jo=(e,t)=>A(x({},_o(e)),{options:[e,t]}),Qo=(e,t)=>A(x({},Io(e)),{options:[e,t]}),er=(e,t)=>A(x({},Fo(e)),{options:[e,t]}),tr=(e,t)=>A(x({},Zo(e)),{options:[e,t]});var nr="Arrow",_t=h.forwardRef((e,t)=>{const a=e,{children:n,width:o=10,height:r=5}=a,i=q(a,["children","width","height"]);return L.jsx(ie.svg,A(x({},i),{ref:t,width:o,height:r,viewBox:"0 0 30 10",preserveAspectRatio:"none",children:e.asChild?n:L.jsx("polygon",{points:"0,0 30,0 15,10"})}))});_t.displayName=nr;var or=_t;function rr(e){const[t,n]=h.useState(void 0);return oe(()=>{if(e){n({width:e.offsetWidth,height:e.offsetHeight});const o=new ResizeObserver(r=>{if(!Array.isArray(r)||!r.length)return;const i=r[0];let a,s;if("borderBoxSize"in i){const l=i.borderBoxSize,c=Array.isArray(l)?l[0]:l;a=c.inlineSize,s=c.blockSize}else a=e.offsetWidth,s=e.offsetHeight;n({width:a,height:s})});return o.observe(e,{box:"border-box"}),()=>o.unobserve(e)}else n(void 0)},[e]),t}var It="Popper",[Ft,Ta]=wt(It),[Da,Bt]=Ft(It),$t="PopperAnchor",Wt=h.forwardRef((e,t)=>{const l=e,{__scopePopper:n,virtualRef:o}=l,r=q(l,["__scopePopper","virtualRef"]),i=Bt($t,n),a=h.useRef(null),s=ne(t,a);return h.useEffect(()=>{i.onAnchorChange((o==null?void 0:o.current)||a.current)}),o?null:L.jsx(ie.div,A(x({},r),{ref:s}))});Wt.displayName=$t;var $e="PopperContent",[ir,ar]=Ft($e),Ut=h.forwardRef((e,t)=>{var Ue,Ye,Ze,Xe,Ke,Ge,Je,Qe;const We=e,{__scopePopper:n,side:o="bottom",sideOffset:r=0,align:i="center",alignOffset:a=0,arrowPadding:s=0,avoidCollisions:l=!0,collisionBoundary:c=[],collisionPadding:f=0,sticky:u="partial",hideWhenDetached:y=!1,updatePositionStrategy:p="optimized",onPlaced:m}=We,g=q(We,["__scopePopper","side","sideOffset","align","alignOffset","arrowPadding","avoidCollisions","collisionBoundary","collisionPadding","sticky","hideWhenDetached","updatePositionStrategy","onPlaced"]),v=Bt($e,n),[k,w]=h.useState(null),b=ne(t,fe=>w(fe)),[M,C]=h.useState(null),S=rr(M),P=(Ue=S==null?void 0:S.width)!=null?Ue:0,T=(Ye=S==null?void 0:S.height)!=null?Ye:0,R=o+(i!=="center"?"-"+i:""),O=typeof f=="number"?f:x({top:0,right:0,bottom:0,left:0},f),j=Array.isArray(c)?c:[c],D=j.length>0,N={padding:O,boundary:j.filter(cr),altBoundary:D},{refs:z,floatingStyles:V,placement:_,isPositioned:I,middlewareData:E}=Yo({strategy:"fixed",placement:R,whileElementsMounted:(...fe)=>jo(...fe,{animationFrame:p==="always"}),elements:{reference:v.anchor},middleware:[Xo({mainAxis:r+T,alignmentAxis:a}),l&&Ko(x({mainAxis:!0,crossAxis:!1,limiter:u==="partial"?Go():void 0},N)),l&&Jo(x({},N)),Qo(A(x({},N),{apply:({elements:fe,rects:et,availableWidth:tn,availableHeight:nn})=>{const{width:on,height:rn}=et.reference,pe=fe.floating.style;pe.setProperty("--radix-popper-available-width",`${tn}px`),pe.setProperty("--radix-popper-available-height",`${nn}px`),pe.setProperty("--radix-popper-anchor-width",`${on}px`),pe.setProperty("--radix-popper-anchor-height",`${rn}px`)}})),M&&tr({element:M,padding:s}),lr({arrowWidth:P,arrowHeight:T}),y&&er(x({strategy:"referenceHidden"},N))]}),[H,F]=Xt(_),ae=Ae(m);oe(()=>{I&&(ae==null||ae())},[I,ae]);const Kt=(Ze=E.arrow)==null?void 0:Ze.x,Gt=(Xe=E.arrow)==null?void 0:Xe.y,Jt=((Ke=E.arrow)==null?void 0:Ke.centerOffset)!==0,[Qt,en]=h.useState();return oe(()=>{k&&en(window.getComputedStyle(k).zIndex)},[k]),L.jsx("div",{ref:z.setFloating,"data-radix-popper-content-wrapper":"",style:x(A(x({},V),{transform:I?V.transform:"translate(0, -200%)",minWidth:"max-content",zIndex:Qt,"--radix-popper-transform-origin":[(Ge=E.transformOrigin)==null?void 0:Ge.x,(Je=E.transformOrigin)==null?void 0:Je.y].join(" ")}),((Qe=E.hide)==null?void 0:Qe.referenceHidden)&&{visibility:"hidden",pointerEvents:"none"}),dir:e.dir,children:L.jsx(ir,{scope:n,placedSide:H,onArrowChange:C,arrowX:Kt,arrowY:Gt,shouldHideArrow:Jt,children:L.jsx(ie.div,A(x({"data-side":H,"data-align":F},g),{ref:b,style:A(x({},g.style),{animation:I?void 0:"none"})}))})})});Ut.displayName=$e;var Yt="PopperArrow",sr={top:"bottom",right:"left",bottom:"top",left:"right"},Zt=h.forwardRef(function(t,n){const s=t,{__scopePopper:o}=s,r=q(s,["__scopePopper"]),i=ar(Yt,o),a=sr[i.placedSide];return L.jsx("span",{ref:i.onArrowChange,style:{position:"absolute",left:i.arrowX,top:i.arrowY,[a]:0,transformOrigin:{top:"",right:"0 0",bottom:"center 0",left:"100% 0"}[i.placedSide],transform:{top:"translateY(100%)",right:"translateY(50%) rotate(90deg) translateX(-50%)",bottom:"rotate(180deg)",left:"translateY(50%) rotate(-90deg) translateX(50%)"}[i.placedSide],visibility:i.shouldHideArrow?"hidden":void 0},children:L.jsx(or,A(x({},r),{ref:n,style:A(x({},r.style),{display:"block"})}))})});Zt.displayName=Yt;function cr(e){return e!==null}var lr=e=>({name:"transformOrigin",options:e,fn(t){var v,k,w,b,M;const{placement:n,rects:o,middlewareData:r}=t,a=((v=r.arrow)==null?void 0:v.centerOffset)!==0,s=a?0:e.arrowWidth,l=a?0:e.arrowHeight,[c,f]=Xt(n),u={start:"0%",center:"50%",end:"100%"}[f],y=((w=(k=r.arrow)==null?void 0:k.x)!=null?w:0)+s/2,p=((M=(b=r.arrow)==null?void 0:b.y)!=null?M:0)+l/2;let m="",g="";return c==="bottom"?(m=a?u:`${y}px`,g=`${-l}px`):c==="top"?(m=a?u:`${y}px`,g=`${o.floating.height+l}px`):c==="right"?(m=`${-l}px`,g=a?u:`${p}px`):c==="left"&&(m=`${o.floating.width+l}px`,g=a?u:`${p}px`),{data:{x:m,y:g}}}});function Xt(e){const[t,n="center"]=e.split("-");return[t,n]}var Na=Wt,za=Ut,Ha=Zt;export{ea as $,Na as A,pr as B,za as C,Ct as D,Qr as E,ni as F,ci as G,fi as H,hi as I,Vi as J,Lr as K,Ci as L,Pi as M,Tr as N,Gr as O,ie as P,Wi as Q,yr as R,aa as S,va as T,Or as U,Pt as V,Ea as W,Oa as X,ri as Y,Hr as Z,mi as _,wt as a,Er as a$,ia as a0,ti as a1,xr as a2,zr as a3,Bi as a4,Ai as a5,Ri as a6,qi as a7,Pa as a8,ra as a9,Ji as aA,Nr as aB,pi as aC,wi as aD,ei as aE,Di as aF,ca as aG,oi as aH,ya as aI,Zr as aJ,_i as aK,bi as aL,Ei as aM,Ra as aN,Li as aO,Xr as aP,di as aQ,ma as aR,Fi as aS,sa as aT,Si as aU,ii as aV,ui as aW,si as aX,Aa as aY,Qi as aZ,Ar as a_,Mi as aa,Kr as ab,br as ac,na as ad,li as ae,Yr as af,$i as ag,Yi as ah,_r as ai,la as aj,Jr as ak,Cr as al,Ur as am,La as an,ua as ao,xa as ap,qr as aq,Ii as ar,zi as as,ga as at,Sr as au,Ki as av,vi as aw,$r as ax,ta as ay,da as az,mr as b,yi as b0,ba as b1,wr as b2,kr as b3,Mr as b4,vr as b5,ki as b6,xi as b7,Ca as b8,Ui as b9,ha as ba,gi as bb,Zi as bc,Xi as bd,Pr as be,ji as bf,Sa as bg,Ma as bh,Ni as bi,oa as bj,Oi as bk,Ir as bl,pa as bm,Hi as bn,fa as bo,ai as bp,hr as c,Nn as d,Ae as e,Ee as f,Tn as g,oe as h,bn as i,L as j,Ta as k,gr as l,Ha as m,ur as n,Fr as o,jr as p,Rr as q,Br as r,Vr as s,Wr as t,ne as u,Ti as v,wa as w,Gi as x,Dr as y,ka as z};

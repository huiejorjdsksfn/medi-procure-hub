var sn=Object.defineProperty,cn=Object.defineProperties;var ln=Object.getOwnPropertyDescriptors;var ge=Object.getOwnPropertySymbols;var rt=Object.prototype.hasOwnProperty,it=Object.prototype.propertyIsEnumerable;var ot=(e,t,n)=>t in e?sn(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,x=(e,t)=>{for(var n in t||(t={}))rt.call(t,n)&&ot(e,n,t[n]);if(ge)for(var n of ge(t))it.call(t,n)&&ot(e,n,t[n]);return e},A=(e,t)=>cn(e,ln(t));var q=(e,t)=>{var n={};for(var o in e)rt.call(e,o)&&t.indexOf(o)<0&&(n[o]=e[o]);if(e!=null&&ge)for(var o of ge(e))t.indexOf(o)<0&&it.call(e,o)&&(n[o]=e[o]);return n};var U=(e,t,n)=>new Promise((o,r)=>{var i=c=>{try{s(n.next(c))}catch(l){r(l)}},a=c=>{try{s(n.throw(c))}catch(l){r(l)}},s=c=>c.done?o(c.value):Promise.resolve(c.value).then(i,a);s((n=n.apply(e,t)).next())});import{r as h,o as oe,a as kt,v as dn,R as fn}from"./react-vendor-D0kNNEwc.js";var vt={exports:{}},Ae={};/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var un=h,hn=Symbol.for("react.element"),yn=Symbol.for("react.fragment"),pn=Object.prototype.hasOwnProperty,mn=un.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,gn={key:!0,ref:!0,__self:!0,__source:!0};function wt(e,t,n){var o,r={},i=null,a=null;n!==void 0&&(i=""+n),t.key!==void 0&&(i=""+t.key),t.ref!==void 0&&(a=t.ref);for(o in t)pn.call(t,o)&&!gn.hasOwnProperty(o)&&(r[o]=t[o]);if(e&&e.defaultProps)for(o in t=e.defaultProps,t)r[o]===void 0&&(r[o]=t[o]);return{$$typeof:hn,type:e,key:i,ref:a,props:r,_owner:mn.current}}Ae.Fragment=yn;Ae.jsx=wt;Ae.jsxs=wt;vt.exports=Ae;var z=vt.exports;function Le(e,t,{checkForDefaultPrevented:n=!0}={}){return function(r){if(e==null||e(r),n===!1||!r.defaultPrevented)return t==null?void 0:t(r)}}function at(e,t){if(typeof e=="function")return e(t);e!=null&&(e.current=t)}function Mt(...e){return t=>{let n=!1;const o=e.map(r=>{const i=at(r,t);return!n&&typeof i=="function"&&(n=!0),i});if(n)return()=>{for(let r=0;r<o.length;r++){const i=o[r];typeof i=="function"?i():at(e[r],null)}}}}function re(...e){return h.useCallback(Mt(...e),e)}function bt(e,t=[]){let n=[];function o(i,a){const s=h.createContext(a),c=n.length;n=[...n,a];const l=u=>{var M;const v=u,{scope:y,children:p}=v,g=q(v,["scope","children"]),m=((M=y==null?void 0:y[e])==null?void 0:M[c])||s,k=h.useMemo(()=>g,Object.values(g));return z.jsx(m.Provider,{value:k,children:p})};l.displayName=i+"Provider";function f(u,y){var m;const p=((m=y==null?void 0:y[e])==null?void 0:m[c])||s,g=h.useContext(p);if(g)return g;if(a!==void 0)return a;throw new Error(`\`${u}\` must be used within \`${i}\``)}return[l,f]}const r=()=>{const i=n.map(a=>h.createContext(a));return function(s){const c=(s==null?void 0:s[e])||i;return h.useMemo(()=>({[`__scope${e}`]:A(x({},s),{[e]:c})}),[s,c])}};return r.scopeName=e,[o,xn(r,...t)]}function xn(...e){const t=e[0];if(e.length===1)return t;const n=()=>{const o=e.map(r=>({useScope:r(),scopeName:r.scopeName}));return function(i){const a=o.reduce((s,{useScope:c,scopeName:l})=>{const u=c(i)[`__scope${l}`];return x(x({},s),u)},{});return h.useMemo(()=>({[`__scope${t.scopeName}`]:a}),[a])}};return n.scopeName=t.scopeName,n}function De(e){const t=kn(e),n=h.forwardRef((o,r)=>{const l=o,{children:i}=l,a=q(l,["children"]),s=h.Children.toArray(i),c=s.find(vn);if(c){const f=c.props.children,u=s.map(y=>y===c?h.Children.count(f)>1?h.Children.only(null):h.isValidElement(f)?f.props.children:null:y);return z.jsx(t,A(x({},a),{ref:r,children:h.isValidElement(f)?h.cloneElement(f,void 0,u):null}))}return z.jsx(t,A(x({},a),{ref:r,children:i}))});return n.displayName=`${e}.Slot`,n}function kn(e){const t=h.forwardRef((n,o)=>{const a=n,{children:r}=a,i=q(a,["children"]);if(h.isValidElement(r)){const s=Mn(r),c=wn(i,r.props);return r.type!==h.Fragment&&(c.ref=o?Mt(o,s):s),h.cloneElement(r,c)}return h.Children.count(r)>1?h.Children.only(null):null});return t.displayName=`${e}.SlotClone`,t}var Ct=Symbol("radix.slottable");function hr(e){const t=({children:n})=>z.jsx(z.Fragment,{children:n});return t.displayName=`${e}.Slottable`,t.__radixId=Ct,t}function vn(e){return h.isValidElement(e)&&typeof e.type=="function"&&"__radixId"in e.type&&e.type.__radixId===Ct}function wn(e,t){const n=x({},t);for(const o in t){const r=e[o],i=t[o];/^on[A-Z]/.test(o)?r&&i?n[o]=(...s)=>{const c=i(...s);return r(...s),c}:r&&(n[o]=r):o==="style"?n[o]=x(x({},r),i):o==="className"&&(n[o]=[r,i].filter(Boolean).join(" "))}return x(x({},e),n)}function Mn(e){var o,r;let t=(o=Object.getOwnPropertyDescriptor(e.props,"ref"))==null?void 0:o.get,n=t&&"isReactWarning"in t&&t.isReactWarning;return n?e.ref:(t=(r=Object.getOwnPropertyDescriptor(e,"ref"))==null?void 0:r.get,n=t&&"isReactWarning"in t&&t.isReactWarning,n?e.props.ref:e.props.ref||e.ref)}function yr(e){const t=e+"CollectionProvider",[n,o]=bt(t),[r,i]=n(t,{collectionRef:{current:null},itemMap:new Map}),a=m=>{const{scope:k,children:v}=m,M=oe.useRef(null),b=oe.useRef(new Map).current;return z.jsx(r,{scope:k,itemMap:b,collectionRef:M,children:v})};a.displayName=t;const s=e+"CollectionSlot",c=De(s),l=oe.forwardRef((m,k)=>{const{scope:v,children:M}=m,b=i(s,v),w=re(k,b.collectionRef);return z.jsx(c,{ref:w,children:M})});l.displayName=s;const f=e+"CollectionItemSlot",u="data-radix-collection-item",y=De(f),p=oe.forwardRef((m,k)=>{const E=m,{scope:v,children:M}=E,b=q(E,["scope","children"]),w=oe.useRef(null),C=re(k,w),S=i(f,v);return oe.useEffect(()=>(S.itemMap.set(w,x({ref:w},b)),()=>void S.itemMap.delete(w))),z.jsx(y,{[u]:"",ref:C,children:M})});p.displayName=f;function g(m){const k=i(e+"CollectionConsumer",m);return oe.useCallback(()=>{const M=k.collectionRef.current;if(!M)return[];const b=Array.from(M.querySelectorAll(`[${u}]`));return Array.from(k.itemMap.values()).sort((S,E)=>b.indexOf(S.ref.current)-b.indexOf(E.ref.current))},[k.collectionRef,k.itemMap])}return[{Provider:a,Slot:l,ItemSlot:p},g,o]}var bn=["a","button","div","form","h2","h3","img","input","label","li","nav","ol","p","select","span","svg","ul"],se=bn.reduce((e,t)=>{const n=De(`Primitive.${t}`),o=h.forwardRef((r,i)=>{const l=r,{asChild:a}=l,s=q(l,["asChild"]),c=a?n:t;return typeof window!="undefined"&&(window[Symbol.for("radix-ui")]=!0),z.jsx(c,A(x({},s),{ref:i}))});return o.displayName=`Primitive.${t}`,A(x({},e),{[t]:o})},{});function Cn(e,t){e&&kt.flushSync(()=>e.dispatchEvent(t))}function Se(e){const t=h.useRef(e);return h.useEffect(()=>{t.current=e}),h.useMemo(()=>(...n)=>{var o;return(o=t.current)==null?void 0:o.call(t,...n)},[])}function An(e,t=globalThis==null?void 0:globalThis.document){const n=Se(e);h.useEffect(()=>{const o=r=>{r.key==="Escape"&&n(r)};return t.addEventListener("keydown",o,{capture:!0}),()=>t.removeEventListener("keydown",o,{capture:!0})},[n,t])}var Sn="DismissableLayer",ze="dismissableLayer.update",Pn="dismissableLayer.pointerDownOutside",Rn="dismissableLayer.focusOutside",st,At=h.createContext({layers:new Set,layersWithOutsidePointerEventsDisabled:new Set,branches:new Set}),St=h.forwardRef((e,t)=>{var O;const E=e,{disableOutsidePointerEvents:n=!1,onEscapeKeyDown:o,onPointerDownOutside:r,onFocusOutside:i,onInteractOutside:a,onDismiss:s}=E,c=q(E,["disableOutsidePointerEvents","onEscapeKeyDown","onPointerDownOutside","onFocusOutside","onInteractOutside","onDismiss"]),l=h.useContext(At),[f,u]=h.useState(null),y=(O=f==null?void 0:f.ownerDocument)!=null?O:globalThis==null?void 0:globalThis.document,[,p]=h.useState({}),g=re(t,P=>u(P)),m=Array.from(l.layers),[k]=[...l.layersWithOutsidePointerEventsDisabled].slice(-1),v=m.indexOf(k),M=f?m.indexOf(f):-1,b=l.layersWithOutsidePointerEventsDisabled.size>0,w=M>=v,C=On(P=>{const T=P.target,L=[...l.branches].some(_=>_.contains(T));!w||L||(r==null||r(P),a==null||a(P),P.defaultPrevented||s==null||s())},y),S=Ln(P=>{const T=P.target;[...l.branches].some(_=>_.contains(T))||(i==null||i(P),a==null||a(P),P.defaultPrevented||s==null||s())},y);return An(P=>{M===l.layers.size-1&&(o==null||o(P),!P.defaultPrevented&&s&&(P.preventDefault(),s()))},y),h.useEffect(()=>{if(f)return n&&(l.layersWithOutsidePointerEventsDisabled.size===0&&(st=y.body.style.pointerEvents,y.body.style.pointerEvents="none"),l.layersWithOutsidePointerEventsDisabled.add(f)),l.layers.add(f),ct(),()=>{n&&l.layersWithOutsidePointerEventsDisabled.size===1&&(y.body.style.pointerEvents=st)}},[f,y,n,l]),h.useEffect(()=>()=>{f&&(l.layers.delete(f),l.layersWithOutsidePointerEventsDisabled.delete(f),ct())},[f,l]),h.useEffect(()=>{const P=()=>p({});return document.addEventListener(ze,P),()=>document.removeEventListener(ze,P)},[]),z.jsx(se.div,A(x({},c),{ref:g,style:x({pointerEvents:b?w?"auto":"none":void 0},e.style),onFocusCapture:Le(e.onFocusCapture,S.onFocusCapture),onBlurCapture:Le(e.onBlurCapture,S.onBlurCapture),onPointerDownCapture:Le(e.onPointerDownCapture,C.onPointerDownCapture)}))});St.displayName=Sn;var En="DismissableLayerBranch",Pt=h.forwardRef((e,t)=>{const n=h.useContext(At),o=h.useRef(null),r=re(t,o);return h.useEffect(()=>{const i=o.current;if(i)return n.branches.add(i),()=>{n.branches.delete(i)}},[n.branches]),z.jsx(se.div,A(x({},e),{ref:r}))});Pt.displayName=En;function On(e,t=globalThis==null?void 0:globalThis.document){const n=Se(e),o=h.useRef(!1),r=h.useRef(()=>{});return h.useEffect(()=>{const i=s=>{if(s.target&&!o.current){let c=function(){Rt(Pn,n,l,{discrete:!0})};const l={originalEvent:s};s.pointerType==="touch"?(t.removeEventListener("click",r.current),r.current=c,t.addEventListener("click",r.current,{once:!0})):c()}else t.removeEventListener("click",r.current);o.current=!1},a=window.setTimeout(()=>{t.addEventListener("pointerdown",i)},0);return()=>{window.clearTimeout(a),t.removeEventListener("pointerdown",i),t.removeEventListener("click",r.current)}},[t,n]),{onPointerDownCapture:()=>o.current=!0}}function Ln(e,t=globalThis==null?void 0:globalThis.document){const n=Se(e),o=h.useRef(!1);return h.useEffect(()=>{const r=i=>{i.target&&!o.current&&Rt(Rn,n,{originalEvent:i},{discrete:!1})};return t.addEventListener("focusin",r),()=>t.removeEventListener("focusin",r)},[t,n]),{onFocusCapture:()=>o.current=!0,onBlurCapture:()=>o.current=!1}}function ct(){const e=new CustomEvent(ze);document.dispatchEvent(e)}function Rt(e,t,n,{discrete:o}){const r=n.originalEvent.target,i=new CustomEvent(e,{bubbles:!1,cancelable:!0,detail:n});t&&r.addEventListener(e,t,{once:!0}),o?Cn(r,i):r.dispatchEvent(i)}var pr=St,mr=Pt,ie=globalThis!=null&&globalThis.document?h.useLayoutEffect:()=>{},Tn="Portal",Nn=h.forwardRef((e,t)=>{var c;const s=e,{container:n}=s,o=q(s,["container"]),[r,i]=h.useState(!1);ie(()=>i(!0),[]);const a=n||r&&((c=globalThis==null?void 0:globalThis.document)==null?void 0:c.body);return a?dn.createPortal(z.jsx(se.div,A(x({},o),{ref:t})),a):null});Nn.displayName=Tn;function Dn(e,t){return h.useReducer((n,o)=>{const r=t[n][o];return r!=null?r:n},e)}var zn=e=>{const{present:t,children:n}=e,o=Hn(t),r=typeof n=="function"?n({present:o.isPresent}):h.Children.only(n),i=re(o.ref,jn(r));return typeof n=="function"||o.isPresent?h.cloneElement(r,{ref:i}):null};zn.displayName="Presence";function Hn(e){const[t,n]=h.useState(),o=h.useRef(null),r=h.useRef(e),i=h.useRef("none"),a=e?"mounted":"unmounted",[s,c]=Dn(a,{mounted:{UNMOUNT:"unmounted",ANIMATION_OUT:"unmountSuspended"},unmountSuspended:{MOUNT:"mounted",ANIMATION_END:"unmounted"},unmounted:{MOUNT:"mounted"}});return h.useEffect(()=>{const l=xe(o.current);i.current=s==="mounted"?l:"none"},[s]),ie(()=>{const l=o.current,f=r.current;if(f!==e){const y=i.current,p=xe(l);e?c("MOUNT"):p==="none"||(l==null?void 0:l.display)==="none"?c("UNMOUNT"):c(f&&y!==p?"ANIMATION_OUT":"UNMOUNT"),r.current=e}},[e,c]),ie(()=>{var l;if(t){let f;const u=(l=t.ownerDocument.defaultView)!=null?l:window,y=g=>{const k=xe(o.current).includes(g.animationName);if(g.target===t&&k&&(c("ANIMATION_END"),!r.current)){const v=t.style.animationFillMode;t.style.animationFillMode="forwards",f=u.setTimeout(()=>{t.style.animationFillMode==="forwards"&&(t.style.animationFillMode=v)})}},p=g=>{g.target===t&&(i.current=xe(o.current))};return t.addEventListener("animationstart",p),t.addEventListener("animationcancel",y),t.addEventListener("animationend",y),()=>{u.clearTimeout(f),t.removeEventListener("animationstart",p),t.removeEventListener("animationcancel",y),t.removeEventListener("animationend",y)}}else c("ANIMATION_END")},[t,c]),{isPresent:["mounted","unmountSuspended"].includes(s),ref:h.useCallback(l=>{o.current=l?getComputedStyle(l):null,n(l)},[])}}function xe(e){return(e==null?void 0:e.animationName)||"none"}function jn(e){var o,r;let t=(o=Object.getOwnPropertyDescriptor(e.props,"ref"))==null?void 0:o.get,n=t&&"isReactWarning"in t&&t.isReactWarning;return n?e.ref:(t=(r=Object.getOwnPropertyDescriptor(e,"ref"))==null?void 0:r.get,n=t&&"isReactWarning"in t&&t.isReactWarning,n?e.props.ref:e.props.ref||e.ref)}var qn=fn[" useInsertionEffect ".trim().toString()]||ie;function gr({prop:e,defaultProp:t,onChange:n=()=>{},caller:o}){const[r,i,a]=_n({defaultProp:t,onChange:n}),s=e!==void 0,c=s?e:r;{const f=h.useRef(e!==void 0);h.useEffect(()=>{const u=f.current;u!==s&&console.warn(`${o} is changing from ${u?"controlled":"uncontrolled"} to ${s?"controlled":"uncontrolled"}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`),f.current=s},[s,o])}const l=h.useCallback(f=>{var u;if(s){const y=Vn(f)?f(e):f;y!==e&&((u=a.current)==null||u.call(a,y))}else i(f)},[s,e,i,a]);return[c,l]}function _n({defaultProp:e,onChange:t}){const[n,o]=h.useState(e),r=h.useRef(n),i=h.useRef(t);return qn(()=>{i.current=t},[t]),h.useEffect(()=>{var a;r.current!==n&&((a=i.current)==null||a.call(i,n),r.current=n)},[n,r]),[n,o,i]}function Vn(e){return typeof e=="function"}var In=Object.freeze({position:"absolute",border:0,width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",wordWrap:"normal"}),Bn="VisuallyHidden",Et=h.forwardRef((e,t)=>z.jsx(se.span,A(x({},e),{ref:t,style:x(x({},In),e.style)})));Et.displayName=Bn;var xr=Et;/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fn=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),Ot=(...e)=>e.filter((t,n,o)=>!!t&&t.trim()!==""&&o.indexOf(t)===n).join(" ").trim();/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var $n={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wn=h.forwardRef((l,c)=>{var f=l,{color:e="currentColor",size:t=24,strokeWidth:n=2,absoluteStrokeWidth:o,className:r="",children:i,iconNode:a}=f,s=q(f,["color","size","strokeWidth","absoluteStrokeWidth","className","children","iconNode"]);return h.createElement("svg",x(A(x({ref:c},$n),{width:t,height:t,stroke:e,strokeWidth:o?Number(n)*24/Number(t):n,className:Ot("lucide",r)}),s),[...a.map(([u,y])=>h.createElement(u,y)),...Array.isArray(i)?i:[i]])});/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=(e,t)=>{const n=h.forwardRef((a,i)=>{var s=a,{className:o}=s,r=q(s,["className"]);return h.createElement(Wn,x({ref:i,iconNode:t,className:Ot(`lucide-${Fn(e)}`,o)},r))});return n.displayName=`${e}`,n};/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kr=d("Activity",[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vr=d("AlignCenter",[["path",{d:"M17 12H7",key:"16if0g"}],["path",{d:"M19 18H5",key:"18s9l3"}],["path",{d:"M21 6H3",key:"1jwq7v"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wr=d("AlignJustify",[["path",{d:"M3 12h18",key:"1i2n21"}],["path",{d:"M3 18h18",key:"1h113x"}],["path",{d:"M3 6h18",key:"d0wm0j"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mr=d("AlignLeft",[["path",{d:"M15 12H3",key:"6jk70r"}],["path",{d:"M17 18H3",key:"1amg6g"}],["path",{d:"M21 6H3",key:"1jwq7v"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const br=d("AlignRight",[["path",{d:"M21 12H9",key:"dn1m92"}],["path",{d:"M21 18H7",key:"1ygte8"}],["path",{d:"M21 6H3",key:"1jwq7v"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cr=d("Archive",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ar=d("ArrowLeft",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sr=d("ArrowRight",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);/**
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
 */const Tr=d("Bug",[["path",{d:"m8 2 1.88 1.88",key:"fmnt4t"}],["path",{d:"M14.12 3.88 16 2",key:"qol33r"}],["path",{d:"M9 7.13v-1a3.003 3.003 0 1 1 6 0v1",key:"d7y7pr"}],["path",{d:"M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6",key:"xs1cw7"}],["path",{d:"M12 20v-9",key:"1qisl0"}],["path",{d:"M6.53 9C4.6 8.8 3 7.1 3 5",key:"32zzws"}],["path",{d:"M6 13H2",key:"82j7cp"}],["path",{d:"M3 21c0-2.1 1.7-3.9 3.8-4",key:"4p0ekp"}],["path",{d:"M20.97 5c0 2.1-1.6 3.8-3.5 4",key:"18gb23"}],["path",{d:"M22 13h-4",key:"1jl80f"}],["path",{d:"M17.2 17c2.1.1 3.8 1.9 3.8 4",key:"k3fwyw"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nr=d("Building2",[["path",{d:"M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z",key:"1b4qmf"}],["path",{d:"M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2",key:"i71pzd"}],["path",{d:"M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2",key:"10jefs"}],["path",{d:"M10 6h4",key:"1itunk"}],["path",{d:"M10 10h4",key:"tcdvrf"}],["path",{d:"M10 14h4",key:"kelpxr"}],["path",{d:"M10 18h4",key:"1ulq68"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dr=d("Calendar",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zr=d("Camera",[["path",{d:"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",key:"1tc9qg"}],["circle",{cx:"12",cy:"13",r:"3",key:"1vg3eu"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hr=d("ChartColumn",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jr=d("ChartNoAxesColumn",[["line",{x1:"18",x2:"18",y1:"20",y2:"10",key:"1xfpm4"}],["line",{x1:"12",x2:"12",y1:"20",y2:"4",key:"be30l9"}],["line",{x1:"6",x2:"6",y1:"20",y2:"14",key:"1r4le6"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qr=d("CheckCheck",[["path",{d:"M18 6 7 17l-5-5",key:"116fxf"}],["path",{d:"m22 10-7.5 7.5L13 16",key:"ke71qq"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _r=d("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vr=d("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ir=d("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Br=d("ChevronUp",[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fr=d("CircleAlert",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $r=d("CircleCheckBig",[["path",{d:"M21.801 10A10 10 0 1 1 17 3.335",key:"yps3ct"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wr=d("CircleUser",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}],["path",{d:"M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662",key:"154egf"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ur=d("CircleX",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yr=d("ClipboardList",[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zr=d("Clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xr=d("CodeXml",[["path",{d:"m18 16 4-4-4-4",key:"1inbqp"}],["path",{d:"m6 8-4 4 4 4",key:"15zrgr"}],["path",{d:"m14.5 4-5 16",key:"e7oirm"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gr=d("Copy",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kr=d("CornerUpLeft",[["polyline",{points:"9 14 4 9 9 4",key:"881910"}],["path",{d:"M20 20v-7a4 4 0 0 0-4-4H4",key:"1nkjon"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jr=d("Database",[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qr=d("DollarSign",[["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",key:"1b0p4s"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ei=d("Download",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ti=d("ExternalLink",[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ni=d("EyeOff",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oi=d("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ri=d("FileCheck",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"m9 15 2 2 4-4",key:"1grp1n"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ii=d("FileSpreadsheet",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M8 13h2",key:"yr2amv"}],["path",{d:"M14 13h2",key:"un5t4a"}],["path",{d:"M8 17h2",key:"2yhykz"}],["path",{d:"M14 17h2",key:"10kma7"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ai=d("FileText",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const si=d("File",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ci=d("FolderOpen",[["path",{d:"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",key:"usdka0"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const li=d("Forward",[["polyline",{points:"15 17 20 12 15 7",key:"1w3sku"}],["path",{d:"M4 18v-2a4 4 0 0 1 4-4h12",key:"jmiej9"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const di=d("Gavel",[["path",{d:"m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8",key:"15492f"}],["path",{d:"m16 16 6-6",key:"vzrcl6"}],["path",{d:"m8 8 6-6",key:"18bi4p"}],["path",{d:"m9 7 8 8",key:"5jnvq1"}],["path",{d:"m21 11-8-8",key:"z4y7zo"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fi=d("Globe",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ui=d("HardDrive",[["line",{x1:"22",x2:"2",y1:"12",y2:"12",key:"1y58io"}],["path",{d:"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",key:"oot6mr"}],["line",{x1:"6",x2:"6.01",y1:"16",y2:"16",key:"sgf278"}],["line",{x1:"10",x2:"10.01",y1:"16",y2:"16",key:"1l4acy"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hi=d("Hash",[["line",{x1:"4",x2:"20",y1:"9",y2:"9",key:"4lhtct"}],["line",{x1:"4",x2:"20",y1:"15",y2:"15",key:"vyu0kd"}],["line",{x1:"10",x2:"8",y1:"3",y2:"21",key:"1ggp8o"}],["line",{x1:"16",x2:"14",y1:"3",y2:"21",key:"weycgp"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yi=d("House",[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"1d0kgt"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pi=d("Image",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mi=d("Inbox",[["polyline",{points:"22 12 16 12 14 15 10 15 8 12 2 12",key:"o97t9d"}],["path",{d:"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",key:"oot6mr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gi=d("Info",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xi=d("Italic",[["line",{x1:"19",x2:"10",y1:"4",y2:"4",key:"15jd3p"}],["line",{x1:"14",x2:"5",y1:"20",y2:"20",key:"bu0au3"}],["line",{x1:"15",x2:"9",y1:"4",y2:"20",key:"uljnxc"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ki=d("Key",[["path",{d:"m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4",key:"g0fldk"}],["path",{d:"m21 2-9.6 9.6",key:"1j0ho8"}],["circle",{cx:"7.5",cy:"15.5",r:"5.5",key:"yqb3hr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vi=d("Layers",[["path",{d:"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",key:"8b97xw"}],["path",{d:"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65",key:"dd6zsq"}],["path",{d:"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65",key:"ep9fru"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wi=d("LayoutDashboard",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mi=d("LayoutGrid",[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1",key:"1g98yp"}],["rect",{width:"7",height:"7",x:"14",y:"3",rx:"1",key:"6d4xhi"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1",key:"nxv5o0"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1",key:"1bb6yr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bi=d("ListOrdered",[["path",{d:"M10 12h11",key:"6m4ad9"}],["path",{d:"M10 18h11",key:"11hvi2"}],["path",{d:"M10 6h11",key:"c7qv1k"}],["path",{d:"M4 10h2",key:"16xx2s"}],["path",{d:"M4 6h1v4",key:"cnovpq"}],["path",{d:"M6 18H4c0-1 2-2 2-3s-1-1.5-2-1",key:"m9a95d"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ci=d("List",[["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M3 18h.01",key:"1tta3j"}],["path",{d:"M3 6h.01",key:"1rqtza"}],["path",{d:"M8 12h13",key:"1za7za"}],["path",{d:"M8 18h13",key:"1lx6n3"}],["path",{d:"M8 6h13",key:"ik3vkj"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ai=d("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Si=d("LockOpen",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 9.9-1",key:"1mm8w8"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pi=d("Lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ri=d("LogIn",[["path",{d:"M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4",key:"u53s6r"}],["polyline",{points:"10 17 15 12 10 7",key:"1ail0h"}],["line",{x1:"15",x2:"3",y1:"12",y2:"12",key:"v6grx8"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ei=d("LogOut",[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}],["polyline",{points:"16 17 21 12 16 7",key:"1gabdz"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12",key:"1uyos4"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Oi=d("Mail",[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2",key:"18n3k1"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7",key:"1ocrg3"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Li=d("MapPin",[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",key:"1r0f0z"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ti=d("Megaphone",[["path",{d:"m3 11 18-5v12L3 14v-3z",key:"n962bs"}],["path",{d:"M11.6 16.8a3 3 0 1 1-5.8-1.6",key:"1yl0tm"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ni=d("MessageSquare",[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",key:"1lielz"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Di=d("Monitor",[["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2",key:"48i651"}],["line",{x1:"8",x2:"16",y1:"21",y2:"21",key:"1svkeh"}],["line",{x1:"12",x2:"12",y1:"17",y2:"21",key:"vw1qmm"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zi=d("Move",[["path",{d:"M12 2v20",key:"t6zp3m"}],["path",{d:"m15 19-3 3-3-3",key:"11eu04"}],["path",{d:"m19 9 3 3-3 3",key:"1mg7y2"}],["path",{d:"M2 12h20",key:"9i4pu4"}],["path",{d:"m5 9-3 3 3 3",key:"j64kie"}],["path",{d:"m9 5 3-3 3 3",key:"l8vdw6"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hi=d("Network",[["rect",{x:"16",y:"16",width:"6",height:"6",rx:"1",key:"4q2zg0"}],["rect",{x:"2",y:"16",width:"6",height:"6",rx:"1",key:"8cvhb9"}],["rect",{x:"9",y:"2",width:"6",height:"6",rx:"1",key:"1egb70"}],["path",{d:"M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3",key:"1jsf9p"}],["path",{d:"M12 12V8",key:"2874zd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ji=d("Package",[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["path",{d:"m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7",key:"yx3hmr"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qi=d("Palette",[["circle",{cx:"13.5",cy:"6.5",r:".5",fill:"currentColor",key:"1okk4w"}],["circle",{cx:"17.5",cy:"10.5",r:".5",fill:"currentColor",key:"f64h9f"}],["circle",{cx:"8.5",cy:"7.5",r:".5",fill:"currentColor",key:"fotxhn"}],["circle",{cx:"6.5",cy:"12.5",r:".5",fill:"currentColor",key:"qy21gx"}],["path",{d:"M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z",key:"12rzf8"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _i=d("PanelsTopLeft",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 9h18",key:"1pudct"}],["path",{d:"M9 21V9",key:"1oto5p"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vi=d("PenLine",[["path",{d:"M12 20h9",key:"t2du7b"}],["path",{d:"M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z",key:"1ykcvy"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ii=d("Pen",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bi=d("PhoneCall",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}],["path",{d:"M14.05 2a9 9 0 0 1 8 7.94",key:"vmijpz"}],["path",{d:"M14.05 6A5 5 0 0 1 18 10",key:"13nbpp"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fi=d("Phone",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $i=d("PiggyBank",[["path",{d:"M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z",key:"1ivx2i"}],["path",{d:"M2 9v1c0 1.1.9 2 2 2h1",key:"nm575m"}],["path",{d:"M16 11h.01",key:"xkw8gn"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wi=d("Play",[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ui=d("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yi=d("Printer",[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zi=d("Radio",[["path",{d:"M4.9 19.1C1 15.2 1 8.8 4.9 4.9",key:"1vaf9d"}],["path",{d:"M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5",key:"u1ii0m"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5",key:"1j5fej"}],["path",{d:"M19.1 4.9C23 8.8 23 15.1 19.1 19",key:"10b0cb"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xi=d("Receipt",[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",key:"q3az6g"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 17.5v-11",key:"1jc1ny"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gi=d("Redo",[["path",{d:"M21 7v6h-6",key:"3ptur4"}],["path",{d:"M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7",key:"1kgawr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ki=d("RefreshCw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ji=d("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qi=d("Save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ea=d("Scale",[["path",{d:"m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"7g6ntu"}],["path",{d:"m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"ijws7r"}],["path",{d:"M7 21h10",key:"1b0cd5"}],["path",{d:"M12 3v18",key:"108xh3"}],["path",{d:"M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2",key:"3gwbw2"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ta=d("ScanBarcode",[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2",key:"aa7l1z"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2",key:"4qcy5o"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2",key:"6vwrx8"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2",key:"ioqczr"}],["path",{d:"M8 7v10",key:"23sfjj"}],["path",{d:"M12 7v10",key:"jspqdw"}],["path",{d:"M17 7v10",key:"578dap"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const na=d("Scan",[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2",key:"aa7l1z"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2",key:"4qcy5o"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2",key:"6vwrx8"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2",key:"ioqczr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oa=d("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ra=d("Send",[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ia=d("Server",[["rect",{width:"20",height:"8",x:"2",y:"2",rx:"2",ry:"2",key:"ngkwjq"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",ry:"2",key:"iecqi9"}],["line",{x1:"6",x2:"6.01",y1:"6",y2:"6",key:"16zg32"}],["line",{x1:"6",x2:"6.01",y1:"18",y2:"18",key:"nzw8ys"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const aa=d("Settings2",[["path",{d:"M20 7h-9",key:"3s1dr2"}],["path",{d:"M14 17H5",key:"gfn3mx"}],["circle",{cx:"17",cy:"17",r:"3",key:"18b49y"}],["circle",{cx:"7",cy:"7",r:"3",key:"dfmy0x"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sa=d("Settings",[["path",{d:"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",key:"1qme2f"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ca=d("Shield",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const la=d("ShoppingCart",[["circle",{cx:"8",cy:"21",r:"1",key:"jimo8o"}],["circle",{cx:"19",cy:"21",r:"1",key:"13723u"}],["path",{d:"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12",key:"9zh506"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const da=d("Signal",[["path",{d:"M2 20h.01",key:"4haj6o"}],["path",{d:"M7 20v-4",key:"j294jx"}],["path",{d:"M12 20v-8",key:"i3yub9"}],["path",{d:"M17 20V8",key:"1tkaf5"}],["path",{d:"M22 4v16",key:"sih9yq"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fa=d("SlidersVertical",[["line",{x1:"4",x2:"4",y1:"21",y2:"14",key:"1p332r"}],["line",{x1:"4",x2:"4",y1:"10",y2:"3",key:"gb41h5"}],["line",{x1:"12",x2:"12",y1:"21",y2:"12",key:"hf2csr"}],["line",{x1:"12",x2:"12",y1:"8",y2:"3",key:"1kfi7u"}],["line",{x1:"20",x2:"20",y1:"21",y2:"16",key:"1lhrwl"}],["line",{x1:"20",x2:"20",y1:"12",y2:"3",key:"16vvfq"}],["line",{x1:"2",x2:"6",y1:"14",y2:"14",key:"1uebub"}],["line",{x1:"10",x2:"14",y1:"8",y2:"8",key:"1yglbp"}],["line",{x1:"18",x2:"22",y1:"16",y2:"16",key:"1jxqpz"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ua=d("Smartphone",[["rect",{width:"14",height:"20",x:"5",y:"2",rx:"2",ry:"2",key:"1yt0o3"}],["path",{d:"M12 18h.01",key:"mhygvu"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ha=d("SquarePen",[["path",{d:"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",key:"1m0v6g"}],["path",{d:"M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z",key:"ohrbg2"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ya=d("Square",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pa=d("Star",[["path",{d:"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",key:"r04s7s"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ma=d("Table2",[["path",{d:"M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18",key:"gugj83"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ga=d("Table",[["path",{d:"M12 3v18",key:"108xh3"}],["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 9h18",key:"1pudct"}],["path",{d:"M3 15h18",key:"5xshup"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xa=d("Tablet",[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",ry:"2",key:"76otgf"}],["line",{x1:"12",x2:"12.01",y1:"18",y2:"18",key:"1dp563"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ka=d("Terminal",[["polyline",{points:"4 17 10 11 4 5",key:"akl6gq"}],["line",{x1:"12",x2:"20",y1:"19",y2:"19",key:"q2wloq"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const va=d("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wa=d("TrendingUp",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ma=d("TriangleAlert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ba=d("Truck",[["path",{d:"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2",key:"wrbu53"}],["path",{d:"M15 18H9",key:"1lyqi6"}],["path",{d:"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14",key:"lysw3i"}],["circle",{cx:"17",cy:"18",r:"2",key:"332jqn"}],["circle",{cx:"7",cy:"18",r:"2",key:"19iecd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ca=d("Type",[["polyline",{points:"4 7 4 4 20 4 20 7",key:"1nosan"}],["line",{x1:"9",x2:"15",y1:"20",y2:"20",key:"swin9y"}],["line",{x1:"12",x2:"12",y1:"4",y2:"20",key:"1tx1rr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Aa=d("Underline",[["path",{d:"M6 4v6a6 6 0 0 0 12 0V4",key:"9kb039"}],["line",{x1:"4",x2:"20",y1:"20",y2:"20",key:"nun2al"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sa=d("Undo",[["path",{d:"M3 7v6h6",key:"1v2h90"}],["path",{d:"M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13",key:"1r6uu6"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pa=d("Upload",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"17 8 12 3 7 8",key:"t8dd8p"}],["line",{x1:"12",x2:"12",y1:"3",y2:"15",key:"widbto"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ra=d("UserCheck",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["polyline",{points:"16 11 18 13 22 9",key:"1pwet4"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ea=d("User",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Oa=d("Users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75",key:"1da9ce"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const La=d("Wifi",[["path",{d:"M12 20h.01",key:"zekei9"}],["path",{d:"M2 8.82a15 15 0 0 1 20 0",key:"dnpr2z"}],["path",{d:"M5 12.859a10 10 0 0 1 14 0",key:"1x1e6c"}],["path",{d:"M8.5 16.429a5 5 0 0 1 7 0",key:"1bycff"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ta=d("Wrench",[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",key:"cbrjhi"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Na=d("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Da=d("Zap",[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]]),Un=["top","right","bottom","left"],te=Math.min,$=Math.max,we=Math.round,ke=Math.floor,G=e=>({x:e,y:e}),Yn={left:"right",right:"left",bottom:"top",top:"bottom"},Zn={start:"end",end:"start"};function He(e,t,n){return $(e,te(t,n))}function Q(e,t){return typeof e=="function"?e(t):e}function ee(e){return e.split("-")[0]}function de(e){return e.split("-")[1]}function _e(e){return e==="x"?"y":"x"}function Ve(e){return e==="y"?"height":"width"}const Xn=new Set(["top","bottom"]);function X(e){return Xn.has(ee(e))?"y":"x"}function Ie(e){return _e(X(e))}function Gn(e,t,n){n===void 0&&(n=!1);const o=de(e),r=Ie(e),i=Ve(r);let a=r==="x"?o===(n?"end":"start")?"right":"left":o==="start"?"bottom":"top";return t.reference[i]>t.floating[i]&&(a=Me(a)),[a,Me(a)]}function Kn(e){const t=Me(e);return[je(e),t,je(t)]}function je(e){return e.replace(/start|end/g,t=>Zn[t])}const lt=["left","right"],dt=["right","left"],Jn=["top","bottom"],Qn=["bottom","top"];function eo(e,t,n){switch(e){case"top":case"bottom":return n?t?dt:lt:t?lt:dt;case"left":case"right":return t?Jn:Qn;default:return[]}}function to(e,t,n,o){const r=de(e);let i=eo(ee(e),n==="start",o);return r&&(i=i.map(a=>a+"-"+r),t&&(i=i.concat(i.map(je)))),i}function Me(e){return e.replace(/left|right|bottom|top/g,t=>Yn[t])}function no(e){return x({top:0,right:0,bottom:0,left:0},e)}function Lt(e){return typeof e!="number"?no(e):{top:e,right:e,bottom:e,left:e}}function be(e){const{x:t,y:n,width:o,height:r}=e;return{width:o,height:r,top:n,left:t,right:t+o,bottom:n+r,x:t,y:n}}function ft(e,t,n){let{reference:o,floating:r}=e;const i=X(t),a=Ie(t),s=Ve(a),c=ee(t),l=i==="y",f=o.x+o.width/2-r.width/2,u=o.y+o.height/2-r.height/2,y=o[s]/2-r[s]/2;let p;switch(c){case"top":p={x:f,y:o.y-r.height};break;case"bottom":p={x:f,y:o.y+o.height};break;case"right":p={x:o.x+o.width,y:u};break;case"left":p={x:o.x-r.width,y:u};break;default:p={x:o.x,y:o.y}}switch(de(t)){case"start":p[a]-=y*(n&&l?-1:1);break;case"end":p[a]+=y*(n&&l?-1:1);break}return p}const oo=(e,t,n)=>U(void 0,null,function*(){const{placement:o="bottom",strategy:r="absolute",middleware:i=[],platform:a}=n,s=i.filter(Boolean),c=yield a.isRTL==null?void 0:a.isRTL(t);let l=yield a.getElementRects({reference:e,floating:t,strategy:r}),{x:f,y:u}=ft(l,o,c),y=o,p={},g=0;for(let m=0;m<s.length;m++){const{name:k,fn:v}=s[m],{x:M,y:b,data:w,reset:C}=yield v({x:f,y:u,initialPlacement:o,placement:y,strategy:r,middlewareData:p,rects:l,platform:a,elements:{reference:e,floating:t}});f=M!=null?M:f,u=b!=null?b:u,p=A(x({},p),{[k]:x(x({},p[k]),w)}),C&&g<=50&&(g++,typeof C=="object"&&(C.placement&&(y=C.placement),C.rects&&(l=C.rects===!0?yield a.getElementRects({reference:e,floating:t,strategy:r}):C.rects),{x:f,y:u}=ft(l,y,c)),m=-1)}return{x:f,y:u,placement:y,strategy:r,middlewareData:p}});function he(e,t){return U(this,null,function*(){var n;t===void 0&&(t={});const{x:o,y:r,platform:i,rects:a,elements:s,strategy:c}=e,{boundary:l="clippingAncestors",rootBoundary:f="viewport",elementContext:u="floating",altBoundary:y=!1,padding:p=0}=Q(t,e),g=Lt(p),k=s[y?u==="floating"?"reference":"floating":u],v=be(yield i.getClippingRect({element:(n=yield i.isElement==null?void 0:i.isElement(k))==null||n?k:k.contextElement||(yield i.getDocumentElement==null?void 0:i.getDocumentElement(s.floating)),boundary:l,rootBoundary:f,strategy:c})),M=u==="floating"?{x:o,y:r,width:a.floating.width,height:a.floating.height}:a.reference,b=yield i.getOffsetParent==null?void 0:i.getOffsetParent(s.floating),w=(yield i.isElement==null?void 0:i.isElement(b))?(yield i.getScale==null?void 0:i.getScale(b))||{x:1,y:1}:{x:1,y:1},C=be(i.convertOffsetParentRelativeRectToViewportRelativeRect?yield i.convertOffsetParentRelativeRectToViewportRelativeRect({elements:s,rect:M,offsetParent:b,strategy:c}):M);return{top:(v.top-C.top+g.top)/w.y,bottom:(C.bottom-v.bottom+g.bottom)/w.y,left:(v.left-C.left+g.left)/w.x,right:(C.right-v.right+g.right)/w.x}})}const ro=e=>({name:"arrow",options:e,fn(n){return U(this,null,function*(){const{x:o,y:r,placement:i,rects:a,platform:s,elements:c,middlewareData:l}=n,{element:f,padding:u=0}=Q(e,n)||{};if(f==null)return{};const y=Lt(u),p={x:o,y:r},g=Ie(i),m=Ve(g),k=yield s.getDimensions(f),v=g==="y",M=v?"top":"left",b=v?"bottom":"right",w=v?"clientHeight":"clientWidth",C=a.reference[m]+a.reference[g]-p[g]-a.floating[m],S=p[g]-a.reference[g],E=yield s.getOffsetParent==null?void 0:s.getOffsetParent(f);let O=E?E[w]:0;(!O||!(yield s.isElement==null?void 0:s.isElement(E)))&&(O=c.floating[w]||a.floating[m]);const P=C/2-S/2,T=O/2-k[m]/2-1,L=te(y[M],T),_=te(y[b],T),N=L,B=O-k[m]-_,j=O/2-k[m]/2+P,D=He(N,j,B),V=!l.arrow&&de(i)!=null&&j!==D&&a.reference[m]/2-(j<N?L:_)-k[m]/2<0,R=V?j<N?j-N:j-B:0;return{[g]:p[g]+R,data:x({[g]:D,centerOffset:j-D-R},V&&{alignmentOffset:R}),reset:V}})}}),io=function(e){return e===void 0&&(e={}),{name:"flip",options:e,fn(n){return U(this,null,function*(){var o,r;const{placement:i,middlewareData:a,rects:s,initialPlacement:c,platform:l,elements:f}=n,j=Q(e,n),{mainAxis:u=!0,crossAxis:y=!0,fallbackPlacements:p,fallbackStrategy:g="bestFit",fallbackAxisSideDirection:m="none",flipAlignment:k=!0}=j,v=q(j,["mainAxis","crossAxis","fallbackPlacements","fallbackStrategy","fallbackAxisSideDirection","flipAlignment"]);if((o=a.arrow)!=null&&o.alignmentOffset)return{};const M=ee(i),b=X(c),w=ee(c)===c,C=yield l.isRTL==null?void 0:l.isRTL(f.floating),S=p||(w||!k?[Me(c)]:Kn(c)),E=m!=="none";!p&&E&&S.push(...to(c,k,m,C));const O=[c,...S],P=yield he(n,v),T=[];let L=((r=a.flip)==null?void 0:r.overflows)||[];if(u&&T.push(P[M]),y){const D=Gn(i,s,C);T.push(P[D[0]],P[D[1]])}if(L=[...L,{placement:i,overflows:T}],!T.every(D=>D<=0)){var _,N;const D=(((_=a.flip)==null?void 0:_.index)||0)+1,V=O[D];if(V&&(!(y==="alignment"?b!==X(V):!1)||L.every(H=>H.overflows[0]>0&&X(H.placement)===b)))return{data:{index:D,overflows:L},reset:{placement:V}};let R=(N=L.filter(I=>I.overflows[0]<=0).sort((I,H)=>I.overflows[1]-H.overflows[1])[0])==null?void 0:N.placement;if(!R)switch(g){case"bestFit":{var B;const I=(B=L.filter(H=>{if(E){const F=X(H.placement);return F===b||F==="y"}return!0}).map(H=>[H.placement,H.overflows.filter(F=>F>0).reduce((F,Oe)=>F+Oe,0)]).sort((H,F)=>H[1]-F[1])[0])==null?void 0:B[0];I&&(R=I);break}case"initialPlacement":R=c;break}if(i!==R)return{reset:{placement:R}}}return{}})}}};function ut(e,t){return{top:e.top-t.height,right:e.right-t.width,bottom:e.bottom-t.height,left:e.left-t.width}}function ht(e){return Un.some(t=>e[t]>=0)}const ao=function(e){return e===void 0&&(e={}),{name:"hide",options:e,fn(n){return U(this,null,function*(){const{rects:o}=n,a=Q(e,n),{strategy:r="referenceHidden"}=a,i=q(a,["strategy"]);switch(r){case"referenceHidden":{const s=yield he(n,A(x({},i),{elementContext:"reference"})),c=ut(s,o.reference);return{data:{referenceHiddenOffsets:c,referenceHidden:ht(c)}}}case"escaped":{const s=yield he(n,A(x({},i),{altBoundary:!0})),c=ut(s,o.floating);return{data:{escapedOffsets:c,escaped:ht(c)}}}default:return{}}})}}},Tt=new Set(["left","top"]);function so(e,t){return U(this,null,function*(){const{placement:n,platform:o,elements:r}=e,i=yield o.isRTL==null?void 0:o.isRTL(r.floating),a=ee(n),s=de(n),c=X(n)==="y",l=Tt.has(a)?-1:1,f=i&&c?-1:1,u=Q(t,e);let{mainAxis:y,crossAxis:p,alignmentAxis:g}=typeof u=="number"?{mainAxis:u,crossAxis:0,alignmentAxis:null}:{mainAxis:u.mainAxis||0,crossAxis:u.crossAxis||0,alignmentAxis:u.alignmentAxis};return s&&typeof g=="number"&&(p=s==="end"?g*-1:g),c?{x:p*f,y:y*l}:{x:y*l,y:p*f}})}const co=function(e){return e===void 0&&(e=0),{name:"offset",options:e,fn(n){return U(this,null,function*(){var o,r;const{x:i,y:a,placement:s,middlewareData:c}=n,l=yield so(n,e);return s===((o=c.offset)==null?void 0:o.placement)&&(r=c.arrow)!=null&&r.alignmentOffset?{}:{x:i+l.x,y:a+l.y,data:A(x({},l),{placement:s})}})}}},lo=function(e){return e===void 0&&(e={}),{name:"shift",options:e,fn(n){return U(this,null,function*(){const{x:o,y:r,placement:i}=n,v=Q(e,n),{mainAxis:a=!0,crossAxis:s=!1,limiter:c={fn:M=>{let{x:b,y:w}=M;return{x:b,y:w}}}}=v,l=q(v,["mainAxis","crossAxis","limiter"]),f={x:o,y:r},u=yield he(n,l),y=X(ee(i)),p=_e(y);let g=f[p],m=f[y];if(a){const M=p==="y"?"top":"left",b=p==="y"?"bottom":"right",w=g+u[M],C=g-u[b];g=He(w,g,C)}if(s){const M=y==="y"?"top":"left",b=y==="y"?"bottom":"right",w=m+u[M],C=m-u[b];m=He(w,m,C)}const k=c.fn(A(x({},n),{[p]:g,[y]:m}));return A(x({},k),{data:{x:k.x-o,y:k.y-r,enabled:{[p]:a,[y]:s}}})})}}},fo=function(e){return e===void 0&&(e={}),{options:e,fn(t){const{x:n,y:o,placement:r,rects:i,middlewareData:a}=t,{offset:s=0,mainAxis:c=!0,crossAxis:l=!0}=Q(e,t),f={x:n,y:o},u=X(r),y=_e(u);let p=f[y],g=f[u];const m=Q(s,t),k=typeof m=="number"?{mainAxis:m,crossAxis:0}:x({mainAxis:0,crossAxis:0},m);if(c){const b=y==="y"?"height":"width",w=i.reference[y]-i.floating[b]+k.mainAxis,C=i.reference[y]+i.reference[b]-k.mainAxis;p<w?p=w:p>C&&(p=C)}if(l){var v,M;const b=y==="y"?"width":"height",w=Tt.has(ee(r)),C=i.reference[u]-i.floating[b]+(w&&((v=a.offset)==null?void 0:v[u])||0)+(w?0:k.crossAxis),S=i.reference[u]+i.reference[b]+(w?0:((M=a.offset)==null?void 0:M[u])||0)-(w?k.crossAxis:0);g<C?g=C:g>S&&(g=S)}return{[y]:p,[u]:g}}}},uo=function(e){return e===void 0&&(e={}),{name:"size",options:e,fn(n){return U(this,null,function*(){var o,r;const{placement:i,rects:a,platform:s,elements:c}=n,L=Q(e,n),{apply:l=()=>{}}=L,f=q(L,["apply"]),u=yield he(n,f),y=ee(i),p=de(i),g=X(i)==="y",{width:m,height:k}=a.floating;let v,M;y==="top"||y==="bottom"?(v=y,M=p===((yield s.isRTL==null?void 0:s.isRTL(c.floating))?"start":"end")?"left":"right"):(M=y,v=p==="end"?"top":"bottom");const b=k-u.top-u.bottom,w=m-u.left-u.right,C=te(k-u[v],b),S=te(m-u[M],w),E=!n.middlewareData.shift;let O=C,P=S;if((o=n.middlewareData.shift)!=null&&o.enabled.x&&(P=w),(r=n.middlewareData.shift)!=null&&r.enabled.y&&(O=b),E&&!p){const _=$(u.left,0),N=$(u.right,0),B=$(u.top,0),j=$(u.bottom,0);g?P=m-2*(_!==0||N!==0?_+N:$(u.left,u.right)):O=k-2*(B!==0||j!==0?B+j:$(u.top,u.bottom))}yield l(A(x({},n),{availableWidth:P,availableHeight:O}));const T=yield s.getDimensions(c.floating);return m!==T.width||k!==T.height?{reset:{rects:!0}}:{}})}}};function Pe(){return typeof window!="undefined"}function fe(e){return Nt(e)?(e.nodeName||"").toLowerCase():"#document"}function W(e){var t;return(e==null||(t=e.ownerDocument)==null?void 0:t.defaultView)||window}function J(e){var t;return(t=(Nt(e)?e.ownerDocument:e.document)||window.document)==null?void 0:t.documentElement}function Nt(e){return Pe()?e instanceof Node||e instanceof W(e).Node:!1}function Y(e){return Pe()?e instanceof Element||e instanceof W(e).Element:!1}function K(e){return Pe()?e instanceof HTMLElement||e instanceof W(e).HTMLElement:!1}function yt(e){return!Pe()||typeof ShadowRoot=="undefined"?!1:e instanceof ShadowRoot||e instanceof W(e).ShadowRoot}const ho=new Set(["inline","contents"]);function pe(e){const{overflow:t,overflowX:n,overflowY:o,display:r}=Z(e);return/auto|scroll|overlay|hidden|clip/.test(t+o+n)&&!ho.has(r)}const yo=new Set(["table","td","th"]);function po(e){return yo.has(fe(e))}const mo=[":popover-open",":modal"];function Re(e){return mo.some(t=>{try{return e.matches(t)}catch(n){return!1}})}const go=["transform","translate","scale","rotate","perspective"],xo=["transform","translate","scale","rotate","perspective","filter"],ko=["paint","layout","strict","content"];function Be(e){const t=Fe(),n=Y(e)?Z(e):e;return go.some(o=>n[o]?n[o]!=="none":!1)||(n.containerType?n.containerType!=="normal":!1)||!t&&(n.backdropFilter?n.backdropFilter!=="none":!1)||!t&&(n.filter?n.filter!=="none":!1)||xo.some(o=>(n.willChange||"").includes(o))||ko.some(o=>(n.contain||"").includes(o))}function vo(e){let t=ne(e);for(;K(t)&&!le(t);){if(Be(t))return t;if(Re(t))return null;t=ne(t)}return null}function Fe(){return typeof CSS=="undefined"||!CSS.supports?!1:CSS.supports("-webkit-backdrop-filter","none")}const wo=new Set(["html","body","#document"]);function le(e){return wo.has(fe(e))}function Z(e){return W(e).getComputedStyle(e)}function Ee(e){return Y(e)?{scrollLeft:e.scrollLeft,scrollTop:e.scrollTop}:{scrollLeft:e.scrollX,scrollTop:e.scrollY}}function ne(e){if(fe(e)==="html")return e;const t=e.assignedSlot||e.parentNode||yt(e)&&e.host||J(e);return yt(t)?t.host:t}function Dt(e){const t=ne(e);return le(t)?e.ownerDocument?e.ownerDocument.body:e.body:K(t)&&pe(t)?t:Dt(t)}function ye(e,t,n){var o;t===void 0&&(t=[]),n===void 0&&(n=!0);const r=Dt(e),i=r===((o=e.ownerDocument)==null?void 0:o.body),a=W(r);if(i){const s=qe(a);return t.concat(a,a.visualViewport||[],pe(r)?r:[],s&&n?ye(s):[])}return t.concat(r,ye(r,[],n))}function qe(e){return e.parent&&Object.getPrototypeOf(e.parent)?e.frameElement:null}function zt(e){const t=Z(e);let n=parseFloat(t.width)||0,o=parseFloat(t.height)||0;const r=K(e),i=r?e.offsetWidth:n,a=r?e.offsetHeight:o,s=we(n)!==i||we(o)!==a;return s&&(n=i,o=a),{width:n,height:o,$:s}}function $e(e){return Y(e)?e:e.contextElement}function ce(e){const t=$e(e);if(!K(t))return G(1);const n=t.getBoundingClientRect(),{width:o,height:r,$:i}=zt(t);let a=(i?we(n.width):n.width)/o,s=(i?we(n.height):n.height)/r;return(!a||!Number.isFinite(a))&&(a=1),(!s||!Number.isFinite(s))&&(s=1),{x:a,y:s}}const Mo=G(0);function Ht(e){const t=W(e);return!Fe()||!t.visualViewport?Mo:{x:t.visualViewport.offsetLeft,y:t.visualViewport.offsetTop}}function bo(e,t,n){return t===void 0&&(t=!1),!n||t&&n!==W(e)?!1:t}function ae(e,t,n,o){t===void 0&&(t=!1),n===void 0&&(n=!1);const r=e.getBoundingClientRect(),i=$e(e);let a=G(1);t&&(o?Y(o)&&(a=ce(o)):a=ce(e));const s=bo(i,n,o)?Ht(i):G(0);let c=(r.left+s.x)/a.x,l=(r.top+s.y)/a.y,f=r.width/a.x,u=r.height/a.y;if(i){const y=W(i),p=o&&Y(o)?W(o):o;let g=y,m=qe(g);for(;m&&o&&p!==g;){const k=ce(m),v=m.getBoundingClientRect(),M=Z(m),b=v.left+(m.clientLeft+parseFloat(M.paddingLeft))*k.x,w=v.top+(m.clientTop+parseFloat(M.paddingTop))*k.y;c*=k.x,l*=k.y,f*=k.x,u*=k.y,c+=b,l+=w,g=W(m),m=qe(g)}}return be({width:f,height:u,x:c,y:l})}function We(e,t){const n=Ee(e).scrollLeft;return t?t.left+n:ae(J(e)).left+n}function jt(e,t,n){n===void 0&&(n=!1);const o=e.getBoundingClientRect(),r=o.left+t.scrollLeft-(n?0:We(e,o)),i=o.top+t.scrollTop;return{x:r,y:i}}function Co(e){let{elements:t,rect:n,offsetParent:o,strategy:r}=e;const i=r==="fixed",a=J(o),s=t?Re(t.floating):!1;if(o===a||s&&i)return n;let c={scrollLeft:0,scrollTop:0},l=G(1);const f=G(0),u=K(o);if((u||!u&&!i)&&((fe(o)!=="body"||pe(a))&&(c=Ee(o)),K(o))){const p=ae(o);l=ce(o),f.x=p.x+o.clientLeft,f.y=p.y+o.clientTop}const y=a&&!u&&!i?jt(a,c,!0):G(0);return{width:n.width*l.x,height:n.height*l.y,x:n.x*l.x-c.scrollLeft*l.x+f.x+y.x,y:n.y*l.y-c.scrollTop*l.y+f.y+y.y}}function Ao(e){return Array.from(e.getClientRects())}function So(e){const t=J(e),n=Ee(e),o=e.ownerDocument.body,r=$(t.scrollWidth,t.clientWidth,o.scrollWidth,o.clientWidth),i=$(t.scrollHeight,t.clientHeight,o.scrollHeight,o.clientHeight);let a=-n.scrollLeft+We(e);const s=-n.scrollTop;return Z(o).direction==="rtl"&&(a+=$(t.clientWidth,o.clientWidth)-r),{width:r,height:i,x:a,y:s}}function Po(e,t){const n=W(e),o=J(e),r=n.visualViewport;let i=o.clientWidth,a=o.clientHeight,s=0,c=0;if(r){i=r.width,a=r.height;const l=Fe();(!l||l&&t==="fixed")&&(s=r.offsetLeft,c=r.offsetTop)}return{width:i,height:a,x:s,y:c}}const Ro=new Set(["absolute","fixed"]);function Eo(e,t){const n=ae(e,!0,t==="fixed"),o=n.top+e.clientTop,r=n.left+e.clientLeft,i=K(e)?ce(e):G(1),a=e.clientWidth*i.x,s=e.clientHeight*i.y,c=r*i.x,l=o*i.y;return{width:a,height:s,x:c,y:l}}function pt(e,t,n){let o;if(t==="viewport")o=Po(e,n);else if(t==="document")o=So(J(e));else if(Y(t))o=Eo(t,n);else{const r=Ht(e);o={x:t.x-r.x,y:t.y-r.y,width:t.width,height:t.height}}return be(o)}function qt(e,t){const n=ne(e);return n===t||!Y(n)||le(n)?!1:Z(n).position==="fixed"||qt(n,t)}function Oo(e,t){const n=t.get(e);if(n)return n;let o=ye(e,[],!1).filter(s=>Y(s)&&fe(s)!=="body"),r=null;const i=Z(e).position==="fixed";let a=i?ne(e):e;for(;Y(a)&&!le(a);){const s=Z(a),c=Be(a);!c&&s.position==="fixed"&&(r=null),(i?!c&&!r:!c&&s.position==="static"&&!!r&&Ro.has(r.position)||pe(a)&&!c&&qt(e,a))?o=o.filter(f=>f!==a):r=s,a=ne(a)}return t.set(e,o),o}function Lo(e){let{element:t,boundary:n,rootBoundary:o,strategy:r}=e;const a=[...n==="clippingAncestors"?Re(t)?[]:Oo(t,this._c):[].concat(n),o],s=a[0],c=a.reduce((l,f)=>{const u=pt(t,f,r);return l.top=$(u.top,l.top),l.right=te(u.right,l.right),l.bottom=te(u.bottom,l.bottom),l.left=$(u.left,l.left),l},pt(t,s,r));return{width:c.right-c.left,height:c.bottom-c.top,x:c.left,y:c.top}}function To(e){const{width:t,height:n}=zt(e);return{width:t,height:n}}function No(e,t,n){const o=K(t),r=J(t),i=n==="fixed",a=ae(e,!0,i,t);let s={scrollLeft:0,scrollTop:0};const c=G(0);function l(){c.x=We(r)}if(o||!o&&!i)if((fe(t)!=="body"||pe(r))&&(s=Ee(t)),o){const p=ae(t,!0,i,t);c.x=p.x+t.clientLeft,c.y=p.y+t.clientTop}else r&&l();i&&!o&&r&&l();const f=r&&!o&&!i?jt(r,s):G(0),u=a.left+s.scrollLeft-c.x-f.x,y=a.top+s.scrollTop-c.y-f.y;return{x:u,y,width:a.width,height:a.height}}function Te(e){return Z(e).position==="static"}function mt(e,t){if(!K(e)||Z(e).position==="fixed")return null;if(t)return t(e);let n=e.offsetParent;return J(e)===n&&(n=n.ownerDocument.body),n}function _t(e,t){const n=W(e);if(Re(e))return n;if(!K(e)){let r=ne(e);for(;r&&!le(r);){if(Y(r)&&!Te(r))return r;r=ne(r)}return n}let o=mt(e,t);for(;o&&po(o)&&Te(o);)o=mt(o,t);return o&&le(o)&&Te(o)&&!Be(o)?n:o||vo(e)||n}const Do=function(e){return U(this,null,function*(){const t=this.getOffsetParent||_t,n=this.getDimensions,o=yield n(e.floating);return{reference:No(e.reference,yield t(e.floating),e.strategy),floating:{x:0,y:0,width:o.width,height:o.height}}})};function zo(e){return Z(e).direction==="rtl"}const Ho={convertOffsetParentRelativeRectToViewportRelativeRect:Co,getDocumentElement:J,getClippingRect:Lo,getOffsetParent:_t,getElementRects:Do,getClientRects:Ao,getDimensions:To,getScale:ce,isElement:Y,isRTL:zo};function Vt(e,t){return e.x===t.x&&e.y===t.y&&e.width===t.width&&e.height===t.height}function jo(e,t){let n=null,o;const r=J(e);function i(){var s;clearTimeout(o),(s=n)==null||s.disconnect(),n=null}function a(s,c){s===void 0&&(s=!1),c===void 0&&(c=1),i();const l=e.getBoundingClientRect(),{left:f,top:u,width:y,height:p}=l;if(s||t(),!y||!p)return;const g=ke(u),m=ke(r.clientWidth-(f+y)),k=ke(r.clientHeight-(u+p)),v=ke(f),b={rootMargin:-g+"px "+-m+"px "+-k+"px "+-v+"px",threshold:$(0,te(1,c))||1};let w=!0;function C(S){const E=S[0].intersectionRatio;if(E!==c){if(!w)return a();E?a(!1,E):o=setTimeout(()=>{a(!1,1e-7)},1e3)}E===1&&!Vt(l,e.getBoundingClientRect())&&a(),w=!1}try{n=new IntersectionObserver(C,A(x({},b),{root:r.ownerDocument}))}catch(S){n=new IntersectionObserver(C,b)}n.observe(e)}return a(!0),i}function qo(e,t,n,o){o===void 0&&(o={});const{ancestorScroll:r=!0,ancestorResize:i=!0,elementResize:a=typeof ResizeObserver=="function",layoutShift:s=typeof IntersectionObserver=="function",animationFrame:c=!1}=o,l=$e(e),f=r||i?[...l?ye(l):[],...ye(t)]:[];f.forEach(v=>{r&&v.addEventListener("scroll",n,{passive:!0}),i&&v.addEventListener("resize",n)});const u=l&&s?jo(l,n):null;let y=-1,p=null;a&&(p=new ResizeObserver(v=>{let[M]=v;M&&M.target===l&&p&&(p.unobserve(t),cancelAnimationFrame(y),y=requestAnimationFrame(()=>{var b;(b=p)==null||b.observe(t)})),n()}),l&&!c&&p.observe(l),p.observe(t));let g,m=c?ae(e):null;c&&k();function k(){const v=ae(e);m&&!Vt(m,v)&&n(),m=v,g=requestAnimationFrame(k)}return n(),()=>{var v;f.forEach(M=>{r&&M.removeEventListener("scroll",n),i&&M.removeEventListener("resize",n)}),u==null||u(),(v=p)==null||v.disconnect(),p=null,c&&cancelAnimationFrame(g)}}const _o=co,Vo=lo,Io=io,Bo=uo,Fo=ao,gt=ro,$o=fo,Wo=(e,t,n)=>{const o=new Map,r=x({platform:Ho},n),i=A(x({},r.platform),{_c:o});return oo(e,t,A(x({},r),{platform:i}))};var Uo=typeof document!="undefined",Yo=function(){},ve=Uo?h.useLayoutEffect:Yo;function Ce(e,t){if(e===t)return!0;if(typeof e!=typeof t)return!1;if(typeof e=="function"&&e.toString()===t.toString())return!0;let n,o,r;if(e&&t&&typeof e=="object"){if(Array.isArray(e)){if(n=e.length,n!==t.length)return!1;for(o=n;o--!==0;)if(!Ce(e[o],t[o]))return!1;return!0}if(r=Object.keys(e),n=r.length,n!==Object.keys(t).length)return!1;for(o=n;o--!==0;)if(!{}.hasOwnProperty.call(t,r[o]))return!1;for(o=n;o--!==0;){const i=r[o];if(!(i==="_owner"&&e.$$typeof)&&!Ce(e[i],t[i]))return!1}return!0}return e!==e&&t!==t}function It(e){return typeof window=="undefined"?1:(e.ownerDocument.defaultView||window).devicePixelRatio||1}function xt(e,t){const n=It(e);return Math.round(t*n)/n}function Ne(e){const t=h.useRef(e);return ve(()=>{t.current=e}),t}function Zo(e){e===void 0&&(e={});const{placement:t="bottom",strategy:n="absolute",middleware:o=[],platform:r,elements:{reference:i,floating:a}={},transform:s=!0,whileElementsMounted:c,open:l}=e,[f,u]=h.useState({x:0,y:0,strategy:n,placement:t,middlewareData:{},isPositioned:!1}),[y,p]=h.useState(o);Ce(y,o)||p(o);const[g,m]=h.useState(null),[k,v]=h.useState(null),M=h.useCallback(R=>{R!==S.current&&(S.current=R,m(R))},[]),b=h.useCallback(R=>{R!==E.current&&(E.current=R,v(R))},[]),w=i||g,C=a||k,S=h.useRef(null),E=h.useRef(null),O=h.useRef(f),P=c!=null,T=Ne(c),L=Ne(r),_=Ne(l),N=h.useCallback(()=>{if(!S.current||!E.current)return;const R={placement:t,strategy:n,middleware:y};L.current&&(R.platform=L.current),Wo(S.current,E.current,R).then(I=>{const H=A(x({},I),{isPositioned:_.current!==!1});B.current&&!Ce(O.current,H)&&(O.current=H,kt.flushSync(()=>{u(H)}))})},[y,t,n,L,_]);ve(()=>{l===!1&&O.current.isPositioned&&(O.current.isPositioned=!1,u(R=>A(x({},R),{isPositioned:!1})))},[l]);const B=h.useRef(!1);ve(()=>(B.current=!0,()=>{B.current=!1}),[]),ve(()=>{if(w&&(S.current=w),C&&(E.current=C),w&&C){if(T.current)return T.current(w,C,N);N()}},[w,C,N,T,P]);const j=h.useMemo(()=>({reference:S,floating:E,setReference:M,setFloating:b}),[M,b]),D=h.useMemo(()=>({reference:w,floating:C}),[w,C]),V=h.useMemo(()=>{const R={position:n,left:0,top:0};if(!D.floating)return R;const I=xt(D.floating,f.x),H=xt(D.floating,f.y);return s?x(A(x({},R),{transform:"translate("+I+"px, "+H+"px)"}),It(D.floating)>=1.5&&{willChange:"transform"}):{position:n,left:I,top:H}},[n,s,D.floating,f.x,f.y]);return h.useMemo(()=>A(x({},f),{update:N,refs:j,elements:D,floatingStyles:V}),[f,N,j,D,V])}const Xo=e=>{function t(n){return{}.hasOwnProperty.call(n,"current")}return{name:"arrow",options:e,fn(n){const{element:o,padding:r}=typeof e=="function"?e(n):e;return o&&t(o)?o.current!=null?gt({element:o.current,padding:r}).fn(n):{}:o?gt({element:o,padding:r}).fn(n):{}}}},Go=(e,t)=>A(x({},_o(e)),{options:[e,t]}),Ko=(e,t)=>A(x({},Vo(e)),{options:[e,t]}),Jo=(e,t)=>A(x({},$o(e)),{options:[e,t]}),Qo=(e,t)=>A(x({},Io(e)),{options:[e,t]}),er=(e,t)=>A(x({},Bo(e)),{options:[e,t]}),tr=(e,t)=>A(x({},Fo(e)),{options:[e,t]}),nr=(e,t)=>A(x({},Xo(e)),{options:[e,t]});var or="Arrow",Bt=h.forwardRef((e,t)=>{const a=e,{children:n,width:o=10,height:r=5}=a,i=q(a,["children","width","height"]);return z.jsx(se.svg,A(x({},i),{ref:t,width:o,height:r,viewBox:"0 0 30 10",preserveAspectRatio:"none",children:e.asChild?n:z.jsx("polygon",{points:"0,0 30,0 15,10"})}))});Bt.displayName=or;var rr=Bt;function ir(e){const[t,n]=h.useState(void 0);return ie(()=>{if(e){n({width:e.offsetWidth,height:e.offsetHeight});const o=new ResizeObserver(r=>{if(!Array.isArray(r)||!r.length)return;const i=r[0];let a,s;if("borderBoxSize"in i){const c=i.borderBoxSize,l=Array.isArray(c)?c[0]:c;a=l.inlineSize,s=l.blockSize}else a=e.offsetWidth,s=e.offsetHeight;n({width:a,height:s})});return o.observe(e,{box:"border-box"}),()=>o.unobserve(e)}else n(void 0)},[e]),t}var Ft="Popper",[$t,za]=bt(Ft),[Ha,Wt]=$t(Ft),Ut="PopperAnchor",Yt=h.forwardRef((e,t)=>{const c=e,{__scopePopper:n,virtualRef:o}=c,r=q(c,["__scopePopper","virtualRef"]),i=Wt(Ut,n),a=h.useRef(null),s=re(t,a);return h.useEffect(()=>{i.onAnchorChange((o==null?void 0:o.current)||a.current)}),o?null:z.jsx(se.div,A(x({},r),{ref:s}))});Yt.displayName=Ut;var Ue="PopperContent",[ar,sr]=$t(Ue),Zt=h.forwardRef((e,t)=>{var Ze,Xe,Ge,Ke,Je,Qe,et,tt;const Ye=e,{__scopePopper:n,side:o="bottom",sideOffset:r=0,align:i="center",alignOffset:a=0,arrowPadding:s=0,avoidCollisions:c=!0,collisionBoundary:l=[],collisionPadding:f=0,sticky:u="partial",hideWhenDetached:y=!1,updatePositionStrategy:p="optimized",onPlaced:g}=Ye,m=q(Ye,["__scopePopper","side","sideOffset","align","alignOffset","arrowPadding","avoidCollisions","collisionBoundary","collisionPadding","sticky","hideWhenDetached","updatePositionStrategy","onPlaced"]),k=Wt(Ue,n),[v,M]=h.useState(null),b=re(t,ue=>M(ue)),[w,C]=h.useState(null),S=ir(w),E=(Ze=S==null?void 0:S.width)!=null?Ze:0,O=(Xe=S==null?void 0:S.height)!=null?Xe:0,P=o+(i!=="center"?"-"+i:""),T=typeof f=="number"?f:x({top:0,right:0,bottom:0,left:0},f),L=Array.isArray(l)?l:[l],_=L.length>0,N={padding:T,boundary:L.filter(lr),altBoundary:_},{refs:B,floatingStyles:j,placement:D,isPositioned:V,middlewareData:R}=Zo({strategy:"fixed",placement:P,whileElementsMounted:(...ue)=>qo(...ue,{animationFrame:p==="always"}),elements:{reference:k.anchor},middleware:[Go({mainAxis:r+O,alignmentAxis:a}),c&&Ko(x({mainAxis:!0,crossAxis:!1,limiter:u==="partial"?Jo():void 0},N)),c&&Qo(x({},N)),er(A(x({},N),{apply:({elements:ue,rects:nt,availableWidth:nn,availableHeight:on})=>{const{width:rn,height:an}=nt.reference,me=ue.floating.style;me.setProperty("--radix-popper-available-width",`${nn}px`),me.setProperty("--radix-popper-available-height",`${on}px`),me.setProperty("--radix-popper-anchor-width",`${rn}px`),me.setProperty("--radix-popper-anchor-height",`${an}px`)}})),w&&nr({element:w,padding:s}),dr({arrowWidth:E,arrowHeight:O}),y&&tr(x({strategy:"referenceHidden"},N))]}),[I,H]=Kt(D),F=Se(g);ie(()=>{V&&(F==null||F())},[V,F]);const Oe=(Ge=R.arrow)==null?void 0:Ge.x,Jt=(Ke=R.arrow)==null?void 0:Ke.y,Qt=((Je=R.arrow)==null?void 0:Je.centerOffset)!==0,[en,tn]=h.useState();return ie(()=>{v&&tn(window.getComputedStyle(v).zIndex)},[v]),z.jsx("div",{ref:B.setFloating,"data-radix-popper-content-wrapper":"",style:x(A(x({},j),{transform:V?j.transform:"translate(0, -200%)",minWidth:"max-content",zIndex:en,"--radix-popper-transform-origin":[(Qe=R.transformOrigin)==null?void 0:Qe.x,(et=R.transformOrigin)==null?void 0:et.y].join(" ")}),((tt=R.hide)==null?void 0:tt.referenceHidden)&&{visibility:"hidden",pointerEvents:"none"}),dir:e.dir,children:z.jsx(ar,{scope:n,placedSide:I,onArrowChange:C,arrowX:Oe,arrowY:Jt,shouldHideArrow:Qt,children:z.jsx(se.div,A(x({"data-side":I,"data-align":H},m),{ref:b,style:A(x({},m.style),{animation:V?void 0:"none"})}))})})});Zt.displayName=Ue;var Xt="PopperArrow",cr={top:"bottom",right:"left",bottom:"top",left:"right"},Gt=h.forwardRef(function(t,n){const s=t,{__scopePopper:o}=s,r=q(s,["__scopePopper"]),i=sr(Xt,o),a=cr[i.placedSide];return z.jsx("span",{ref:i.onArrowChange,style:{position:"absolute",left:i.arrowX,top:i.arrowY,[a]:0,transformOrigin:{top:"",right:"0 0",bottom:"center 0",left:"100% 0"}[i.placedSide],transform:{top:"translateY(100%)",right:"translateY(50%) rotate(90deg) translateX(-50%)",bottom:"rotate(180deg)",left:"translateY(50%) rotate(-90deg) translateX(50%)"}[i.placedSide],visibility:i.shouldHideArrow?"hidden":void 0},children:z.jsx(rr,A(x({},r),{ref:n,style:A(x({},r.style),{display:"block"})}))})});Gt.displayName=Xt;function lr(e){return e!==null}var dr=e=>({name:"transformOrigin",options:e,fn(t){var k,v,M,b,w;const{placement:n,rects:o,middlewareData:r}=t,a=((k=r.arrow)==null?void 0:k.centerOffset)!==0,s=a?0:e.arrowWidth,c=a?0:e.arrowHeight,[l,f]=Kt(n),u={start:"0%",center:"50%",end:"100%"}[f],y=((M=(v=r.arrow)==null?void 0:v.x)!=null?M:0)+s/2,p=((w=(b=r.arrow)==null?void 0:b.y)!=null?w:0)+c/2;let g="",m="";return l==="bottom"?(g=a?u:`${y}px`,m=`${-c}px`):l==="top"?(g=a?u:`${y}px`,m=`${o.floating.height+c}px`):l==="right"?(g=`${-c}px`,m=a?u:`${p}px`):l==="left"&&(g=`${o.floating.width+c}px`,m=a?u:`${p}px`),{data:{x:g,y:m}}}});function Kt(e){const[t,n="center"]=e.split("-");return[t,n]}var ja=Yt,qa=Zt,_a=Gt;export{ca as $,ja as A,mr as B,qa as C,St as D,ti as E,ri as F,di as G,yi as H,gi as I,wa as J,$i as K,Lr as L,Li as M,Qr as N,Xi as O,se as P,Or as Q,pr as R,la as S,Ma as T,ai as U,Et as V,Ta as W,Na as X,jr as Y,vi as Z,oa as _,bt as a,pi as a$,oi as a0,kr as a1,Hr as a2,Oi as a3,Ni as a4,Fi as a5,Oa as a6,sa as a7,Pi as a8,Jr as a9,Ur as aA,pa as aB,ta as aC,zr as aD,Ai as aE,Pa as aF,ki as aG,Si as aH,Gr as aI,qi as aJ,fa as aK,ga as aL,Wi as aM,Ri as aN,hi as aO,ui as aP,Sr as aQ,Di as aR,ka as aS,Tr as aT,Mi as aU,Kr as aV,li as aW,mi as aX,ci as aY,na as aZ,si as a_,Cr as aa,ia as ab,fi as ac,Xr as ad,Zi as ae,Rr as af,Wr as ag,Ei as ah,Ki as ai,Ir as aj,ni as ak,ua as al,ei as am,Fr as an,Ar as ao,wi as ap,Zr as aq,Da as ar,Yi as as,ii as at,Ui as au,ha as av,va as aw,Qi as ax,Vi as ay,ra as az,gr as b,Er as b0,xi as b1,Aa as b2,Mr as b3,vr as b4,br as b5,wr as b6,Ci as b7,bi as b8,Sa as b9,Gi as ba,La as bb,ma as bc,Ra as bd,da as be,Pr as bf,Hi as bg,Ea as bh,Ca as bi,_i as bj,aa as bk,zi as bl,Br as bm,Ji as bn,xa as bo,Ii as bp,ya as bq,Bi as br,yr as c,zn as d,Se as e,Le as f,Nn as g,ie as h,Cn as i,z as j,za as k,xr as l,_a as m,hr as n,Nr as o,Vr as p,_r as q,$r as r,Ti as s,qr as t,re as u,Yr as v,ji as w,ba as x,ea as y,Dr as z};

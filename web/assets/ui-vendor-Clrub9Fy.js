var En=Object.defineProperty,Rn=Object.defineProperties;var On=Object.getOwnPropertyDescriptors;var we=Object.getOwnPropertySymbols;var pt=Object.prototype.hasOwnProperty,mt=Object.prototype.propertyIsEnumerable;var yt=(e,t,n)=>t in e?En(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,k=(e,t)=>{for(var n in t||(t={}))pt.call(t,n)&&yt(e,n,t[n]);if(we)for(var n of we(t))mt.call(t,n)&&yt(e,n,t[n]);return e},A=(e,t)=>Rn(e,On(t));var V=(e,t)=>{var n={};for(var r in e)pt.call(e,r)&&t.indexOf(r)<0&&(n[r]=e[r]);if(e!=null&&we)for(var r of we(e))t.indexOf(r)<0&&mt.call(e,r)&&(n[r]=e[r]);return n};var Y=(e,t,n)=>new Promise((r,o)=>{var i=c=>{try{s(n.next(c))}catch(l){o(l)}},a=c=>{try{s(n.throw(c))}catch(l){o(l)}},s=c=>c.done?r(c.value):Promise.resolve(c.value).then(i,a);s((n=n.apply(e,t)).next())});import{j as N}from"./query-vendor-Ddgkk05A.js";import{r as zt,v as Ln}from"./react-vendor-Amj_-LnG.js";function Tn(e,t){for(var n=0;n<t.length;n++){const r=t[n];if(typeof r!="string"&&!Array.isArray(r)){for(const o in r)if(o!=="default"&&!(o in e)){const i=Object.getOwnPropertyDescriptor(r,o);i&&Object.defineProperty(e,o,i.get?i:{enumerable:!0,get:()=>r[o]})}}}return Object.freeze(Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}))}var Uo=typeof globalThis!="undefined"?globalThis:typeof window!="undefined"?window:typeof global!="undefined"?global:typeof self!="undefined"?self:{};function zn(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}function Zo(e){if(e.__esModule)return e;var t=e.default;if(typeof t=="function"){var n=function r(){return this instanceof r?Reflect.construct(t,arguments,this.constructor):t.apply(this,arguments)};n.prototype=t.prototype}else n={};return Object.defineProperty(n,"__esModule",{value:!0}),Object.keys(e).forEach(function(r){var o=Object.getOwnPropertyDescriptor(e,r);Object.defineProperty(n,r,o.get?o:{enumerable:!0,get:function(){return e[r]}})}),n}var Dt={exports:{}},S={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var ke=Symbol.for("react.element"),Dn=Symbol.for("react.portal"),_n=Symbol.for("react.fragment"),Nn=Symbol.for("react.strict_mode"),jn=Symbol.for("react.profiler"),Hn=Symbol.for("react.provider"),Vn=Symbol.for("react.context"),qn=Symbol.for("react.forward_ref"),$n=Symbol.for("react.suspense"),In=Symbol.for("react.memo"),Fn=Symbol.for("react.lazy"),gt=Symbol.iterator;function Bn(e){return e===null||typeof e!="object"?null:(e=gt&&e[gt]||e["@@iterator"],typeof e=="function"?e:null)}var _t={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},Nt=Object.assign,jt={};function de(e,t,n){this.props=e,this.context=t,this.refs=jt,this.updater=n||_t}de.prototype.isReactComponent={};de.prototype.setState=function(e,t){if(typeof e!="object"&&typeof e!="function"&&e!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,e,t,"setState")};de.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")};function Ht(){}Ht.prototype=de.prototype;function Ue(e,t,n){this.props=e,this.context=t,this.refs=jt,this.updater=n||_t}var Ze=Ue.prototype=new Ht;Ze.constructor=Ue;Nt(Ze,de.prototype);Ze.isPureReactComponent=!0;var kt=Array.isArray,Vt=Object.prototype.hasOwnProperty,Ye={current:null},qt={key:!0,ref:!0,__self:!0,__source:!0};function $t(e,t,n){var r,o={},i=null,a=null;if(t!=null)for(r in t.ref!==void 0&&(a=t.ref),t.key!==void 0&&(i=""+t.key),t)Vt.call(t,r)&&!qt.hasOwnProperty(r)&&(o[r]=t[r]);var s=arguments.length-2;if(s===1)o.children=n;else if(1<s){for(var c=Array(s),l=0;l<s;l++)c[l]=arguments[l+2];o.children=c}if(e&&e.defaultProps)for(r in s=e.defaultProps,s)o[r]===void 0&&(o[r]=s[r]);return{$$typeof:ke,type:e,key:i,ref:a,props:o,_owner:Ye.current}}function Wn(e,t){return{$$typeof:ke,type:e.type,key:t,ref:e.ref,props:e.props,_owner:e._owner}}function Xe(e){return typeof e=="object"&&e!==null&&e.$$typeof===ke}function Un(e){var t={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,function(n){return t[n]})}var vt=/\/+/g;function je(e,t){return typeof e=="object"&&e!==null&&e.key!=null?Un(""+e.key):t.toString(36)}function Ae(e,t,n,r,o){var i=typeof e;(i==="undefined"||i==="boolean")&&(e=null);var a=!1;if(e===null)a=!0;else switch(i){case"string":case"number":a=!0;break;case"object":switch(e.$$typeof){case ke:case Dn:a=!0}}if(a)return a=e,o=o(a),e=r===""?"."+je(a,0):r,kt(o)?(n="",e!=null&&(n=e.replace(vt,"$&/")+"/"),Ae(o,t,n,"",function(l){return l})):o!=null&&(Xe(o)&&(o=Wn(o,n+(!o.key||a&&a.key===o.key?"":(""+o.key).replace(vt,"$&/")+"/")+e)),t.push(o)),1;if(a=0,r=r===""?".":r+":",kt(e))for(var s=0;s<e.length;s++){i=e[s];var c=r+je(i,s);a+=Ae(i,t,n,c,o)}else if(c=Bn(e),typeof c=="function")for(e=c.call(e),s=0;!(i=e.next()).done;)i=i.value,c=r+je(i,s++),a+=Ae(i,t,n,c,o);else if(i==="object")throw t=String(e),Error("Objects are not valid as a React child (found: "+(t==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":t)+"). If you meant to render a collection of children, use an array instead.");return a}function be(e,t,n){if(e==null)return e;var r=[],o=0;return Ae(e,r,"","",function(i){return t.call(n,i,o++)}),r}function Zn(e){if(e._status===-1){var t=e._result;t=t(),t.then(function(n){(e._status===0||e._status===-1)&&(e._status=1,e._result=n)},function(n){(e._status===0||e._status===-1)&&(e._status=2,e._result=n)}),e._status===-1&&(e._status=0,e._result=t)}if(e._status===1)return e._result.default;throw e._result}var F={current:null},Se={transition:null},Yn={ReactCurrentDispatcher:F,ReactCurrentBatchConfig:Se,ReactCurrentOwner:Ye};function It(){throw Error("act(...) is not supported in production builds of React.")}S.Children={map:be,forEach:function(e,t,n){be(e,function(){t.apply(this,arguments)},n)},count:function(e){var t=0;return be(e,function(){t++}),t},toArray:function(e){return be(e,function(t){return t})||[]},only:function(e){if(!Xe(e))throw Error("React.Children.only expected to receive a single React element child.");return e}};S.Component=de;S.Fragment=_n;S.Profiler=jn;S.PureComponent=Ue;S.StrictMode=Nn;S.Suspense=$n;S.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Yn;S.act=It;S.cloneElement=function(e,t,n){if(e==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+e+".");var r=Nt({},e.props),o=e.key,i=e.ref,a=e._owner;if(t!=null){if(t.ref!==void 0&&(i=t.ref,a=Ye.current),t.key!==void 0&&(o=""+t.key),e.type&&e.type.defaultProps)var s=e.type.defaultProps;for(c in t)Vt.call(t,c)&&!qt.hasOwnProperty(c)&&(r[c]=t[c]===void 0&&s!==void 0?s[c]:t[c])}var c=arguments.length-2;if(c===1)r.children=n;else if(1<c){s=Array(c);for(var l=0;l<c;l++)s[l]=arguments[l+2];r.children=s}return{$$typeof:ke,type:e.type,key:o,ref:i,props:r,_owner:a}};S.createContext=function(e){return e={$$typeof:Vn,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},e.Provider={$$typeof:Hn,_context:e},e.Consumer=e};S.createElement=$t;S.createFactory=function(e){var t=$t.bind(null,e);return t.type=e,t};S.createRef=function(){return{current:null}};S.forwardRef=function(e){return{$$typeof:qn,render:e}};S.isValidElement=Xe;S.lazy=function(e){return{$$typeof:Fn,_payload:{_status:-1,_result:e},_init:Zn}};S.memo=function(e,t){return{$$typeof:In,type:e,compare:t===void 0?null:t}};S.startTransition=function(e){var t=Se.transition;Se.transition={};try{e()}finally{Se.transition=t}};S.unstable_act=It;S.useCallback=function(e,t){return F.current.useCallback(e,t)};S.useContext=function(e){return F.current.useContext(e)};S.useDebugValue=function(){};S.useDeferredValue=function(e){return F.current.useDeferredValue(e)};S.useEffect=function(e,t){return F.current.useEffect(e,t)};S.useId=function(){return F.current.useId()};S.useImperativeHandle=function(e,t,n){return F.current.useImperativeHandle(e,t,n)};S.useInsertionEffect=function(e,t){return F.current.useInsertionEffect(e,t)};S.useLayoutEffect=function(e,t){return F.current.useLayoutEffect(e,t)};S.useMemo=function(e,t){return F.current.useMemo(e,t)};S.useReducer=function(e,t,n){return F.current.useReducer(e,t,n)};S.useRef=function(e){return F.current.useRef(e)};S.useState=function(e){return F.current.useState(e)};S.useSyncExternalStore=function(e,t,n){return F.current.useSyncExternalStore(e,t,n)};S.useTransition=function(){return F.current.useTransition()};S.version="18.3.1";Dt.exports=S;var h=Dt.exports;const re=zn(h),Xn=Tn({__proto__:null,default:re},[h]);function He(e,t,{checkForDefaultPrevented:n=!0}={}){return function(o){if(e==null||e(o),n===!1||!o.defaultPrevented)return t==null?void 0:t(o)}}function xt(e,t){if(typeof e=="function")return e(t);e!=null&&(e.current=t)}function Ft(...e){return t=>{let n=!1;const r=e.map(o=>{const i=xt(o,t);return!n&&typeof i=="function"&&(n=!0),i});if(n)return()=>{for(let o=0;o<r.length;o++){const i=r[o];typeof i=="function"?i():xt(e[o],null)}}}}function ae(...e){return h.useCallback(Ft(...e),e)}function Bt(e,t=[]){let n=[];function r(i,a){const s=h.createContext(a),c=n.length;n=[...n,a];const l=d=>{var b;const x=d,{scope:y,children:p}=x,g=V(x,["scope","children"]),m=((b=y==null?void 0:y[e])==null?void 0:b[c])||s,v=h.useMemo(()=>g,Object.values(g));return N.jsx(m.Provider,{value:v,children:p})};l.displayName=i+"Provider";function f(d,y){var m;const p=((m=y==null?void 0:y[e])==null?void 0:m[c])||s,g=h.useContext(p);if(g)return g;if(a!==void 0)return a;throw new Error(`\`${d}\` must be used within \`${i}\``)}return[l,f]}const o=()=>{const i=n.map(a=>h.createContext(a));return function(s){const c=(s==null?void 0:s[e])||i;return h.useMemo(()=>({[`__scope${e}`]:A(k({},s),{[e]:c})}),[s,c])}};return o.scopeName=e,[r,Gn(o,...t)]}function Gn(...e){const t=e[0];if(e.length===1)return t;const n=()=>{const r=e.map(o=>({useScope:o(),scopeName:o.scopeName}));return function(i){const a=r.reduce((s,{useScope:c,scopeName:l})=>{const d=c(i)[`__scope${l}`];return k(k({},s),d)},{});return h.useMemo(()=>({[`__scope${t.scopeName}`]:a}),[a])}};return n.scopeName=t.scopeName,n}function $e(e){const t=Kn(e),n=h.forwardRef((r,o)=>{const l=r,{children:i}=l,a=V(l,["children"]),s=h.Children.toArray(i),c=s.find(Jn);if(c){const f=c.props.children,d=s.map(y=>y===c?h.Children.count(f)>1?h.Children.only(null):h.isValidElement(f)?f.props.children:null:y);return N.jsx(t,A(k({},a),{ref:o,children:h.isValidElement(f)?h.cloneElement(f,void 0,d):null}))}return N.jsx(t,A(k({},a),{ref:o,children:i}))});return n.displayName=`${e}.Slot`,n}function Kn(e){const t=h.forwardRef((n,r)=>{const a=n,{children:o}=a,i=V(a,["children"]);if(h.isValidElement(o)){const s=er(o),c=Qn(i,o.props);return o.type!==h.Fragment&&(c.ref=r?Ft(r,s):s),h.cloneElement(o,c)}return h.Children.count(o)>1?h.Children.only(null):null});return t.displayName=`${e}.SlotClone`,t}var Wt=Symbol("radix.slottable");function Yo(e){const t=({children:n})=>N.jsx(N.Fragment,{children:n});return t.displayName=`${e}.Slottable`,t.__radixId=Wt,t}function Jn(e){return h.isValidElement(e)&&typeof e.type=="function"&&"__radixId"in e.type&&e.type.__radixId===Wt}function Qn(e,t){const n=k({},t);for(const r in t){const o=e[r],i=t[r];/^on[A-Z]/.test(r)?o&&i?n[r]=(...s)=>{const c=i(...s);return o(...s),c}:o&&(n[r]=o):r==="style"?n[r]=k(k({},o),i):r==="className"&&(n[r]=[o,i].filter(Boolean).join(" "))}return k(k({},e),n)}function er(e){var r,o;let t=(r=Object.getOwnPropertyDescriptor(e.props,"ref"))==null?void 0:r.get,n=t&&"isReactWarning"in t&&t.isReactWarning;return n?e.ref:(t=(o=Object.getOwnPropertyDescriptor(e,"ref"))==null?void 0:o.get,n=t&&"isReactWarning"in t&&t.isReactWarning,n?e.props.ref:e.props.ref||e.ref)}function Xo(e){const t=e+"CollectionProvider",[n,r]=Bt(t),[o,i]=n(t,{collectionRef:{current:null},itemMap:new Map}),a=m=>{const{scope:v,children:x}=m,b=re.useRef(null),M=re.useRef(new Map).current;return N.jsx(o,{scope:v,itemMap:M,collectionRef:b,children:x})};a.displayName=t;const s=e+"CollectionSlot",c=$e(s),l=re.forwardRef((m,v)=>{const{scope:x,children:b}=m,M=i(s,x),w=ae(v,M.collectionRef);return N.jsx(c,{ref:w,children:b})});l.displayName=s;const f=e+"CollectionItemSlot",d="data-radix-collection-item",y=$e(f),p=re.forwardRef((m,v)=>{const O=m,{scope:x,children:b}=O,M=V(O,["scope","children"]),w=re.useRef(null),C=ae(v,w),P=i(f,x);return re.useEffect(()=>(P.itemMap.set(w,k({ref:w},M)),()=>void P.itemMap.delete(w))),N.jsx(y,{[d]:"",ref:C,children:b})});p.displayName=f;function g(m){const v=i(e+"CollectionConsumer",m);return re.useCallback(()=>{const b=v.collectionRef.current;if(!b)return[];const M=Array.from(b.querySelectorAll(`[${d}]`));return Array.from(v.itemMap.values()).sort((P,O)=>M.indexOf(P.ref.current)-M.indexOf(O.ref.current))},[v.collectionRef,v.itemMap])}return[{Provider:a,Slot:l,ItemSlot:p},g,r]}var tr=["a","button","div","form","h2","h3","img","input","label","li","nav","ol","p","select","span","svg","ul"],le=tr.reduce((e,t)=>{const n=$e(`Primitive.${t}`),r=h.forwardRef((o,i)=>{const l=o,{asChild:a}=l,s=V(l,["asChild"]),c=a?n:t;return typeof window!="undefined"&&(window[Symbol.for("radix-ui")]=!0),N.jsx(c,A(k({},s),{ref:i}))});return r.displayName=`Primitive.${t}`,A(k({},e),{[t]:r})},{});function nr(e,t){e&&zt.flushSync(()=>e.dispatchEvent(t))}function Te(e){const t=h.useRef(e);return h.useEffect(()=>{t.current=e}),h.useMemo(()=>(...n)=>{var r;return(r=t.current)==null?void 0:r.call(t,...n)},[])}function rr(e,t=globalThis==null?void 0:globalThis.document){const n=Te(e);h.useEffect(()=>{const r=o=>{o.key==="Escape"&&n(o)};return t.addEventListener("keydown",r,{capture:!0}),()=>t.removeEventListener("keydown",r,{capture:!0})},[n,t])}var or="DismissableLayer",Ie="dismissableLayer.update",ir="dismissableLayer.pointerDownOutside",ar="dismissableLayer.focusOutside",wt,Ut=h.createContext({layers:new Set,layersWithOutsidePointerEventsDisabled:new Set,branches:new Set}),Zt=h.forwardRef((e,t)=>{var L;const O=e,{disableOutsidePointerEvents:n=!1,onEscapeKeyDown:r,onPointerDownOutside:o,onFocusOutside:i,onInteractOutside:a,onDismiss:s}=O,c=V(O,["disableOutsidePointerEvents","onEscapeKeyDown","onPointerDownOutside","onFocusOutside","onInteractOutside","onDismiss"]),l=h.useContext(Ut),[f,d]=h.useState(null),y=(L=f==null?void 0:f.ownerDocument)!=null?L:globalThis==null?void 0:globalThis.document,[,p]=h.useState({}),g=ae(t,E=>d(E)),m=Array.from(l.layers),[v]=[...l.layersWithOutsidePointerEventsDisabled].slice(-1),x=m.indexOf(v),b=f?m.indexOf(f):-1,M=l.layersWithOutsidePointerEventsDisabled.size>0,w=b>=x,C=cr(E=>{const z=E.target,T=[...l.branches].some(q=>q.contains(z));!w||T||(o==null||o(E),a==null||a(E),E.defaultPrevented||s==null||s())},y),P=lr(E=>{const z=E.target;[...l.branches].some(q=>q.contains(z))||(i==null||i(E),a==null||a(E),E.defaultPrevented||s==null||s())},y);return rr(E=>{b===l.layers.size-1&&(r==null||r(E),!E.defaultPrevented&&s&&(E.preventDefault(),s()))},y),h.useEffect(()=>{if(f)return n&&(l.layersWithOutsidePointerEventsDisabled.size===0&&(wt=y.body.style.pointerEvents,y.body.style.pointerEvents="none"),l.layersWithOutsidePointerEventsDisabled.add(f)),l.layers.add(f),bt(),()=>{n&&l.layersWithOutsidePointerEventsDisabled.size===1&&(y.body.style.pointerEvents=wt)}},[f,y,n,l]),h.useEffect(()=>()=>{f&&(l.layers.delete(f),l.layersWithOutsidePointerEventsDisabled.delete(f),bt())},[f,l]),h.useEffect(()=>{const E=()=>p({});return document.addEventListener(Ie,E),()=>document.removeEventListener(Ie,E)},[]),N.jsx(le.div,A(k({},c),{ref:g,style:k({pointerEvents:M?w?"auto":"none":void 0},e.style),onFocusCapture:He(e.onFocusCapture,P.onFocusCapture),onBlurCapture:He(e.onBlurCapture,P.onBlurCapture),onPointerDownCapture:He(e.onPointerDownCapture,C.onPointerDownCapture)}))});Zt.displayName=or;var sr="DismissableLayerBranch",Yt=h.forwardRef((e,t)=>{const n=h.useContext(Ut),r=h.useRef(null),o=ae(t,r);return h.useEffect(()=>{const i=r.current;if(i)return n.branches.add(i),()=>{n.branches.delete(i)}},[n.branches]),N.jsx(le.div,A(k({},e),{ref:o}))});Yt.displayName=sr;function cr(e,t=globalThis==null?void 0:globalThis.document){const n=Te(e),r=h.useRef(!1),o=h.useRef(()=>{});return h.useEffect(()=>{const i=s=>{if(s.target&&!r.current){let c=function(){Xt(ir,n,l,{discrete:!0})};const l={originalEvent:s};s.pointerType==="touch"?(t.removeEventListener("click",o.current),o.current=c,t.addEventListener("click",o.current,{once:!0})):c()}else t.removeEventListener("click",o.current);r.current=!1},a=window.setTimeout(()=>{t.addEventListener("pointerdown",i)},0);return()=>{window.clearTimeout(a),t.removeEventListener("pointerdown",i),t.removeEventListener("click",o.current)}},[t,n]),{onPointerDownCapture:()=>r.current=!0}}function lr(e,t=globalThis==null?void 0:globalThis.document){const n=Te(e),r=h.useRef(!1);return h.useEffect(()=>{const o=i=>{i.target&&!r.current&&Xt(ar,n,{originalEvent:i},{discrete:!1})};return t.addEventListener("focusin",o),()=>t.removeEventListener("focusin",o)},[t,n]),{onFocusCapture:()=>r.current=!0,onBlurCapture:()=>r.current=!1}}function bt(){const e=new CustomEvent(Ie);document.dispatchEvent(e)}function Xt(e,t,n,{discrete:r}){const o=n.originalEvent.target,i=new CustomEvent(e,{bubbles:!1,cancelable:!0,detail:n});t&&o.addEventListener(e,t,{once:!0}),r?nr(o,i):o.dispatchEvent(i)}var Go=Zt,Ko=Yt,se=globalThis!=null&&globalThis.document?h.useLayoutEffect:()=>{},ur="Portal",fr=h.forwardRef((e,t)=>{var c;const s=e,{container:n}=s,r=V(s,["container"]),[o,i]=h.useState(!1);se(()=>i(!0),[]);const a=n||o&&((c=globalThis==null?void 0:globalThis.document)==null?void 0:c.body);return a?Ln.createPortal(N.jsx(le.div,A(k({},r),{ref:t})),a):null});fr.displayName=ur;function dr(e,t){return h.useReducer((n,r)=>{const o=t[n][r];return o!=null?o:n},e)}var hr=e=>{const{present:t,children:n}=e,r=yr(t),o=typeof n=="function"?n({present:r.isPresent}):h.Children.only(n),i=ae(r.ref,pr(o));return typeof n=="function"||r.isPresent?h.cloneElement(o,{ref:i}):null};hr.displayName="Presence";function yr(e){const[t,n]=h.useState(),r=h.useRef(null),o=h.useRef(e),i=h.useRef("none"),a=e?"mounted":"unmounted",[s,c]=dr(a,{mounted:{UNMOUNT:"unmounted",ANIMATION_OUT:"unmountSuspended"},unmountSuspended:{MOUNT:"mounted",ANIMATION_END:"unmounted"},unmounted:{MOUNT:"mounted"}});return h.useEffect(()=>{const l=Me(r.current);i.current=s==="mounted"?l:"none"},[s]),se(()=>{const l=r.current,f=o.current;if(f!==e){const y=i.current,p=Me(l);e?c("MOUNT"):p==="none"||(l==null?void 0:l.display)==="none"?c("UNMOUNT"):c(f&&y!==p?"ANIMATION_OUT":"UNMOUNT"),o.current=e}},[e,c]),se(()=>{var l;if(t){let f;const d=(l=t.ownerDocument.defaultView)!=null?l:window,y=g=>{const v=Me(r.current).includes(g.animationName);if(g.target===t&&v&&(c("ANIMATION_END"),!o.current)){const x=t.style.animationFillMode;t.style.animationFillMode="forwards",f=d.setTimeout(()=>{t.style.animationFillMode==="forwards"&&(t.style.animationFillMode=x)})}},p=g=>{g.target===t&&(i.current=Me(r.current))};return t.addEventListener("animationstart",p),t.addEventListener("animationcancel",y),t.addEventListener("animationend",y),()=>{d.clearTimeout(f),t.removeEventListener("animationstart",p),t.removeEventListener("animationcancel",y),t.removeEventListener("animationend",y)}}else c("ANIMATION_END")},[t,c]),{isPresent:["mounted","unmountSuspended"].includes(s),ref:h.useCallback(l=>{r.current=l?getComputedStyle(l):null,n(l)},[])}}function Me(e){return(e==null?void 0:e.animationName)||"none"}function pr(e){var r,o;let t=(r=Object.getOwnPropertyDescriptor(e.props,"ref"))==null?void 0:r.get,n=t&&"isReactWarning"in t&&t.isReactWarning;return n?e.ref:(t=(o=Object.getOwnPropertyDescriptor(e,"ref"))==null?void 0:o.get,n=t&&"isReactWarning"in t&&t.isReactWarning,n?e.props.ref:e.props.ref||e.ref)}var mr=Xn[" useInsertionEffect ".trim().toString()]||se;function Jo({prop:e,defaultProp:t,onChange:n=()=>{},caller:r}){const[o,i,a]=gr({defaultProp:t,onChange:n}),s=e!==void 0,c=s?e:o;{const f=h.useRef(e!==void 0);h.useEffect(()=>{const d=f.current;d!==s&&console.warn(`${r} is changing from ${d?"controlled":"uncontrolled"} to ${s?"controlled":"uncontrolled"}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`),f.current=s},[s,r])}const l=h.useCallback(f=>{var d;if(s){const y=kr(f)?f(e):f;y!==e&&((d=a.current)==null||d.call(a,y))}else i(f)},[s,e,i,a]);return[c,l]}function gr({defaultProp:e,onChange:t}){const[n,r]=h.useState(e),o=h.useRef(n),i=h.useRef(t);return mr(()=>{i.current=t},[t]),h.useEffect(()=>{var a;o.current!==n&&((a=i.current)==null||a.call(i,n),o.current=n)},[n,o]),[n,r,i]}function kr(e){return typeof e=="function"}var vr=Object.freeze({position:"absolute",border:0,width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",wordWrap:"normal"}),xr="VisuallyHidden",Gt=h.forwardRef((e,t)=>N.jsx(le.span,A(k({},e),{ref:t,style:k(k({},vr),e.style)})));Gt.displayName=xr;var Qo=Gt;/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wr=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),Kt=(...e)=>e.filter((t,n,r)=>!!t&&t.trim()!==""&&r.indexOf(t)===n).join(" ").trim();/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var br={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mr=h.forwardRef((l,c)=>{var f=l,{color:e="currentColor",size:t=24,strokeWidth:n=2,absoluteStrokeWidth:r,className:o="",children:i,iconNode:a}=f,s=V(f,["color","size","strokeWidth","absoluteStrokeWidth","className","children","iconNode"]);return h.createElement("svg",k(A(k({ref:c},br),{width:t,height:t,stroke:e,strokeWidth:r?Number(n)*24/Number(t):n,className:Kt("lucide",o)}),s),[...a.map(([d,y])=>h.createElement(d,y)),...Array.isArray(i)?i:[i]])});/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=(e,t)=>{const n=h.forwardRef((a,i)=>{var s=a,{className:r}=s,o=V(s,["className"]);return h.createElement(Mr,k({ref:i,iconNode:t,className:Kt(`lucide-${wr(e)}`,r)},o))});return n.displayName=`${e}`,n};/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ei=u("Activity",[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ti=u("ArrowLeft",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ni=u("ArrowRight",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ri=u("Award",[["path",{d:"m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526",key:"1yiouv"}],["circle",{cx:"12",cy:"8",r:"6",key:"1vp47v"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oi=u("Bell",[["path",{d:"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9",key:"1qo2s2"}],["path",{d:"M10.3 21a1.94 1.94 0 0 0 3.4 0",key:"qgo35s"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ii=u("BookMarked",[["path",{d:"M10 2v8l3-3 3 3V2",key:"sqw3rj"}],["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20",key:"k3hazp"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ai=u("BookOpen",[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const si=u("Bot",[["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ci=u("Building2",[["path",{d:"M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z",key:"1b4qmf"}],["path",{d:"M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2",key:"i71pzd"}],["path",{d:"M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2",key:"10jefs"}],["path",{d:"M10 6h4",key:"1itunk"}],["path",{d:"M10 10h4",key:"tcdvrf"}],["path",{d:"M10 14h4",key:"kelpxr"}],["path",{d:"M10 18h4",key:"1ulq68"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const li=u("CalendarDays",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M16 14h.01",key:"1gbofw"}],["path",{d:"M8 18h.01",key:"lrp35t"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M16 18h.01",key:"kzsmim"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ui=u("CalendarRange",[["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M16 2v4",key:"4m81vk"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M17 14h-6",key:"bkmgh3"}],["path",{d:"M13 18H7",key:"bb0bb7"}],["path",{d:"M7 14h.01",key:"1qa3f1"}],["path",{d:"M17 18h.01",key:"1bdyru"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fi=u("Calendar",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const di=u("Camera",[["path",{d:"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",key:"1tc9qg"}],["circle",{cx:"12",cy:"13",r:"3",key:"1vg3eu"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hi=u("ChartColumn",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yi=u("ChartNoAxesColumn",[["line",{x1:"18",x2:"18",y1:"20",y2:"10",key:"1xfpm4"}],["line",{x1:"12",x2:"12",y1:"20",y2:"4",key:"be30l9"}],["line",{x1:"6",x2:"6",y1:"20",y2:"14",key:"1r4le6"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pi=u("ChartPie",[["path",{d:"M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z",key:"pzmjnu"}],["path",{d:"M21.21 15.89A10 10 0 1 1 8 2.83",key:"k2fpak"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mi=u("CheckCheck",[["path",{d:"M18 6 7 17l-5-5",key:"116fxf"}],["path",{d:"m22 10-7.5 7.5L13 16",key:"ke71qq"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gi=u("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ki=u("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vi=u("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xi=u("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wi=u("ChevronUp",[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bi=u("ChevronsLeft",[["path",{d:"m11 17-5-5 5-5",key:"13zhaf"}],["path",{d:"m18 17-5-5 5-5",key:"h8a8et"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mi=u("ChevronsRight",[["path",{d:"m6 17 5-5-5-5",key:"xnjwq"}],["path",{d:"m13 17 5-5-5-5",key:"17xmmf"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ci=u("CircleAlert",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ai=u("CircleCheckBig",[["path",{d:"M21.801 10A10 10 0 1 1 17 3.335",key:"yps3ct"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Si=u("CircleCheck",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pi=u("CircleUser",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}],["path",{d:"M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662",key:"154egf"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ei=u("CircleX",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ri=u("ClipboardList",[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Oi=u("Clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Li=u("Cloud",[["path",{d:"M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z",key:"p7xjir"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ti=u("CodeXml",[["path",{d:"m18 16 4-4-4-4",key:"1inbqp"}],["path",{d:"m6 8-4 4 4 4",key:"15zrgr"}],["path",{d:"m14.5 4-5 16",key:"e7oirm"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zi=u("Copy",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Di=u("CornerUpLeft",[["polyline",{points:"9 14 4 9 9 4",key:"881910"}],["path",{d:"M20 20v-7a4 4 0 0 0-4-4H4",key:"1nkjon"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _i=u("Cpu",[["rect",{width:"16",height:"16",x:"4",y:"4",rx:"2",key:"14l7u7"}],["rect",{width:"6",height:"6",x:"9",y:"9",rx:"1",key:"5aljv4"}],["path",{d:"M15 2v2",key:"13l42r"}],["path",{d:"M15 20v2",key:"15mkzm"}],["path",{d:"M2 15h2",key:"1gxd5l"}],["path",{d:"M2 9h2",key:"1bbxkp"}],["path",{d:"M20 15h2",key:"19e6y8"}],["path",{d:"M20 9h2",key:"19tzq7"}],["path",{d:"M9 2v2",key:"165o2o"}],["path",{d:"M9 20v2",key:"i2bqo8"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ni=u("Database",[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ji=u("DollarSign",[["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",key:"1b0p4s"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hi=u("Download",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vi=u("ExternalLink",[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qi=u("EyeOff",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $i=u("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ii=u("FileCheck",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"m9 15 2 2 4-4",key:"1grp1n"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fi=u("FileSpreadsheet",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M8 13h2",key:"yr2amv"}],["path",{d:"M14 13h2",key:"un5t4a"}],["path",{d:"M8 17h2",key:"2yhykz"}],["path",{d:"M14 17h2",key:"10kma7"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bi=u("FileText",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wi=u("File",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ui=u("Filter",[["polygon",{points:"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3",key:"1yg77f"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zi=u("FolderOpen",[["path",{d:"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",key:"usdka0"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yi=u("Forward",[["polyline",{points:"15 17 20 12 15 7",key:"1w3sku"}],["path",{d:"M4 18v-2a4 4 0 0 1 4-4h12",key:"jmiej9"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xi=u("Gavel",[["path",{d:"m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8",key:"15492f"}],["path",{d:"m16 16 6-6",key:"vzrcl6"}],["path",{d:"m8 8 6-6",key:"18bi4p"}],["path",{d:"m9 7 8 8",key:"5jnvq1"}],["path",{d:"m21 11-8-8",key:"z4y7zo"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gi=u("Globe",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ki=u("HardDriveDownload",[["path",{d:"M12 2v8",key:"1q4o3n"}],["path",{d:"m16 6-4 4-4-4",key:"6wukr"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",key:"w68u3i"}],["path",{d:"M6 18h.01",key:"uhywen"}],["path",{d:"M10 18h.01",key:"h775k"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ji=u("HardDrive",[["line",{x1:"22",x2:"2",y1:"12",y2:"12",key:"1y58io"}],["path",{d:"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",key:"oot6mr"}],["line",{x1:"6",x2:"6.01",y1:"16",y2:"16",key:"sgf278"}],["line",{x1:"10",x2:"10.01",y1:"16",y2:"16",key:"1l4acy"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qi=u("Hash",[["line",{x1:"4",x2:"20",y1:"9",y2:"9",key:"4lhtct"}],["line",{x1:"4",x2:"20",y1:"15",y2:"15",key:"vyu0kd"}],["line",{x1:"10",x2:"8",y1:"3",y2:"21",key:"1ggp8o"}],["line",{x1:"16",x2:"14",y1:"3",y2:"21",key:"weycgp"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ea=u("Heart",[["path",{d:"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",key:"c3ymky"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ta=u("House",[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"1d0kgt"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const na=u("Image",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ra=u("Inbox",[["polyline",{points:"22 12 16 12 14 15 10 15 8 12 2 12",key:"o97t9d"}],["path",{d:"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",key:"oot6mr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oa=u("Info",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ia=u("Key",[["path",{d:"m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4",key:"g0fldk"}],["path",{d:"m21 2-9.6 9.6",key:"1j0ho8"}],["circle",{cx:"7.5",cy:"15.5",r:"5.5",key:"yqb3hr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const aa=u("Laptop",[["path",{d:"M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16",key:"tarvll"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sa=u("Layers",[["path",{d:"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",key:"8b97xw"}],["path",{d:"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65",key:"dd6zsq"}],["path",{d:"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65",key:"ep9fru"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ca=u("LayoutDashboard",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const la=u("LayoutGrid",[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1",key:"1g98yp"}],["rect",{width:"7",height:"7",x:"14",y:"3",rx:"1",key:"6d4xhi"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1",key:"nxv5o0"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1",key:"1bb6yr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ua=u("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fa=u("LockOpen",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 9.9-1",key:"1mm8w8"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const da=u("Lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ha=u("LogOut",[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}],["polyline",{points:"16 17 21 12 16 7",key:"1gabdz"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12",key:"1uyos4"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ya=u("Mail",[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2",key:"18n3k1"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7",key:"1ocrg3"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pa=u("MapPin",[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",key:"1r0f0z"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ma=u("Megaphone",[["path",{d:"m3 11 18-5v12L3 14v-3z",key:"n962bs"}],["path",{d:"M11.6 16.8a3 3 0 1 1-5.8-1.6",key:"1yl0tm"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ga=u("MemoryStick",[["path",{d:"M6 19v-3",key:"1nvgqn"}],["path",{d:"M10 19v-3",key:"iu8nkm"}],["path",{d:"M14 19v-3",key:"kcehxu"}],["path",{d:"M18 19v-3",key:"1vh91z"}],["path",{d:"M8 11V9",key:"63erz4"}],["path",{d:"M16 11V9",key:"fru6f3"}],["path",{d:"M12 11V9",key:"ha00sb"}],["path",{d:"M2 15h20",key:"16ne18"}],["path",{d:"M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1.1a2 2 0 0 0 0 3.837V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5.1a2 2 0 0 0 0-3.837Z",key:"lhddv3"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ka=u("MessageCircle",[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z",key:"vv11sd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const va=u("MessageSquare",[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",key:"1lielz"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xa=u("MicOff",[["line",{x1:"2",x2:"22",y1:"2",y2:"22",key:"a6p6uj"}],["path",{d:"M18.89 13.23A7.12 7.12 0 0 0 19 12v-2",key:"80xlxr"}],["path",{d:"M5 10v2a7 7 0 0 0 12 5",key:"p2k8kg"}],["path",{d:"M15 9.34V5a3 3 0 0 0-5.68-1.33",key:"1gzdoj"}],["path",{d:"M9 9v3a3 3 0 0 0 5.12 2.12",key:"r2i35w"}],["line",{x1:"12",x2:"12",y1:"19",y2:"22",key:"x3vr5v"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wa=u("Mic",[["path",{d:"M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z",key:"131961"}],["path",{d:"M19 10v2a7 7 0 0 1-14 0v-2",key:"1vc78b"}],["line",{x1:"12",x2:"12",y1:"19",y2:"22",key:"x3vr5v"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ba=u("Minus",[["path",{d:"M5 12h14",key:"1ays0h"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ma=u("Monitor",[["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2",key:"48i651"}],["line",{x1:"8",x2:"16",y1:"21",y2:"21",key:"1svkeh"}],["line",{x1:"12",x2:"12",y1:"17",y2:"21",key:"vw1qmm"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ca=u("Move",[["path",{d:"M12 2v20",key:"t6zp3m"}],["path",{d:"m15 19-3 3-3-3",key:"11eu04"}],["path",{d:"m19 9 3 3-3 3",key:"1mg7y2"}],["path",{d:"M2 12h20",key:"9i4pu4"}],["path",{d:"m5 9-3 3 3 3",key:"j64kie"}],["path",{d:"m9 5 3-3 3 3",key:"l8vdw6"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Aa=u("Network",[["rect",{x:"16",y:"16",width:"6",height:"6",rx:"1",key:"4q2zg0"}],["rect",{x:"2",y:"16",width:"6",height:"6",rx:"1",key:"8cvhb9"}],["rect",{x:"9",y:"2",width:"6",height:"6",rx:"1",key:"1egb70"}],["path",{d:"M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3",key:"1jsf9p"}],["path",{d:"M12 12V8",key:"2874zd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sa=u("Package",[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["path",{d:"m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7",key:"yx3hmr"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pa=u("Palette",[["circle",{cx:"13.5",cy:"6.5",r:".5",fill:"currentColor",key:"1okk4w"}],["circle",{cx:"17.5",cy:"10.5",r:".5",fill:"currentColor",key:"f64h9f"}],["circle",{cx:"8.5",cy:"7.5",r:".5",fill:"currentColor",key:"fotxhn"}],["circle",{cx:"6.5",cy:"12.5",r:".5",fill:"currentColor",key:"qy21gx"}],["path",{d:"M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z",key:"12rzf8"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ea=u("PanelsTopLeft",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 9h18",key:"1pudct"}],["path",{d:"M9 21V9",key:"1oto5p"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ra=u("Paperclip",[["path",{d:"m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48",key:"1u3ebp"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Oa=u("PenLine",[["path",{d:"M12 20h9",key:"t2du7b"}],["path",{d:"M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z",key:"1ykcvy"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const La=u("PhoneCall",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}],["path",{d:"M14.05 2a9 9 0 0 1 8 7.94",key:"vmijpz"}],["path",{d:"M14.05 6A5 5 0 0 1 18 10",key:"13nbpp"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ta=u("PhoneIncoming",[["polyline",{points:"16 2 16 8 22 8",key:"1ygljm"}],["line",{x1:"22",x2:"16",y1:"2",y2:"8",key:"1xzwqn"}],["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const za=u("PhoneMissed",[["line",{x1:"22",x2:"16",y1:"2",y2:"8",key:"1xzwqn"}],["line",{x1:"16",x2:"22",y1:"2",y2:"8",key:"13zxdn"}],["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Da=u("PhoneOff",[["path",{d:"M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91",key:"z86iuo"}],["line",{x1:"22",x2:"2",y1:"2",y2:"22",key:"11kh81"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _a=u("PhoneOutgoing",[["polyline",{points:"22 8 22 2 16 2",key:"1g204g"}],["line",{x1:"16",x2:"22",y1:"8",y2:"2",key:"1ggias"}],["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Na=u("Phone",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ja=u("PiggyBank",[["path",{d:"M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z",key:"1ivx2i"}],["path",{d:"M2 9v1c0 1.1.9 2 2 2h1",key:"nm575m"}],["path",{d:"M16 11h.01",key:"xkw8gn"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ha=u("Play",[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Va=u("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qa=u("Power",[["path",{d:"M12 2v10",key:"mnfbl"}],["path",{d:"M18.4 6.6a9 9 0 1 1-12.77.04",key:"obofu9"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $a=u("Printer",[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ia=u("Radio",[["path",{d:"M4.9 19.1C1 15.2 1 8.8 4.9 4.9",key:"1vaf9d"}],["path",{d:"M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5",key:"u1ii0m"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5",key:"1j5fej"}],["path",{d:"M19.1 4.9C23 8.8 23 15.1 19.1 19",key:"10b0cb"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fa=u("Receipt",[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",key:"q3az6g"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 17.5v-11",key:"1jc1ny"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ba=u("RefreshCw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wa=u("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ua=u("Save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Za=u("Scale",[["path",{d:"m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"7g6ntu"}],["path",{d:"m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"ijws7r"}],["path",{d:"M7 21h10",key:"1b0cd5"}],["path",{d:"M12 3v18",key:"108xh3"}],["path",{d:"M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2",key:"3gwbw2"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ya=u("ScanBarcode",[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2",key:"aa7l1z"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2",key:"4qcy5o"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2",key:"6vwrx8"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2",key:"ioqczr"}],["path",{d:"M8 7v10",key:"23sfjj"}],["path",{d:"M12 7v10",key:"jspqdw"}],["path",{d:"M17 7v10",key:"578dap"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xa=u("Scan",[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2",key:"aa7l1z"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2",key:"4qcy5o"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2",key:"6vwrx8"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2",key:"ioqczr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ga=u("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ka=u("Send",[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ja=u("Server",[["rect",{width:"20",height:"8",x:"2",y:"2",rx:"2",ry:"2",key:"ngkwjq"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",ry:"2",key:"iecqi9"}],["line",{x1:"6",x2:"6.01",y1:"6",y2:"6",key:"16zg32"}],["line",{x1:"6",x2:"6.01",y1:"18",y2:"18",key:"nzw8ys"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qa=u("Settings2",[["path",{d:"M20 7h-9",key:"3s1dr2"}],["path",{d:"M14 17H5",key:"gfn3mx"}],["circle",{cx:"17",cy:"17",r:"3",key:"18b49y"}],["circle",{cx:"7",cy:"7",r:"3",key:"dfmy0x"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const es=u("Settings",[["path",{d:"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",key:"1qme2f"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ts=u("Shield",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ns=u("ShoppingCart",[["circle",{cx:"8",cy:"21",r:"1",key:"jimo8o"}],["circle",{cx:"19",cy:"21",r:"1",key:"13723u"}],["path",{d:"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12",key:"9zh506"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rs=u("SlidersVertical",[["line",{x1:"4",x2:"4",y1:"21",y2:"14",key:"1p332r"}],["line",{x1:"4",x2:"4",y1:"10",y2:"3",key:"gb41h5"}],["line",{x1:"12",x2:"12",y1:"21",y2:"12",key:"hf2csr"}],["line",{x1:"12",x2:"12",y1:"8",y2:"3",key:"1kfi7u"}],["line",{x1:"20",x2:"20",y1:"21",y2:"16",key:"1lhrwl"}],["line",{x1:"20",x2:"20",y1:"12",y2:"3",key:"16vvfq"}],["line",{x1:"2",x2:"6",y1:"14",y2:"14",key:"1uebub"}],["line",{x1:"10",x2:"14",y1:"8",y2:"8",key:"1yglbp"}],["line",{x1:"18",x2:"22",y1:"16",y2:"16",key:"1jxqpz"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const os=u("Smartphone",[["rect",{width:"14",height:"20",x:"5",y:"2",rx:"2",ry:"2",key:"1yt0o3"}],["path",{d:"M12 18h.01",key:"mhygvu"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const is=u("SquareCheckBig",[["path",{d:"M21 10.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.5",key:"1uzm8b"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const as=u("SquarePen",[["path",{d:"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",key:"1m0v6g"}],["path",{d:"M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z",key:"ohrbg2"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ss=u("Stamp",[["path",{d:"M5 22h14",key:"ehvnwv"}],["path",{d:"M19.27 13.73A2.5 2.5 0 0 0 17.5 13h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-.66-.26-1.3-.73-1.77Z",key:"1sy9ra"}],["path",{d:"M14 13V8.5C14 7 15 7 15 5a3 3 0 0 0-3-3c-1.66 0-3 1-3 3s1 2 1 3.5V13",key:"cnxgux"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cs=u("Star",[["path",{d:"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",key:"r04s7s"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ls=u("Table",[["path",{d:"M12 3v18",key:"108xh3"}],["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 9h18",key:"1pudct"}],["path",{d:"M3 15h18",key:"5xshup"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const us=u("Tablet",[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",ry:"2",key:"76otgf"}],["line",{x1:"12",x2:"12.01",y1:"18",y2:"18",key:"1dp563"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fs=u("Tag",[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ds=u("Terminal",[["polyline",{points:"4 17 10 11 4 5",key:"akl6gq"}],["line",{x1:"12",x2:"20",y1:"19",y2:"19",key:"q2wloq"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hs=u("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ys=u("TrendingDown",[["polyline",{points:"22 17 13.5 8.5 8.5 13.5 2 7",key:"1r2t7k"}],["polyline",{points:"16 17 22 17 22 11",key:"11uiuu"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ps=u("TrendingUp",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ms=u("TriangleAlert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gs=u("Truck",[["path",{d:"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2",key:"wrbu53"}],["path",{d:"M15 18H9",key:"1lyqi6"}],["path",{d:"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14",key:"lysw3i"}],["circle",{cx:"17",cy:"18",r:"2",key:"332jqn"}],["circle",{cx:"7",cy:"18",r:"2",key:"19iecd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ks=u("Tv",[["rect",{width:"20",height:"15",x:"2",y:"7",rx:"2",ry:"2",key:"10ag99"}],["polyline",{points:"17 2 12 7 7 2",key:"11pgbg"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vs=u("Type",[["polyline",{points:"4 7 4 4 20 4 20 7",key:"1nosan"}],["line",{x1:"9",x2:"15",y1:"20",y2:"20",key:"swin9y"}],["line",{x1:"12",x2:"12",y1:"4",y2:"20",key:"1tx1rr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xs=u("Upload",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"17 8 12 3 7 8",key:"t8dd8p"}],["line",{x1:"12",x2:"12",y1:"3",y2:"15",key:"widbto"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ws=u("UserCheck",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["polyline",{points:"16 11 18 13 22 9",key:"1pwet4"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bs=u("User",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ms=u("Users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75",key:"1da9ce"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cs=u("Video",[["path",{d:"m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5",key:"ftymec"}],["rect",{x:"2",y:"6",width:"14",height:"12",rx:"2",key:"158x01"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const As=u("Wifi",[["path",{d:"M12 20h.01",key:"zekei9"}],["path",{d:"M2 8.82a15 15 0 0 1 20 0",key:"dnpr2z"}],["path",{d:"M5 12.859a10 10 0 0 1 14 0",key:"1x1e6c"}],["path",{d:"M8.5 16.429a5 5 0 0 1 7 0",key:"1bycff"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ss=u("Wrench",[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",key:"cbrjhi"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ps=u("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Es=u("Zap",[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]]),Cr=["top","right","bottom","left"],oe=Math.min,U=Math.max,Ee=Math.round,Ce=Math.floor,J=e=>({x:e,y:e}),Ar={left:"right",right:"left",bottom:"top",top:"bottom"},Sr={start:"end",end:"start"};function Fe(e,t,n){return U(e,oe(t,n))}function te(e,t){return typeof e=="function"?e(t):e}function ne(e){return e.split("-")[0]}function he(e){return e.split("-")[1]}function Ge(e){return e==="x"?"y":"x"}function Ke(e){return e==="y"?"height":"width"}const Pr=new Set(["top","bottom"]);function K(e){return Pr.has(ne(e))?"y":"x"}function Je(e){return Ge(K(e))}function Er(e,t,n){n===void 0&&(n=!1);const r=he(e),o=Je(e),i=Ke(o);let a=o==="x"?r===(n?"end":"start")?"right":"left":r==="start"?"bottom":"top";return t.reference[i]>t.floating[i]&&(a=Re(a)),[a,Re(a)]}function Rr(e){const t=Re(e);return[Be(e),t,Be(t)]}function Be(e){return e.replace(/start|end/g,t=>Sr[t])}const Mt=["left","right"],Ct=["right","left"],Or=["top","bottom"],Lr=["bottom","top"];function Tr(e,t,n){switch(e){case"top":case"bottom":return n?t?Ct:Mt:t?Mt:Ct;case"left":case"right":return t?Or:Lr;default:return[]}}function zr(e,t,n,r){const o=he(e);let i=Tr(ne(e),n==="start",r);return o&&(i=i.map(a=>a+"-"+o),t&&(i=i.concat(i.map(Be)))),i}function Re(e){return e.replace(/left|right|bottom|top/g,t=>Ar[t])}function Dr(e){return k({top:0,right:0,bottom:0,left:0},e)}function Jt(e){return typeof e!="number"?Dr(e):{top:e,right:e,bottom:e,left:e}}function Oe(e){const{x:t,y:n,width:r,height:o}=e;return{width:r,height:o,top:n,left:t,right:t+r,bottom:n+o,x:t,y:n}}function At(e,t,n){let{reference:r,floating:o}=e;const i=K(t),a=Je(t),s=Ke(a),c=ne(t),l=i==="y",f=r.x+r.width/2-o.width/2,d=r.y+r.height/2-o.height/2,y=r[s]/2-o[s]/2;let p;switch(c){case"top":p={x:f,y:r.y-o.height};break;case"bottom":p={x:f,y:r.y+r.height};break;case"right":p={x:r.x+r.width,y:d};break;case"left":p={x:r.x-o.width,y:d};break;default:p={x:r.x,y:r.y}}switch(he(t)){case"start":p[a]-=y*(n&&l?-1:1);break;case"end":p[a]+=y*(n&&l?-1:1);break}return p}const _r=(e,t,n)=>Y(void 0,null,function*(){const{placement:r="bottom",strategy:o="absolute",middleware:i=[],platform:a}=n,s=i.filter(Boolean),c=yield a.isRTL==null?void 0:a.isRTL(t);let l=yield a.getElementRects({reference:e,floating:t,strategy:o}),{x:f,y:d}=At(l,r,c),y=r,p={},g=0;for(let m=0;m<s.length;m++){const{name:v,fn:x}=s[m],{x:b,y:M,data:w,reset:C}=yield x({x:f,y:d,initialPlacement:r,placement:y,strategy:o,middlewareData:p,rects:l,platform:a,elements:{reference:e,floating:t}});f=b!=null?b:f,d=M!=null?M:d,p=A(k({},p),{[v]:k(k({},p[v]),w)}),C&&g<=50&&(g++,typeof C=="object"&&(C.placement&&(y=C.placement),C.rects&&(l=C.rects===!0?yield a.getElementRects({reference:e,floating:t,strategy:o}):C.rects),{x:f,y:d}=At(l,y,c)),m=-1)}return{x:f,y:d,placement:y,strategy:o,middlewareData:p}});function me(e,t){return Y(this,null,function*(){var n;t===void 0&&(t={});const{x:r,y:o,platform:i,rects:a,elements:s,strategy:c}=e,{boundary:l="clippingAncestors",rootBoundary:f="viewport",elementContext:d="floating",altBoundary:y=!1,padding:p=0}=te(t,e),g=Jt(p),v=s[y?d==="floating"?"reference":"floating":d],x=Oe(yield i.getClippingRect({element:(n=yield i.isElement==null?void 0:i.isElement(v))==null||n?v:v.contextElement||(yield i.getDocumentElement==null?void 0:i.getDocumentElement(s.floating)),boundary:l,rootBoundary:f,strategy:c})),b=d==="floating"?{x:r,y:o,width:a.floating.width,height:a.floating.height}:a.reference,M=yield i.getOffsetParent==null?void 0:i.getOffsetParent(s.floating),w=(yield i.isElement==null?void 0:i.isElement(M))?(yield i.getScale==null?void 0:i.getScale(M))||{x:1,y:1}:{x:1,y:1},C=Oe(i.convertOffsetParentRelativeRectToViewportRelativeRect?yield i.convertOffsetParentRelativeRectToViewportRelativeRect({elements:s,rect:b,offsetParent:M,strategy:c}):b);return{top:(x.top-C.top+g.top)/w.y,bottom:(C.bottom-x.bottom+g.bottom)/w.y,left:(x.left-C.left+g.left)/w.x,right:(C.right-x.right+g.right)/w.x}})}const Nr=e=>({name:"arrow",options:e,fn(n){return Y(this,null,function*(){const{x:r,y:o,placement:i,rects:a,platform:s,elements:c,middlewareData:l}=n,{element:f,padding:d=0}=te(e,n)||{};if(f==null)return{};const y=Jt(d),p={x:r,y:o},g=Je(i),m=Ke(g),v=yield s.getDimensions(f),x=g==="y",b=x?"top":"left",M=x?"bottom":"right",w=x?"clientHeight":"clientWidth",C=a.reference[m]+a.reference[g]-p[g]-a.floating[m],P=p[g]-a.reference[g],O=yield s.getOffsetParent==null?void 0:s.getOffsetParent(f);let L=O?O[w]:0;(!L||!(yield s.isElement==null?void 0:s.isElement(O)))&&(L=c.floating[w]||a.floating[m]);const E=C/2-P/2,z=L/2-v[m]/2-1,T=oe(y[b],z),q=oe(y[M],z),D=T,B=L-v[m]-q,H=L/2-v[m]/2+E,_=Fe(D,H,B),$=!l.arrow&&he(i)!=null&&H!==_&&a.reference[m]/2-(H<D?T:q)-v[m]/2<0,R=$?H<D?H-D:H-B:0;return{[g]:p[g]+R,data:k({[g]:_,centerOffset:H-_-R},$&&{alignmentOffset:R}),reset:$}})}}),jr=function(e){return e===void 0&&(e={}),{name:"flip",options:e,fn(n){return Y(this,null,function*(){var r,o;const{placement:i,middlewareData:a,rects:s,initialPlacement:c,platform:l,elements:f}=n,H=te(e,n),{mainAxis:d=!0,crossAxis:y=!0,fallbackPlacements:p,fallbackStrategy:g="bestFit",fallbackAxisSideDirection:m="none",flipAlignment:v=!0}=H,x=V(H,["mainAxis","crossAxis","fallbackPlacements","fallbackStrategy","fallbackAxisSideDirection","flipAlignment"]);if((r=a.arrow)!=null&&r.alignmentOffset)return{};const b=ne(i),M=K(c),w=ne(c)===c,C=yield l.isRTL==null?void 0:l.isRTL(f.floating),P=p||(w||!v?[Re(c)]:Rr(c)),O=m!=="none";!p&&O&&P.push(...zr(c,v,m,C));const L=[c,...P],E=yield me(n,x),z=[];let T=((o=a.flip)==null?void 0:o.overflows)||[];if(d&&z.push(E[b]),y){const _=Er(i,s,C);z.push(E[_[0]],E[_[1]])}if(T=[...T,{placement:i,overflows:z}],!z.every(_=>_<=0)){var q,D;const _=(((q=a.flip)==null?void 0:q.index)||0)+1,$=L[_];if($&&(!(y==="alignment"?M!==K($):!1)||T.every(j=>j.overflows[0]>0&&K(j.placement)===M)))return{data:{index:_,overflows:T},reset:{placement:$}};let R=(D=T.filter(I=>I.overflows[0]<=0).sort((I,j)=>I.overflows[1]-j.overflows[1])[0])==null?void 0:D.placement;if(!R)switch(g){case"bestFit":{var B;const I=(B=T.filter(j=>{if(O){const W=K(j.placement);return W===M||W==="y"}return!0}).map(j=>[j.placement,j.overflows.filter(W=>W>0).reduce((W,Ne)=>W+Ne,0)]).sort((j,W)=>j[1]-W[1])[0])==null?void 0:B[0];I&&(R=I);break}case"initialPlacement":R=c;break}if(i!==R)return{reset:{placement:R}}}return{}})}}};function St(e,t){return{top:e.top-t.height,right:e.right-t.width,bottom:e.bottom-t.height,left:e.left-t.width}}function Pt(e){return Cr.some(t=>e[t]>=0)}const Hr=function(e){return e===void 0&&(e={}),{name:"hide",options:e,fn(n){return Y(this,null,function*(){const{rects:r}=n,a=te(e,n),{strategy:o="referenceHidden"}=a,i=V(a,["strategy"]);switch(o){case"referenceHidden":{const s=yield me(n,A(k({},i),{elementContext:"reference"})),c=St(s,r.reference);return{data:{referenceHiddenOffsets:c,referenceHidden:Pt(c)}}}case"escaped":{const s=yield me(n,A(k({},i),{altBoundary:!0})),c=St(s,r.floating);return{data:{escapedOffsets:c,escaped:Pt(c)}}}default:return{}}})}}},Qt=new Set(["left","top"]);function Vr(e,t){return Y(this,null,function*(){const{placement:n,platform:r,elements:o}=e,i=yield r.isRTL==null?void 0:r.isRTL(o.floating),a=ne(n),s=he(n),c=K(n)==="y",l=Qt.has(a)?-1:1,f=i&&c?-1:1,d=te(t,e);let{mainAxis:y,crossAxis:p,alignmentAxis:g}=typeof d=="number"?{mainAxis:d,crossAxis:0,alignmentAxis:null}:{mainAxis:d.mainAxis||0,crossAxis:d.crossAxis||0,alignmentAxis:d.alignmentAxis};return s&&typeof g=="number"&&(p=s==="end"?g*-1:g),c?{x:p*f,y:y*l}:{x:y*l,y:p*f}})}const qr=function(e){return e===void 0&&(e=0),{name:"offset",options:e,fn(n){return Y(this,null,function*(){var r,o;const{x:i,y:a,placement:s,middlewareData:c}=n,l=yield Vr(n,e);return s===((r=c.offset)==null?void 0:r.placement)&&(o=c.arrow)!=null&&o.alignmentOffset?{}:{x:i+l.x,y:a+l.y,data:A(k({},l),{placement:s})}})}}},$r=function(e){return e===void 0&&(e={}),{name:"shift",options:e,fn(n){return Y(this,null,function*(){const{x:r,y:o,placement:i}=n,x=te(e,n),{mainAxis:a=!0,crossAxis:s=!1,limiter:c={fn:b=>{let{x:M,y:w}=b;return{x:M,y:w}}}}=x,l=V(x,["mainAxis","crossAxis","limiter"]),f={x:r,y:o},d=yield me(n,l),y=K(ne(i)),p=Ge(y);let g=f[p],m=f[y];if(a){const b=p==="y"?"top":"left",M=p==="y"?"bottom":"right",w=g+d[b],C=g-d[M];g=Fe(w,g,C)}if(s){const b=y==="y"?"top":"left",M=y==="y"?"bottom":"right",w=m+d[b],C=m-d[M];m=Fe(w,m,C)}const v=c.fn(A(k({},n),{[p]:g,[y]:m}));return A(k({},v),{data:{x:v.x-r,y:v.y-o,enabled:{[p]:a,[y]:s}}})})}}},Ir=function(e){return e===void 0&&(e={}),{options:e,fn(t){const{x:n,y:r,placement:o,rects:i,middlewareData:a}=t,{offset:s=0,mainAxis:c=!0,crossAxis:l=!0}=te(e,t),f={x:n,y:r},d=K(o),y=Ge(d);let p=f[y],g=f[d];const m=te(s,t),v=typeof m=="number"?{mainAxis:m,crossAxis:0}:k({mainAxis:0,crossAxis:0},m);if(c){const M=y==="y"?"height":"width",w=i.reference[y]-i.floating[M]+v.mainAxis,C=i.reference[y]+i.reference[M]-v.mainAxis;p<w?p=w:p>C&&(p=C)}if(l){var x,b;const M=y==="y"?"width":"height",w=Qt.has(ne(o)),C=i.reference[d]-i.floating[M]+(w&&((x=a.offset)==null?void 0:x[d])||0)+(w?0:v.crossAxis),P=i.reference[d]+i.reference[M]+(w?0:((b=a.offset)==null?void 0:b[d])||0)-(w?v.crossAxis:0);g<C?g=C:g>P&&(g=P)}return{[y]:p,[d]:g}}}},Fr=function(e){return e===void 0&&(e={}),{name:"size",options:e,fn(n){return Y(this,null,function*(){var r,o;const{placement:i,rects:a,platform:s,elements:c}=n,T=te(e,n),{apply:l=()=>{}}=T,f=V(T,["apply"]),d=yield me(n,f),y=ne(i),p=he(i),g=K(i)==="y",{width:m,height:v}=a.floating;let x,b;y==="top"||y==="bottom"?(x=y,b=p===((yield s.isRTL==null?void 0:s.isRTL(c.floating))?"start":"end")?"left":"right"):(b=y,x=p==="end"?"top":"bottom");const M=v-d.top-d.bottom,w=m-d.left-d.right,C=oe(v-d[x],M),P=oe(m-d[b],w),O=!n.middlewareData.shift;let L=C,E=P;if((r=n.middlewareData.shift)!=null&&r.enabled.x&&(E=w),(o=n.middlewareData.shift)!=null&&o.enabled.y&&(L=M),O&&!p){const q=U(d.left,0),D=U(d.right,0),B=U(d.top,0),H=U(d.bottom,0);g?E=m-2*(q!==0||D!==0?q+D:U(d.left,d.right)):L=v-2*(B!==0||H!==0?B+H:U(d.top,d.bottom))}yield l(A(k({},n),{availableWidth:E,availableHeight:L}));const z=yield s.getDimensions(c.floating);return m!==z.width||v!==z.height?{reset:{rects:!0}}:{}})}}};function ze(){return typeof window!="undefined"}function ye(e){return en(e)?(e.nodeName||"").toLowerCase():"#document"}function Z(e){var t;return(e==null||(t=e.ownerDocument)==null?void 0:t.defaultView)||window}function ee(e){var t;return(t=(en(e)?e.ownerDocument:e.document)||window.document)==null?void 0:t.documentElement}function en(e){return ze()?e instanceof Node||e instanceof Z(e).Node:!1}function X(e){return ze()?e instanceof Element||e instanceof Z(e).Element:!1}function Q(e){return ze()?e instanceof HTMLElement||e instanceof Z(e).HTMLElement:!1}function Et(e){return!ze()||typeof ShadowRoot=="undefined"?!1:e instanceof ShadowRoot||e instanceof Z(e).ShadowRoot}const Br=new Set(["inline","contents"]);function ve(e){const{overflow:t,overflowX:n,overflowY:r,display:o}=G(e);return/auto|scroll|overlay|hidden|clip/.test(t+r+n)&&!Br.has(o)}const Wr=new Set(["table","td","th"]);function Ur(e){return Wr.has(ye(e))}const Zr=[":popover-open",":modal"];function De(e){return Zr.some(t=>{try{return e.matches(t)}catch(n){return!1}})}const Yr=["transform","translate","scale","rotate","perspective"],Xr=["transform","translate","scale","rotate","perspective","filter"],Gr=["paint","layout","strict","content"];function Qe(e){const t=et(),n=X(e)?G(e):e;return Yr.some(r=>n[r]?n[r]!=="none":!1)||(n.containerType?n.containerType!=="normal":!1)||!t&&(n.backdropFilter?n.backdropFilter!=="none":!1)||!t&&(n.filter?n.filter!=="none":!1)||Xr.some(r=>(n.willChange||"").includes(r))||Gr.some(r=>(n.contain||"").includes(r))}function Kr(e){let t=ie(e);for(;Q(t)&&!fe(t);){if(Qe(t))return t;if(De(t))return null;t=ie(t)}return null}function et(){return typeof CSS=="undefined"||!CSS.supports?!1:CSS.supports("-webkit-backdrop-filter","none")}const Jr=new Set(["html","body","#document"]);function fe(e){return Jr.has(ye(e))}function G(e){return Z(e).getComputedStyle(e)}function _e(e){return X(e)?{scrollLeft:e.scrollLeft,scrollTop:e.scrollTop}:{scrollLeft:e.scrollX,scrollTop:e.scrollY}}function ie(e){if(ye(e)==="html")return e;const t=e.assignedSlot||e.parentNode||Et(e)&&e.host||ee(e);return Et(t)?t.host:t}function tn(e){const t=ie(e);return fe(t)?e.ownerDocument?e.ownerDocument.body:e.body:Q(t)&&ve(t)?t:tn(t)}function ge(e,t,n){var r;t===void 0&&(t=[]),n===void 0&&(n=!0);const o=tn(e),i=o===((r=e.ownerDocument)==null?void 0:r.body),a=Z(o);if(i){const s=We(a);return t.concat(a,a.visualViewport||[],ve(o)?o:[],s&&n?ge(s):[])}return t.concat(o,ge(o,[],n))}function We(e){return e.parent&&Object.getPrototypeOf(e.parent)?e.frameElement:null}function nn(e){const t=G(e);let n=parseFloat(t.width)||0,r=parseFloat(t.height)||0;const o=Q(e),i=o?e.offsetWidth:n,a=o?e.offsetHeight:r,s=Ee(n)!==i||Ee(r)!==a;return s&&(n=i,r=a),{width:n,height:r,$:s}}function tt(e){return X(e)?e:e.contextElement}function ue(e){const t=tt(e);if(!Q(t))return J(1);const n=t.getBoundingClientRect(),{width:r,height:o,$:i}=nn(t);let a=(i?Ee(n.width):n.width)/r,s=(i?Ee(n.height):n.height)/o;return(!a||!Number.isFinite(a))&&(a=1),(!s||!Number.isFinite(s))&&(s=1),{x:a,y:s}}const Qr=J(0);function rn(e){const t=Z(e);return!et()||!t.visualViewport?Qr:{x:t.visualViewport.offsetLeft,y:t.visualViewport.offsetTop}}function eo(e,t,n){return t===void 0&&(t=!1),!n||t&&n!==Z(e)?!1:t}function ce(e,t,n,r){t===void 0&&(t=!1),n===void 0&&(n=!1);const o=e.getBoundingClientRect(),i=tt(e);let a=J(1);t&&(r?X(r)&&(a=ue(r)):a=ue(e));const s=eo(i,n,r)?rn(i):J(0);let c=(o.left+s.x)/a.x,l=(o.top+s.y)/a.y,f=o.width/a.x,d=o.height/a.y;if(i){const y=Z(i),p=r&&X(r)?Z(r):r;let g=y,m=We(g);for(;m&&r&&p!==g;){const v=ue(m),x=m.getBoundingClientRect(),b=G(m),M=x.left+(m.clientLeft+parseFloat(b.paddingLeft))*v.x,w=x.top+(m.clientTop+parseFloat(b.paddingTop))*v.y;c*=v.x,l*=v.y,f*=v.x,d*=v.y,c+=M,l+=w,g=Z(m),m=We(g)}}return Oe({width:f,height:d,x:c,y:l})}function nt(e,t){const n=_e(e).scrollLeft;return t?t.left+n:ce(ee(e)).left+n}function on(e,t,n){n===void 0&&(n=!1);const r=e.getBoundingClientRect(),o=r.left+t.scrollLeft-(n?0:nt(e,r)),i=r.top+t.scrollTop;return{x:o,y:i}}function to(e){let{elements:t,rect:n,offsetParent:r,strategy:o}=e;const i=o==="fixed",a=ee(r),s=t?De(t.floating):!1;if(r===a||s&&i)return n;let c={scrollLeft:0,scrollTop:0},l=J(1);const f=J(0),d=Q(r);if((d||!d&&!i)&&((ye(r)!=="body"||ve(a))&&(c=_e(r)),Q(r))){const p=ce(r);l=ue(r),f.x=p.x+r.clientLeft,f.y=p.y+r.clientTop}const y=a&&!d&&!i?on(a,c,!0):J(0);return{width:n.width*l.x,height:n.height*l.y,x:n.x*l.x-c.scrollLeft*l.x+f.x+y.x,y:n.y*l.y-c.scrollTop*l.y+f.y+y.y}}function no(e){return Array.from(e.getClientRects())}function ro(e){const t=ee(e),n=_e(e),r=e.ownerDocument.body,o=U(t.scrollWidth,t.clientWidth,r.scrollWidth,r.clientWidth),i=U(t.scrollHeight,t.clientHeight,r.scrollHeight,r.clientHeight);let a=-n.scrollLeft+nt(e);const s=-n.scrollTop;return G(r).direction==="rtl"&&(a+=U(t.clientWidth,r.clientWidth)-o),{width:o,height:i,x:a,y:s}}function oo(e,t){const n=Z(e),r=ee(e),o=n.visualViewport;let i=r.clientWidth,a=r.clientHeight,s=0,c=0;if(o){i=o.width,a=o.height;const l=et();(!l||l&&t==="fixed")&&(s=o.offsetLeft,c=o.offsetTop)}return{width:i,height:a,x:s,y:c}}const io=new Set(["absolute","fixed"]);function ao(e,t){const n=ce(e,!0,t==="fixed"),r=n.top+e.clientTop,o=n.left+e.clientLeft,i=Q(e)?ue(e):J(1),a=e.clientWidth*i.x,s=e.clientHeight*i.y,c=o*i.x,l=r*i.y;return{width:a,height:s,x:c,y:l}}function Rt(e,t,n){let r;if(t==="viewport")r=oo(e,n);else if(t==="document")r=ro(ee(e));else if(X(t))r=ao(t,n);else{const o=rn(e);r={x:t.x-o.x,y:t.y-o.y,width:t.width,height:t.height}}return Oe(r)}function an(e,t){const n=ie(e);return n===t||!X(n)||fe(n)?!1:G(n).position==="fixed"||an(n,t)}function so(e,t){const n=t.get(e);if(n)return n;let r=ge(e,[],!1).filter(s=>X(s)&&ye(s)!=="body"),o=null;const i=G(e).position==="fixed";let a=i?ie(e):e;for(;X(a)&&!fe(a);){const s=G(a),c=Qe(a);!c&&s.position==="fixed"&&(o=null),(i?!c&&!o:!c&&s.position==="static"&&!!o&&io.has(o.position)||ve(a)&&!c&&an(e,a))?r=r.filter(f=>f!==a):o=s,a=ie(a)}return t.set(e,r),r}function co(e){let{element:t,boundary:n,rootBoundary:r,strategy:o}=e;const a=[...n==="clippingAncestors"?De(t)?[]:so(t,this._c):[].concat(n),r],s=a[0],c=a.reduce((l,f)=>{const d=Rt(t,f,o);return l.top=U(d.top,l.top),l.right=oe(d.right,l.right),l.bottom=oe(d.bottom,l.bottom),l.left=U(d.left,l.left),l},Rt(t,s,o));return{width:c.right-c.left,height:c.bottom-c.top,x:c.left,y:c.top}}function lo(e){const{width:t,height:n}=nn(e);return{width:t,height:n}}function uo(e,t,n){const r=Q(t),o=ee(t),i=n==="fixed",a=ce(e,!0,i,t);let s={scrollLeft:0,scrollTop:0};const c=J(0);function l(){c.x=nt(o)}if(r||!r&&!i)if((ye(t)!=="body"||ve(o))&&(s=_e(t)),r){const p=ce(t,!0,i,t);c.x=p.x+t.clientLeft,c.y=p.y+t.clientTop}else o&&l();i&&!r&&o&&l();const f=o&&!r&&!i?on(o,s):J(0),d=a.left+s.scrollLeft-c.x-f.x,y=a.top+s.scrollTop-c.y-f.y;return{x:d,y,width:a.width,height:a.height}}function Ve(e){return G(e).position==="static"}function Ot(e,t){if(!Q(e)||G(e).position==="fixed")return null;if(t)return t(e);let n=e.offsetParent;return ee(e)===n&&(n=n.ownerDocument.body),n}function sn(e,t){const n=Z(e);if(De(e))return n;if(!Q(e)){let o=ie(e);for(;o&&!fe(o);){if(X(o)&&!Ve(o))return o;o=ie(o)}return n}let r=Ot(e,t);for(;r&&Ur(r)&&Ve(r);)r=Ot(r,t);return r&&fe(r)&&Ve(r)&&!Qe(r)?n:r||Kr(e)||n}const fo=function(e){return Y(this,null,function*(){const t=this.getOffsetParent||sn,n=this.getDimensions,r=yield n(e.floating);return{reference:uo(e.reference,yield t(e.floating),e.strategy),floating:{x:0,y:0,width:r.width,height:r.height}}})};function ho(e){return G(e).direction==="rtl"}const yo={convertOffsetParentRelativeRectToViewportRelativeRect:to,getDocumentElement:ee,getClippingRect:co,getOffsetParent:sn,getElementRects:fo,getClientRects:no,getDimensions:lo,getScale:ue,isElement:X,isRTL:ho};function cn(e,t){return e.x===t.x&&e.y===t.y&&e.width===t.width&&e.height===t.height}function po(e,t){let n=null,r;const o=ee(e);function i(){var s;clearTimeout(r),(s=n)==null||s.disconnect(),n=null}function a(s,c){s===void 0&&(s=!1),c===void 0&&(c=1),i();const l=e.getBoundingClientRect(),{left:f,top:d,width:y,height:p}=l;if(s||t(),!y||!p)return;const g=Ce(d),m=Ce(o.clientWidth-(f+y)),v=Ce(o.clientHeight-(d+p)),x=Ce(f),M={rootMargin:-g+"px "+-m+"px "+-v+"px "+-x+"px",threshold:U(0,oe(1,c))||1};let w=!0;function C(P){const O=P[0].intersectionRatio;if(O!==c){if(!w)return a();O?a(!1,O):r=setTimeout(()=>{a(!1,1e-7)},1e3)}O===1&&!cn(l,e.getBoundingClientRect())&&a(),w=!1}try{n=new IntersectionObserver(C,A(k({},M),{root:o.ownerDocument}))}catch(P){n=new IntersectionObserver(C,M)}n.observe(e)}return a(!0),i}function mo(e,t,n,r){r===void 0&&(r={});const{ancestorScroll:o=!0,ancestorResize:i=!0,elementResize:a=typeof ResizeObserver=="function",layoutShift:s=typeof IntersectionObserver=="function",animationFrame:c=!1}=r,l=tt(e),f=o||i?[...l?ge(l):[],...ge(t)]:[];f.forEach(x=>{o&&x.addEventListener("scroll",n,{passive:!0}),i&&x.addEventListener("resize",n)});const d=l&&s?po(l,n):null;let y=-1,p=null;a&&(p=new ResizeObserver(x=>{let[b]=x;b&&b.target===l&&p&&(p.unobserve(t),cancelAnimationFrame(y),y=requestAnimationFrame(()=>{var M;(M=p)==null||M.observe(t)})),n()}),l&&!c&&p.observe(l),p.observe(t));let g,m=c?ce(e):null;c&&v();function v(){const x=ce(e);m&&!cn(m,x)&&n(),m=x,g=requestAnimationFrame(v)}return n(),()=>{var x;f.forEach(b=>{o&&b.removeEventListener("scroll",n),i&&b.removeEventListener("resize",n)}),d==null||d(),(x=p)==null||x.disconnect(),p=null,c&&cancelAnimationFrame(g)}}const go=qr,ko=$r,vo=jr,xo=Fr,wo=Hr,Lt=Nr,bo=Ir,Mo=(e,t,n)=>{const r=new Map,o=k({platform:yo},n),i=A(k({},o.platform),{_c:r});return _r(e,t,A(k({},o),{platform:i}))};var Co=typeof document!="undefined",Ao=function(){},Pe=Co?h.useLayoutEffect:Ao;function Le(e,t){if(e===t)return!0;if(typeof e!=typeof t)return!1;if(typeof e=="function"&&e.toString()===t.toString())return!0;let n,r,o;if(e&&t&&typeof e=="object"){if(Array.isArray(e)){if(n=e.length,n!==t.length)return!1;for(r=n;r--!==0;)if(!Le(e[r],t[r]))return!1;return!0}if(o=Object.keys(e),n=o.length,n!==Object.keys(t).length)return!1;for(r=n;r--!==0;)if(!{}.hasOwnProperty.call(t,o[r]))return!1;for(r=n;r--!==0;){const i=o[r];if(!(i==="_owner"&&e.$$typeof)&&!Le(e[i],t[i]))return!1}return!0}return e!==e&&t!==t}function ln(e){return typeof window=="undefined"?1:(e.ownerDocument.defaultView||window).devicePixelRatio||1}function Tt(e,t){const n=ln(e);return Math.round(t*n)/n}function qe(e){const t=h.useRef(e);return Pe(()=>{t.current=e}),t}function So(e){e===void 0&&(e={});const{placement:t="bottom",strategy:n="absolute",middleware:r=[],platform:o,elements:{reference:i,floating:a}={},transform:s=!0,whileElementsMounted:c,open:l}=e,[f,d]=h.useState({x:0,y:0,strategy:n,placement:t,middlewareData:{},isPositioned:!1}),[y,p]=h.useState(r);Le(y,r)||p(r);const[g,m]=h.useState(null),[v,x]=h.useState(null),b=h.useCallback(R=>{R!==P.current&&(P.current=R,m(R))},[]),M=h.useCallback(R=>{R!==O.current&&(O.current=R,x(R))},[]),w=i||g,C=a||v,P=h.useRef(null),O=h.useRef(null),L=h.useRef(f),E=c!=null,z=qe(c),T=qe(o),q=qe(l),D=h.useCallback(()=>{if(!P.current||!O.current)return;const R={placement:t,strategy:n,middleware:y};T.current&&(R.platform=T.current),Mo(P.current,O.current,R).then(I=>{const j=A(k({},I),{isPositioned:q.current!==!1});B.current&&!Le(L.current,j)&&(L.current=j,zt.flushSync(()=>{d(j)}))})},[y,t,n,T,q]);Pe(()=>{l===!1&&L.current.isPositioned&&(L.current.isPositioned=!1,d(R=>A(k({},R),{isPositioned:!1})))},[l]);const B=h.useRef(!1);Pe(()=>(B.current=!0,()=>{B.current=!1}),[]),Pe(()=>{if(w&&(P.current=w),C&&(O.current=C),w&&C){if(z.current)return z.current(w,C,D);D()}},[w,C,D,z,E]);const H=h.useMemo(()=>({reference:P,floating:O,setReference:b,setFloating:M}),[b,M]),_=h.useMemo(()=>({reference:w,floating:C}),[w,C]),$=h.useMemo(()=>{const R={position:n,left:0,top:0};if(!_.floating)return R;const I=Tt(_.floating,f.x),j=Tt(_.floating,f.y);return s?k(A(k({},R),{transform:"translate("+I+"px, "+j+"px)"}),ln(_.floating)>=1.5&&{willChange:"transform"}):{position:n,left:I,top:j}},[n,s,_.floating,f.x,f.y]);return h.useMemo(()=>A(k({},f),{update:D,refs:H,elements:_,floatingStyles:$}),[f,D,H,_,$])}const Po=e=>{function t(n){return{}.hasOwnProperty.call(n,"current")}return{name:"arrow",options:e,fn(n){const{element:r,padding:o}=typeof e=="function"?e(n):e;return r&&t(r)?r.current!=null?Lt({element:r.current,padding:o}).fn(n):{}:r?Lt({element:r,padding:o}).fn(n):{}}}},Eo=(e,t)=>A(k({},go(e)),{options:[e,t]}),Ro=(e,t)=>A(k({},ko(e)),{options:[e,t]}),Oo=(e,t)=>A(k({},bo(e)),{options:[e,t]}),Lo=(e,t)=>A(k({},vo(e)),{options:[e,t]}),To=(e,t)=>A(k({},xo(e)),{options:[e,t]}),zo=(e,t)=>A(k({},wo(e)),{options:[e,t]}),Do=(e,t)=>A(k({},Po(e)),{options:[e,t]});var _o="Arrow",un=h.forwardRef((e,t)=>{const a=e,{children:n,width:r=10,height:o=5}=a,i=V(a,["children","width","height"]);return N.jsx(le.svg,A(k({},i),{ref:t,width:r,height:o,viewBox:"0 0 30 10",preserveAspectRatio:"none",children:e.asChild?n:N.jsx("polygon",{points:"0,0 30,0 15,10"})}))});un.displayName=_o;var No=un;function jo(e){const[t,n]=h.useState(void 0);return se(()=>{if(e){n({width:e.offsetWidth,height:e.offsetHeight});const r=new ResizeObserver(o=>{if(!Array.isArray(o)||!o.length)return;const i=o[0];let a,s;if("borderBoxSize"in i){const c=i.borderBoxSize,l=Array.isArray(c)?c[0]:c;a=l.inlineSize,s=l.blockSize}else a=e.offsetWidth,s=e.offsetHeight;n({width:a,height:s})});return r.observe(e,{box:"border-box"}),()=>r.unobserve(e)}else n(void 0)},[e]),t}var fn="Popper",[dn,Rs]=Bt(fn),[Os,hn]=dn(fn),yn="PopperAnchor",pn=h.forwardRef((e,t)=>{const c=e,{__scopePopper:n,virtualRef:r}=c,o=V(c,["__scopePopper","virtualRef"]),i=hn(yn,n),a=h.useRef(null),s=ae(t,a);return h.useEffect(()=>{i.onAnchorChange((r==null?void 0:r.current)||a.current)}),r?null:N.jsx(le.div,A(k({},o),{ref:s}))});pn.displayName=yn;var rt="PopperContent",[Ho,Vo]=dn(rt),mn=h.forwardRef((e,t)=>{var it,at,st,ct,lt,ut,ft,dt;const ot=e,{__scopePopper:n,side:r="bottom",sideOffset:o=0,align:i="center",alignOffset:a=0,arrowPadding:s=0,avoidCollisions:c=!0,collisionBoundary:l=[],collisionPadding:f=0,sticky:d="partial",hideWhenDetached:y=!1,updatePositionStrategy:p="optimized",onPlaced:g}=ot,m=V(ot,["__scopePopper","side","sideOffset","align","alignOffset","arrowPadding","avoidCollisions","collisionBoundary","collisionPadding","sticky","hideWhenDetached","updatePositionStrategy","onPlaced"]),v=hn(rt,n),[x,b]=h.useState(null),M=ae(t,pe=>b(pe)),[w,C]=h.useState(null),P=jo(w),O=(it=P==null?void 0:P.width)!=null?it:0,L=(at=P==null?void 0:P.height)!=null?at:0,E=r+(i!=="center"?"-"+i:""),z=typeof f=="number"?f:k({top:0,right:0,bottom:0,left:0},f),T=Array.isArray(l)?l:[l],q=T.length>0,D={padding:z,boundary:T.filter($o),altBoundary:q},{refs:B,floatingStyles:H,placement:_,isPositioned:$,middlewareData:R}=So({strategy:"fixed",placement:E,whileElementsMounted:(...pe)=>mo(...pe,{animationFrame:p==="always"}),elements:{reference:v.anchor},middleware:[Eo({mainAxis:o+L,alignmentAxis:a}),c&&Ro(k({mainAxis:!0,crossAxis:!1,limiter:d==="partial"?Oo():void 0},D)),c&&Lo(k({},D)),To(A(k({},D),{apply:({elements:pe,rects:ht,availableWidth:Cn,availableHeight:An})=>{const{width:Sn,height:Pn}=ht.reference,xe=pe.floating.style;xe.setProperty("--radix-popper-available-width",`${Cn}px`),xe.setProperty("--radix-popper-available-height",`${An}px`),xe.setProperty("--radix-popper-anchor-width",`${Sn}px`),xe.setProperty("--radix-popper-anchor-height",`${Pn}px`)}})),w&&Do({element:w,padding:s}),Io({arrowWidth:O,arrowHeight:L}),y&&zo(k({strategy:"referenceHidden"},D))]}),[I,j]=vn(_),W=Te(g);se(()=>{$&&(W==null||W())},[$,W]);const Ne=(st=R.arrow)==null?void 0:st.x,xn=(ct=R.arrow)==null?void 0:ct.y,wn=((lt=R.arrow)==null?void 0:lt.centerOffset)!==0,[bn,Mn]=h.useState();return se(()=>{x&&Mn(window.getComputedStyle(x).zIndex)},[x]),N.jsx("div",{ref:B.setFloating,"data-radix-popper-content-wrapper":"",style:k(A(k({},H),{transform:$?H.transform:"translate(0, -200%)",minWidth:"max-content",zIndex:bn,"--radix-popper-transform-origin":[(ut=R.transformOrigin)==null?void 0:ut.x,(ft=R.transformOrigin)==null?void 0:ft.y].join(" ")}),((dt=R.hide)==null?void 0:dt.referenceHidden)&&{visibility:"hidden",pointerEvents:"none"}),dir:e.dir,children:N.jsx(Ho,{scope:n,placedSide:I,onArrowChange:C,arrowX:Ne,arrowY:xn,shouldHideArrow:wn,children:N.jsx(le.div,A(k({"data-side":I,"data-align":j},m),{ref:M,style:A(k({},m.style),{animation:$?void 0:"none"})}))})})});mn.displayName=rt;var gn="PopperArrow",qo={top:"bottom",right:"left",bottom:"top",left:"right"},kn=h.forwardRef(function(t,n){const s=t,{__scopePopper:r}=s,o=V(s,["__scopePopper"]),i=Vo(gn,r),a=qo[i.placedSide];return N.jsx("span",{ref:i.onArrowChange,style:{position:"absolute",left:i.arrowX,top:i.arrowY,[a]:0,transformOrigin:{top:"",right:"0 0",bottom:"center 0",left:"100% 0"}[i.placedSide],transform:{top:"translateY(100%)",right:"translateY(50%) rotate(90deg) translateX(-50%)",bottom:"rotate(180deg)",left:"translateY(50%) rotate(-90deg) translateX(50%)"}[i.placedSide],visibility:i.shouldHideArrow?"hidden":void 0},children:N.jsx(No,A(k({},o),{ref:n,style:A(k({},o.style),{display:"block"})}))})});kn.displayName=gn;function $o(e){return e!==null}var Io=e=>({name:"transformOrigin",options:e,fn(t){var v,x,b,M,w;const{placement:n,rects:r,middlewareData:o}=t,a=((v=o.arrow)==null?void 0:v.centerOffset)!==0,s=a?0:e.arrowWidth,c=a?0:e.arrowHeight,[l,f]=vn(n),d={start:"0%",center:"50%",end:"100%"}[f],y=((b=(x=o.arrow)==null?void 0:x.x)!=null?b:0)+s/2,p=((w=(M=o.arrow)==null?void 0:M.y)!=null?w:0)+c/2;let g="",m="";return l==="bottom"?(g=a?d:`${y}px`,m=`${-c}px`):l==="top"?(g=a?d:`${y}px`,m=`${r.floating.height+c}px`):l==="right"?(g=`${-c}px`,m=a?d:`${p}px`):l==="left"&&(g=`${r.floating.width+c}px`,m=a?d:`${p}px`),{data:{x:g,y:m}}}});function vn(e){const[t,n="center"]=e.split("-");return[t,n]}var Ls=pn,Ts=mn,zs=kn;export{ii as $,Ls as A,Ko as B,Ts as C,Zt as D,Vi as E,Ri as F,Sa as G,ta as H,oa as I,gs as J,Ii as K,Xi as L,pa as M,Za as N,fi as O,le as P,ps as Q,Xn as R,ns as S,ms as T,ja as U,Gt as V,Ss as W,Ps as X,ai as Y,ji as Z,Fa as _,Zo as a,za as a$,Bi as a0,yi as a1,sa as a2,Ga as a3,ts as a4,$i as a5,ei as a6,hi as a7,$a as a8,Oa as a9,Mi as aA,Fi as aB,as as aC,Ua as aD,Hi as aE,Ka as aF,Ei as aG,os as aH,Ma as aI,Es as aJ,Si as aK,ea as aL,Oi as aM,cs as aN,Ya as aO,di as aP,ua as aQ,xs as aR,la as aS,ia as aT,fa as aU,zi as aV,Pa as aW,rs as aX,Ja as aY,ls as aZ,Ha as a_,ya as aa,va as ab,ka as ac,si as ad,Na as ae,Ms as af,es as ag,ws as ah,Gi as ai,da as aj,Ti as ak,Ni as al,Ia as am,oi as an,Pi as ao,ha as ap,Ba as aq,xi as ar,qi as as,Va as at,hs as au,Ci as av,ti as aw,ca as ax,bi as ay,vi as az,Jo as b,_a as b0,Ta as b1,Cs as b2,Ra as b3,La as b4,bs as b5,xa as b6,wa as b7,Da as b8,ss as b9,Wa as bA,us as bB,Aa as bC,aa as bD,pi as bE,ys as bF,ba as bG,is as bH,Ui as bI,fs as bJ,li as ba,ui as bb,ri as bc,ds as bd,ni as be,Qi as bf,_i as bg,ra as bh,Di as bi,Yi as bj,Zi as bk,Xa as bl,na as bm,Wi as bn,ks as bo,Ji as bp,As as bq,qa as br,ga as bs,Ki as bt,Li as bu,vs as bv,Ea as bw,Qa as bx,Ca as by,wi as bz,Uo as c,hr as d,He as e,Te as f,zn as g,Xo as h,Go as i,Bt as j,fr as k,se as l,nr as m,re as n,Qo as o,Rs as p,Yo as q,h as r,zs as s,ci as t,ae as u,ki as v,gi as w,ma as x,Ai as y,mi as z};

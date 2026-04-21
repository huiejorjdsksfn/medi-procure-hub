var Pn=Object.defineProperty,On=Object.defineProperties;var Ln=Object.getOwnPropertyDescriptors;var we=Object.getOwnPropertySymbols;var mt=Object.prototype.hasOwnProperty,gt=Object.prototype.propertyIsEnumerable;var pt=(e,t,n)=>t in e?Pn(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,v=(e,t)=>{for(var n in t||(t={}))mt.call(t,n)&&pt(e,n,t[n]);if(we)for(var n of we(t))gt.call(t,n)&&pt(e,n,t[n]);return e},R=(e,t)=>On(e,Ln(t));var H=(e,t)=>{var n={};for(var r in e)mt.call(e,r)&&t.indexOf(r)<0&&(n[r]=e[r]);if(e!=null&&we)for(var r of we(e))t.indexOf(r)<0&&gt.call(e,r)&&(n[r]=e[r]);return n};var Z=(e,t,n)=>new Promise((r,o)=>{var i=c=>{try{a(n.next(c))}catch(l){o(l)}},s=c=>{try{a(n.throw(c))}catch(l){o(l)}},a=c=>c.done?r(c.value):Promise.resolve(c.value).then(i,s);a((n=n.apply(e,t)).next())});import{j as N}from"./tanstack-CEWsSzLU.js";import{r as Nt,v as Tn}from"./react-vendor-DFFHBfAu.js";function _n(e,t){for(var n=0;n<t.length;n++){const r=t[n];if(typeof r!="string"&&!Array.isArray(r)){for(const o in r)if(o!=="default"&&!(o in e)){const i=Object.getOwnPropertyDescriptor(r,o);i&&Object.defineProperty(e,o,i.get?i:{enumerable:!0,get:()=>r[o]})}}}return Object.freeze(Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}))}var Zo=typeof globalThis!="undefined"?globalThis:typeof window!="undefined"?window:typeof global!="undefined"?global:typeof self!="undefined"?self:{};function Dn(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}function Yo(e){if(e.__esModule)return e;var t=e.default;if(typeof t=="function"){var n=function r(){return this instanceof r?Reflect.construct(t,arguments,this.constructor):t.apply(this,arguments)};n.prototype=t.prototype}else n={};return Object.defineProperty(n,"__esModule",{value:!0}),Object.keys(e).forEach(function(r){var o=Object.getOwnPropertyDescriptor(e,r);Object.defineProperty(n,r,o.get?o:{enumerable:!0,get:function(){return e[r]}})}),n}var zt={exports:{}},S={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var ke=Symbol.for("react.element"),jn=Symbol.for("react.portal"),Nn=Symbol.for("react.fragment"),zn=Symbol.for("react.strict_mode"),Hn=Symbol.for("react.profiler"),$n=Symbol.for("react.provider"),Vn=Symbol.for("react.context"),qn=Symbol.for("react.forward_ref"),In=Symbol.for("react.suspense"),Fn=Symbol.for("react.memo"),Wn=Symbol.for("react.lazy"),kt=Symbol.iterator;function Bn(e){return e===null||typeof e!="object"?null:(e=kt&&e[kt]||e["@@iterator"],typeof e=="function"?e:null)}var Ht={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},$t=Object.assign,Vt={};function he(e,t,n){this.props=e,this.context=t,this.refs=Vt,this.updater=n||Ht}he.prototype.isReactComponent={};he.prototype.setState=function(e,t){if(typeof e!="object"&&typeof e!="function"&&e!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,e,t,"setState")};he.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")};function qt(){}qt.prototype=he.prototype;function Xe(e,t,n){this.props=e,this.context=t,this.refs=Vt,this.updater=n||Ht}var Ze=Xe.prototype=new qt;Ze.constructor=Xe;$t(Ze,he.prototype);Ze.isPureReactComponent=!0;var vt=Array.isArray,It=Object.prototype.hasOwnProperty,Ye={current:null},Ft={key:!0,ref:!0,__self:!0,__source:!0};function Wt(e,t,n){var r,o={},i=null,s=null;if(t!=null)for(r in t.ref!==void 0&&(s=t.ref),t.key!==void 0&&(i=""+t.key),t)It.call(t,r)&&!Ft.hasOwnProperty(r)&&(o[r]=t[r]);var a=arguments.length-2;if(a===1)o.children=n;else if(1<a){for(var c=Array(a),l=0;l<a;l++)c[l]=arguments[l+2];o.children=c}if(e&&e.defaultProps)for(r in a=e.defaultProps,a)o[r]===void 0&&(o[r]=a[r]);return{$$typeof:ke,type:e,key:i,ref:s,props:o,_owner:Ye.current}}function Un(e,t){return{$$typeof:ke,type:e.type,key:t,ref:e.ref,props:e.props,_owner:e._owner}}function Ke(e){return typeof e=="object"&&e!==null&&e.$$typeof===ke}function Xn(e){var t={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,function(n){return t[n]})}var xt=/\/+/g;function He(e,t){return typeof e=="object"&&e!==null&&e.key!=null?Xn(""+e.key):t.toString(36)}function Ae(e,t,n,r,o){var i=typeof e;(i==="undefined"||i==="boolean")&&(e=null);var s=!1;if(e===null)s=!0;else switch(i){case"string":case"number":s=!0;break;case"object":switch(e.$$typeof){case ke:case jn:s=!0}}if(s)return s=e,o=o(s),e=r===""?"."+He(s,0):r,vt(o)?(n="",e!=null&&(n=e.replace(xt,"$&/")+"/"),Ae(o,t,n,"",function(l){return l})):o!=null&&(Ke(o)&&(o=Un(o,n+(!o.key||s&&s.key===o.key?"":(""+o.key).replace(xt,"$&/")+"/")+e)),t.push(o)),1;if(s=0,r=r===""?".":r+":",vt(e))for(var a=0;a<e.length;a++){i=e[a];var c=r+He(i,a);s+=Ae(i,t,n,c,o)}else if(c=Bn(e),typeof c=="function")for(e=c.call(e),a=0;!(i=e.next()).done;)i=i.value,c=r+He(i,a++),s+=Ae(i,t,n,c,o);else if(i==="object")throw t=String(e),Error("Objects are not valid as a React child (found: "+(t==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":t)+"). If you meant to render a collection of children, use an array instead.");return s}function be(e,t,n){if(e==null)return e;var r=[],o=0;return Ae(e,r,"","",function(i){return t.call(n,i,o++)}),r}function Zn(e){if(e._status===-1){var t=e._result;t=t(),t.then(function(n){(e._status===0||e._status===-1)&&(e._status=1,e._result=n)},function(n){(e._status===0||e._status===-1)&&(e._status=2,e._result=n)}),e._status===-1&&(e._status=0,e._result=t)}if(e._status===1)return e._result.default;throw e._result}var F={current:null},Se={transition:null},Yn={ReactCurrentDispatcher:F,ReactCurrentBatchConfig:Se,ReactCurrentOwner:Ye};function Bt(){throw Error("act(...) is not supported in production builds of React.")}S.Children={map:be,forEach:function(e,t,n){be(e,function(){t.apply(this,arguments)},n)},count:function(e){var t=0;return be(e,function(){t++}),t},toArray:function(e){return be(e,function(t){return t})||[]},only:function(e){if(!Ke(e))throw Error("React.Children.only expected to receive a single React element child.");return e}};S.Component=he;S.Fragment=Nn;S.Profiler=Hn;S.PureComponent=Xe;S.StrictMode=zn;S.Suspense=In;S.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Yn;S.act=Bt;S.cloneElement=function(e,t,n){if(e==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+e+".");var r=$t({},e.props),o=e.key,i=e.ref,s=e._owner;if(t!=null){if(t.ref!==void 0&&(i=t.ref,s=Ye.current),t.key!==void 0&&(o=""+t.key),e.type&&e.type.defaultProps)var a=e.type.defaultProps;for(c in t)It.call(t,c)&&!Ft.hasOwnProperty(c)&&(r[c]=t[c]===void 0&&a!==void 0?a[c]:t[c])}var c=arguments.length-2;if(c===1)r.children=n;else if(1<c){a=Array(c);for(var l=0;l<c;l++)a[l]=arguments[l+2];r.children=a}return{$$typeof:ke,type:e.type,key:o,ref:i,props:r,_owner:s}};S.createContext=function(e){return e={$$typeof:Vn,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},e.Provider={$$typeof:$n,_context:e},e.Consumer=e};S.createElement=Wt;S.createFactory=function(e){var t=Wt.bind(null,e);return t.type=e,t};S.createRef=function(){return{current:null}};S.forwardRef=function(e){return{$$typeof:qn,render:e}};S.isValidElement=Ke;S.lazy=function(e){return{$$typeof:Wn,_payload:{_status:-1,_result:e},_init:Zn}};S.memo=function(e,t){return{$$typeof:Fn,type:e,compare:t===void 0?null:t}};S.startTransition=function(e){var t=Se.transition;Se.transition={};try{e()}finally{Se.transition=t}};S.unstable_act=Bt;S.useCallback=function(e,t){return F.current.useCallback(e,t)};S.useContext=function(e){return F.current.useContext(e)};S.useDebugValue=function(){};S.useDeferredValue=function(e){return F.current.useDeferredValue(e)};S.useEffect=function(e,t){return F.current.useEffect(e,t)};S.useId=function(){return F.current.useId()};S.useImperativeHandle=function(e,t,n){return F.current.useImperativeHandle(e,t,n)};S.useInsertionEffect=function(e,t){return F.current.useInsertionEffect(e,t)};S.useLayoutEffect=function(e,t){return F.current.useLayoutEffect(e,t)};S.useMemo=function(e,t){return F.current.useMemo(e,t)};S.useReducer=function(e,t,n){return F.current.useReducer(e,t,n)};S.useRef=function(e){return F.current.useRef(e)};S.useState=function(e){return F.current.useState(e)};S.useSyncExternalStore=function(e,t,n){return F.current.useSyncExternalStore(e,t,n)};S.useTransition=function(){return F.current.useTransition()};S.version="18.3.1";zt.exports=S;var d=zt.exports;const re=Dn(d),Kn=_n({__proto__:null,default:re},[d]);function $e(e,t,{checkForDefaultPrevented:n=!0}={}){return function(o){if(e==null||e(o),n===!1||!o.defaultPrevented)return t==null?void 0:t(o)}}function wt(e,t){if(typeof e=="function")return e(t);e!=null&&(e.current=t)}function Ge(...e){return t=>{let n=!1;const r=e.map(o=>{const i=wt(o,t);return!n&&typeof i=="function"&&(n=!0),i});if(n)return()=>{for(let o=0;o<r.length;o++){const i=r[o];typeof i=="function"?i():wt(e[o],null)}}}}function ae(...e){return d.useCallback(Ge(...e),e)}function Ut(e,t=[]){let n=[];function r(i,s){const a=d.createContext(s),c=n.length;n=[...n,s];const l=h=>{var M;const x=h,{scope:y,children:p}=x,m=H(x,["scope","children"]),g=((M=y==null?void 0:y[e])==null?void 0:M[c])||a,k=d.useMemo(()=>m,Object.values(m));return N.jsx(g.Provider,{value:k,children:p})};l.displayName=i+"Provider";function f(h,y){var g;const p=((g=y==null?void 0:y[e])==null?void 0:g[c])||a,m=d.useContext(p);if(m)return m;if(s!==void 0)return s;throw new Error(`\`${h}\` must be used within \`${i}\``)}return[l,f]}const o=()=>{const i=n.map(s=>d.createContext(s));return function(a){const c=(a==null?void 0:a[e])||i;return d.useMemo(()=>({[`__scope${e}`]:R(v({},a),{[e]:c})}),[a,c])}};return o.scopeName=e,[r,Gn(o,...t)]}function Gn(...e){const t=e[0];if(e.length===1)return t;const n=()=>{const r=e.map(o=>({useScope:o(),scopeName:o.scopeName}));return function(i){const s=r.reduce((a,{useScope:c,scopeName:l})=>{const h=c(i)[`__scope${l}`];return v(v({},a),h)},{});return d.useMemo(()=>({[`__scope${t.scopeName}`]:s}),[s])}};return n.scopeName=t.scopeName,n}function bt(e){const t=Jn(e),n=d.forwardRef((r,o)=>{const l=r,{children:i}=l,s=H(l,["children"]),a=d.Children.toArray(i),c=a.find(er);if(c){const f=c.props.children,h=a.map(y=>y===c?d.Children.count(f)>1?d.Children.only(null):d.isValidElement(f)?f.props.children:null:y);return N.jsx(t,R(v({},s),{ref:o,children:d.isValidElement(f)?d.cloneElement(f,void 0,h):null}))}return N.jsx(t,R(v({},s),{ref:o,children:i}))});return n.displayName=`${e}.Slot`,n}function Jn(e){const t=d.forwardRef((n,r)=>{const s=n,{children:o}=s,i=H(s,["children"]);if(d.isValidElement(o)){const a=nr(o),c=tr(i,o.props);return o.type!==d.Fragment&&(c.ref=r?Ge(r,a):a),d.cloneElement(o,c)}return d.Children.count(o)>1?d.Children.only(null):null});return t.displayName=`${e}.SlotClone`,t}var Qn=Symbol("radix.slottable");function er(e){return d.isValidElement(e)&&typeof e.type=="function"&&"__radixId"in e.type&&e.type.__radixId===Qn}function tr(e,t){const n=v({},t);for(const r in t){const o=e[r],i=t[r];/^on[A-Z]/.test(r)?o&&i?n[r]=(...a)=>{const c=i(...a);return o(...a),c}:o&&(n[r]=o):r==="style"?n[r]=v(v({},o),i):r==="className"&&(n[r]=[o,i].filter(Boolean).join(" "))}return v(v({},e),n)}function nr(e){var r,o;let t=(r=Object.getOwnPropertyDescriptor(e.props,"ref"))==null?void 0:r.get,n=t&&"isReactWarning"in t&&t.isReactWarning;return n?e.ref:(t=(o=Object.getOwnPropertyDescriptor(e,"ref"))==null?void 0:o.get,n=t&&"isReactWarning"in t&&t.isReactWarning,n?e.props.ref:e.props.ref||e.ref)}function Ko(e){const t=e+"CollectionProvider",[n,r]=Ut(t),[o,i]=n(t,{collectionRef:{current:null},itemMap:new Map}),s=g=>{const{scope:k,children:x}=g,M=re.useRef(null),b=re.useRef(new Map).current;return N.jsx(o,{scope:k,itemMap:b,collectionRef:M,children:x})};s.displayName=t;const a=e+"CollectionSlot",c=bt(a),l=re.forwardRef((g,k)=>{const{scope:x,children:M}=g,b=i(a,x),w=ae(k,b.collectionRef);return N.jsx(c,{ref:w,children:M})});l.displayName=a;const f=e+"CollectionItemSlot",h="data-radix-collection-item",y=bt(f),p=re.forwardRef((g,k)=>{const O=g,{scope:x,children:M}=O,b=H(O,["scope","children"]),w=re.useRef(null),A=ae(k,w),C=i(f,x);return re.useEffect(()=>(C.itemMap.set(w,v({ref:w},b)),()=>void C.itemMap.delete(w))),N.jsx(y,{[h]:"",ref:A,children:M})});p.displayName=f;function m(g){const k=i(e+"CollectionConsumer",g);return re.useCallback(()=>{const M=k.collectionRef.current;if(!M)return[];const b=Array.from(M.querySelectorAll(`[${h}]`));return Array.from(k.itemMap.values()).sort((C,O)=>b.indexOf(C.ref.current)-b.indexOf(O.ref.current))},[k.collectionRef,k.itemMap])}return[{Provider:s,Slot:l,ItemSlot:p},m,r]}function rr(e){const t=or(e),n=d.forwardRef((r,o)=>{const l=r,{children:i}=l,s=H(l,["children"]),a=d.Children.toArray(i),c=a.find(sr);if(c){const f=c.props.children,h=a.map(y=>y===c?d.Children.count(f)>1?d.Children.only(null):d.isValidElement(f)?f.props.children:null:y);return N.jsx(t,R(v({},s),{ref:o,children:d.isValidElement(f)?d.cloneElement(f,void 0,h):null}))}return N.jsx(t,R(v({},s),{ref:o,children:i}))});return n.displayName=`${e}.Slot`,n}function or(e){const t=d.forwardRef((n,r)=>{const s=n,{children:o}=s,i=H(s,["children"]);if(d.isValidElement(o)){const a=cr(o),c=ar(i,o.props);return o.type!==d.Fragment&&(c.ref=r?Ge(r,a):a),d.cloneElement(o,c)}return d.Children.count(o)>1?d.Children.only(null):null});return t.displayName=`${e}.SlotClone`,t}var ir=Symbol("radix.slottable");function sr(e){return d.isValidElement(e)&&typeof e.type=="function"&&"__radixId"in e.type&&e.type.__radixId===ir}function ar(e,t){const n=v({},t);for(const r in t){const o=e[r],i=t[r];/^on[A-Z]/.test(r)?o&&i?n[r]=(...a)=>{const c=i(...a);return o(...a),c}:o&&(n[r]=o):r==="style"?n[r]=v(v({},o),i):r==="className"&&(n[r]=[o,i].filter(Boolean).join(" "))}return v(v({},e),n)}function cr(e){var r,o;let t=(r=Object.getOwnPropertyDescriptor(e.props,"ref"))==null?void 0:r.get,n=t&&"isReactWarning"in t&&t.isReactWarning;return n?e.ref:(t=(o=Object.getOwnPropertyDescriptor(e,"ref"))==null?void 0:o.get,n=t&&"isReactWarning"in t&&t.isReactWarning,n?e.props.ref:e.props.ref||e.ref)}var lr=["a","button","div","form","h2","h3","img","input","label","li","nav","ol","p","select","span","svg","ul"],ue=lr.reduce((e,t)=>{const n=rr(`Primitive.${t}`),r=d.forwardRef((o,i)=>{const l=o,{asChild:s}=l,a=H(l,["asChild"]),c=s?n:t;return typeof window!="undefined"&&(window[Symbol.for("radix-ui")]=!0),N.jsx(c,R(v({},a),{ref:i}))});return r.displayName=`Primitive.${t}`,R(v({},e),{[t]:r})},{});function ur(e,t){e&&Nt.flushSync(()=>e.dispatchEvent(t))}function Te(e){const t=d.useRef(e);return d.useEffect(()=>{t.current=e}),d.useMemo(()=>(...n)=>{var r;return(r=t.current)==null?void 0:r.call(t,...n)},[])}function fr(e,t=globalThis==null?void 0:globalThis.document){const n=Te(e);d.useEffect(()=>{const r=o=>{o.key==="Escape"&&n(o)};return t.addEventListener("keydown",r,{capture:!0}),()=>t.removeEventListener("keydown",r,{capture:!0})},[n,t])}var dr="DismissableLayer",Fe="dismissableLayer.update",hr="dismissableLayer.pointerDownOutside",yr="dismissableLayer.focusOutside",Mt,Xt=d.createContext({layers:new Set,layersWithOutsidePointerEventsDisabled:new Set,branches:new Set}),Zt=d.forwardRef((e,t)=>{var L;const O=e,{disableOutsidePointerEvents:n=!1,onEscapeKeyDown:r,onPointerDownOutside:o,onFocusOutside:i,onInteractOutside:s,onDismiss:a}=O,c=H(O,["disableOutsidePointerEvents","onEscapeKeyDown","onPointerDownOutside","onFocusOutside","onInteractOutside","onDismiss"]),l=d.useContext(Xt),[f,h]=d.useState(null),y=(L=f==null?void 0:f.ownerDocument)!=null?L:globalThis==null?void 0:globalThis.document,[,p]=d.useState({}),m=ae(t,E=>h(E)),g=Array.from(l.layers),[k]=[...l.layersWithOutsidePointerEventsDisabled].slice(-1),x=g.indexOf(k),M=f?g.indexOf(f):-1,b=l.layersWithOutsidePointerEventsDisabled.size>0,w=M>=x,A=mr(E=>{const _=E.target,T=[...l.branches].some(V=>V.contains(_));!w||T||(o==null||o(E),s==null||s(E),E.defaultPrevented||a==null||a())},y),C=gr(E=>{const _=E.target;[...l.branches].some(V=>V.contains(_))||(i==null||i(E),s==null||s(E),E.defaultPrevented||a==null||a())},y);return fr(E=>{M===l.layers.size-1&&(r==null||r(E),!E.defaultPrevented&&a&&(E.preventDefault(),a()))},y),d.useEffect(()=>{if(f)return n&&(l.layersWithOutsidePointerEventsDisabled.size===0&&(Mt=y.body.style.pointerEvents,y.body.style.pointerEvents="none"),l.layersWithOutsidePointerEventsDisabled.add(f)),l.layers.add(f),Ct(),()=>{n&&l.layersWithOutsidePointerEventsDisabled.size===1&&(y.body.style.pointerEvents=Mt)}},[f,y,n,l]),d.useEffect(()=>()=>{f&&(l.layers.delete(f),l.layersWithOutsidePointerEventsDisabled.delete(f),Ct())},[f,l]),d.useEffect(()=>{const E=()=>p({});return document.addEventListener(Fe,E),()=>document.removeEventListener(Fe,E)},[]),N.jsx(ue.div,R(v({},c),{ref:m,style:v({pointerEvents:b?w?"auto":"none":void 0},e.style),onFocusCapture:$e(e.onFocusCapture,C.onFocusCapture),onBlurCapture:$e(e.onBlurCapture,C.onBlurCapture),onPointerDownCapture:$e(e.onPointerDownCapture,A.onPointerDownCapture)}))});Zt.displayName=dr;var pr="DismissableLayerBranch",Yt=d.forwardRef((e,t)=>{const n=d.useContext(Xt),r=d.useRef(null),o=ae(t,r);return d.useEffect(()=>{const i=r.current;if(i)return n.branches.add(i),()=>{n.branches.delete(i)}},[n.branches]),N.jsx(ue.div,R(v({},e),{ref:o}))});Yt.displayName=pr;function mr(e,t=globalThis==null?void 0:globalThis.document){const n=Te(e),r=d.useRef(!1),o=d.useRef(()=>{});return d.useEffect(()=>{const i=a=>{if(a.target&&!r.current){let c=function(){Kt(hr,n,l,{discrete:!0})};const l={originalEvent:a};a.pointerType==="touch"?(t.removeEventListener("click",o.current),o.current=c,t.addEventListener("click",o.current,{once:!0})):c()}else t.removeEventListener("click",o.current);r.current=!1},s=window.setTimeout(()=>{t.addEventListener("pointerdown",i)},0);return()=>{window.clearTimeout(s),t.removeEventListener("pointerdown",i),t.removeEventListener("click",o.current)}},[t,n]),{onPointerDownCapture:()=>r.current=!0}}function gr(e,t=globalThis==null?void 0:globalThis.document){const n=Te(e),r=d.useRef(!1);return d.useEffect(()=>{const o=i=>{i.target&&!r.current&&Kt(yr,n,{originalEvent:i},{discrete:!1})};return t.addEventListener("focusin",o),()=>t.removeEventListener("focusin",o)},[t,n]),{onFocusCapture:()=>r.current=!0,onBlurCapture:()=>r.current=!1}}function Ct(){const e=new CustomEvent(Fe);document.dispatchEvent(e)}function Kt(e,t,n,{discrete:r}){const o=n.originalEvent.target,i=new CustomEvent(e,{bubbles:!1,cancelable:!0,detail:n});t&&o.addEventListener(e,t,{once:!0}),r?ur(o,i):o.dispatchEvent(i)}var Go=Zt,Jo=Yt,ce=globalThis!=null&&globalThis.document?d.useLayoutEffect:()=>{},kr="Portal",vr=d.forwardRef((e,t)=>{var c;const a=e,{container:n}=a,r=H(a,["container"]),[o,i]=d.useState(!1);ce(()=>i(!0),[]);const s=n||o&&((c=globalThis==null?void 0:globalThis.document)==null?void 0:c.body);return s?Tn.createPortal(N.jsx(ue.div,R(v({},r),{ref:t})),s):null});vr.displayName=kr;function xr(e,t){return d.useReducer((n,r)=>{const o=t[n][r];return o!=null?o:n},e)}var wr=e=>{const{present:t,children:n}=e,r=br(t),o=typeof n=="function"?n({present:r.isPresent}):d.Children.only(n),i=ae(r.ref,Mr(o));return typeof n=="function"||r.isPresent?d.cloneElement(o,{ref:i}):null};wr.displayName="Presence";function br(e){const[t,n]=d.useState(),r=d.useRef(null),o=d.useRef(e),i=d.useRef("none"),s=e?"mounted":"unmounted",[a,c]=xr(s,{mounted:{UNMOUNT:"unmounted",ANIMATION_OUT:"unmountSuspended"},unmountSuspended:{MOUNT:"mounted",ANIMATION_END:"unmounted"},unmounted:{MOUNT:"mounted"}});return d.useEffect(()=>{const l=Me(r.current);i.current=a==="mounted"?l:"none"},[a]),ce(()=>{const l=r.current,f=o.current;if(f!==e){const y=i.current,p=Me(l);e?c("MOUNT"):p==="none"||(l==null?void 0:l.display)==="none"?c("UNMOUNT"):c(f&&y!==p?"ANIMATION_OUT":"UNMOUNT"),o.current=e}},[e,c]),ce(()=>{var l;if(t){let f;const h=(l=t.ownerDocument.defaultView)!=null?l:window,y=m=>{const k=Me(r.current).includes(CSS.escape(m.animationName));if(m.target===t&&k&&(c("ANIMATION_END"),!o.current)){const x=t.style.animationFillMode;t.style.animationFillMode="forwards",f=h.setTimeout(()=>{t.style.animationFillMode==="forwards"&&(t.style.animationFillMode=x)})}},p=m=>{m.target===t&&(i.current=Me(r.current))};return t.addEventListener("animationstart",p),t.addEventListener("animationcancel",y),t.addEventListener("animationend",y),()=>{h.clearTimeout(f),t.removeEventListener("animationstart",p),t.removeEventListener("animationcancel",y),t.removeEventListener("animationend",y)}}else c("ANIMATION_END")},[t,c]),{isPresent:["mounted","unmountSuspended"].includes(a),ref:d.useCallback(l=>{r.current=l?getComputedStyle(l):null,n(l)},[])}}function Me(e){return(e==null?void 0:e.animationName)||"none"}function Mr(e){var r,o;let t=(r=Object.getOwnPropertyDescriptor(e.props,"ref"))==null?void 0:r.get,n=t&&"isReactWarning"in t&&t.isReactWarning;return n?e.ref:(t=(o=Object.getOwnPropertyDescriptor(e,"ref"))==null?void 0:o.get,n=t&&"isReactWarning"in t&&t.isReactWarning,n?e.props.ref:e.props.ref||e.ref)}var Cr=Kn[" useInsertionEffect ".trim().toString()]||ce;function Qo({prop:e,defaultProp:t,onChange:n=()=>{},caller:r}){const[o,i,s]=Ar({defaultProp:t,onChange:n}),a=e!==void 0,c=a?e:o;{const f=d.useRef(e!==void 0);d.useEffect(()=>{const h=f.current;h!==a&&console.warn(`${r} is changing from ${h?"controlled":"uncontrolled"} to ${a?"controlled":"uncontrolled"}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`),f.current=a},[a,r])}const l=d.useCallback(f=>{var h;if(a){const y=Sr(f)?f(e):f;y!==e&&((h=s.current)==null||h.call(s,y))}else i(f)},[a,e,i,s]);return[c,l]}function Ar({defaultProp:e,onChange:t}){const[n,r]=d.useState(e),o=d.useRef(n),i=d.useRef(t);return Cr(()=>{i.current=t},[t]),d.useEffect(()=>{var s;o.current!==n&&((s=i.current)==null||s.call(i,n),o.current=n)},[n,o]),[n,r,i]}function Sr(e){return typeof e=="function"}var Rr=Object.freeze({position:"absolute",border:0,width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",wordWrap:"normal"}),Er="VisuallyHidden",Gt=d.forwardRef((e,t)=>N.jsx(ue.span,R(v({},e),{ref:t,style:v(v({},Rr),e.style)})));Gt.displayName=Er;var ei=Gt;/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pr=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),Jt=(...e)=>e.filter((t,n,r)=>!!t&&t.trim()!==""&&r.indexOf(t)===n).join(" ").trim();/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var Or={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lr=d.forwardRef((l,c)=>{var f=l,{color:e="currentColor",size:t=24,strokeWidth:n=2,absoluteStrokeWidth:r,className:o="",children:i,iconNode:s}=f,a=H(f,["color","size","strokeWidth","absoluteStrokeWidth","className","children","iconNode"]);return d.createElement("svg",v(R(v({ref:c},Or),{width:t,height:t,stroke:e,strokeWidth:r?Number(n)*24/Number(t):n,className:Jt("lucide",o)}),a),[...s.map(([h,y])=>d.createElement(h,y)),...Array.isArray(i)?i:[i]])});/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=(e,t)=>{const n=d.forwardRef((s,i)=>{var a=s,{className:r}=a,o=H(a,["className"]);return d.createElement(Lr,v({ref:i,iconNode:t,className:Jt(`lucide-${Pr(e)}`,r)},o))});return n.displayName=`${e}`,n};/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ti=u("Activity",[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ni=u("AlignCenter",[["path",{d:"M17 12H7",key:"16if0g"}],["path",{d:"M19 18H5",key:"18s9l3"}],["path",{d:"M21 6H3",key:"1jwq7v"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ri=u("AlignJustify",[["path",{d:"M3 12h18",key:"1i2n21"}],["path",{d:"M3 18h18",key:"1h113x"}],["path",{d:"M3 6h18",key:"d0wm0j"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oi=u("AlignLeft",[["path",{d:"M15 12H3",key:"6jk70r"}],["path",{d:"M17 18H3",key:"1amg6g"}],["path",{d:"M21 6H3",key:"1jwq7v"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ii=u("AlignRight",[["path",{d:"M21 12H9",key:"dn1m92"}],["path",{d:"M21 18H7",key:"1ygte8"}],["path",{d:"M21 6H3",key:"1jwq7v"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const si=u("Archive",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ai=u("ArrowLeft",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ci=u("ArrowRight",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const li=u("ArrowUpDown",[["path",{d:"m21 16-4 4-4-4",key:"f6ql7i"}],["path",{d:"M17 20V4",key:"1ejh1v"}],["path",{d:"m3 8 4-4 4 4",key:"11wl7u"}],["path",{d:"M7 4v16",key:"1glfcx"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ui=u("Ban",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m4.9 4.9 14.2 14.2",key:"1m5liu"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fi=u("Bell",[["path",{d:"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9",key:"1qo2s2"}],["path",{d:"M10.3 21a1.94 1.94 0 0 0 3.4 0",key:"qgo35s"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const di=u("Bold",[["path",{d:"M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8",key:"mg9rjx"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hi=u("BookMarked",[["path",{d:"M10 2v8l3-3 3 3V2",key:"sqw3rj"}],["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20",key:"k3hazp"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yi=u("BookOpen",[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pi=u("Building2",[["path",{d:"M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z",key:"1b4qmf"}],["path",{d:"M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2",key:"i71pzd"}],["path",{d:"M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2",key:"10jefs"}],["path",{d:"M10 6h4",key:"1itunk"}],["path",{d:"M10 10h4",key:"tcdvrf"}],["path",{d:"M10 14h4",key:"kelpxr"}],["path",{d:"M10 18h4",key:"1ulq68"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mi=u("Calendar",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gi=u("Camera",[["path",{d:"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",key:"1tc9qg"}],["circle",{cx:"12",cy:"13",r:"3",key:"1vg3eu"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ki=u("ChartColumn",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vi=u("ChartNoAxesColumn",[["line",{x1:"18",x2:"18",y1:"20",y2:"10",key:"1xfpm4"}],["line",{x1:"12",x2:"12",y1:"20",y2:"4",key:"be30l9"}],["line",{x1:"6",x2:"6",y1:"20",y2:"14",key:"1r4le6"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xi=u("CheckCheck",[["path",{d:"M18 6 7 17l-5-5",key:"116fxf"}],["path",{d:"m22 10-7.5 7.5L13 16",key:"ke71qq"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wi=u("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bi=u("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mi=u("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ci=u("ChevronUp",[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ai=u("CircleAlert",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Si=u("CircleCheckBig",[["path",{d:"M21.801 10A10 10 0 1 1 17 3.335",key:"yps3ct"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ri=u("CircleUser",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}],["path",{d:"M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662",key:"154egf"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ei=u("CircleX",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pi=u("ClipboardList",[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Oi=u("Clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Li=u("CodeXml",[["path",{d:"m18 16 4-4-4-4",key:"1inbqp"}],["path",{d:"m6 8-4 4 4 4",key:"15zrgr"}],["path",{d:"m14.5 4-5 16",key:"e7oirm"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ti=u("Copy",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _i=u("Cpu",[["rect",{width:"16",height:"16",x:"4",y:"4",rx:"2",key:"14l7u7"}],["rect",{width:"6",height:"6",x:"9",y:"9",rx:"1",key:"5aljv4"}],["path",{d:"M15 2v2",key:"13l42r"}],["path",{d:"M15 20v2",key:"15mkzm"}],["path",{d:"M2 15h2",key:"1gxd5l"}],["path",{d:"M2 9h2",key:"1bbxkp"}],["path",{d:"M20 15h2",key:"19e6y8"}],["path",{d:"M20 9h2",key:"19tzq7"}],["path",{d:"M9 2v2",key:"165o2o"}],["path",{d:"M9 20v2",key:"i2bqo8"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Di=u("Database",[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ji=u("DollarSign",[["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",key:"1b0p4s"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ni=u("Download",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zi=u("Ellipsis",[["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}],["circle",{cx:"19",cy:"12",r:"1",key:"1wjl8i"}],["circle",{cx:"5",cy:"12",r:"1",key:"1pcz8c"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hi=u("ExternalLink",[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $i=u("EyeOff",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vi=u("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qi=u("FileCheck",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"m9 15 2 2 4-4",key:"1grp1n"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ii=u("FileSpreadsheet",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M8 13h2",key:"yr2amv"}],["path",{d:"M14 13h2",key:"un5t4a"}],["path",{d:"M8 17h2",key:"2yhykz"}],["path",{d:"M14 17h2",key:"10kma7"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fi=u("FileText",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wi=u("File",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bi=u("Filter",[["polygon",{points:"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3",key:"1yg77f"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ui=u("FolderOpen",[["path",{d:"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",key:"usdka0"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xi=u("Forward",[["polyline",{points:"15 17 20 12 15 7",key:"1w3sku"}],["path",{d:"M4 18v-2a4 4 0 0 1 4-4h12",key:"jmiej9"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zi=u("Gavel",[["path",{d:"m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8",key:"15492f"}],["path",{d:"m16 16 6-6",key:"vzrcl6"}],["path",{d:"m8 8 6-6",key:"18bi4p"}],["path",{d:"m9 7 8 8",key:"5jnvq1"}],["path",{d:"m21 11-8-8",key:"z4y7zo"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yi=u("Globe",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ki=u("HardDrive",[["line",{x1:"22",x2:"2",y1:"12",y2:"12",key:"1y58io"}],["path",{d:"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",key:"oot6mr"}],["line",{x1:"6",x2:"6.01",y1:"16",y2:"16",key:"sgf278"}],["line",{x1:"10",x2:"10.01",y1:"16",y2:"16",key:"1l4acy"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gi=u("House",[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"1d0kgt"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ji=u("Image",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qi=u("Inbox",[["polyline",{points:"22 12 16 12 14 15 10 15 8 12 2 12",key:"o97t9d"}],["path",{d:"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",key:"oot6mr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const es=u("Info",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ts=u("Italic",[["line",{x1:"19",x2:"10",y1:"4",y2:"4",key:"15jd3p"}],["line",{x1:"14",x2:"5",y1:"20",y2:"20",key:"bu0au3"}],["line",{x1:"15",x2:"9",y1:"4",y2:"20",key:"uljnxc"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ns=u("Key",[["path",{d:"m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4",key:"g0fldk"}],["path",{d:"m21 2-9.6 9.6",key:"1j0ho8"}],["circle",{cx:"7.5",cy:"15.5",r:"5.5",key:"yqb3hr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rs=u("Layers",[["path",{d:"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",key:"8b97xw"}],["path",{d:"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65",key:"dd6zsq"}],["path",{d:"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65",key:"ep9fru"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const os=u("LayoutDashboard",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const is=u("ListOrdered",[["path",{d:"M10 12h11",key:"6m4ad9"}],["path",{d:"M10 18h11",key:"11hvi2"}],["path",{d:"M10 6h11",key:"c7qv1k"}],["path",{d:"M4 10h2",key:"16xx2s"}],["path",{d:"M4 6h1v4",key:"cnovpq"}],["path",{d:"M6 18H4c0-1 2-2 2-3s-1-1.5-2-1",key:"m9a95d"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ss=u("List",[["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M3 18h.01",key:"1tta3j"}],["path",{d:"M3 6h.01",key:"1rqtza"}],["path",{d:"M8 12h13",key:"1za7za"}],["path",{d:"M8 18h13",key:"1lx6n3"}],["path",{d:"M8 6h13",key:"ik3vkj"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const as=u("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cs=u("LockOpen",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 9.9-1",key:"1mm8w8"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ls=u("Lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const us=u("LogIn",[["path",{d:"M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4",key:"u53s6r"}],["polyline",{points:"10 17 15 12 10 7",key:"1ail0h"}],["line",{x1:"15",x2:"3",y1:"12",y2:"12",key:"v6grx8"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fs=u("LogOut",[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}],["polyline",{points:"16 17 21 12 16 7",key:"1gabdz"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12",key:"1uyos4"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ds=u("Mail",[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2",key:"18n3k1"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7",key:"1ocrg3"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hs=u("MapPin",[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",key:"1r0f0z"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ys=u("Megaphone",[["path",{d:"m3 11 18-5v12L3 14v-3z",key:"n962bs"}],["path",{d:"M11.6 16.8a3 3 0 1 1-5.8-1.6",key:"1yl0tm"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ps=u("MessageSquare",[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",key:"1lielz"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ms=u("Monitor",[["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2",key:"48i651"}],["line",{x1:"8",x2:"16",y1:"21",y2:"21",key:"1svkeh"}],["line",{x1:"12",x2:"12",y1:"17",y2:"21",key:"vw1qmm"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gs=u("Move",[["path",{d:"M12 2v20",key:"t6zp3m"}],["path",{d:"m15 19-3 3-3-3",key:"11eu04"}],["path",{d:"m19 9 3 3-3 3",key:"1mg7y2"}],["path",{d:"M2 12h20",key:"9i4pu4"}],["path",{d:"m5 9-3 3 3 3",key:"j64kie"}],["path",{d:"m9 5 3-3 3 3",key:"l8vdw6"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ks=u("Network",[["rect",{x:"16",y:"16",width:"6",height:"6",rx:"1",key:"4q2zg0"}],["rect",{x:"2",y:"16",width:"6",height:"6",rx:"1",key:"8cvhb9"}],["rect",{x:"9",y:"2",width:"6",height:"6",rx:"1",key:"1egb70"}],["path",{d:"M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3",key:"1jsf9p"}],["path",{d:"M12 12V8",key:"2874zd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vs=u("Package",[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["path",{d:"m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7",key:"yx3hmr"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xs=u("Palette",[["circle",{cx:"13.5",cy:"6.5",r:".5",fill:"currentColor",key:"1okk4w"}],["circle",{cx:"17.5",cy:"10.5",r:".5",fill:"currentColor",key:"f64h9f"}],["circle",{cx:"8.5",cy:"7.5",r:".5",fill:"currentColor",key:"fotxhn"}],["circle",{cx:"6.5",cy:"12.5",r:".5",fill:"currentColor",key:"qy21gx"}],["path",{d:"M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z",key:"12rzf8"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ws=u("PanelsTopLeft",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 9h18",key:"1pudct"}],["path",{d:"M9 21V9",key:"1oto5p"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bs=u("Paperclip",[["path",{d:"m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48",key:"1u3ebp"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ms=u("PenLine",[["path",{d:"M12 20h9",key:"t2du7b"}],["path",{d:"M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z",key:"1ykcvy"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cs=u("Pen",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const As=u("PhoneCall",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}],["path",{d:"M14.05 2a9 9 0 0 1 8 7.94",key:"vmijpz"}],["path",{d:"M14.05 6A5 5 0 0 1 18 10",key:"13nbpp"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ss=u("Phone",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rs=u("PiggyBank",[["path",{d:"M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z",key:"1ivx2i"}],["path",{d:"M2 9v1c0 1.1.9 2 2 2h1",key:"nm575m"}],["path",{d:"M16 11h.01",key:"xkw8gn"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Es=u("Play",[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ps=u("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Os=u("Power",[["path",{d:"M12 2v10",key:"mnfbl"}],["path",{d:"M18.4 6.6a9 9 0 1 1-12.77.04",key:"obofu9"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ls=u("Printer",[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ts=u("Radio",[["path",{d:"M4.9 19.1C1 15.2 1 8.8 4.9 4.9",key:"1vaf9d"}],["path",{d:"M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5",key:"u1ii0m"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5",key:"1j5fej"}],["path",{d:"M19.1 4.9C23 8.8 23 15.1 19.1 19",key:"10b0cb"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _s=u("Receipt",[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",key:"q3az6g"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 17.5v-11",key:"1jc1ny"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ds=u("Redo",[["path",{d:"M21 7v6h-6",key:"3ptur4"}],["path",{d:"M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7",key:"1kgawr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const js=u("RefreshCw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ns=u("Reply",[["polyline",{points:"9 17 4 12 9 7",key:"hvgpf2"}],["path",{d:"M20 18v-2a4 4 0 0 0-4-4H4",key:"5vmcpk"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zs=u("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hs=u("Satellite",[["path",{d:"M13 7 9 3 5 7l4 4",key:"vyckw6"}],["path",{d:"m17 11 4 4-4 4-4-4",key:"rchckc"}],["path",{d:"m8 12 4 4 6-6-4-4Z",key:"1sshf7"}],["path",{d:"m16 8 3-3",key:"x428zp"}],["path",{d:"M9 21a6 6 0 0 0-6-6",key:"1iajcf"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $s=u("Save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vs=u("Scale",[["path",{d:"m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"7g6ntu"}],["path",{d:"m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"ijws7r"}],["path",{d:"M7 21h10",key:"1b0cd5"}],["path",{d:"M12 3v18",key:"108xh3"}],["path",{d:"M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2",key:"3gwbw2"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qs=u("ScanBarcode",[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2",key:"aa7l1z"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2",key:"4qcy5o"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2",key:"6vwrx8"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2",key:"ioqczr"}],["path",{d:"M8 7v10",key:"23sfjj"}],["path",{d:"M12 7v10",key:"jspqdw"}],["path",{d:"M17 7v10",key:"578dap"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Is=u("Scan",[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2",key:"aa7l1z"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2",key:"4qcy5o"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2",key:"6vwrx8"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2",key:"ioqczr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fs=u("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ws=u("Send",[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bs=u("Server",[["rect",{width:"20",height:"8",x:"2",y:"2",rx:"2",ry:"2",key:"ngkwjq"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",ry:"2",key:"iecqi9"}],["line",{x1:"6",x2:"6.01",y1:"6",y2:"6",key:"16zg32"}],["line",{x1:"6",x2:"6.01",y1:"18",y2:"18",key:"nzw8ys"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Us=u("Settings2",[["path",{d:"M20 7h-9",key:"3s1dr2"}],["path",{d:"M14 17H5",key:"gfn3mx"}],["circle",{cx:"17",cy:"17",r:"3",key:"18b49y"}],["circle",{cx:"7",cy:"7",r:"3",key:"dfmy0x"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xs=u("Settings",[["path",{d:"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",key:"1qme2f"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zs=u("Shield",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ys=u("ShoppingCart",[["circle",{cx:"8",cy:"21",r:"1",key:"jimo8o"}],["circle",{cx:"19",cy:"21",r:"1",key:"13723u"}],["path",{d:"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12",key:"9zh506"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ks=u("Signal",[["path",{d:"M2 20h.01",key:"4haj6o"}],["path",{d:"M7 20v-4",key:"j294jx"}],["path",{d:"M12 20v-8",key:"i3yub9"}],["path",{d:"M17 20V8",key:"1tkaf5"}],["path",{d:"M22 4v16",key:"sih9yq"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gs=u("SlidersVertical",[["line",{x1:"4",x2:"4",y1:"21",y2:"14",key:"1p332r"}],["line",{x1:"4",x2:"4",y1:"10",y2:"3",key:"gb41h5"}],["line",{x1:"12",x2:"12",y1:"21",y2:"12",key:"hf2csr"}],["line",{x1:"12",x2:"12",y1:"8",y2:"3",key:"1kfi7u"}],["line",{x1:"20",x2:"20",y1:"21",y2:"16",key:"1lhrwl"}],["line",{x1:"20",x2:"20",y1:"12",y2:"3",key:"16vvfq"}],["line",{x1:"2",x2:"6",y1:"14",y2:"14",key:"1uebub"}],["line",{x1:"10",x2:"14",y1:"8",y2:"8",key:"1yglbp"}],["line",{x1:"18",x2:"22",y1:"16",y2:"16",key:"1jxqpz"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Js=u("Smartphone",[["rect",{width:"14",height:"20",x:"5",y:"2",rx:"2",ry:"2",key:"1yt0o3"}],["path",{d:"M12 18h.01",key:"mhygvu"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qs=u("SquarePen",[["path",{d:"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",key:"1m0v6g"}],["path",{d:"M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z",key:"ohrbg2"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ea=u("Square",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ta=u("Star",[["path",{d:"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",key:"r04s7s"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const na=u("Table2",[["path",{d:"M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18",key:"gugj83"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ra=u("Table",[["path",{d:"M12 3v18",key:"108xh3"}],["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 9h18",key:"1pudct"}],["path",{d:"M3 15h18",key:"5xshup"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oa=u("Tablet",[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",ry:"2",key:"76otgf"}],["line",{x1:"12",x2:"12.01",y1:"18",y2:"18",key:"1dp563"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ia=u("Tag",[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sa=u("Terminal",[["polyline",{points:"4 17 10 11 4 5",key:"akl6gq"}],["line",{x1:"12",x2:"20",y1:"19",y2:"19",key:"q2wloq"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const aa=u("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ca=u("TrendingDown",[["polyline",{points:"22 17 13.5 8.5 8.5 13.5 2 7",key:"1r2t7k"}],["polyline",{points:"16 17 22 17 22 11",key:"11uiuu"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const la=u("TrendingUp",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ua=u("TriangleAlert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fa=u("Truck",[["path",{d:"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2",key:"wrbu53"}],["path",{d:"M15 18H9",key:"1lyqi6"}],["path",{d:"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14",key:"lysw3i"}],["circle",{cx:"17",cy:"18",r:"2",key:"332jqn"}],["circle",{cx:"7",cy:"18",r:"2",key:"19iecd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const da=u("Type",[["polyline",{points:"4 7 4 4 20 4 20 7",key:"1nosan"}],["line",{x1:"9",x2:"15",y1:"20",y2:"20",key:"swin9y"}],["line",{x1:"12",x2:"12",y1:"4",y2:"20",key:"1tx1rr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ha=u("Underline",[["path",{d:"M6 4v6a6 6 0 0 0 12 0V4",key:"9kb039"}],["line",{x1:"4",x2:"20",y1:"20",y2:"20",key:"nun2al"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ya=u("Undo",[["path",{d:"M3 7v6h6",key:"1v2h90"}],["path",{d:"M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13",key:"1r6uu6"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pa=u("Upload",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"17 8 12 3 7 8",key:"t8dd8p"}],["line",{x1:"12",x2:"12",y1:"3",y2:"15",key:"widbto"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ma=u("User",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ga=u("Users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75",key:"1da9ce"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ka=u("Wifi",[["path",{d:"M12 20h.01",key:"zekei9"}],["path",{d:"M2 8.82a15 15 0 0 1 20 0",key:"dnpr2z"}],["path",{d:"M5 12.859a10 10 0 0 1 14 0",key:"1x1e6c"}],["path",{d:"M8.5 16.429a5 5 0 0 1 7 0",key:"1bycff"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const va=u("Wrench",[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",key:"cbrjhi"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xa=u("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wa=u("Zap",[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]]),Tr=["top","right","bottom","left"],oe=Math.min,U=Math.max,Ee=Math.round,Ce=Math.floor,J=e=>({x:e,y:e}),_r={left:"right",right:"left",bottom:"top",top:"bottom"};function We(e,t,n){return U(e,oe(t,n))}function ee(e,t){return typeof e=="function"?e(t):e}function te(e){return e.split("-")[0]}function ye(e){return e.split("-")[1]}function Je(e){return e==="x"?"y":"x"}function Qe(e){return e==="y"?"height":"width"}function G(e){const t=e[0];return t==="t"||t==="b"?"y":"x"}function et(e){return Je(G(e))}function Dr(e,t,n){n===void 0&&(n=!1);const r=ye(e),o=et(e),i=Qe(o);let s=o==="x"?r===(n?"end":"start")?"right":"left":r==="start"?"bottom":"top";return t.reference[i]>t.floating[i]&&(s=Pe(s)),[s,Pe(s)]}function jr(e){const t=Pe(e);return[Be(e),t,Be(t)]}function Be(e){return e.includes("start")?e.replace("start","end"):e.replace("end","start")}const At=["left","right"],St=["right","left"],Nr=["top","bottom"],zr=["bottom","top"];function Hr(e,t,n){switch(e){case"top":case"bottom":return n?t?St:At:t?At:St;case"left":case"right":return t?Nr:zr;default:return[]}}function $r(e,t,n,r){const o=ye(e);let i=Hr(te(e),n==="start",r);return o&&(i=i.map(s=>s+"-"+o),t&&(i=i.concat(i.map(Be)))),i}function Pe(e){const t=te(e);return _r[t]+e.slice(t.length)}function Vr(e){return v({top:0,right:0,bottom:0,left:0},e)}function Qt(e){return typeof e!="number"?Vr(e):{top:e,right:e,bottom:e,left:e}}function Oe(e){const{x:t,y:n,width:r,height:o}=e;return{width:r,height:o,top:n,left:t,right:t+r,bottom:n+o,x:t,y:n}}function Rt(e,t,n){let{reference:r,floating:o}=e;const i=G(t),s=et(t),a=Qe(s),c=te(t),l=i==="y",f=r.x+r.width/2-o.width/2,h=r.y+r.height/2-o.height/2,y=r[a]/2-o[a]/2;let p;switch(c){case"top":p={x:f,y:r.y-o.height};break;case"bottom":p={x:f,y:r.y+r.height};break;case"right":p={x:r.x+r.width,y:h};break;case"left":p={x:r.x-o.width,y:h};break;default:p={x:r.x,y:r.y}}switch(ye(t)){case"start":p[s]-=y*(n&&l?-1:1);break;case"end":p[s]+=y*(n&&l?-1:1);break}return p}function qr(e,t){return Z(this,null,function*(){var n;t===void 0&&(t={});const{x:r,y:o,platform:i,rects:s,elements:a,strategy:c}=e,{boundary:l="clippingAncestors",rootBoundary:f="viewport",elementContext:h="floating",altBoundary:y=!1,padding:p=0}=ee(t,e),m=Qt(p),k=a[y?h==="floating"?"reference":"floating":h],x=Oe(yield i.getClippingRect({element:(n=yield i.isElement==null?void 0:i.isElement(k))==null||n?k:k.contextElement||(yield i.getDocumentElement==null?void 0:i.getDocumentElement(a.floating)),boundary:l,rootBoundary:f,strategy:c})),M=h==="floating"?{x:r,y:o,width:s.floating.width,height:s.floating.height}:s.reference,b=yield i.getOffsetParent==null?void 0:i.getOffsetParent(a.floating),w=(yield i.isElement==null?void 0:i.isElement(b))?(yield i.getScale==null?void 0:i.getScale(b))||{x:1,y:1}:{x:1,y:1},A=Oe(i.convertOffsetParentRelativeRectToViewportRelativeRect?yield i.convertOffsetParentRelativeRectToViewportRelativeRect({elements:a,rect:M,offsetParent:b,strategy:c}):M);return{top:(x.top-A.top+m.top)/w.y,bottom:(A.bottom-x.bottom+m.bottom)/w.y,left:(x.left-A.left+m.left)/w.x,right:(A.right-x.right+m.right)/w.x}})}const Ir=50,Fr=(e,t,n)=>Z(void 0,null,function*(){const{placement:r="bottom",strategy:o="absolute",middleware:i=[],platform:s}=n,a=s.detectOverflow?s:R(v({},s),{detectOverflow:qr}),c=yield s.isRTL==null?void 0:s.isRTL(t);let l=yield s.getElementRects({reference:e,floating:t,strategy:o}),{x:f,y:h}=Rt(l,r,c),y=r,p=0;const m={};for(let g=0;g<i.length;g++){const k=i[g];if(!k)continue;const{name:x,fn:M}=k,{x:b,y:w,data:A,reset:C}=yield M({x:f,y:h,initialPlacement:r,placement:y,strategy:o,middlewareData:m,rects:l,platform:a,elements:{reference:e,floating:t}});f=b!=null?b:f,h=w!=null?w:h,m[x]=v(v({},m[x]),A),C&&p<Ir&&(p++,typeof C=="object"&&(C.placement&&(y=C.placement),C.rects&&(l=C.rects===!0?yield s.getElementRects({reference:e,floating:t,strategy:o}):C.rects),{x:f,y:h}=Rt(l,y,c)),g=-1)}return{x:f,y:h,placement:y,strategy:o,middlewareData:m}}),Wr=e=>({name:"arrow",options:e,fn(n){return Z(this,null,function*(){const{x:r,y:o,placement:i,rects:s,platform:a,elements:c,middlewareData:l}=n,{element:f,padding:h=0}=ee(e,n)||{};if(f==null)return{};const y=Qt(h),p={x:r,y:o},m=et(i),g=Qe(m),k=yield a.getDimensions(f),x=m==="y",M=x?"top":"left",b=x?"bottom":"right",w=x?"clientHeight":"clientWidth",A=s.reference[g]+s.reference[m]-p[m]-s.floating[g],C=p[m]-s.reference[m],O=yield a.getOffsetParent==null?void 0:a.getOffsetParent(f);let L=O?O[w]:0;(!L||!(yield a.isElement==null?void 0:a.isElement(O)))&&(L=c.floating[w]||s.floating[g]);const E=A/2-C/2,_=L/2-k[g]/2-1,T=oe(y[M],_),V=oe(y[b],_),D=T,W=L-k[g]-V,$=L/2-k[g]/2+E,j=We(D,$,W),q=!l.arrow&&ye(i)!=null&&$!==j&&s.reference[g]/2-($<D?T:V)-k[g]/2<0,P=q?$<D?$-D:$-W:0;return{[m]:p[m]+P,data:v({[m]:j,centerOffset:$-j-P},q&&{alignmentOffset:P}),reset:q}})}}),Br=function(e){return e===void 0&&(e={}),{name:"flip",options:e,fn(n){return Z(this,null,function*(){var r,o;const{placement:i,middlewareData:s,rects:a,initialPlacement:c,platform:l,elements:f}=n,$=ee(e,n),{mainAxis:h=!0,crossAxis:y=!0,fallbackPlacements:p,fallbackStrategy:m="bestFit",fallbackAxisSideDirection:g="none",flipAlignment:k=!0}=$,x=H($,["mainAxis","crossAxis","fallbackPlacements","fallbackStrategy","fallbackAxisSideDirection","flipAlignment"]);if((r=s.arrow)!=null&&r.alignmentOffset)return{};const M=te(i),b=G(c),w=te(c)===c,A=yield l.isRTL==null?void 0:l.isRTL(f.floating),C=p||(w||!k?[Pe(c)]:jr(c)),O=g!=="none";!p&&O&&C.push(...$r(c,k,g,A));const L=[c,...C],E=yield l.detectOverflow(n,x),_=[];let T=((o=s.flip)==null?void 0:o.overflows)||[];if(h&&_.push(E[M]),y){const j=Dr(i,a,A);_.push(E[j[0]],E[j[1]])}if(T=[...T,{placement:i,overflows:_}],!_.every(j=>j<=0)){var V,D;const j=(((V=s.flip)==null?void 0:V.index)||0)+1,q=L[j];if(q&&(!(y==="alignment"?b!==G(q):!1)||T.every(z=>G(z.placement)===b?z.overflows[0]>0:!0)))return{data:{index:j,overflows:T},reset:{placement:q}};let P=(D=T.filter(I=>I.overflows[0]<=0).sort((I,z)=>I.overflows[1]-z.overflows[1])[0])==null?void 0:D.placement;if(!P)switch(m){case"bestFit":{var W;const I=(W=T.filter(z=>{if(O){const B=G(z.placement);return B===b||B==="y"}return!0}).map(z=>[z.placement,z.overflows.filter(B=>B>0).reduce((B,ze)=>B+ze,0)]).sort((z,B)=>z[1]-B[1])[0])==null?void 0:W[0];I&&(P=I);break}case"initialPlacement":P=c;break}if(i!==P)return{reset:{placement:P}}}return{}})}}};function Et(e,t){return{top:e.top-t.height,right:e.right-t.width,bottom:e.bottom-t.height,left:e.left-t.width}}function Pt(e){return Tr.some(t=>e[t]>=0)}const Ur=function(e){return e===void 0&&(e={}),{name:"hide",options:e,fn(n){return Z(this,null,function*(){const{rects:r,platform:o}=n,a=ee(e,n),{strategy:i="referenceHidden"}=a,s=H(a,["strategy"]);switch(i){case"referenceHidden":{const c=yield o.detectOverflow(n,R(v({},s),{elementContext:"reference"})),l=Et(c,r.reference);return{data:{referenceHiddenOffsets:l,referenceHidden:Pt(l)}}}case"escaped":{const c=yield o.detectOverflow(n,R(v({},s),{altBoundary:!0})),l=Et(c,r.floating);return{data:{escapedOffsets:l,escaped:Pt(l)}}}default:return{}}})}}},en=new Set(["left","top"]);function Xr(e,t){return Z(this,null,function*(){const{placement:n,platform:r,elements:o}=e,i=yield r.isRTL==null?void 0:r.isRTL(o.floating),s=te(n),a=ye(n),c=G(n)==="y",l=en.has(s)?-1:1,f=i&&c?-1:1,h=ee(t,e);let{mainAxis:y,crossAxis:p,alignmentAxis:m}=typeof h=="number"?{mainAxis:h,crossAxis:0,alignmentAxis:null}:{mainAxis:h.mainAxis||0,crossAxis:h.crossAxis||0,alignmentAxis:h.alignmentAxis};return a&&typeof m=="number"&&(p=a==="end"?m*-1:m),c?{x:p*f,y:y*l}:{x:y*l,y:p*f}})}const Zr=function(e){return e===void 0&&(e=0),{name:"offset",options:e,fn(n){return Z(this,null,function*(){var r,o;const{x:i,y:s,placement:a,middlewareData:c}=n,l=yield Xr(n,e);return a===((r=c.offset)==null?void 0:r.placement)&&(o=c.arrow)!=null&&o.alignmentOffset?{}:{x:i+l.x,y:s+l.y,data:R(v({},l),{placement:a})}})}}},Yr=function(e){return e===void 0&&(e={}),{name:"shift",options:e,fn(n){return Z(this,null,function*(){const{x:r,y:o,placement:i,platform:s}=n,M=ee(e,n),{mainAxis:a=!0,crossAxis:c=!1,limiter:l={fn:b=>{let{x:w,y:A}=b;return{x:w,y:A}}}}=M,f=H(M,["mainAxis","crossAxis","limiter"]),h={x:r,y:o},y=yield s.detectOverflow(n,f),p=G(te(i)),m=Je(p);let g=h[m],k=h[p];if(a){const b=m==="y"?"top":"left",w=m==="y"?"bottom":"right",A=g+y[b],C=g-y[w];g=We(A,g,C)}if(c){const b=p==="y"?"top":"left",w=p==="y"?"bottom":"right",A=k+y[b],C=k-y[w];k=We(A,k,C)}const x=l.fn(R(v({},n),{[m]:g,[p]:k}));return R(v({},x),{data:{x:x.x-r,y:x.y-o,enabled:{[m]:a,[p]:c}}})})}}},Kr=function(e){return e===void 0&&(e={}),{options:e,fn(t){const{x:n,y:r,placement:o,rects:i,middlewareData:s}=t,{offset:a=0,mainAxis:c=!0,crossAxis:l=!0}=ee(e,t),f={x:n,y:r},h=G(o),y=Je(h);let p=f[y],m=f[h];const g=ee(a,t),k=typeof g=="number"?{mainAxis:g,crossAxis:0}:v({mainAxis:0,crossAxis:0},g);if(c){const b=y==="y"?"height":"width",w=i.reference[y]-i.floating[b]+k.mainAxis,A=i.reference[y]+i.reference[b]-k.mainAxis;p<w?p=w:p>A&&(p=A)}if(l){var x,M;const b=y==="y"?"width":"height",w=en.has(te(o)),A=i.reference[h]-i.floating[b]+(w&&((x=s.offset)==null?void 0:x[h])||0)+(w?0:k.crossAxis),C=i.reference[h]+i.reference[b]+(w?0:((M=s.offset)==null?void 0:M[h])||0)-(w?k.crossAxis:0);m<A?m=A:m>C&&(m=C)}return{[y]:p,[h]:m}}}},Gr=function(e){return e===void 0&&(e={}),{name:"size",options:e,fn(n){return Z(this,null,function*(){var r,o;const{placement:i,rects:s,platform:a,elements:c}=n,T=ee(e,n),{apply:l=()=>{}}=T,f=H(T,["apply"]),h=yield a.detectOverflow(n,f),y=te(i),p=ye(i),m=G(i)==="y",{width:g,height:k}=s.floating;let x,M;y==="top"||y==="bottom"?(x=y,M=p===((yield a.isRTL==null?void 0:a.isRTL(c.floating))?"start":"end")?"left":"right"):(M=y,x=p==="end"?"top":"bottom");const b=k-h.top-h.bottom,w=g-h.left-h.right,A=oe(k-h[x],b),C=oe(g-h[M],w),O=!n.middlewareData.shift;let L=A,E=C;if((r=n.middlewareData.shift)!=null&&r.enabled.x&&(E=w),(o=n.middlewareData.shift)!=null&&o.enabled.y&&(L=b),O&&!p){const V=U(h.left,0),D=U(h.right,0),W=U(h.top,0),$=U(h.bottom,0);m?E=g-2*(V!==0||D!==0?V+D:U(h.left,h.right)):L=k-2*(W!==0||$!==0?W+$:U(h.top,h.bottom))}yield l(R(v({},n),{availableWidth:E,availableHeight:L}));const _=yield a.getDimensions(c.floating);return g!==_.width||k!==_.height?{reset:{rects:!0}}:{}})}}};function _e(){return typeof window!="undefined"}function pe(e){return tn(e)?(e.nodeName||"").toLowerCase():"#document"}function X(e){var t;return(e==null||(t=e.ownerDocument)==null?void 0:t.defaultView)||window}function Q(e){var t;return(t=(tn(e)?e.ownerDocument:e.document)||window.document)==null?void 0:t.documentElement}function tn(e){return _e()?e instanceof Node||e instanceof X(e).Node:!1}function Y(e){return _e()?e instanceof Element||e instanceof X(e).Element:!1}function ne(e){return _e()?e instanceof HTMLElement||e instanceof X(e).HTMLElement:!1}function Ot(e){return!_e()||typeof ShadowRoot=="undefined"?!1:e instanceof ShadowRoot||e instanceof X(e).ShadowRoot}function ve(e){const{overflow:t,overflowX:n,overflowY:r,display:o}=K(e);return/auto|scroll|overlay|hidden|clip/.test(t+r+n)&&o!=="inline"&&o!=="contents"}function Jr(e){return/^(table|td|th)$/.test(pe(e))}function De(e){try{if(e.matches(":popover-open"))return!0}catch(t){}try{return e.matches(":modal")}catch(t){return!1}}const Qr=/transform|translate|scale|rotate|perspective|filter/,eo=/paint|layout|strict|content/,se=e=>!!e&&e!=="none";let Ve;function tt(e){const t=Y(e)?K(e):e;return se(t.transform)||se(t.translate)||se(t.scale)||se(t.rotate)||se(t.perspective)||!nt()&&(se(t.backdropFilter)||se(t.filter))||Qr.test(t.willChange||"")||eo.test(t.contain||"")}function to(e){let t=ie(e);for(;ne(t)&&!de(t);){if(tt(t))return t;if(De(t))return null;t=ie(t)}return null}function nt(){return Ve==null&&(Ve=typeof CSS!="undefined"&&CSS.supports&&CSS.supports("-webkit-backdrop-filter","none")),Ve}function de(e){return/^(html|body|#document)$/.test(pe(e))}function K(e){return X(e).getComputedStyle(e)}function je(e){return Y(e)?{scrollLeft:e.scrollLeft,scrollTop:e.scrollTop}:{scrollLeft:e.scrollX,scrollTop:e.scrollY}}function ie(e){if(pe(e)==="html")return e;const t=e.assignedSlot||e.parentNode||Ot(e)&&e.host||Q(e);return Ot(t)?t.host:t}function nn(e){const t=ie(e);return de(t)?e.ownerDocument?e.ownerDocument.body:e.body:ne(t)&&ve(t)?t:nn(t)}function ge(e,t,n){var r;t===void 0&&(t=[]),n===void 0&&(n=!0);const o=nn(e),i=o===((r=e.ownerDocument)==null?void 0:r.body),s=X(o);if(i){const a=Ue(s);return t.concat(s,s.visualViewport||[],ve(o)?o:[],a&&n?ge(a):[])}else return t.concat(o,ge(o,[],n))}function Ue(e){return e.parent&&Object.getPrototypeOf(e.parent)?e.frameElement:null}function rn(e){const t=K(e);let n=parseFloat(t.width)||0,r=parseFloat(t.height)||0;const o=ne(e),i=o?e.offsetWidth:n,s=o?e.offsetHeight:r,a=Ee(n)!==i||Ee(r)!==s;return a&&(n=i,r=s),{width:n,height:r,$:a}}function rt(e){return Y(e)?e:e.contextElement}function fe(e){const t=rt(e);if(!ne(t))return J(1);const n=t.getBoundingClientRect(),{width:r,height:o,$:i}=rn(t);let s=(i?Ee(n.width):n.width)/r,a=(i?Ee(n.height):n.height)/o;return(!s||!Number.isFinite(s))&&(s=1),(!a||!Number.isFinite(a))&&(a=1),{x:s,y:a}}const no=J(0);function on(e){const t=X(e);return!nt()||!t.visualViewport?no:{x:t.visualViewport.offsetLeft,y:t.visualViewport.offsetTop}}function ro(e,t,n){return t===void 0&&(t=!1),!n||t&&n!==X(e)?!1:t}function le(e,t,n,r){t===void 0&&(t=!1),n===void 0&&(n=!1);const o=e.getBoundingClientRect(),i=rt(e);let s=J(1);t&&(r?Y(r)&&(s=fe(r)):s=fe(e));const a=ro(i,n,r)?on(i):J(0);let c=(o.left+a.x)/s.x,l=(o.top+a.y)/s.y,f=o.width/s.x,h=o.height/s.y;if(i){const y=X(i),p=r&&Y(r)?X(r):r;let m=y,g=Ue(m);for(;g&&r&&p!==m;){const k=fe(g),x=g.getBoundingClientRect(),M=K(g),b=x.left+(g.clientLeft+parseFloat(M.paddingLeft))*k.x,w=x.top+(g.clientTop+parseFloat(M.paddingTop))*k.y;c*=k.x,l*=k.y,f*=k.x,h*=k.y,c+=b,l+=w,m=X(g),g=Ue(m)}}return Oe({width:f,height:h,x:c,y:l})}function Ne(e,t){const n=je(e).scrollLeft;return t?t.left+n:le(Q(e)).left+n}function sn(e,t){const n=e.getBoundingClientRect(),r=n.left+t.scrollLeft-Ne(e,n),o=n.top+t.scrollTop;return{x:r,y:o}}function oo(e){let{elements:t,rect:n,offsetParent:r,strategy:o}=e;const i=o==="fixed",s=Q(r),a=t?De(t.floating):!1;if(r===s||a&&i)return n;let c={scrollLeft:0,scrollTop:0},l=J(1);const f=J(0),h=ne(r);if((h||!h&&!i)&&((pe(r)!=="body"||ve(s))&&(c=je(r)),h)){const p=le(r);l=fe(r),f.x=p.x+r.clientLeft,f.y=p.y+r.clientTop}const y=s&&!h&&!i?sn(s,c):J(0);return{width:n.width*l.x,height:n.height*l.y,x:n.x*l.x-c.scrollLeft*l.x+f.x+y.x,y:n.y*l.y-c.scrollTop*l.y+f.y+y.y}}function io(e){return Array.from(e.getClientRects())}function so(e){const t=Q(e),n=je(e),r=e.ownerDocument.body,o=U(t.scrollWidth,t.clientWidth,r.scrollWidth,r.clientWidth),i=U(t.scrollHeight,t.clientHeight,r.scrollHeight,r.clientHeight);let s=-n.scrollLeft+Ne(e);const a=-n.scrollTop;return K(r).direction==="rtl"&&(s+=U(t.clientWidth,r.clientWidth)-o),{width:o,height:i,x:s,y:a}}const Lt=25;function ao(e,t){const n=X(e),r=Q(e),o=n.visualViewport;let i=r.clientWidth,s=r.clientHeight,a=0,c=0;if(o){i=o.width,s=o.height;const f=nt();(!f||f&&t==="fixed")&&(a=o.offsetLeft,c=o.offsetTop)}const l=Ne(r);if(l<=0){const f=r.ownerDocument,h=f.body,y=getComputedStyle(h),p=f.compatMode==="CSS1Compat"&&parseFloat(y.marginLeft)+parseFloat(y.marginRight)||0,m=Math.abs(r.clientWidth-h.clientWidth-p);m<=Lt&&(i-=m)}else l<=Lt&&(i+=l);return{width:i,height:s,x:a,y:c}}function co(e,t){const n=le(e,!0,t==="fixed"),r=n.top+e.clientTop,o=n.left+e.clientLeft,i=ne(e)?fe(e):J(1),s=e.clientWidth*i.x,a=e.clientHeight*i.y,c=o*i.x,l=r*i.y;return{width:s,height:a,x:c,y:l}}function Tt(e,t,n){let r;if(t==="viewport")r=ao(e,n);else if(t==="document")r=so(Q(e));else if(Y(t))r=co(t,n);else{const o=on(e);r={x:t.x-o.x,y:t.y-o.y,width:t.width,height:t.height}}return Oe(r)}function an(e,t){const n=ie(e);return n===t||!Y(n)||de(n)?!1:K(n).position==="fixed"||an(n,t)}function lo(e,t){const n=t.get(e);if(n)return n;let r=ge(e,[],!1).filter(a=>Y(a)&&pe(a)!=="body"),o=null;const i=K(e).position==="fixed";let s=i?ie(e):e;for(;Y(s)&&!de(s);){const a=K(s),c=tt(s);!c&&a.position==="fixed"&&(o=null),(i?!c&&!o:!c&&a.position==="static"&&!!o&&(o.position==="absolute"||o.position==="fixed")||ve(s)&&!c&&an(e,s))?r=r.filter(f=>f!==s):o=a,s=ie(s)}return t.set(e,r),r}function uo(e){let{element:t,boundary:n,rootBoundary:r,strategy:o}=e;const s=[...n==="clippingAncestors"?De(t)?[]:lo(t,this._c):[].concat(n),r],a=Tt(t,s[0],o);let c=a.top,l=a.right,f=a.bottom,h=a.left;for(let y=1;y<s.length;y++){const p=Tt(t,s[y],o);c=U(p.top,c),l=oe(p.right,l),f=oe(p.bottom,f),h=U(p.left,h)}return{width:l-h,height:f-c,x:h,y:c}}function fo(e){const{width:t,height:n}=rn(e);return{width:t,height:n}}function ho(e,t,n){const r=ne(t),o=Q(t),i=n==="fixed",s=le(e,!0,i,t);let a={scrollLeft:0,scrollTop:0};const c=J(0);function l(){c.x=Ne(o)}if(r||!r&&!i)if((pe(t)!=="body"||ve(o))&&(a=je(t)),r){const p=le(t,!0,i,t);c.x=p.x+t.clientLeft,c.y=p.y+t.clientTop}else o&&l();i&&!r&&o&&l();const f=o&&!r&&!i?sn(o,a):J(0),h=s.left+a.scrollLeft-c.x-f.x,y=s.top+a.scrollTop-c.y-f.y;return{x:h,y,width:s.width,height:s.height}}function qe(e){return K(e).position==="static"}function _t(e,t){if(!ne(e)||K(e).position==="fixed")return null;if(t)return t(e);let n=e.offsetParent;return Q(e)===n&&(n=n.ownerDocument.body),n}function cn(e,t){const n=X(e);if(De(e))return n;if(!ne(e)){let o=ie(e);for(;o&&!de(o);){if(Y(o)&&!qe(o))return o;o=ie(o)}return n}let r=_t(e,t);for(;r&&Jr(r)&&qe(r);)r=_t(r,t);return r&&de(r)&&qe(r)&&!tt(r)?n:r||to(e)||n}const yo=function(e){return Z(this,null,function*(){const t=this.getOffsetParent||cn,n=this.getDimensions,r=yield n(e.floating);return{reference:ho(e.reference,yield t(e.floating),e.strategy),floating:{x:0,y:0,width:r.width,height:r.height}}})};function po(e){return K(e).direction==="rtl"}const mo={convertOffsetParentRelativeRectToViewportRelativeRect:oo,getDocumentElement:Q,getClippingRect:uo,getOffsetParent:cn,getElementRects:yo,getClientRects:io,getDimensions:fo,getScale:fe,isElement:Y,isRTL:po};function ln(e,t){return e.x===t.x&&e.y===t.y&&e.width===t.width&&e.height===t.height}function go(e,t){let n=null,r;const o=Q(e);function i(){var a;clearTimeout(r),(a=n)==null||a.disconnect(),n=null}function s(a,c){a===void 0&&(a=!1),c===void 0&&(c=1),i();const l=e.getBoundingClientRect(),{left:f,top:h,width:y,height:p}=l;if(a||t(),!y||!p)return;const m=Ce(h),g=Ce(o.clientWidth-(f+y)),k=Ce(o.clientHeight-(h+p)),x=Ce(f),b={rootMargin:-m+"px "+-g+"px "+-k+"px "+-x+"px",threshold:U(0,oe(1,c))||1};let w=!0;function A(C){const O=C[0].intersectionRatio;if(O!==c){if(!w)return s();O?s(!1,O):r=setTimeout(()=>{s(!1,1e-7)},1e3)}O===1&&!ln(l,e.getBoundingClientRect())&&s(),w=!1}try{n=new IntersectionObserver(A,R(v({},b),{root:o.ownerDocument}))}catch(C){n=new IntersectionObserver(A,b)}n.observe(e)}return s(!0),i}function ko(e,t,n,r){r===void 0&&(r={});const{ancestorScroll:o=!0,ancestorResize:i=!0,elementResize:s=typeof ResizeObserver=="function",layoutShift:a=typeof IntersectionObserver=="function",animationFrame:c=!1}=r,l=rt(e),f=o||i?[...l?ge(l):[],...t?ge(t):[]]:[];f.forEach(x=>{o&&x.addEventListener("scroll",n,{passive:!0}),i&&x.addEventListener("resize",n)});const h=l&&a?go(l,n):null;let y=-1,p=null;s&&(p=new ResizeObserver(x=>{let[M]=x;M&&M.target===l&&p&&t&&(p.unobserve(t),cancelAnimationFrame(y),y=requestAnimationFrame(()=>{var b;(b=p)==null||b.observe(t)})),n()}),l&&!c&&p.observe(l),t&&p.observe(t));let m,g=c?le(e):null;c&&k();function k(){const x=le(e);g&&!ln(g,x)&&n(),g=x,m=requestAnimationFrame(k)}return n(),()=>{var x;f.forEach(M=>{o&&M.removeEventListener("scroll",n),i&&M.removeEventListener("resize",n)}),h==null||h(),(x=p)==null||x.disconnect(),p=null,c&&cancelAnimationFrame(m)}}const vo=Zr,xo=Yr,wo=Br,bo=Gr,Mo=Ur,Dt=Wr,Co=Kr,Ao=(e,t,n)=>{const r=new Map,o=v({platform:mo},n),i=R(v({},o.platform),{_c:r});return Fr(e,t,R(v({},o),{platform:i}))};var So=typeof document!="undefined",Ro=function(){},Re=So?d.useLayoutEffect:Ro;function Le(e,t){if(e===t)return!0;if(typeof e!=typeof t)return!1;if(typeof e=="function"&&e.toString()===t.toString())return!0;let n,r,o;if(e&&t&&typeof e=="object"){if(Array.isArray(e)){if(n=e.length,n!==t.length)return!1;for(r=n;r--!==0;)if(!Le(e[r],t[r]))return!1;return!0}if(o=Object.keys(e),n=o.length,n!==Object.keys(t).length)return!1;for(r=n;r--!==0;)if(!{}.hasOwnProperty.call(t,o[r]))return!1;for(r=n;r--!==0;){const i=o[r];if(!(i==="_owner"&&e.$$typeof)&&!Le(e[i],t[i]))return!1}return!0}return e!==e&&t!==t}function un(e){return typeof window=="undefined"?1:(e.ownerDocument.defaultView||window).devicePixelRatio||1}function jt(e,t){const n=un(e);return Math.round(t*n)/n}function Ie(e){const t=d.useRef(e);return Re(()=>{t.current=e}),t}function Eo(e){e===void 0&&(e={});const{placement:t="bottom",strategy:n="absolute",middleware:r=[],platform:o,elements:{reference:i,floating:s}={},transform:a=!0,whileElementsMounted:c,open:l}=e,[f,h]=d.useState({x:0,y:0,strategy:n,placement:t,middlewareData:{},isPositioned:!1}),[y,p]=d.useState(r);Le(y,r)||p(r);const[m,g]=d.useState(null),[k,x]=d.useState(null),M=d.useCallback(P=>{P!==C.current&&(C.current=P,g(P))},[]),b=d.useCallback(P=>{P!==O.current&&(O.current=P,x(P))},[]),w=i||m,A=s||k,C=d.useRef(null),O=d.useRef(null),L=d.useRef(f),E=c!=null,_=Ie(c),T=Ie(o),V=Ie(l),D=d.useCallback(()=>{if(!C.current||!O.current)return;const P={placement:t,strategy:n,middleware:y};T.current&&(P.platform=T.current),Ao(C.current,O.current,P).then(I=>{const z=R(v({},I),{isPositioned:V.current!==!1});W.current&&!Le(L.current,z)&&(L.current=z,Nt.flushSync(()=>{h(z)}))})},[y,t,n,T,V]);Re(()=>{l===!1&&L.current.isPositioned&&(L.current.isPositioned=!1,h(P=>R(v({},P),{isPositioned:!1})))},[l]);const W=d.useRef(!1);Re(()=>(W.current=!0,()=>{W.current=!1}),[]),Re(()=>{if(w&&(C.current=w),A&&(O.current=A),w&&A){if(_.current)return _.current(w,A,D);D()}},[w,A,D,_,E]);const $=d.useMemo(()=>({reference:C,floating:O,setReference:M,setFloating:b}),[M,b]),j=d.useMemo(()=>({reference:w,floating:A}),[w,A]),q=d.useMemo(()=>{const P={position:n,left:0,top:0};if(!j.floating)return P;const I=jt(j.floating,f.x),z=jt(j.floating,f.y);return a?v(R(v({},P),{transform:"translate("+I+"px, "+z+"px)"}),un(j.floating)>=1.5&&{willChange:"transform"}):{position:n,left:I,top:z}},[n,a,j.floating,f.x,f.y]);return d.useMemo(()=>R(v({},f),{update:D,refs:$,elements:j,floatingStyles:q}),[f,D,$,j,q])}const Po=e=>{function t(n){return{}.hasOwnProperty.call(n,"current")}return{name:"arrow",options:e,fn(n){const{element:r,padding:o}=typeof e=="function"?e(n):e;return r&&t(r)?r.current!=null?Dt({element:r.current,padding:o}).fn(n):{}:r?Dt({element:r,padding:o}).fn(n):{}}}},Oo=(e,t)=>{const n=vo(e);return{name:n.name,fn:n.fn,options:[e,t]}},Lo=(e,t)=>{const n=xo(e);return{name:n.name,fn:n.fn,options:[e,t]}},To=(e,t)=>({fn:Co(e).fn,options:[e,t]}),_o=(e,t)=>{const n=wo(e);return{name:n.name,fn:n.fn,options:[e,t]}},Do=(e,t)=>{const n=bo(e);return{name:n.name,fn:n.fn,options:[e,t]}},jo=(e,t)=>{const n=Mo(e);return{name:n.name,fn:n.fn,options:[e,t]}},No=(e,t)=>{const n=Po(e);return{name:n.name,fn:n.fn,options:[e,t]}};var zo="Arrow",fn=d.forwardRef((e,t)=>{const s=e,{children:n,width:r=10,height:o=5}=s,i=H(s,["children","width","height"]);return N.jsx(ue.svg,R(v({},i),{ref:t,width:r,height:o,viewBox:"0 0 30 10",preserveAspectRatio:"none",children:e.asChild?n:N.jsx("polygon",{points:"0,0 30,0 15,10"})}))});fn.displayName=zo;var Ho=fn;function $o(e){const[t,n]=d.useState(void 0);return ce(()=>{if(e){n({width:e.offsetWidth,height:e.offsetHeight});const r=new ResizeObserver(o=>{if(!Array.isArray(o)||!o.length)return;const i=o[0];let s,a;if("borderBoxSize"in i){const c=i.borderBoxSize,l=Array.isArray(c)?c[0]:c;s=l.inlineSize,a=l.blockSize}else s=e.offsetWidth,a=e.offsetHeight;n({width:s,height:a})});return r.observe(e,{box:"border-box"}),()=>r.unobserve(e)}else n(void 0)},[e]),t}var dn="Popper",[hn,ba]=Ut(dn),[Ma,yn]=hn(dn),pn="PopperAnchor",mn=d.forwardRef((e,t)=>{const l=e,{__scopePopper:n,virtualRef:r}=l,o=H(l,["__scopePopper","virtualRef"]),i=yn(pn,n),s=d.useRef(null),a=ae(t,s),c=d.useRef(null);return d.useEffect(()=>{const f=c.current;c.current=(r==null?void 0:r.current)||s.current,f!==c.current&&i.onAnchorChange(c.current)}),r?null:N.jsx(ue.div,R(v({},o),{ref:a}))});mn.displayName=pn;var ot="PopperContent",[Vo,qo]=hn(ot),gn=d.forwardRef((e,t)=>{var st,at,ct,lt,ut,ft,dt,ht;const it=e,{__scopePopper:n,side:r="bottom",sideOffset:o=0,align:i="center",alignOffset:s=0,arrowPadding:a=0,avoidCollisions:c=!0,collisionBoundary:l=[],collisionPadding:f=0,sticky:h="partial",hideWhenDetached:y=!1,updatePositionStrategy:p="optimized",onPlaced:m}=it,g=H(it,["__scopePopper","side","sideOffset","align","alignOffset","arrowPadding","avoidCollisions","collisionBoundary","collisionPadding","sticky","hideWhenDetached","updatePositionStrategy","onPlaced"]),k=yn(ot,n),[x,M]=d.useState(null),b=ae(t,me=>M(me)),[w,A]=d.useState(null),C=$o(w),O=(st=C==null?void 0:C.width)!=null?st:0,L=(at=C==null?void 0:C.height)!=null?at:0,E=r+(i!=="center"?"-"+i:""),_=typeof f=="number"?f:v({top:0,right:0,bottom:0,left:0},f),T=Array.isArray(l)?l:[l],V=T.length>0,D={padding:_,boundary:T.filter(Fo),altBoundary:V},{refs:W,floatingStyles:$,placement:j,isPositioned:q,middlewareData:P}=Eo({strategy:"fixed",placement:E,whileElementsMounted:(...me)=>ko(...me,{animationFrame:p==="always"}),elements:{reference:k.anchor},middleware:[Oo({mainAxis:o+L,alignmentAxis:s}),c&&Lo(v({mainAxis:!0,crossAxis:!1,limiter:h==="partial"?To():void 0},D)),c&&_o(v({},D)),Do(R(v({},D),{apply:({elements:me,rects:yt,availableWidth:An,availableHeight:Sn})=>{const{width:Rn,height:En}=yt.reference,xe=me.floating.style;xe.setProperty("--radix-popper-available-width",`${An}px`),xe.setProperty("--radix-popper-available-height",`${Sn}px`),xe.setProperty("--radix-popper-anchor-width",`${Rn}px`),xe.setProperty("--radix-popper-anchor-height",`${En}px`)}})),w&&No({element:w,padding:a}),Wo({arrowWidth:O,arrowHeight:L}),y&&jo(v({strategy:"referenceHidden"},D))]}),[I,z]=xn(j),B=Te(m);ce(()=>{q&&(B==null||B())},[q,B]);const ze=(ct=P.arrow)==null?void 0:ct.x,wn=(lt=P.arrow)==null?void 0:lt.y,bn=((ut=P.arrow)==null?void 0:ut.centerOffset)!==0,[Mn,Cn]=d.useState();return ce(()=>{x&&Cn(window.getComputedStyle(x).zIndex)},[x]),N.jsx("div",{ref:W.setFloating,"data-radix-popper-content-wrapper":"",style:v(R(v({},$),{transform:q?$.transform:"translate(0, -200%)",minWidth:"max-content",zIndex:Mn,"--radix-popper-transform-origin":[(ft=P.transformOrigin)==null?void 0:ft.x,(dt=P.transformOrigin)==null?void 0:dt.y].join(" ")}),((ht=P.hide)==null?void 0:ht.referenceHidden)&&{visibility:"hidden",pointerEvents:"none"}),dir:e.dir,children:N.jsx(Vo,{scope:n,placedSide:I,onArrowChange:A,arrowX:ze,arrowY:wn,shouldHideArrow:bn,children:N.jsx(ue.div,R(v({"data-side":I,"data-align":z},g),{ref:b,style:R(v({},g.style),{animation:q?void 0:"none"})}))})})});gn.displayName=ot;var kn="PopperArrow",Io={top:"bottom",right:"left",bottom:"top",left:"right"},vn=d.forwardRef(function(t,n){const a=t,{__scopePopper:r}=a,o=H(a,["__scopePopper"]),i=qo(kn,r),s=Io[i.placedSide];return N.jsx("span",{ref:i.onArrowChange,style:{position:"absolute",left:i.arrowX,top:i.arrowY,[s]:0,transformOrigin:{top:"",right:"0 0",bottom:"center 0",left:"100% 0"}[i.placedSide],transform:{top:"translateY(100%)",right:"translateY(50%) rotate(90deg) translateX(-50%)",bottom:"rotate(180deg)",left:"translateY(50%) rotate(-90deg) translateX(50%)"}[i.placedSide],visibility:i.shouldHideArrow?"hidden":void 0},children:N.jsx(Ho,R(v({},o),{ref:n,style:R(v({},o.style),{display:"block"})}))})});vn.displayName=kn;function Fo(e){return e!==null}var Wo=e=>({name:"transformOrigin",options:e,fn(t){var k,x,M,b,w;const{placement:n,rects:r,middlewareData:o}=t,s=((k=o.arrow)==null?void 0:k.centerOffset)!==0,a=s?0:e.arrowWidth,c=s?0:e.arrowHeight,[l,f]=xn(n),h={start:"0%",center:"50%",end:"100%"}[f],y=((M=(x=o.arrow)==null?void 0:x.x)!=null?M:0)+a/2,p=((w=(b=o.arrow)==null?void 0:b.y)!=null?w:0)+c/2;let m="",g="";return l==="bottom"?(m=s?h:`${y}px`,g=`${-c}px`):l==="top"?(m=s?h:`${y}px`,g=`${r.floating.height+c}px`):l==="right"?(m=`${-c}px`,g=s?h:`${p}px`):l==="left"&&(m=`${r.floating.width+c}px`,g=s?h:`${p}px`),{data:{x:m,y:g}}}});function xn(e){const[t,n="center"]=e.split("-");return[t,n]}var Ca=mn,Aa=gn,Sa=vn;export{Fs as $,Ca as A,Jo as B,Aa as C,Zt as D,Hi as E,qi as F,Zi as G,Gi as H,es as I,la as J,Rs as K,yi as L,ys as M,pi as N,ji as O,ue as P,_s as Q,Kn as R,Ys as S,ua as T,hi as U,Gt as V,va as W,xa as X,Fi as Y,vi as Z,rs as _,Yo as a,bs as a$,Zs as a0,Vi as a1,ti as a2,ki as a3,Ls as a4,ds as a5,ps as a6,Ss as a7,ga as a8,Xs as a9,ta as aA,Oi as aB,Qs as aC,qs as aD,gi as aE,ns as aF,cs as aG,xs as aH,Gs as aI,$i as aJ,Ii as aK,ra as aL,Ki as aM,Es as aN,us as aO,ms as aP,sa as aQ,Ks as aR,hs as aS,Os as aT,ka as aU,ks as aV,_i as aW,Qi as aX,Ai as aY,ia as aZ,zi as a_,ls as aa,Di as ab,si as ac,Bs as ad,Yi as ae,Li as af,Ts as ag,fi as ah,Ri as ai,fs as aj,bi as ak,js as al,Mi as am,Js as an,Ni as ao,ai as ap,wi as aq,Ps as ar,Ms as as,aa as at,li as au,ca as av,$s as aw,as as ax,Ei as ay,Ws as az,Qo as b,Ns as b0,Xi as b1,Ui as b2,pa as b3,Is as b4,Ji as b5,Wi as b6,ci as b7,wa as b8,di as b9,Bi as bA,ts as ba,ha as bb,oi as bc,ni as bd,ii as be,ri as bf,ss as bg,is as bh,ya as bi,Ds as bj,na as bk,Ti as bl,os as bm,Hs as bn,ui as bo,As as bp,zs as bq,ma as br,da as bs,ws as bt,Us as bu,gs as bv,Ci as bw,oa as bx,Cs as by,ea as bz,Zo as c,wr as d,$e as e,Te as f,Dn as g,Ko as h,Go as i,Ut as j,vr as k,ce as l,ur as m,ei as n,re as o,ba as p,Sa as q,d as r,Si as s,xi as t,ae as u,Pi as v,vs as w,fa as x,Vs as y,mi as z};

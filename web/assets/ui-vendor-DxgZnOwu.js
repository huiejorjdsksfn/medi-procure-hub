var zo=Object.defineProperty,Bo=Object.defineProperties;var Wo=Object.getOwnPropertyDescriptors;var nt=Object.getOwnPropertySymbols;var bn=Object.prototype.hasOwnProperty,Sn=Object.prototype.propertyIsEnumerable;var kn=(e,t,n)=>t in e?zo(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,k=(e,t)=>{for(var n in t||(t={}))bn.call(t,n)&&kn(e,n,t[n]);if(nt)for(var n of nt(t))Sn.call(t,n)&&kn(e,n,t[n]);return e},E=(e,t)=>Bo(e,Wo(t));var N=(e,t)=>{var n={};for(var r in e)bn.call(e,r)&&t.indexOf(r)<0&&(n[r]=e[r]);if(e!=null&&nt)for(var r of nt(e))t.indexOf(r)<0&&Sn.call(e,r)&&(n[r]=e[r]);return n};var ie=(e,t,n)=>new Promise((r,o)=>{var a=c=>{try{i(n.next(c))}catch(u){o(u)}},s=c=>{try{i(n.throw(c))}catch(u){o(u)}},i=c=>c.done?r(c.value):Promise.resolve(c.value).then(a,s);i((n=n.apply(e,t)).next())});import{r as kt,R as qo}from"./react-vendor-eZ_tfyQJ.js";import{j as C}from"./query-vendor-DN67sy9X.js";import{_ as Se,a as Xn,b as $o}from"./supabase-vendor-BaQoRFJY.js";function Uo(e,t){for(var n=0;n<t.length;n++){const r=t[n];if(typeof r!="string"&&!Array.isArray(r)){for(const o in r)if(o!=="default"&&!(o in e)){const a=Object.getOwnPropertyDescriptor(r,o);a&&Object.defineProperty(e,o,a.get?a:{enumerable:!0,get:()=>r[o]})}}}return Object.freeze(Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}))}var Dc=typeof globalThis!="undefined"?globalThis:typeof window!="undefined"?window:typeof global!="undefined"?global:typeof self!="undefined"?self:{};function Ko(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}function jc(e){if(e.__esModule)return e;var t=e.default;if(typeof t=="function"){var n=function r(){return this instanceof r?Reflect.construct(t,arguments,this.constructor):t.apply(this,arguments)};n.prototype=t.prototype}else n={};return Object.defineProperty(n,"__esModule",{value:!0}),Object.keys(e).forEach(function(r){var o=Object.getOwnPropertyDescriptor(e,r);Object.defineProperty(n,r,o.get?o:{enumerable:!0,get:function(){return e[r]}})}),n}var Qn={exports:{}},L={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Je=Symbol.for("react.element"),Go=Symbol.for("react.portal"),Yo=Symbol.for("react.fragment"),Zo=Symbol.for("react.strict_mode"),Xo=Symbol.for("react.profiler"),Qo=Symbol.for("react.provider"),Jo=Symbol.for("react.context"),ea=Symbol.for("react.forward_ref"),ta=Symbol.for("react.suspense"),na=Symbol.for("react.memo"),ra=Symbol.for("react.lazy"),Cn=Symbol.iterator;function oa(e){return e===null||typeof e!="object"?null:(e=Cn&&e[Cn]||e["@@iterator"],typeof e=="function"?e:null)}var Jn={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},er=Object.assign,tr={};function Be(e,t,n){this.props=e,this.context=t,this.refs=tr,this.updater=n||Jn}Be.prototype.isReactComponent={};Be.prototype.setState=function(e,t){if(typeof e!="object"&&typeof e!="function"&&e!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,e,t,"setState")};Be.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")};function nr(){}nr.prototype=Be.prototype;function en(e,t,n){this.props=e,this.context=t,this.refs=tr,this.updater=n||Jn}var tn=en.prototype=new nr;tn.constructor=en;er(tn,Be.prototype);tn.isPureReactComponent=!0;var Mn=Array.isArray,rr=Object.prototype.hasOwnProperty,nn={current:null},or={key:!0,ref:!0,__self:!0,__source:!0};function ar(e,t,n){var r,o={},a=null,s=null;if(t!=null)for(r in t.ref!==void 0&&(s=t.ref),t.key!==void 0&&(a=""+t.key),t)rr.call(t,r)&&!or.hasOwnProperty(r)&&(o[r]=t[r]);var i=arguments.length-2;if(i===1)o.children=n;else if(1<i){for(var c=Array(i),u=0;u<i;u++)c[u]=arguments[u+2];o.children=c}if(e&&e.defaultProps)for(r in i=e.defaultProps,i)o[r]===void 0&&(o[r]=i[r]);return{$$typeof:Je,type:e,key:a,ref:s,props:o,_owner:nn.current}}function aa(e,t){return{$$typeof:Je,type:e.type,key:t,ref:e.ref,props:e.props,_owner:e._owner}}function rn(e){return typeof e=="object"&&e!==null&&e.$$typeof===Je}function ia(e){var t={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,function(n){return t[n]})}var En=/\/+/g;function _t(e,t){return typeof e=="object"&&e!==null&&e.key!=null?ia(""+e.key):t.toString(36)}function ut(e,t,n,r,o){var a=typeof e;(a==="undefined"||a==="boolean")&&(e=null);var s=!1;if(e===null)s=!0;else switch(a){case"string":case"number":s=!0;break;case"object":switch(e.$$typeof){case Je:case Go:s=!0}}if(s)return s=e,o=o(s),e=r===""?"."+_t(s,0):r,Mn(o)?(n="",e!=null&&(n=e.replace(En,"$&/")+"/"),ut(o,t,n,"",function(u){return u})):o!=null&&(rn(o)&&(o=aa(o,n+(!o.key||s&&s.key===o.key?"":(""+o.key).replace(En,"$&/")+"/")+e)),t.push(o)),1;if(s=0,r=r===""?".":r+":",Mn(e))for(var i=0;i<e.length;i++){a=e[i];var c=r+_t(a,i);s+=ut(a,t,n,c,o)}else if(c=oa(e),typeof c=="function")for(e=c.call(e),i=0;!(a=e.next()).done;)a=a.value,c=r+_t(a,i++),s+=ut(a,t,n,c,o);else if(a==="object")throw t=String(e),Error("Objects are not valid as a React child (found: "+(t==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":t)+"). If you meant to render a collection of children, use an array instead.");return s}function rt(e,t,n){if(e==null)return e;var r=[],o=0;return ut(e,r,"","",function(a){return t.call(n,a,o++)}),r}function sa(e){if(e._status===-1){var t=e._result;t=t(),t.then(function(n){(e._status===0||e._status===-1)&&(e._status=1,e._result=n)},function(n){(e._status===0||e._status===-1)&&(e._status=2,e._result=n)}),e._status===-1&&(e._status=0,e._result=t)}if(e._status===1)return e._result.default;throw e._result}var te={current:null},dt={transition:null},ca={ReactCurrentDispatcher:te,ReactCurrentBatchConfig:dt,ReactCurrentOwner:nn};function ir(){throw Error("act(...) is not supported in production builds of React.")}L.Children={map:rt,forEach:function(e,t,n){rt(e,function(){t.apply(this,arguments)},n)},count:function(e){var t=0;return rt(e,function(){t++}),t},toArray:function(e){return rt(e,function(t){return t})||[]},only:function(e){if(!rn(e))throw Error("React.Children.only expected to receive a single React element child.");return e}};L.Component=Be;L.Fragment=Yo;L.Profiler=Xo;L.PureComponent=en;L.StrictMode=Zo;L.Suspense=ta;L.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=ca;L.act=ir;L.cloneElement=function(e,t,n){if(e==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+e+".");var r=er({},e.props),o=e.key,a=e.ref,s=e._owner;if(t!=null){if(t.ref!==void 0&&(a=t.ref,s=nn.current),t.key!==void 0&&(o=""+t.key),e.type&&e.type.defaultProps)var i=e.type.defaultProps;for(c in t)rr.call(t,c)&&!or.hasOwnProperty(c)&&(r[c]=t[c]===void 0&&i!==void 0?i[c]:t[c])}var c=arguments.length-2;if(c===1)r.children=n;else if(1<c){i=Array(c);for(var u=0;u<c;u++)i[u]=arguments[u+2];r.children=i}return{$$typeof:Je,type:e.type,key:o,ref:a,props:r,_owner:s}};L.createContext=function(e){return e={$$typeof:Jo,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},e.Provider={$$typeof:Qo,_context:e},e.Consumer=e};L.createElement=ar;L.createFactory=function(e){var t=ar.bind(null,e);return t.type=e,t};L.createRef=function(){return{current:null}};L.forwardRef=function(e){return{$$typeof:ea,render:e}};L.isValidElement=rn;L.lazy=function(e){return{$$typeof:ra,_payload:{_status:-1,_result:e},_init:sa}};L.memo=function(e,t){return{$$typeof:na,type:e,compare:t===void 0?null:t}};L.startTransition=function(e){var t=dt.transition;dt.transition={};try{e()}finally{dt.transition=t}};L.unstable_act=ir;L.useCallback=function(e,t){return te.current.useCallback(e,t)};L.useContext=function(e){return te.current.useContext(e)};L.useDebugValue=function(){};L.useDeferredValue=function(e){return te.current.useDeferredValue(e)};L.useEffect=function(e,t){return te.current.useEffect(e,t)};L.useId=function(){return te.current.useId()};L.useImperativeHandle=function(e,t,n){return te.current.useImperativeHandle(e,t,n)};L.useInsertionEffect=function(e,t){return te.current.useInsertionEffect(e,t)};L.useLayoutEffect=function(e,t){return te.current.useLayoutEffect(e,t)};L.useMemo=function(e,t){return te.current.useMemo(e,t)};L.useReducer=function(e,t,n){return te.current.useReducer(e,t,n)};L.useRef=function(e){return te.current.useRef(e)};L.useState=function(e){return te.current.useState(e)};L.useSyncExternalStore=function(e,t,n){return te.current.useSyncExternalStore(e,t,n)};L.useTransition=function(){return te.current.useTransition()};L.version="18.3.1";Qn.exports=L;var l=Qn.exports;const ke=Ko(l),sr=Uo({__proto__:null,default:ke},[l]);function G(e,t,{checkForDefaultPrevented:n=!0}={}){return function(o){if(e==null||e(o),n===!1||!o.defaultPrevented)return t==null?void 0:t(o)}}function Rn(e,t){if(typeof e=="function")return e(t);e!=null&&(e.current=t)}function cr(...e){return t=>{let n=!1;const r=e.map(o=>{const a=Rn(o,t);return!n&&typeof a=="function"&&(n=!0),a});if(n)return()=>{for(let o=0;o<r.length;o++){const a=r[o];typeof a=="function"?a():Rn(e[o],null)}}}}function X(...e){return l.useCallback(cr(...e),e)}function la(e,t){const n=l.createContext(t),r=a=>{const u=a,{children:s}=u,i=N(u,["children"]),c=l.useMemo(()=>i,Object.values(i));return C.jsx(n.Provider,{value:c,children:s})};r.displayName=e+"Provider";function o(a){const s=l.useContext(n);if(s)return s;if(t!==void 0)return t;throw new Error(`\`${a}\` must be used within \`${e}\``)}return[r,o]}function bt(e,t=[]){let n=[];function r(a,s){const i=l.createContext(s),c=n.length;n=[...n,s];const u=h=>{var x;const w=h,{scope:p,children:v}=w,b=N(w,["scope","children"]),y=((x=p==null?void 0:p[e])==null?void 0:x[c])||i,d=l.useMemo(()=>b,Object.values(b));return C.jsx(y.Provider,{value:d,children:v})};u.displayName=a+"Provider";function f(h,p){var y;const v=((y=p==null?void 0:p[e])==null?void 0:y[c])||i,b=l.useContext(v);if(b)return b;if(s!==void 0)return s;throw new Error(`\`${h}\` must be used within \`${a}\``)}return[u,f]}const o=()=>{const a=n.map(s=>l.createContext(s));return function(i){const c=(i==null?void 0:i[e])||a;return l.useMemo(()=>({[`__scope${e}`]:E(k({},i),{[e]:c})}),[i,c])}};return o.scopeName=e,[r,ua(o,...t)]}function ua(...e){const t=e[0];if(e.length===1)return t;const n=()=>{const r=e.map(o=>({useScope:o(),scopeName:o.scopeName}));return function(a){const s=r.reduce((i,{useScope:c,scopeName:u})=>{const h=c(a)[`__scope${u}`];return k(k({},i),h)},{});return l.useMemo(()=>({[`__scope${t.scopeName}`]:s}),[s])}};return n.scopeName=t.scopeName,n}function Ve(e){const t=da(e),n=l.forwardRef((r,o)=>{const u=r,{children:a}=u,s=N(u,["children"]),i=l.Children.toArray(a),c=i.find(fa);if(c){const f=c.props.children,h=i.map(p=>p===c?l.Children.count(f)>1?l.Children.only(null):l.isValidElement(f)?f.props.children:null:p);return C.jsx(t,E(k({},s),{ref:o,children:l.isValidElement(f)?l.cloneElement(f,void 0,h):null}))}return C.jsx(t,E(k({},s),{ref:o,children:a}))});return n.displayName=`${e}.Slot`,n}var Fc=Ve("Slot");function da(e){const t=l.forwardRef((n,r)=>{const s=n,{children:o}=s,a=N(s,["children"]);if(l.isValidElement(o)){const i=pa(o),c=ha(a,o.props);return o.type!==l.Fragment&&(c.ref=r?cr(r,i):i),l.cloneElement(o,c)}return l.Children.count(o)>1?l.Children.only(null):null});return t.displayName=`${e}.SlotClone`,t}var lr=Symbol("radix.slottable");function Hc(e){const t=({children:n})=>C.jsx(C.Fragment,{children:n});return t.displayName=`${e}.Slottable`,t.__radixId=lr,t}function fa(e){return l.isValidElement(e)&&typeof e.type=="function"&&"__radixId"in e.type&&e.type.__radixId===lr}function ha(e,t){const n=k({},t);for(const r in t){const o=e[r],a=t[r];/^on[A-Z]/.test(r)?o&&a?n[r]=(...i)=>{const c=a(...i);return o(...i),c}:o&&(n[r]=o):r==="style"?n[r]=k(k({},o),a):r==="className"&&(n[r]=[o,a].filter(Boolean).join(" "))}return k(k({},e),n)}function pa(e){var r,o;let t=(r=Object.getOwnPropertyDescriptor(e.props,"ref"))==null?void 0:r.get,n=t&&"isReactWarning"in t&&t.isReactWarning;return n?e.ref:(t=(o=Object.getOwnPropertyDescriptor(e,"ref"))==null?void 0:o.get,n=t&&"isReactWarning"in t&&t.isReactWarning,n?e.props.ref:e.props.ref||e.ref)}function ya(e){const t=e+"CollectionProvider",[n,r]=bt(t),[o,a]=n(t,{collectionRef:{current:null},itemMap:new Map}),s=y=>{const{scope:d,children:w}=y,x=ke.useRef(null),g=ke.useRef(new Map).current;return C.jsx(o,{scope:d,itemMap:g,collectionRef:x,children:w})};s.displayName=t;const i=e+"CollectionSlot",c=Ve(i),u=ke.forwardRef((y,d)=>{const{scope:w,children:x}=y,g=a(i,w),S=X(d,g.collectionRef);return C.jsx(c,{ref:S,children:x})});u.displayName=i;const f=e+"CollectionItemSlot",h="data-radix-collection-item",p=Ve(f),v=ke.forwardRef((y,d)=>{const A=y,{scope:w,children:x}=A,g=N(A,["scope","children"]),S=ke.useRef(null),M=X(d,S),R=a(f,w);return ke.useEffect(()=>(R.itemMap.set(S,k({ref:S},g)),()=>void R.itemMap.delete(S))),C.jsx(p,{[h]:"",ref:M,children:x})});v.displayName=f;function b(y){const d=a(e+"CollectionConsumer",y);return ke.useCallback(()=>{const x=d.collectionRef.current;if(!x)return[];const g=Array.from(x.querySelectorAll(`[${h}]`));return Array.from(d.itemMap.values()).sort((R,A)=>g.indexOf(R.ref.current)-g.indexOf(A.ref.current))},[d.collectionRef,d.itemMap])}return[{Provider:s,Slot:u,ItemSlot:v},b,r]}var ma=["a","button","div","form","h2","h3","img","input","label","li","nav","ol","p","select","span","svg","ul"],$=ma.reduce((e,t)=>{const n=Ve(`Primitive.${t}`),r=l.forwardRef((o,a)=>{const u=o,{asChild:s}=u,i=N(u,["asChild"]),c=s?n:t;return typeof window!="undefined"&&(window[Symbol.for("radix-ui")]=!0),C.jsx(c,E(k({},i),{ref:a}))});return r.displayName=`Primitive.${t}`,E(k({},e),{[t]:r})},{});function va(e,t){e&&kt.flushSync(()=>e.dispatchEvent(t))}function Ae(e){const t=l.useRef(e);return l.useEffect(()=>{t.current=e}),l.useMemo(()=>(...n)=>{var r;return(r=t.current)==null?void 0:r.call(t,...n)},[])}function ga(e,t=globalThis==null?void 0:globalThis.document){const n=Ae(e);l.useEffect(()=>{const r=o=>{o.key==="Escape"&&n(o)};return t.addEventListener("keydown",r,{capture:!0}),()=>t.removeEventListener("keydown",r,{capture:!0})},[n,t])}var xa="DismissableLayer",Wt="dismissableLayer.update",wa="dismissableLayer.pointerDownOutside",ka="dismissableLayer.focusOutside",An,ur=l.createContext({layers:new Set,layersWithOutsidePointerEventsDisabled:new Set,branches:new Set}),St=l.forwardRef((e,t)=>{var T;const A=e,{disableOutsidePointerEvents:n=!1,onEscapeKeyDown:r,onPointerDownOutside:o,onFocusOutside:a,onInteractOutside:s,onDismiss:i}=A,c=N(A,["disableOutsidePointerEvents","onEscapeKeyDown","onPointerDownOutside","onFocusOutside","onInteractOutside","onDismiss"]),u=l.useContext(ur),[f,h]=l.useState(null),p=(T=f==null?void 0:f.ownerDocument)!=null?T:globalThis==null?void 0:globalThis.document,[,v]=l.useState({}),b=X(t,P=>h(P)),y=Array.from(u.layers),[d]=[...u.layersWithOutsidePointerEventsDisabled].slice(-1),w=y.indexOf(d),x=f?y.indexOf(f):-1,g=u.layersWithOutsidePointerEventsDisabled.size>0,S=x>=w,M=Sa(P=>{const H=P.target,V=[...u.branches].some(j=>j.contains(H));!S||V||(o==null||o(P),s==null||s(P),P.defaultPrevented||i==null||i())},p),R=Ca(P=>{const H=P.target;[...u.branches].some(j=>j.contains(H))||(a==null||a(P),s==null||s(P),P.defaultPrevented||i==null||i())},p);return ga(P=>{x===u.layers.size-1&&(r==null||r(P),!P.defaultPrevented&&i&&(P.preventDefault(),i()))},p),l.useEffect(()=>{if(f)return n&&(u.layersWithOutsidePointerEventsDisabled.size===0&&(An=p.body.style.pointerEvents,p.body.style.pointerEvents="none"),u.layersWithOutsidePointerEventsDisabled.add(f)),u.layers.add(f),Pn(),()=>{n&&u.layersWithOutsidePointerEventsDisabled.size===1&&(p.body.style.pointerEvents=An)}},[f,p,n,u]),l.useEffect(()=>()=>{f&&(u.layers.delete(f),u.layersWithOutsidePointerEventsDisabled.delete(f),Pn())},[f,u]),l.useEffect(()=>{const P=()=>v({});return document.addEventListener(Wt,P),()=>document.removeEventListener(Wt,P)},[]),C.jsx($.div,E(k({},c),{ref:b,style:k({pointerEvents:g?S?"auto":"none":void 0},e.style),onFocusCapture:G(e.onFocusCapture,R.onFocusCapture),onBlurCapture:G(e.onBlurCapture,R.onBlurCapture),onPointerDownCapture:G(e.onPointerDownCapture,M.onPointerDownCapture)}))});St.displayName=xa;var ba="DismissableLayerBranch",dr=l.forwardRef((e,t)=>{const n=l.useContext(ur),r=l.useRef(null),o=X(t,r);return l.useEffect(()=>{const a=r.current;if(a)return n.branches.add(a),()=>{n.branches.delete(a)}},[n.branches]),C.jsx($.div,E(k({},e),{ref:o}))});dr.displayName=ba;function Sa(e,t=globalThis==null?void 0:globalThis.document){const n=Ae(e),r=l.useRef(!1),o=l.useRef(()=>{});return l.useEffect(()=>{const a=i=>{if(i.target&&!r.current){let c=function(){fr(wa,n,u,{discrete:!0})};const u={originalEvent:i};i.pointerType==="touch"?(t.removeEventListener("click",o.current),o.current=c,t.addEventListener("click",o.current,{once:!0})):c()}else t.removeEventListener("click",o.current);r.current=!1},s=window.setTimeout(()=>{t.addEventListener("pointerdown",a)},0);return()=>{window.clearTimeout(s),t.removeEventListener("pointerdown",a),t.removeEventListener("click",o.current)}},[t,n]),{onPointerDownCapture:()=>r.current=!0}}function Ca(e,t=globalThis==null?void 0:globalThis.document){const n=Ae(e),r=l.useRef(!1);return l.useEffect(()=>{const o=a=>{a.target&&!r.current&&fr(ka,n,{originalEvent:a},{discrete:!1})};return t.addEventListener("focusin",o),()=>t.removeEventListener("focusin",o)},[t,n]),{onFocusCapture:()=>r.current=!0,onBlurCapture:()=>r.current=!1}}function Pn(){const e=new CustomEvent(Wt);document.dispatchEvent(e)}function fr(e,t,n,{discrete:r}){const o=n.originalEvent.target,a=new CustomEvent(e,{bubbles:!1,cancelable:!0,detail:n});t&&o.addEventListener(e,t,{once:!0}),r?va(o,a):o.dispatchEvent(a)}var Vc=St,zc=dr,ee=globalThis!=null&&globalThis.document?l.useLayoutEffect:()=>{},Ma="Portal",on=l.forwardRef((e,t)=>{var c;const i=e,{container:n}=i,r=N(i,["container"]),[o,a]=l.useState(!1);ee(()=>a(!0),[]);const s=n||o&&((c=globalThis==null?void 0:globalThis.document)==null?void 0:c.body);return s?qo.createPortal(C.jsx($.div,E(k({},r),{ref:t})),s):null});on.displayName=Ma;function Ea(e,t){return l.useReducer((n,r)=>{const o=t[n][r];return o!=null?o:n},e)}var Ct=e=>{const{present:t,children:n}=e,r=Ra(t),o=typeof n=="function"?n({present:r.isPresent}):l.Children.only(n),a=X(r.ref,Aa(o));return typeof n=="function"||r.isPresent?l.cloneElement(o,{ref:a}):null};Ct.displayName="Presence";function Ra(e){const[t,n]=l.useState(),r=l.useRef(null),o=l.useRef(e),a=l.useRef("none"),s=e?"mounted":"unmounted",[i,c]=Ea(s,{mounted:{UNMOUNT:"unmounted",ANIMATION_OUT:"unmountSuspended"},unmountSuspended:{MOUNT:"mounted",ANIMATION_END:"unmounted"},unmounted:{MOUNT:"mounted"}});return l.useEffect(()=>{const u=ot(r.current);a.current=i==="mounted"?u:"none"},[i]),ee(()=>{const u=r.current,f=o.current;if(f!==e){const p=a.current,v=ot(u);e?c("MOUNT"):v==="none"||(u==null?void 0:u.display)==="none"?c("UNMOUNT"):c(f&&p!==v?"ANIMATION_OUT":"UNMOUNT"),o.current=e}},[e,c]),ee(()=>{var u;if(t){let f;const h=(u=t.ownerDocument.defaultView)!=null?u:window,p=b=>{const d=ot(r.current).includes(b.animationName);if(b.target===t&&d&&(c("ANIMATION_END"),!o.current)){const w=t.style.animationFillMode;t.style.animationFillMode="forwards",f=h.setTimeout(()=>{t.style.animationFillMode==="forwards"&&(t.style.animationFillMode=w)})}},v=b=>{b.target===t&&(a.current=ot(r.current))};return t.addEventListener("animationstart",v),t.addEventListener("animationcancel",p),t.addEventListener("animationend",p),()=>{h.clearTimeout(f),t.removeEventListener("animationstart",v),t.removeEventListener("animationcancel",p),t.removeEventListener("animationend",p)}}else c("ANIMATION_END")},[t,c]),{isPresent:["mounted","unmountSuspended"].includes(i),ref:l.useCallback(u=>{r.current=u?getComputedStyle(u):null,n(u)},[])}}function ot(e){return(e==null?void 0:e.animationName)||"none"}function Aa(e){var r,o;let t=(r=Object.getOwnPropertyDescriptor(e.props,"ref"))==null?void 0:r.get,n=t&&"isReactWarning"in t&&t.isReactWarning;return n?e.ref:(t=(o=Object.getOwnPropertyDescriptor(e,"ref"))==null?void 0:o.get,n=t&&"isReactWarning"in t&&t.isReactWarning,n?e.props.ref:e.props.ref||e.ref)}var Pa=sr[" useInsertionEffect ".trim().toString()]||ee;function qt({prop:e,defaultProp:t,onChange:n=()=>{},caller:r}){const[o,a,s]=Ta({defaultProp:t,onChange:n}),i=e!==void 0,c=i?e:o;{const f=l.useRef(e!==void 0);l.useEffect(()=>{const h=f.current;h!==i&&console.warn(`${r} is changing from ${h?"controlled":"uncontrolled"} to ${i?"controlled":"uncontrolled"}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`),f.current=i},[i,r])}const u=l.useCallback(f=>{var h;if(i){const p=Oa(f)?f(e):f;p!==e&&((h=s.current)==null||h.call(s,p))}else a(f)},[i,e,a,s]);return[c,u]}function Ta({defaultProp:e,onChange:t}){const[n,r]=l.useState(e),o=l.useRef(n),a=l.useRef(t);return Pa(()=>{a.current=t},[t]),l.useEffect(()=>{var s;o.current!==n&&((s=a.current)==null||s.call(a,n),o.current=n)},[n,o]),[n,r,a]}function Oa(e){return typeof e=="function"}var hr=Object.freeze({position:"absolute",border:0,width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",wordWrap:"normal"}),Na="VisuallyHidden",pr=l.forwardRef((e,t)=>C.jsx($.span,E(k({},e),{ref:t,style:k(k({},hr),e.style)})));pr.displayName=Na;var Bc=pr;/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _a=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),yr=(...e)=>e.filter((t,n,r)=>!!t&&t.trim()!==""&&r.indexOf(t)===n).join(" ").trim();/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var Ia={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const La=l.forwardRef((u,c)=>{var f=u,{color:e="currentColor",size:t=24,strokeWidth:n=2,absoluteStrokeWidth:r,className:o="",children:a,iconNode:s}=f,i=N(f,["color","size","strokeWidth","absoluteStrokeWidth","className","children","iconNode"]);return l.createElement("svg",k(E(k({ref:c},Ia),{width:t,height:t,stroke:e,strokeWidth:r?Number(n)*24/Number(t):n,className:yr("lucide",o)}),i),[...s.map(([h,p])=>l.createElement(h,p)),...Array.isArray(a)?a:[a]])});/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=(e,t)=>{const n=l.forwardRef((s,a)=>{var i=s,{className:r}=i,o=N(i,["className"]);return l.createElement(La,k({ref:a,iconNode:t,className:yr(`lucide-${_a(e)}`,r)},o))});return n.displayName=`${e}`,n};/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wc=m("Activity",[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qc=m("ArchiveRestore",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h2",key:"tvwodi"}],["path",{d:"M20 8v11a2 2 0 0 1-2 2h-2",key:"1gkqxj"}],["path",{d:"m9 15 3-3 3 3",key:"1pd0qc"}],["path",{d:"M12 12v9",key:"192myk"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $c=m("Archive",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Uc=m("ArrowDown",[["path",{d:"M12 5v14",key:"s699le"}],["path",{d:"m19 12-7 7-7-7",key:"1idqje"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kc=m("ArrowLeft",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gc=m("ArrowRightLeft",[["path",{d:"m16 3 4 4-4 4",key:"1x1c3m"}],["path",{d:"M20 7H4",key:"zbl0bi"}],["path",{d:"m8 21-4-4 4-4",key:"h9nckh"}],["path",{d:"M4 17h16",key:"g4d7ey"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yc=m("ArrowRight",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zc=m("ArrowUp",[["path",{d:"m5 12 7-7 7 7",key:"hav0vg"}],["path",{d:"M12 19V5",key:"x0mq9r"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xc=m("Bell",[["path",{d:"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9",key:"1qo2s2"}],["path",{d:"M10.3 21a1.94 1.94 0 0 0 3.4 0",key:"qgo35s"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qc=m("BookMarked",[["path",{d:"M10 2v8l3-3 3 3V2",key:"sqw3rj"}],["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20",key:"k3hazp"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jc=m("BookOpen",[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const el=m("Bot",[["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tl=m("Boxes",[["path",{d:"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z",key:"lc1i9w"}],["path",{d:"m7 16.5-4.74-2.85",key:"1o9zyk"}],["path",{d:"m7 16.5 5-3",key:"va8pkn"}],["path",{d:"M7 16.5v5.17",key:"jnp8gn"}],["path",{d:"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z",key:"8zsnat"}],["path",{d:"m17 16.5-5-3",key:"8arw3v"}],["path",{d:"m17 16.5 4.74-2.85",key:"8rfmw"}],["path",{d:"M17 16.5v5.17",key:"k6z78m"}],["path",{d:"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z",key:"1xygjf"}],["path",{d:"M12 8 7.26 5.15",key:"1vbdud"}],["path",{d:"m12 8 4.74-2.85",key:"3rx089"}],["path",{d:"M12 13.5V8",key:"1io7kd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nl=m("Bug",[["path",{d:"m8 2 1.88 1.88",key:"fmnt4t"}],["path",{d:"M14.12 3.88 16 2",key:"qol33r"}],["path",{d:"M9 7.13v-1a3.003 3.003 0 1 1 6 0v1",key:"d7y7pr"}],["path",{d:"M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6",key:"xs1cw7"}],["path",{d:"M12 20v-9",key:"1qisl0"}],["path",{d:"M6.53 9C4.6 8.8 3 7.1 3 5",key:"32zzws"}],["path",{d:"M6 13H2",key:"82j7cp"}],["path",{d:"M3 21c0-2.1 1.7-3.9 3.8-4",key:"4p0ekp"}],["path",{d:"M20.97 5c0 2.1-1.6 3.8-3.5 4",key:"18gb23"}],["path",{d:"M22 13h-4",key:"1jl80f"}],["path",{d:"M17.2 17c2.1.1 3.8 1.9 3.8 4",key:"k3fwyw"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rl=m("Building2",[["path",{d:"M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z",key:"1b4qmf"}],["path",{d:"M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2",key:"i71pzd"}],["path",{d:"M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2",key:"10jefs"}],["path",{d:"M10 6h4",key:"1itunk"}],["path",{d:"M10 10h4",key:"tcdvrf"}],["path",{d:"M10 14h4",key:"kelpxr"}],["path",{d:"M10 18h4",key:"1ulq68"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ol=m("Calendar",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const al=m("Camera",[["path",{d:"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",key:"1tc9qg"}],["circle",{cx:"12",cy:"13",r:"3",key:"1vg3eu"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const il=m("ChartColumn",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sl=m("ChartNoAxesColumn",[["line",{x1:"18",x2:"18",y1:"20",y2:"10",key:"1xfpm4"}],["line",{x1:"12",x2:"12",y1:"20",y2:"4",key:"be30l9"}],["line",{x1:"6",x2:"6",y1:"20",y2:"14",key:"1r4le6"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cl=m("CheckCheck",[["path",{d:"M18 6 7 17l-5-5",key:"116fxf"}],["path",{d:"m22 10-7.5 7.5L13 16",key:"ke71qq"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ll=m("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ul=m("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dl=m("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fl=m("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hl=m("ChevronUp",[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pl=m("ChevronsLeft",[["path",{d:"m11 17-5-5 5-5",key:"13zhaf"}],["path",{d:"m18 17-5-5 5-5",key:"h8a8et"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yl=m("ChevronsRight",[["path",{d:"m6 17 5-5-5-5",key:"xnjwq"}],["path",{d:"m13 17 5-5-5-5",key:"17xmmf"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ml=m("CircleAlert",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vl=m("CircleCheckBig",[["path",{d:"M21.801 10A10 10 0 1 1 17 3.335",key:"yps3ct"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gl=m("CircleCheck",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xl=m("CircleUser",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}],["path",{d:"M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662",key:"154egf"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wl=m("CircleX",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kl=m("ClipboardList",[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bl=m("Clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sl=m("CodeXml",[["path",{d:"m18 16 4-4-4-4",key:"1inbqp"}],["path",{d:"m6 8-4 4 4 4",key:"15zrgr"}],["path",{d:"m14.5 4-5 16",key:"e7oirm"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cl=m("Copy",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ml=m("CornerUpLeft",[["polyline",{points:"9 14 4 9 9 4",key:"881910"}],["path",{d:"M20 20v-7a4 4 0 0 0-4-4H4",key:"1nkjon"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const El=m("Cpu",[["rect",{width:"16",height:"16",x:"4",y:"4",rx:"2",key:"14l7u7"}],["rect",{width:"6",height:"6",x:"9",y:"9",rx:"1",key:"5aljv4"}],["path",{d:"M15 2v2",key:"13l42r"}],["path",{d:"M15 20v2",key:"15mkzm"}],["path",{d:"M2 15h2",key:"1gxd5l"}],["path",{d:"M2 9h2",key:"1bbxkp"}],["path",{d:"M20 15h2",key:"19e6y8"}],["path",{d:"M20 9h2",key:"19tzq7"}],["path",{d:"M9 2v2",key:"165o2o"}],["path",{d:"M9 20v2",key:"i2bqo8"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rl=m("Database",[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Al=m("DollarSign",[["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",key:"1b0p4s"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pl=m("Download",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tl=m("ExternalLink",[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ol=m("EyeOff",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nl=m("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _l=m("FileChartColumnIncreasing",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M8 18v-2",key:"qcmpov"}],["path",{d:"M12 18v-4",key:"q1q25u"}],["path",{d:"M16 18v-6",key:"15y0np"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Il=m("FileCheck",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"m9 15 2 2 4-4",key:"1grp1n"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ll=m("FileSpreadsheet",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M8 13h2",key:"yr2amv"}],["path",{d:"M14 13h2",key:"un5t4a"}],["path",{d:"M8 17h2",key:"2yhykz"}],["path",{d:"M14 17h2",key:"10kma7"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dl=m("FileText",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jl=m("File",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fl=m("Filter",[["polygon",{points:"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3",key:"1yg77f"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hl=m("FolderOpen",[["path",{d:"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",key:"usdka0"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vl=m("Forward",[["polyline",{points:"15 17 20 12 15 7",key:"1w3sku"}],["path",{d:"M4 18v-2a4 4 0 0 1 4-4h12",key:"jmiej9"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zl=m("Gavel",[["path",{d:"m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8",key:"15492f"}],["path",{d:"m16 16 6-6",key:"vzrcl6"}],["path",{d:"m8 8 6-6",key:"18bi4p"}],["path",{d:"m9 7 8 8",key:"5jnvq1"}],["path",{d:"m21 11-8-8",key:"z4y7zo"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bl=m("GitBranch",[["line",{x1:"6",x2:"6",y1:"3",y2:"15",key:"17qcm7"}],["circle",{cx:"18",cy:"6",r:"3",key:"1h7g24"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}],["path",{d:"M18 9a9 9 0 0 1-9 9",key:"n2h4wq"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wl=m("Globe",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ql=m("HardDrive",[["line",{x1:"22",x2:"2",y1:"12",y2:"12",key:"1y58io"}],["path",{d:"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",key:"oot6mr"}],["line",{x1:"6",x2:"6.01",y1:"16",y2:"16",key:"sgf278"}],["line",{x1:"10",x2:"10.01",y1:"16",y2:"16",key:"1l4acy"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $l=m("Hash",[["line",{x1:"4",x2:"20",y1:"9",y2:"9",key:"4lhtct"}],["line",{x1:"4",x2:"20",y1:"15",y2:"15",key:"vyu0kd"}],["line",{x1:"10",x2:"8",y1:"3",y2:"21",key:"1ggp8o"}],["line",{x1:"16",x2:"14",y1:"3",y2:"21",key:"weycgp"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ul=m("Heart",[["path",{d:"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",key:"c3ymky"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kl=m("House",[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"1d0kgt"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gl=m("Image",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yl=m("Inbox",[["polyline",{points:"22 12 16 12 14 15 10 15 8 12 2 12",key:"o97t9d"}],["path",{d:"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",key:"oot6mr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zl=m("Info",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xl=m("KeyRound",[["path",{d:"M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",key:"1s6t7t"}],["circle",{cx:"16.5",cy:"7.5",r:".5",fill:"currentColor",key:"w0ekpg"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ql=m("Key",[["path",{d:"m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4",key:"g0fldk"}],["path",{d:"m21 2-9.6 9.6",key:"1j0ho8"}],["circle",{cx:"7.5",cy:"15.5",r:"5.5",key:"yqb3hr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jl=m("Layers",[["path",{d:"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",key:"8b97xw"}],["path",{d:"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65",key:"dd6zsq"}],["path",{d:"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65",key:"ep9fru"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const eu=m("LayoutDashboard",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tu=m("LayoutGrid",[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1",key:"1g98yp"}],["rect",{width:"7",height:"7",x:"14",y:"3",rx:"1",key:"6d4xhi"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1",key:"nxv5o0"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1",key:"1bb6yr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nu=m("Lightbulb",[["path",{d:"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5",key:"1gvzjb"}],["path",{d:"M9 18h6",key:"x1upvd"}],["path",{d:"M10 22h4",key:"ceow96"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ru=m("List",[["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M3 18h.01",key:"1tta3j"}],["path",{d:"M3 6h.01",key:"1rqtza"}],["path",{d:"M8 12h13",key:"1za7za"}],["path",{d:"M8 18h13",key:"1lx6n3"}],["path",{d:"M8 6h13",key:"ik3vkj"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ou=m("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const au=m("LockOpen",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 9.9-1",key:"1mm8w8"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const iu=m("Lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const su=m("LogOut",[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}],["polyline",{points:"16 17 21 12 16 7",key:"1gabdz"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12",key:"1uyos4"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cu=m("Mail",[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2",key:"18n3k1"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7",key:"1ocrg3"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lu=m("MapPin",[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",key:"1r0f0z"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uu=m("Map",[["path",{d:"M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z",key:"169xi5"}],["path",{d:"M15 5.764v15",key:"1pn4in"}],["path",{d:"M9 3.236v15",key:"1uimfh"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const du=m("Megaphone",[["path",{d:"m3 11 18-5v12L3 14v-3z",key:"n962bs"}],["path",{d:"M11.6 16.8a3 3 0 1 1-5.8-1.6",key:"1yl0tm"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fu=m("MessageCircle",[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z",key:"vv11sd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hu=m("MessageSquare",[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",key:"1lielz"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pu=m("Minus",[["path",{d:"M5 12h14",key:"1ays0h"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yu=m("Monitor",[["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2",key:"48i651"}],["line",{x1:"8",x2:"16",y1:"21",y2:"21",key:"1svkeh"}],["line",{x1:"12",x2:"12",y1:"17",y2:"21",key:"vw1qmm"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mu=m("Move",[["path",{d:"M12 2v20",key:"t6zp3m"}],["path",{d:"m15 19-3 3-3-3",key:"11eu04"}],["path",{d:"m19 9 3 3-3 3",key:"1mg7y2"}],["path",{d:"M2 12h20",key:"9i4pu4"}],["path",{d:"m5 9-3 3 3 3",key:"j64kie"}],["path",{d:"m9 5 3-3 3 3",key:"l8vdw6"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vu=m("Package",[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["path",{d:"m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7",key:"yx3hmr"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gu=m("Palette",[["circle",{cx:"13.5",cy:"6.5",r:".5",fill:"currentColor",key:"1okk4w"}],["circle",{cx:"17.5",cy:"10.5",r:".5",fill:"currentColor",key:"f64h9f"}],["circle",{cx:"8.5",cy:"7.5",r:".5",fill:"currentColor",key:"fotxhn"}],["circle",{cx:"6.5",cy:"12.5",r:".5",fill:"currentColor",key:"qy21gx"}],["path",{d:"M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z",key:"12rzf8"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xu=m("PanelsTopLeft",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 9h18",key:"1pudct"}],["path",{d:"M9 21V9",key:"1oto5p"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wu=m("Pause",[["rect",{x:"14",y:"4",width:"4",height:"16",rx:"1",key:"zuxfzm"}],["rect",{x:"6",y:"4",width:"4",height:"16",rx:"1",key:"1okwgv"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ku=m("PenLine",[["path",{d:"M12 20h9",key:"t2du7b"}],["path",{d:"M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z",key:"1ykcvy"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bu=m("PhoneCall",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}],["path",{d:"M14.05 2a9 9 0 0 1 8 7.94",key:"vmijpz"}],["path",{d:"M14.05 6A5 5 0 0 1 18 10",key:"13nbpp"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Su=m("PhoneIncoming",[["polyline",{points:"16 2 16 8 22 8",key:"1ygljm"}],["line",{x1:"22",x2:"16",y1:"2",y2:"8",key:"1xzwqn"}],["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cu=m("PhoneMissed",[["line",{x1:"22",x2:"16",y1:"2",y2:"8",key:"1xzwqn"}],["line",{x1:"16",x2:"22",y1:"2",y2:"8",key:"13zxdn"}],["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mu=m("PhoneOutgoing",[["polyline",{points:"22 8 22 2 16 2",key:"1g204g"}],["line",{x1:"16",x2:"22",y1:"8",y2:"2",key:"1ggias"}],["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Eu=m("Phone",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ru=m("PiggyBank",[["path",{d:"M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z",key:"1ivx2i"}],["path",{d:"M2 9v1c0 1.1.9 2 2 2h1",key:"nm575m"}],["path",{d:"M16 11h.01",key:"xkw8gn"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Au=m("Play",[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pu=m("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tu=m("Power",[["path",{d:"M12 2v10",key:"mnfbl"}],["path",{d:"M18.4 6.6a9 9 0 1 1-12.77.04",key:"obofu9"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ou=m("Printer",[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nu=m("Radio",[["path",{d:"M4.9 19.1C1 15.2 1 8.8 4.9 4.9",key:"1vaf9d"}],["path",{d:"M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5",key:"u1ii0m"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5",key:"1j5fej"}],["path",{d:"M19.1 4.9C23 8.8 23 15.1 19.1 19",key:"10b0cb"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _u=m("Receipt",[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",key:"q3az6g"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 17.5v-11",key:"1jc1ny"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Iu=m("RefreshCw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lu=m("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Du=m("Save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ju=m("Scale",[["path",{d:"m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"7g6ntu"}],["path",{d:"m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"ijws7r"}],["path",{d:"M7 21h10",key:"1b0cd5"}],["path",{d:"M12 3v18",key:"108xh3"}],["path",{d:"M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2",key:"3gwbw2"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fu=m("ScanBarcode",[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2",key:"aa7l1z"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2",key:"4qcy5o"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2",key:"6vwrx8"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2",key:"ioqczr"}],["path",{d:"M8 7v10",key:"23sfjj"}],["path",{d:"M12 7v10",key:"jspqdw"}],["path",{d:"M17 7v10",key:"578dap"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hu=m("Scan",[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2",key:"aa7l1z"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2",key:"4qcy5o"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2",key:"6vwrx8"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2",key:"ioqczr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vu=m("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zu=m("Send",[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bu=m("Server",[["rect",{width:"20",height:"8",x:"2",y:"2",rx:"2",ry:"2",key:"ngkwjq"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",ry:"2",key:"iecqi9"}],["line",{x1:"6",x2:"6.01",y1:"6",y2:"6",key:"16zg32"}],["line",{x1:"6",x2:"6.01",y1:"18",y2:"18",key:"nzw8ys"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wu=m("Settings2",[["path",{d:"M20 7h-9",key:"3s1dr2"}],["path",{d:"M14 17H5",key:"gfn3mx"}],["circle",{cx:"17",cy:"17",r:"3",key:"18b49y"}],["circle",{cx:"7",cy:"7",r:"3",key:"dfmy0x"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qu=m("Settings",[["path",{d:"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",key:"1qme2f"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $u=m("ShieldAlert",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"M12 8v4",key:"1got3b"}],["path",{d:"M12 16h.01",key:"1drbdi"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Uu=m("Shield",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ku=m("ShoppingCart",[["circle",{cx:"8",cy:"21",r:"1",key:"jimo8o"}],["circle",{cx:"19",cy:"21",r:"1",key:"13723u"}],["path",{d:"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12",key:"9zh506"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gu=m("SlidersVertical",[["line",{x1:"4",x2:"4",y1:"21",y2:"14",key:"1p332r"}],["line",{x1:"4",x2:"4",y1:"10",y2:"3",key:"gb41h5"}],["line",{x1:"12",x2:"12",y1:"21",y2:"12",key:"hf2csr"}],["line",{x1:"12",x2:"12",y1:"8",y2:"3",key:"1kfi7u"}],["line",{x1:"20",x2:"20",y1:"21",y2:"16",key:"1lhrwl"}],["line",{x1:"20",x2:"20",y1:"12",y2:"3",key:"16vvfq"}],["line",{x1:"2",x2:"6",y1:"14",y2:"14",key:"1uebub"}],["line",{x1:"10",x2:"14",y1:"8",y2:"8",key:"1yglbp"}],["line",{x1:"18",x2:"22",y1:"16",y2:"16",key:"1jxqpz"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yu=m("Smartphone",[["rect",{width:"14",height:"20",x:"5",y:"2",rx:"2",ry:"2",key:"1yt0o3"}],["path",{d:"M12 18h.01",key:"mhygvu"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zu=m("Snowflake",[["line",{x1:"2",x2:"22",y1:"12",y2:"12",key:"1dnqot"}],["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"m20 16-4-4 4-4",key:"rquw4f"}],["path",{d:"m4 8 4 4-4 4",key:"12s3z9"}],["path",{d:"m16 4-4 4-4-4",key:"1tumq1"}],["path",{d:"m8 20 4-4 4 4",key:"9p200w"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xu=m("SquareCheckBig",[["path",{d:"M21 10.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.5",key:"1uzm8b"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qu=m("SquarePen",[["path",{d:"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",key:"1m0v6g"}],["path",{d:"M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z",key:"ohrbg2"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ju=m("Square",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ed=m("Star",[["path",{d:"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",key:"r04s7s"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const td=m("Store",[["path",{d:"m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7",key:"ztvudi"}],["path",{d:"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8",key:"1b2hhj"}],["path",{d:"M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4",key:"2ebpfo"}],["path",{d:"M2 7h20",key:"1fcdvo"}],["path",{d:"M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7",key:"6c3vgh"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nd=m("Table2",[["path",{d:"M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18",key:"gugj83"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rd=m("Table",[["path",{d:"M12 3v18",key:"108xh3"}],["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 9h18",key:"1pudct"}],["path",{d:"M3 15h18",key:"5xshup"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const od=m("Tablet",[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",ry:"2",key:"76otgf"}],["line",{x1:"12",x2:"12.01",y1:"18",y2:"18",key:"1dp563"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ad=m("Terminal",[["polyline",{points:"4 17 10 11 4 5",key:"akl6gq"}],["line",{x1:"12",x2:"20",y1:"19",y2:"19",key:"q2wloq"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const id=m("Thermometer",[["path",{d:"M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z",key:"17jzev"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sd=m("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cd=m("TrendingUp",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ld=m("TriangleAlert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ud=m("Truck",[["path",{d:"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2",key:"wrbu53"}],["path",{d:"M15 18H9",key:"1lyqi6"}],["path",{d:"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14",key:"lysw3i"}],["circle",{cx:"17",cy:"18",r:"2",key:"332jqn"}],["circle",{cx:"7",cy:"18",r:"2",key:"19iecd"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dd=m("Tv",[["rect",{width:"20",height:"15",x:"2",y:"7",rx:"2",ry:"2",key:"10ag99"}],["polyline",{points:"17 2 12 7 7 2",key:"11pgbg"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fd=m("Type",[["polyline",{points:"4 7 4 4 20 4 20 7",key:"1nosan"}],["line",{x1:"9",x2:"15",y1:"20",y2:"20",key:"swin9y"}],["line",{x1:"12",x2:"12",y1:"4",y2:"20",key:"1tx1rr"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hd=m("Upload",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"17 8 12 3 7 8",key:"t8dd8p"}],["line",{x1:"12",x2:"12",y1:"3",y2:"15",key:"widbto"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pd=m("UserCheck",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["polyline",{points:"16 11 18 13 22 9",key:"1pwet4"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yd=m("User",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const md=m("Users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75",key:"1da9ce"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vd=m("Wifi",[["path",{d:"M12 20h.01",key:"zekei9"}],["path",{d:"M2 8.82a15 15 0 0 1 20 0",key:"dnpr2z"}],["path",{d:"M5 12.859a10 10 0 0 1 14 0",key:"1x1e6c"}],["path",{d:"M8.5 16.429a5 5 0 0 1 7 0",key:"1bycff"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gd=m("Wrench",[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",key:"cbrjhi"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xd=m("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wd=m("Zap",[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]]);var Da=sr[" useId ".trim().toString()]||(()=>{}),ja=0;function je(e){const[t,n]=l.useState(Da());return ee(()=>{n(r=>r!=null?r:String(ja++))},[e]),t?`radix-${t}`:""}const Fa=["top","right","bottom","left"],Ce=Math.min,oe=Math.max,yt=Math.round,at=Math.floor,fe=e=>({x:e,y:e}),Ha={left:"right",right:"left",bottom:"top",top:"bottom"},Va={start:"end",end:"start"};function $t(e,t,n){return oe(e,Ce(t,n))}function ge(e,t){return typeof e=="function"?e(t):e}function xe(e){return e.split("-")[0]}function We(e){return e.split("-")[1]}function an(e){return e==="x"?"y":"x"}function sn(e){return e==="y"?"height":"width"}const za=new Set(["top","bottom"]);function de(e){return za.has(xe(e))?"y":"x"}function cn(e){return an(de(e))}function Ba(e,t,n){n===void 0&&(n=!1);const r=We(e),o=cn(e),a=sn(o);let s=o==="x"?r===(n?"end":"start")?"right":"left":r==="start"?"bottom":"top";return t.reference[a]>t.floating[a]&&(s=mt(s)),[s,mt(s)]}function Wa(e){const t=mt(e);return[Ut(e),t,Ut(t)]}function Ut(e){return e.replace(/start|end/g,t=>Va[t])}const Tn=["left","right"],On=["right","left"],qa=["top","bottom"],$a=["bottom","top"];function Ua(e,t,n){switch(e){case"top":case"bottom":return n?t?On:Tn:t?Tn:On;case"left":case"right":return t?qa:$a;default:return[]}}function Ka(e,t,n,r){const o=We(e);let a=Ua(xe(e),n==="start",r);return o&&(a=a.map(s=>s+"-"+o),t&&(a=a.concat(a.map(Ut)))),a}function mt(e){return e.replace(/left|right|bottom|top/g,t=>Ha[t])}function Ga(e){return k({top:0,right:0,bottom:0,left:0},e)}function mr(e){return typeof e!="number"?Ga(e):{top:e,right:e,bottom:e,left:e}}function vt(e){const{x:t,y:n,width:r,height:o}=e;return{width:r,height:o,top:n,left:t,right:t+r,bottom:n+o,x:t,y:n}}function Nn(e,t,n){let{reference:r,floating:o}=e;const a=de(t),s=cn(t),i=sn(s),c=xe(t),u=a==="y",f=r.x+r.width/2-o.width/2,h=r.y+r.height/2-o.height/2,p=r[i]/2-o[i]/2;let v;switch(c){case"top":v={x:f,y:r.y-o.height};break;case"bottom":v={x:f,y:r.y+r.height};break;case"right":v={x:r.x+r.width,y:h};break;case"left":v={x:r.x-o.width,y:h};break;default:v={x:r.x,y:r.y}}switch(We(t)){case"start":v[s]-=p*(n&&u?-1:1);break;case"end":v[s]+=p*(n&&u?-1:1);break}return v}const Ya=(e,t,n)=>ie(void 0,null,function*(){const{placement:r="bottom",strategy:o="absolute",middleware:a=[],platform:s}=n,i=a.filter(Boolean),c=yield s.isRTL==null?void 0:s.isRTL(t);let u=yield s.getElementRects({reference:e,floating:t,strategy:o}),{x:f,y:h}=Nn(u,r,c),p=r,v={},b=0;for(let y=0;y<i.length;y++){const{name:d,fn:w}=i[y],{x,y:g,data:S,reset:M}=yield w({x:f,y:h,initialPlacement:r,placement:p,strategy:o,middlewareData:v,rects:u,platform:s,elements:{reference:e,floating:t}});f=x!=null?x:f,h=g!=null?g:h,v=E(k({},v),{[d]:k(k({},v[d]),S)}),M&&b<=50&&(b++,typeof M=="object"&&(M.placement&&(p=M.placement),M.rects&&(u=M.rects===!0?yield s.getElementRects({reference:e,floating:t,strategy:o}):M.rects),{x:f,y:h}=Nn(u,p,c)),y=-1)}return{x:f,y:h,placement:p,strategy:o,middlewareData:v}});function Xe(e,t){return ie(this,null,function*(){var n;t===void 0&&(t={});const{x:r,y:o,platform:a,rects:s,elements:i,strategy:c}=e,{boundary:u="clippingAncestors",rootBoundary:f="viewport",elementContext:h="floating",altBoundary:p=!1,padding:v=0}=ge(t,e),b=mr(v),d=i[p?h==="floating"?"reference":"floating":h],w=vt(yield a.getClippingRect({element:(n=yield a.isElement==null?void 0:a.isElement(d))==null||n?d:d.contextElement||(yield a.getDocumentElement==null?void 0:a.getDocumentElement(i.floating)),boundary:u,rootBoundary:f,strategy:c})),x=h==="floating"?{x:r,y:o,width:s.floating.width,height:s.floating.height}:s.reference,g=yield a.getOffsetParent==null?void 0:a.getOffsetParent(i.floating),S=(yield a.isElement==null?void 0:a.isElement(g))?(yield a.getScale==null?void 0:a.getScale(g))||{x:1,y:1}:{x:1,y:1},M=vt(a.convertOffsetParentRelativeRectToViewportRelativeRect?yield a.convertOffsetParentRelativeRectToViewportRelativeRect({elements:i,rect:x,offsetParent:g,strategy:c}):x);return{top:(w.top-M.top+b.top)/S.y,bottom:(M.bottom-w.bottom+b.bottom)/S.y,left:(w.left-M.left+b.left)/S.x,right:(M.right-w.right+b.right)/S.x}})}const Za=e=>({name:"arrow",options:e,fn(n){return ie(this,null,function*(){const{x:r,y:o,placement:a,rects:s,platform:i,elements:c,middlewareData:u}=n,{element:f,padding:h=0}=ge(e,n)||{};if(f==null)return{};const p=mr(h),v={x:r,y:o},b=cn(a),y=sn(b),d=yield i.getDimensions(f),w=b==="y",x=w?"top":"left",g=w?"bottom":"right",S=w?"clientHeight":"clientWidth",M=s.reference[y]+s.reference[b]-v[b]-s.floating[y],R=v[b]-s.reference[b],A=yield i.getOffsetParent==null?void 0:i.getOffsetParent(f);let T=A?A[S]:0;(!T||!(yield i.isElement==null?void 0:i.isElement(A)))&&(T=c.floating[S]||s.floating[y]);const P=M/2-R/2,H=T/2-d[y]/2-1,V=Ce(p[x],H),j=Ce(p[g],H),D=V,Z=T-d[y]-j,F=T/2-d[y]/2+P,I=$t(D,F,Z),W=!u.arrow&&We(a)!=null&&F!==I&&s.reference[y]/2-(F<D?V:j)-d[y]/2<0,_=W?F<D?F-D:F-Z:0;return{[b]:v[b]+_,data:k({[b]:I,centerOffset:F-I-_},W&&{alignmentOffset:_}),reset:W}})}}),Xa=function(e){return e===void 0&&(e={}),{name:"flip",options:e,fn(n){return ie(this,null,function*(){var r,o;const{placement:a,middlewareData:s,rects:i,initialPlacement:c,platform:u,elements:f}=n,F=ge(e,n),{mainAxis:h=!0,crossAxis:p=!0,fallbackPlacements:v,fallbackStrategy:b="bestFit",fallbackAxisSideDirection:y="none",flipAlignment:d=!0}=F,w=N(F,["mainAxis","crossAxis","fallbackPlacements","fallbackStrategy","fallbackAxisSideDirection","flipAlignment"]);if((r=s.arrow)!=null&&r.alignmentOffset)return{};const x=xe(a),g=de(c),S=xe(c)===c,M=yield u.isRTL==null?void 0:u.isRTL(f.floating),R=v||(S||!d?[mt(c)]:Wa(c)),A=y!=="none";!v&&A&&R.push(...Ka(c,d,y,M));const T=[c,...R],P=yield Xe(n,w),H=[];let V=((o=s.flip)==null?void 0:o.overflows)||[];if(h&&H.push(P[x]),p){const I=Ba(a,i,M);H.push(P[I[0]],P[I[1]])}if(V=[...V,{placement:a,overflows:H}],!H.every(I=>I<=0)){var j,D;const I=(((j=s.flip)==null?void 0:j.index)||0)+1,W=T[I];if(W&&(!(p==="alignment"?g!==de(W):!1)||V.every(U=>U.overflows[0]>0&&de(U.placement)===g)))return{data:{index:I,overflows:V},reset:{placement:W}};let _=(D=V.filter(Y=>Y.overflows[0]<=0).sort((Y,U)=>Y.overflows[1]-U.overflows[1])[0])==null?void 0:D.placement;if(!_)switch(b){case"bestFit":{var Z;const Y=(Z=V.filter(U=>{if(A){const Q=de(U.placement);return Q===g||Q==="y"}return!0}).map(U=>[U.placement,U.overflows.filter(Q=>Q>0).reduce((Q,we)=>Q+we,0)]).sort((U,Q)=>U[1]-Q[1])[0])==null?void 0:Z[0];Y&&(_=Y);break}case"initialPlacement":_=c;break}if(a!==_)return{reset:{placement:_}}}return{}})}}};function _n(e,t){return{top:e.top-t.height,right:e.right-t.width,bottom:e.bottom-t.height,left:e.left-t.width}}function In(e){return Fa.some(t=>e[t]>=0)}const Qa=function(e){return e===void 0&&(e={}),{name:"hide",options:e,fn(n){return ie(this,null,function*(){const{rects:r}=n,s=ge(e,n),{strategy:o="referenceHidden"}=s,a=N(s,["strategy"]);switch(o){case"referenceHidden":{const i=yield Xe(n,E(k({},a),{elementContext:"reference"})),c=_n(i,r.reference);return{data:{referenceHiddenOffsets:c,referenceHidden:In(c)}}}case"escaped":{const i=yield Xe(n,E(k({},a),{altBoundary:!0})),c=_n(i,r.floating);return{data:{escapedOffsets:c,escaped:In(c)}}}default:return{}}})}}},vr=new Set(["left","top"]);function Ja(e,t){return ie(this,null,function*(){const{placement:n,platform:r,elements:o}=e,a=yield r.isRTL==null?void 0:r.isRTL(o.floating),s=xe(n),i=We(n),c=de(n)==="y",u=vr.has(s)?-1:1,f=a&&c?-1:1,h=ge(t,e);let{mainAxis:p,crossAxis:v,alignmentAxis:b}=typeof h=="number"?{mainAxis:h,crossAxis:0,alignmentAxis:null}:{mainAxis:h.mainAxis||0,crossAxis:h.crossAxis||0,alignmentAxis:h.alignmentAxis};return i&&typeof b=="number"&&(v=i==="end"?b*-1:b),c?{x:v*f,y:p*u}:{x:p*u,y:v*f}})}const ei=function(e){return e===void 0&&(e=0),{name:"offset",options:e,fn(n){return ie(this,null,function*(){var r,o;const{x:a,y:s,placement:i,middlewareData:c}=n,u=yield Ja(n,e);return i===((r=c.offset)==null?void 0:r.placement)&&(o=c.arrow)!=null&&o.alignmentOffset?{}:{x:a+u.x,y:s+u.y,data:E(k({},u),{placement:i})}})}}},ti=function(e){return e===void 0&&(e={}),{name:"shift",options:e,fn(n){return ie(this,null,function*(){const{x:r,y:o,placement:a}=n,w=ge(e,n),{mainAxis:s=!0,crossAxis:i=!1,limiter:c={fn:x=>{let{x:g,y:S}=x;return{x:g,y:S}}}}=w,u=N(w,["mainAxis","crossAxis","limiter"]),f={x:r,y:o},h=yield Xe(n,u),p=de(xe(a)),v=an(p);let b=f[v],y=f[p];if(s){const x=v==="y"?"top":"left",g=v==="y"?"bottom":"right",S=b+h[x],M=b-h[g];b=$t(S,b,M)}if(i){const x=p==="y"?"top":"left",g=p==="y"?"bottom":"right",S=y+h[x],M=y-h[g];y=$t(S,y,M)}const d=c.fn(E(k({},n),{[v]:b,[p]:y}));return E(k({},d),{data:{x:d.x-r,y:d.y-o,enabled:{[v]:s,[p]:i}}})})}}},ni=function(e){return e===void 0&&(e={}),{options:e,fn(t){const{x:n,y:r,placement:o,rects:a,middlewareData:s}=t,{offset:i=0,mainAxis:c=!0,crossAxis:u=!0}=ge(e,t),f={x:n,y:r},h=de(o),p=an(h);let v=f[p],b=f[h];const y=ge(i,t),d=typeof y=="number"?{mainAxis:y,crossAxis:0}:k({mainAxis:0,crossAxis:0},y);if(c){const g=p==="y"?"height":"width",S=a.reference[p]-a.floating[g]+d.mainAxis,M=a.reference[p]+a.reference[g]-d.mainAxis;v<S?v=S:v>M&&(v=M)}if(u){var w,x;const g=p==="y"?"width":"height",S=vr.has(xe(o)),M=a.reference[h]-a.floating[g]+(S&&((w=s.offset)==null?void 0:w[h])||0)+(S?0:d.crossAxis),R=a.reference[h]+a.reference[g]+(S?0:((x=s.offset)==null?void 0:x[h])||0)-(S?d.crossAxis:0);b<M?b=M:b>R&&(b=R)}return{[p]:v,[h]:b}}}},ri=function(e){return e===void 0&&(e={}),{name:"size",options:e,fn(n){return ie(this,null,function*(){var r,o;const{placement:a,rects:s,platform:i,elements:c}=n,V=ge(e,n),{apply:u=()=>{}}=V,f=N(V,["apply"]),h=yield Xe(n,f),p=xe(a),v=We(a),b=de(a)==="y",{width:y,height:d}=s.floating;let w,x;p==="top"||p==="bottom"?(w=p,x=v===((yield i.isRTL==null?void 0:i.isRTL(c.floating))?"start":"end")?"left":"right"):(x=p,w=v==="end"?"top":"bottom");const g=d-h.top-h.bottom,S=y-h.left-h.right,M=Ce(d-h[w],g),R=Ce(y-h[x],S),A=!n.middlewareData.shift;let T=M,P=R;if((r=n.middlewareData.shift)!=null&&r.enabled.x&&(P=S),(o=n.middlewareData.shift)!=null&&o.enabled.y&&(T=g),A&&!v){const j=oe(h.left,0),D=oe(h.right,0),Z=oe(h.top,0),F=oe(h.bottom,0);b?P=y-2*(j!==0||D!==0?j+D:oe(h.left,h.right)):T=d-2*(Z!==0||F!==0?Z+F:oe(h.top,h.bottom))}yield u(E(k({},n),{availableWidth:P,availableHeight:T}));const H=yield i.getDimensions(c.floating);return y!==H.width||d!==H.height?{reset:{rects:!0}}:{}})}}};function Mt(){return typeof window!="undefined"}function qe(e){return gr(e)?(e.nodeName||"").toLowerCase():"#document"}function ae(e){var t;return(e==null||(t=e.ownerDocument)==null?void 0:t.defaultView)||window}function pe(e){var t;return(t=(gr(e)?e.ownerDocument:e.document)||window.document)==null?void 0:t.documentElement}function gr(e){return Mt()?e instanceof Node||e instanceof ae(e).Node:!1}function ce(e){return Mt()?e instanceof Element||e instanceof ae(e).Element:!1}function he(e){return Mt()?e instanceof HTMLElement||e instanceof ae(e).HTMLElement:!1}function Ln(e){return!Mt()||typeof ShadowRoot=="undefined"?!1:e instanceof ShadowRoot||e instanceof ae(e).ShadowRoot}const oi=new Set(["inline","contents"]);function et(e){const{overflow:t,overflowX:n,overflowY:r,display:o}=le(e);return/auto|scroll|overlay|hidden|clip/.test(t+r+n)&&!oi.has(o)}const ai=new Set(["table","td","th"]);function ii(e){return ai.has(qe(e))}const si=[":popover-open",":modal"];function Et(e){return si.some(t=>{try{return e.matches(t)}catch(n){return!1}})}const ci=["transform","translate","scale","rotate","perspective"],li=["transform","translate","scale","rotate","perspective","filter"],ui=["paint","layout","strict","content"];function ln(e){const t=un(),n=ce(e)?le(e):e;return ci.some(r=>n[r]?n[r]!=="none":!1)||(n.containerType?n.containerType!=="normal":!1)||!t&&(n.backdropFilter?n.backdropFilter!=="none":!1)||!t&&(n.filter?n.filter!=="none":!1)||li.some(r=>(n.willChange||"").includes(r))||ui.some(r=>(n.contain||"").includes(r))}function di(e){let t=Me(e);for(;he(t)&&!ze(t);){if(ln(t))return t;if(Et(t))return null;t=Me(t)}return null}function un(){return typeof CSS=="undefined"||!CSS.supports?!1:CSS.supports("-webkit-backdrop-filter","none")}const fi=new Set(["html","body","#document"]);function ze(e){return fi.has(qe(e))}function le(e){return ae(e).getComputedStyle(e)}function Rt(e){return ce(e)?{scrollLeft:e.scrollLeft,scrollTop:e.scrollTop}:{scrollLeft:e.scrollX,scrollTop:e.scrollY}}function Me(e){if(qe(e)==="html")return e;const t=e.assignedSlot||e.parentNode||Ln(e)&&e.host||pe(e);return Ln(t)?t.host:t}function xr(e){const t=Me(e);return ze(t)?e.ownerDocument?e.ownerDocument.body:e.body:he(t)&&et(t)?t:xr(t)}function Qe(e,t,n){var r;t===void 0&&(t=[]),n===void 0&&(n=!0);const o=xr(e),a=o===((r=e.ownerDocument)==null?void 0:r.body),s=ae(o);if(a){const i=Kt(s);return t.concat(s,s.visualViewport||[],et(o)?o:[],i&&n?Qe(i):[])}return t.concat(o,Qe(o,[],n))}function Kt(e){return e.parent&&Object.getPrototypeOf(e.parent)?e.frameElement:null}function wr(e){const t=le(e);let n=parseFloat(t.width)||0,r=parseFloat(t.height)||0;const o=he(e),a=o?e.offsetWidth:n,s=o?e.offsetHeight:r,i=yt(n)!==a||yt(r)!==s;return i&&(n=a,r=s),{width:n,height:r,$:i}}function dn(e){return ce(e)?e:e.contextElement}function Fe(e){const t=dn(e);if(!he(t))return fe(1);const n=t.getBoundingClientRect(),{width:r,height:o,$:a}=wr(t);let s=(a?yt(n.width):n.width)/r,i=(a?yt(n.height):n.height)/o;return(!s||!Number.isFinite(s))&&(s=1),(!i||!Number.isFinite(i))&&(i=1),{x:s,y:i}}const hi=fe(0);function kr(e){const t=ae(e);return!un()||!t.visualViewport?hi:{x:t.visualViewport.offsetLeft,y:t.visualViewport.offsetTop}}function pi(e,t,n){return t===void 0&&(t=!1),!n||t&&n!==ae(e)?!1:t}function Pe(e,t,n,r){t===void 0&&(t=!1),n===void 0&&(n=!1);const o=e.getBoundingClientRect(),a=dn(e);let s=fe(1);t&&(r?ce(r)&&(s=Fe(r)):s=Fe(e));const i=pi(a,n,r)?kr(a):fe(0);let c=(o.left+i.x)/s.x,u=(o.top+i.y)/s.y,f=o.width/s.x,h=o.height/s.y;if(a){const p=ae(a),v=r&&ce(r)?ae(r):r;let b=p,y=Kt(b);for(;y&&r&&v!==b;){const d=Fe(y),w=y.getBoundingClientRect(),x=le(y),g=w.left+(y.clientLeft+parseFloat(x.paddingLeft))*d.x,S=w.top+(y.clientTop+parseFloat(x.paddingTop))*d.y;c*=d.x,u*=d.y,f*=d.x,h*=d.y,c+=g,u+=S,b=ae(y),y=Kt(b)}}return vt({width:f,height:h,x:c,y:u})}function fn(e,t){const n=Rt(e).scrollLeft;return t?t.left+n:Pe(pe(e)).left+n}function br(e,t,n){n===void 0&&(n=!1);const r=e.getBoundingClientRect(),o=r.left+t.scrollLeft-(n?0:fn(e,r)),a=r.top+t.scrollTop;return{x:o,y:a}}function yi(e){let{elements:t,rect:n,offsetParent:r,strategy:o}=e;const a=o==="fixed",s=pe(r),i=t?Et(t.floating):!1;if(r===s||i&&a)return n;let c={scrollLeft:0,scrollTop:0},u=fe(1);const f=fe(0),h=he(r);if((h||!h&&!a)&&((qe(r)!=="body"||et(s))&&(c=Rt(r)),he(r))){const v=Pe(r);u=Fe(r),f.x=v.x+r.clientLeft,f.y=v.y+r.clientTop}const p=s&&!h&&!a?br(s,c,!0):fe(0);return{width:n.width*u.x,height:n.height*u.y,x:n.x*u.x-c.scrollLeft*u.x+f.x+p.x,y:n.y*u.y-c.scrollTop*u.y+f.y+p.y}}function mi(e){return Array.from(e.getClientRects())}function vi(e){const t=pe(e),n=Rt(e),r=e.ownerDocument.body,o=oe(t.scrollWidth,t.clientWidth,r.scrollWidth,r.clientWidth),a=oe(t.scrollHeight,t.clientHeight,r.scrollHeight,r.clientHeight);let s=-n.scrollLeft+fn(e);const i=-n.scrollTop;return le(r).direction==="rtl"&&(s+=oe(t.clientWidth,r.clientWidth)-o),{width:o,height:a,x:s,y:i}}function gi(e,t){const n=ae(e),r=pe(e),o=n.visualViewport;let a=r.clientWidth,s=r.clientHeight,i=0,c=0;if(o){a=o.width,s=o.height;const u=un();(!u||u&&t==="fixed")&&(i=o.offsetLeft,c=o.offsetTop)}return{width:a,height:s,x:i,y:c}}const xi=new Set(["absolute","fixed"]);function wi(e,t){const n=Pe(e,!0,t==="fixed"),r=n.top+e.clientTop,o=n.left+e.clientLeft,a=he(e)?Fe(e):fe(1),s=e.clientWidth*a.x,i=e.clientHeight*a.y,c=o*a.x,u=r*a.y;return{width:s,height:i,x:c,y:u}}function Dn(e,t,n){let r;if(t==="viewport")r=gi(e,n);else if(t==="document")r=vi(pe(e));else if(ce(t))r=wi(t,n);else{const o=kr(e);r={x:t.x-o.x,y:t.y-o.y,width:t.width,height:t.height}}return vt(r)}function Sr(e,t){const n=Me(e);return n===t||!ce(n)||ze(n)?!1:le(n).position==="fixed"||Sr(n,t)}function ki(e,t){const n=t.get(e);if(n)return n;let r=Qe(e,[],!1).filter(i=>ce(i)&&qe(i)!=="body"),o=null;const a=le(e).position==="fixed";let s=a?Me(e):e;for(;ce(s)&&!ze(s);){const i=le(s),c=ln(s);!c&&i.position==="fixed"&&(o=null),(a?!c&&!o:!c&&i.position==="static"&&!!o&&xi.has(o.position)||et(s)&&!c&&Sr(e,s))?r=r.filter(f=>f!==s):o=i,s=Me(s)}return t.set(e,r),r}function bi(e){let{element:t,boundary:n,rootBoundary:r,strategy:o}=e;const s=[...n==="clippingAncestors"?Et(t)?[]:ki(t,this._c):[].concat(n),r],i=s[0],c=s.reduce((u,f)=>{const h=Dn(t,f,o);return u.top=oe(h.top,u.top),u.right=Ce(h.right,u.right),u.bottom=Ce(h.bottom,u.bottom),u.left=oe(h.left,u.left),u},Dn(t,i,o));return{width:c.right-c.left,height:c.bottom-c.top,x:c.left,y:c.top}}function Si(e){const{width:t,height:n}=wr(e);return{width:t,height:n}}function Ci(e,t,n){const r=he(t),o=pe(t),a=n==="fixed",s=Pe(e,!0,a,t);let i={scrollLeft:0,scrollTop:0};const c=fe(0);function u(){c.x=fn(o)}if(r||!r&&!a)if((qe(t)!=="body"||et(o))&&(i=Rt(t)),r){const v=Pe(t,!0,a,t);c.x=v.x+t.clientLeft,c.y=v.y+t.clientTop}else o&&u();a&&!r&&o&&u();const f=o&&!r&&!a?br(o,i):fe(0),h=s.left+i.scrollLeft-c.x-f.x,p=s.top+i.scrollTop-c.y-f.y;return{x:h,y:p,width:s.width,height:s.height}}function It(e){return le(e).position==="static"}function jn(e,t){if(!he(e)||le(e).position==="fixed")return null;if(t)return t(e);let n=e.offsetParent;return pe(e)===n&&(n=n.ownerDocument.body),n}function Cr(e,t){const n=ae(e);if(Et(e))return n;if(!he(e)){let o=Me(e);for(;o&&!ze(o);){if(ce(o)&&!It(o))return o;o=Me(o)}return n}let r=jn(e,t);for(;r&&ii(r)&&It(r);)r=jn(r,t);return r&&ze(r)&&It(r)&&!ln(r)?n:r||di(e)||n}const Mi=function(e){return ie(this,null,function*(){const t=this.getOffsetParent||Cr,n=this.getDimensions,r=yield n(e.floating);return{reference:Ci(e.reference,yield t(e.floating),e.strategy),floating:{x:0,y:0,width:r.width,height:r.height}}})};function Ei(e){return le(e).direction==="rtl"}const Ri={convertOffsetParentRelativeRectToViewportRelativeRect:yi,getDocumentElement:pe,getClippingRect:bi,getOffsetParent:Cr,getElementRects:Mi,getClientRects:mi,getDimensions:Si,getScale:Fe,isElement:ce,isRTL:Ei};function Mr(e,t){return e.x===t.x&&e.y===t.y&&e.width===t.width&&e.height===t.height}function Ai(e,t){let n=null,r;const o=pe(e);function a(){var i;clearTimeout(r),(i=n)==null||i.disconnect(),n=null}function s(i,c){i===void 0&&(i=!1),c===void 0&&(c=1),a();const u=e.getBoundingClientRect(),{left:f,top:h,width:p,height:v}=u;if(i||t(),!p||!v)return;const b=at(h),y=at(o.clientWidth-(f+p)),d=at(o.clientHeight-(h+v)),w=at(f),g={rootMargin:-b+"px "+-y+"px "+-d+"px "+-w+"px",threshold:oe(0,Ce(1,c))||1};let S=!0;function M(R){const A=R[0].intersectionRatio;if(A!==c){if(!S)return s();A?s(!1,A):r=setTimeout(()=>{s(!1,1e-7)},1e3)}A===1&&!Mr(u,e.getBoundingClientRect())&&s(),S=!1}try{n=new IntersectionObserver(M,E(k({},g),{root:o.ownerDocument}))}catch(R){n=new IntersectionObserver(M,g)}n.observe(e)}return s(!0),a}function Pi(e,t,n,r){r===void 0&&(r={});const{ancestorScroll:o=!0,ancestorResize:a=!0,elementResize:s=typeof ResizeObserver=="function",layoutShift:i=typeof IntersectionObserver=="function",animationFrame:c=!1}=r,u=dn(e),f=o||a?[...u?Qe(u):[],...Qe(t)]:[];f.forEach(w=>{o&&w.addEventListener("scroll",n,{passive:!0}),a&&w.addEventListener("resize",n)});const h=u&&i?Ai(u,n):null;let p=-1,v=null;s&&(v=new ResizeObserver(w=>{let[x]=w;x&&x.target===u&&v&&(v.unobserve(t),cancelAnimationFrame(p),p=requestAnimationFrame(()=>{var g;(g=v)==null||g.observe(t)})),n()}),u&&!c&&v.observe(u),v.observe(t));let b,y=c?Pe(e):null;c&&d();function d(){const w=Pe(e);y&&!Mr(y,w)&&n(),y=w,b=requestAnimationFrame(d)}return n(),()=>{var w;f.forEach(x=>{o&&x.removeEventListener("scroll",n),a&&x.removeEventListener("resize",n)}),h==null||h(),(w=v)==null||w.disconnect(),v=null,c&&cancelAnimationFrame(b)}}const Ti=ei,Oi=ti,Ni=Xa,_i=ri,Ii=Qa,Fn=Za,Li=ni,Di=(e,t,n)=>{const r=new Map,o=k({platform:Ri},n),a=E(k({},o.platform),{_c:r});return Ya(e,t,E(k({},o),{platform:a}))};var ji=typeof document!="undefined",Fi=function(){},ft=ji?l.useLayoutEffect:Fi;function gt(e,t){if(e===t)return!0;if(typeof e!=typeof t)return!1;if(typeof e=="function"&&e.toString()===t.toString())return!0;let n,r,o;if(e&&t&&typeof e=="object"){if(Array.isArray(e)){if(n=e.length,n!==t.length)return!1;for(r=n;r--!==0;)if(!gt(e[r],t[r]))return!1;return!0}if(o=Object.keys(e),n=o.length,n!==Object.keys(t).length)return!1;for(r=n;r--!==0;)if(!{}.hasOwnProperty.call(t,o[r]))return!1;for(r=n;r--!==0;){const a=o[r];if(!(a==="_owner"&&e.$$typeof)&&!gt(e[a],t[a]))return!1}return!0}return e!==e&&t!==t}function Er(e){return typeof window=="undefined"?1:(e.ownerDocument.defaultView||window).devicePixelRatio||1}function Hn(e,t){const n=Er(e);return Math.round(t*n)/n}function Lt(e){const t=l.useRef(e);return ft(()=>{t.current=e}),t}function Hi(e){e===void 0&&(e={});const{placement:t="bottom",strategy:n="absolute",middleware:r=[],platform:o,elements:{reference:a,floating:s}={},transform:i=!0,whileElementsMounted:c,open:u}=e,[f,h]=l.useState({x:0,y:0,strategy:n,placement:t,middlewareData:{},isPositioned:!1}),[p,v]=l.useState(r);gt(p,r)||v(r);const[b,y]=l.useState(null),[d,w]=l.useState(null),x=l.useCallback(_=>{_!==R.current&&(R.current=_,y(_))},[]),g=l.useCallback(_=>{_!==A.current&&(A.current=_,w(_))},[]),S=a||b,M=s||d,R=l.useRef(null),A=l.useRef(null),T=l.useRef(f),P=c!=null,H=Lt(c),V=Lt(o),j=Lt(u),D=l.useCallback(()=>{if(!R.current||!A.current)return;const _={placement:t,strategy:n,middleware:p};V.current&&(_.platform=V.current),Di(R.current,A.current,_).then(Y=>{const U=E(k({},Y),{isPositioned:j.current!==!1});Z.current&&!gt(T.current,U)&&(T.current=U,kt.flushSync(()=>{h(U)}))})},[p,t,n,V,j]);ft(()=>{u===!1&&T.current.isPositioned&&(T.current.isPositioned=!1,h(_=>E(k({},_),{isPositioned:!1})))},[u]);const Z=l.useRef(!1);ft(()=>(Z.current=!0,()=>{Z.current=!1}),[]),ft(()=>{if(S&&(R.current=S),M&&(A.current=M),S&&M){if(H.current)return H.current(S,M,D);D()}},[S,M,D,H,P]);const F=l.useMemo(()=>({reference:R,floating:A,setReference:x,setFloating:g}),[x,g]),I=l.useMemo(()=>({reference:S,floating:M}),[S,M]),W=l.useMemo(()=>{const _={position:n,left:0,top:0};if(!I.floating)return _;const Y=Hn(I.floating,f.x),U=Hn(I.floating,f.y);return i?k(E(k({},_),{transform:"translate("+Y+"px, "+U+"px)"}),Er(I.floating)>=1.5&&{willChange:"transform"}):{position:n,left:Y,top:U}},[n,i,I.floating,f.x,f.y]);return l.useMemo(()=>E(k({},f),{update:D,refs:F,elements:I,floatingStyles:W}),[f,D,F,I,W])}const Vi=e=>{function t(n){return{}.hasOwnProperty.call(n,"current")}return{name:"arrow",options:e,fn(n){const{element:r,padding:o}=typeof e=="function"?e(n):e;return r&&t(r)?r.current!=null?Fn({element:r.current,padding:o}).fn(n):{}:r?Fn({element:r,padding:o}).fn(n):{}}}},zi=(e,t)=>E(k({},Ti(e)),{options:[e,t]}),Bi=(e,t)=>E(k({},Oi(e)),{options:[e,t]}),Wi=(e,t)=>E(k({},Li(e)),{options:[e,t]}),qi=(e,t)=>E(k({},Ni(e)),{options:[e,t]}),$i=(e,t)=>E(k({},_i(e)),{options:[e,t]}),Ui=(e,t)=>E(k({},Ii(e)),{options:[e,t]}),Ki=(e,t)=>E(k({},Vi(e)),{options:[e,t]});var Gi="Arrow",Rr=l.forwardRef((e,t)=>{const s=e,{children:n,width:r=10,height:o=5}=s,a=N(s,["children","width","height"]);return C.jsx($.svg,E(k({},a),{ref:t,width:r,height:o,viewBox:"0 0 30 10",preserveAspectRatio:"none",children:e.asChild?n:C.jsx("polygon",{points:"0,0 30,0 15,10"})}))});Rr.displayName=Gi;var Yi=Rr;function Zi(e){const[t,n]=l.useState(void 0);return ee(()=>{if(e){n({width:e.offsetWidth,height:e.offsetHeight});const r=new ResizeObserver(o=>{if(!Array.isArray(o)||!o.length)return;const a=o[0];let s,i;if("borderBoxSize"in a){const c=a.borderBoxSize,u=Array.isArray(c)?c[0]:c;s=u.inlineSize,i=u.blockSize}else s=e.offsetWidth,i=e.offsetHeight;n({width:s,height:i})});return r.observe(e,{box:"border-box"}),()=>r.unobserve(e)}else n(void 0)},[e]),t}var hn="Popper",[Ar,Pr]=bt(hn),[Xi,Tr]=Ar(hn),Or=e=>{const{__scopePopper:t,children:n}=e,[r,o]=l.useState(null);return C.jsx(Xi,{scope:t,anchor:r,onAnchorChange:o,children:n})};Or.displayName=hn;var Nr="PopperAnchor",_r=l.forwardRef((e,t)=>{const c=e,{__scopePopper:n,virtualRef:r}=c,o=N(c,["__scopePopper","virtualRef"]),a=Tr(Nr,n),s=l.useRef(null),i=X(t,s);return l.useEffect(()=>{a.onAnchorChange((r==null?void 0:r.current)||s.current)}),r?null:C.jsx($.div,E(k({},o),{ref:i}))});_r.displayName=Nr;var pn="PopperContent",[Qi,Ji]=Ar(pn),Ir=l.forwardRef((e,t)=>{var O,K,J,q,z,B,ne,re;const me=e,{__scopePopper:n,side:r="bottom",sideOffset:o=0,align:a="center",alignOffset:s=0,arrowPadding:i=0,avoidCollisions:c=!0,collisionBoundary:u=[],collisionPadding:f=0,sticky:h="partial",hideWhenDetached:p=!1,updatePositionStrategy:v="optimized",onPlaced:b}=me,y=N(me,["__scopePopper","side","sideOffset","align","alignOffset","arrowPadding","avoidCollisions","collisionBoundary","collisionPadding","sticky","hideWhenDetached","updatePositionStrategy","onPlaced"]),d=Tr(pn,n),[w,x]=l.useState(null),g=X(t,ve=>x(ve)),[S,M]=l.useState(null),R=Zi(S),A=(O=R==null?void 0:R.width)!=null?O:0,T=(K=R==null?void 0:R.height)!=null?K:0,P=r+(a!=="center"?"-"+a:""),H=typeof f=="number"?f:k({top:0,right:0,bottom:0,left:0},f),V=Array.isArray(u)?u:[u],j=V.length>0,D={padding:H,boundary:V.filter(ts),altBoundary:j},{refs:Z,floatingStyles:F,placement:I,isPositioned:W,middlewareData:_}=Hi({strategy:"fixed",placement:P,whileElementsMounted:(...ve)=>Pi(...ve,{animationFrame:v==="always"}),elements:{reference:d.anchor},middleware:[zi({mainAxis:o+T,alignmentAxis:s}),c&&Bi(k({mainAxis:!0,crossAxis:!1,limiter:h==="partial"?Wi():void 0},D)),c&&qi(k({},D)),$i(E(k({},D),{apply:({elements:ve,rects:_e,availableWidth:Ye,availableHeight:Fo})=>{const{width:Ho,height:Vo}=_e.reference,tt=ve.floating.style;tt.setProperty("--radix-popper-available-width",`${Ye}px`),tt.setProperty("--radix-popper-available-height",`${Fo}px`),tt.setProperty("--radix-popper-anchor-width",`${Ho}px`),tt.setProperty("--radix-popper-anchor-height",`${Vo}px`)}})),S&&Ki({element:S,padding:i}),ns({arrowWidth:A,arrowHeight:T}),p&&Ui(k({strategy:"referenceHidden"},D))]}),[Y,U]=jr(I),Q=Ae(b);ee(()=>{W&&(Q==null||Q())},[W,Q]);const we=(J=_.arrow)==null?void 0:J.x,Ue=(q=_.arrow)==null?void 0:q.y,Ke=((z=_.arrow)==null?void 0:z.centerOffset)!==0,[ye,Ge]=l.useState();return ee(()=>{w&&Ge(window.getComputedStyle(w).zIndex)},[w]),C.jsx("div",{ref:Z.setFloating,"data-radix-popper-content-wrapper":"",style:k(E(k({},F),{transform:W?F.transform:"translate(0, -200%)",minWidth:"max-content",zIndex:ye,"--radix-popper-transform-origin":[(B=_.transformOrigin)==null?void 0:B.x,(ne=_.transformOrigin)==null?void 0:ne.y].join(" ")}),((re=_.hide)==null?void 0:re.referenceHidden)&&{visibility:"hidden",pointerEvents:"none"}),dir:e.dir,children:C.jsx(Qi,{scope:n,placedSide:Y,onArrowChange:M,arrowX:we,arrowY:Ue,shouldHideArrow:Ke,children:C.jsx($.div,E(k({"data-side":Y,"data-align":U},y),{ref:g,style:E(k({},y.style),{animation:W?void 0:"none"})}))})})});Ir.displayName=pn;var Lr="PopperArrow",es={top:"bottom",right:"left",bottom:"top",left:"right"},Dr=l.forwardRef(function(t,n){const i=t,{__scopePopper:r}=i,o=N(i,["__scopePopper"]),a=Ji(Lr,r),s=es[a.placedSide];return C.jsx("span",{ref:a.onArrowChange,style:{position:"absolute",left:a.arrowX,top:a.arrowY,[s]:0,transformOrigin:{top:"",right:"0 0",bottom:"center 0",left:"100% 0"}[a.placedSide],transform:{top:"translateY(100%)",right:"translateY(50%) rotate(90deg) translateX(-50%)",bottom:"rotate(180deg)",left:"translateY(50%) rotate(-90deg) translateX(50%)"}[a.placedSide],visibility:a.shouldHideArrow?"hidden":void 0},children:C.jsx(Yi,E(k({},o),{ref:n,style:E(k({},o.style),{display:"block"})}))})});Dr.displayName=Lr;function ts(e){return e!==null}var ns=e=>({name:"transformOrigin",options:e,fn(t){var d,w,x,g,S;const{placement:n,rects:r,middlewareData:o}=t,s=((d=o.arrow)==null?void 0:d.centerOffset)!==0,i=s?0:e.arrowWidth,c=s?0:e.arrowHeight,[u,f]=jr(n),h={start:"0%",center:"50%",end:"100%"}[f],p=((x=(w=o.arrow)==null?void 0:w.x)!=null?x:0)+i/2,v=((S=(g=o.arrow)==null?void 0:g.y)!=null?S:0)+c/2;let b="",y="";return u==="bottom"?(b=s?h:`${p}px`,y=`${-c}px`):u==="top"?(b=s?h:`${p}px`,y=`${r.floating.height+c}px`):u==="right"?(b=`${-c}px`,y=s?h:`${v}px`):u==="left"&&(b=`${r.floating.width+c}px`,y=s?h:`${v}px`),{data:{x:b,y}}}});function jr(e){const[t,n="center"]=e.split("-");return[t,n]}var rs=Or,os=_r,as=Ir,is=Dr;function ss(e){const t=l.useRef({value:e,previous:e});return l.useMemo(()=>(t.current.value!==e&&(t.current.previous=t.current.value,t.current.value=e),t.current.previous),[e])}function Vn(e,[t,n]){return Math.min(n,Math.max(t,e))}var cs=l.createContext(void 0);function ls(e){const t=l.useContext(cs);return e||t||"ltr"}var Dt=0;function Fr(){l.useEffect(()=>{var t,n;const e=document.querySelectorAll("[data-radix-focus-guard]");return document.body.insertAdjacentElement("afterbegin",(t=e[0])!=null?t:zn()),document.body.insertAdjacentElement("beforeend",(n=e[1])!=null?n:zn()),Dt++,()=>{Dt===1&&document.querySelectorAll("[data-radix-focus-guard]").forEach(r=>r.remove()),Dt--}},[])}function zn(){const e=document.createElement("span");return e.setAttribute("data-radix-focus-guard",""),e.tabIndex=0,e.style.outline="none",e.style.opacity="0",e.style.position="fixed",e.style.pointerEvents="none",e}var jt="focusScope.autoFocusOnMount",Ft="focusScope.autoFocusOnUnmount",Bn={bubbles:!1,cancelable:!0},us="FocusScope",yn=l.forwardRef((e,t)=>{const y=e,{loop:n=!1,trapped:r=!1,onMountAutoFocus:o,onUnmountAutoFocus:a}=y,s=N(y,["loop","trapped","onMountAutoFocus","onUnmountAutoFocus"]),[i,c]=l.useState(null),u=Ae(o),f=Ae(a),h=l.useRef(null),p=X(t,d=>c(d)),v=l.useRef({paused:!1,pause(){this.paused=!0},resume(){this.paused=!1}}).current;l.useEffect(()=>{if(r){let d=function(S){if(v.paused||!i)return;const M=S.target;i.contains(M)?h.current=M:be(h.current,{select:!0})},w=function(S){if(v.paused||!i)return;const M=S.relatedTarget;M!==null&&(i.contains(M)||be(h.current,{select:!0}))},x=function(S){if(document.activeElement===document.body)for(const R of S)R.removedNodes.length>0&&be(i)};document.addEventListener("focusin",d),document.addEventListener("focusout",w);const g=new MutationObserver(x);return i&&g.observe(i,{childList:!0,subtree:!0}),()=>{document.removeEventListener("focusin",d),document.removeEventListener("focusout",w),g.disconnect()}}},[r,i,v.paused]),l.useEffect(()=>{if(i){qn.add(v);const d=document.activeElement;if(!i.contains(d)){const x=new CustomEvent(jt,Bn);i.addEventListener(jt,u),i.dispatchEvent(x),x.defaultPrevented||(ds(ms(Hr(i)),{select:!0}),document.activeElement===d&&be(i))}return()=>{i.removeEventListener(jt,u),setTimeout(()=>{const x=new CustomEvent(Ft,Bn);i.addEventListener(Ft,f),i.dispatchEvent(x),x.defaultPrevented||be(d!=null?d:document.body,{select:!0}),i.removeEventListener(Ft,f),qn.remove(v)},0)}}},[i,u,f,v]);const b=l.useCallback(d=>{if(!n&&!r||v.paused)return;const w=d.key==="Tab"&&!d.altKey&&!d.ctrlKey&&!d.metaKey,x=document.activeElement;if(w&&x){const g=d.currentTarget,[S,M]=fs(g);S&&M?!d.shiftKey&&x===M?(d.preventDefault(),n&&be(S,{select:!0})):d.shiftKey&&x===S&&(d.preventDefault(),n&&be(M,{select:!0})):x===g&&d.preventDefault()}},[n,r,v.paused]);return C.jsx($.div,E(k({tabIndex:-1},s),{ref:p,onKeyDown:b}))});yn.displayName=us;function ds(e,{select:t=!1}={}){const n=document.activeElement;for(const r of e)if(be(r,{select:t}),document.activeElement!==n)return}function fs(e){const t=Hr(e),n=Wn(t,e),r=Wn(t.reverse(),e);return[n,r]}function Hr(e){const t=[],n=document.createTreeWalker(e,NodeFilter.SHOW_ELEMENT,{acceptNode:r=>{const o=r.tagName==="INPUT"&&r.type==="hidden";return r.disabled||r.hidden||o?NodeFilter.FILTER_SKIP:r.tabIndex>=0?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}});for(;n.nextNode();)t.push(n.currentNode);return t}function Wn(e,t){for(const n of e)if(!hs(n,{upTo:t}))return n}function hs(e,{upTo:t}){if(getComputedStyle(e).visibility==="hidden")return!0;for(;e;){if(t!==void 0&&e===t)return!1;if(getComputedStyle(e).display==="none")return!0;e=e.parentElement}return!1}function ps(e){return e instanceof HTMLInputElement&&"select"in e}function be(e,{select:t=!1}={}){if(e&&e.focus){const n=document.activeElement;e.focus({preventScroll:!0}),e!==n&&ps(e)&&t&&e.select()}}var qn=ys();function ys(){let e=[];return{add(t){const n=e[0];t!==n&&(n==null||n.pause()),e=$n(e,t),e.unshift(t)},remove(t){var n;e=$n(e,t),(n=e[0])==null||n.resume()}}}function $n(e,t){const n=[...e],r=n.indexOf(t);return r!==-1&&n.splice(r,1),n}function ms(e){return e.filter(t=>t.tagName!=="A")}var vs=function(e){if(typeof document=="undefined")return null;var t=Array.isArray(e)?e[0]:e;return t.ownerDocument.body},Ie=new WeakMap,it=new WeakMap,st={},Ht=0,Vr=function(e){return e&&(e.host||Vr(e.parentNode))},gs=function(e,t){return t.map(function(n){if(e.contains(n))return n;var r=Vr(n);return r&&e.contains(r)?r:(console.error("aria-hidden",n,"in not contained inside",e,". Doing nothing"),null)}).filter(function(n){return!!n})},xs=function(e,t,n,r){var o=gs(t,Array.isArray(e)?e:[e]);st[n]||(st[n]=new WeakMap);var a=st[n],s=[],i=new Set,c=new Set(o),u=function(h){!h||i.has(h)||(i.add(h),u(h.parentNode))};o.forEach(u);var f=function(h){!h||c.has(h)||Array.prototype.forEach.call(h.children,function(p){if(i.has(p))f(p);else try{var v=p.getAttribute(r),b=v!==null&&v!=="false",y=(Ie.get(p)||0)+1,d=(a.get(p)||0)+1;Ie.set(p,y),a.set(p,d),s.push(p),y===1&&b&&it.set(p,!0),d===1&&p.setAttribute(n,"true"),b||p.setAttribute(r,"true")}catch(w){console.error("aria-hidden: cannot operate on ",p,w)}})};return f(t),i.clear(),Ht++,function(){s.forEach(function(h){var p=Ie.get(h)-1,v=a.get(h)-1;Ie.set(h,p),a.set(h,v),p||(it.has(h)||h.removeAttribute(r),it.delete(h)),v||h.removeAttribute(n)}),Ht--,Ht||(Ie=new WeakMap,Ie=new WeakMap,it=new WeakMap,st={})}},zr=function(e,t,n){n===void 0&&(n="data-aria-hidden");var r=Array.from(Array.isArray(e)?e:[e]),o=vs(e);return o?(r.push.apply(r,Array.from(o.querySelectorAll("[aria-live]"))),xs(r,o,n,"aria-hidden")):function(){return null}},ht="right-scroll-bar-position",pt="width-before-scroll-bar",ws="with-scroll-bars-hidden",ks="--removed-body-scroll-bar-size";function Vt(e,t){return typeof e=="function"?e(t):e&&(e.current=t),e}function bs(e,t){var n=l.useState(function(){return{value:e,callback:t,facade:{get current(){return n.value},set current(r){var o=n.value;o!==r&&(n.value=r,n.callback(r,o))}}}})[0];return n.callback=t,n.facade}var Ss=typeof window!="undefined"?l.useLayoutEffect:l.useEffect,Un=new WeakMap;function Cs(e,t){var n=bs(null,function(r){return e.forEach(function(o){return Vt(o,r)})});return Ss(function(){var r=Un.get(n);if(r){var o=new Set(r),a=new Set(e),s=n.current;o.forEach(function(i){a.has(i)||Vt(i,null)}),a.forEach(function(i){o.has(i)||Vt(i,s)})}Un.set(n,e)},[e]),n}function Ms(e){return e}function Es(e,t){t===void 0&&(t=Ms);var n=[],r=!1,o={read:function(){if(r)throw new Error("Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.");return n.length?n[n.length-1]:e},useMedium:function(a){var s=t(a,r);return n.push(s),function(){n=n.filter(function(i){return i!==s})}},assignSyncMedium:function(a){for(r=!0;n.length;){var s=n;n=[],s.forEach(a)}n={push:function(i){return a(i)},filter:function(){return n}}},assignMedium:function(a){r=!0;var s=[];if(n.length){var i=n;n=[],i.forEach(a),s=n}var c=function(){var f=s;s=[],f.forEach(a)},u=function(){return Promise.resolve().then(c)};u(),n={push:function(f){s.push(f),u()},filter:function(f){return s=s.filter(f),n}}}};return o}function Rs(e){e===void 0&&(e={});var t=Es(null);return t.options=Se({async:!0,ssr:!1},e),t}var Br=function(e){var t=e.sideCar,n=Xn(e,["sideCar"]);if(!t)throw new Error("Sidecar: please provide `sideCar` property to import the right car");var r=t.read();if(!r)throw new Error("Sidecar medium not found");return l.createElement(r,Se({},n))};Br.isSideCarExport=!0;function As(e,t){return e.useMedium(t),Br}var Wr=Rs(),zt=function(){},At=l.forwardRef(function(e,t){var n=l.useRef(null),r=l.useState({onScrollCapture:zt,onWheelCapture:zt,onTouchMoveCapture:zt}),o=r[0],a=r[1],s=e.forwardProps,i=e.children,c=e.className,u=e.removeScrollBar,f=e.enabled,h=e.shards,p=e.sideCar,v=e.noRelative,b=e.noIsolation,y=e.inert,d=e.allowPinchZoom,w=e.as,x=w===void 0?"div":w,g=e.gapMode,S=Xn(e,["forwardProps","children","className","removeScrollBar","enabled","shards","sideCar","noRelative","noIsolation","inert","allowPinchZoom","as","gapMode"]),M=p,R=Cs([n,t]),A=Se(Se({},S),o);return l.createElement(l.Fragment,null,f&&l.createElement(M,{sideCar:Wr,removeScrollBar:u,shards:h,noRelative:v,noIsolation:b,inert:y,setCallbacks:a,allowPinchZoom:!!d,lockRef:n,gapMode:g}),s?l.cloneElement(l.Children.only(i),Se(Se({},A),{ref:R})):l.createElement(x,Se({},A,{className:c,ref:R}),i))});At.defaultProps={enabled:!0,removeScrollBar:!0,inert:!1};At.classNames={fullWidth:pt,zeroRight:ht};var Ps=function(){if(typeof __webpack_nonce__!="undefined")return __webpack_nonce__};function Ts(){if(!document)return null;var e=document.createElement("style");e.type="text/css";var t=Ps();return t&&e.setAttribute("nonce",t),e}function Os(e,t){e.styleSheet?e.styleSheet.cssText=t:e.appendChild(document.createTextNode(t))}function Ns(e){var t=document.head||document.getElementsByTagName("head")[0];t.appendChild(e)}var _s=function(){var e=0,t=null;return{add:function(n){e==0&&(t=Ts())&&(Os(t,n),Ns(t)),e++},remove:function(){e--,!e&&t&&(t.parentNode&&t.parentNode.removeChild(t),t=null)}}},Is=function(){var e=_s();return function(t,n){l.useEffect(function(){return e.add(t),function(){e.remove()}},[t&&n])}},qr=function(){var e=Is(),t=function(n){var r=n.styles,o=n.dynamic;return e(r,o),null};return t},Ls={left:0,top:0,right:0,gap:0},Bt=function(e){return parseInt(e||"",10)||0},Ds=function(e){var t=window.getComputedStyle(document.body),n=t[e==="padding"?"paddingLeft":"marginLeft"],r=t[e==="padding"?"paddingTop":"marginTop"],o=t[e==="padding"?"paddingRight":"marginRight"];return[Bt(n),Bt(r),Bt(o)]},js=function(e){if(e===void 0&&(e="margin"),typeof window=="undefined")return Ls;var t=Ds(e),n=document.documentElement.clientWidth,r=window.innerWidth;return{left:t[0],top:t[1],right:t[2],gap:Math.max(0,r-n+t[2]-t[0])}},Fs=qr(),He="data-scroll-locked",Hs=function(e,t,n,r){var o=e.left,a=e.top,s=e.right,i=e.gap;return n===void 0&&(n="margin"),`
  .`.concat(ws,` {
   overflow: hidden `).concat(r,`;
   padding-right: `).concat(i,"px ").concat(r,`;
  }
  body[`).concat(He,`] {
    overflow: hidden `).concat(r,`;
    overscroll-behavior: contain;
    `).concat([t&&"position: relative ".concat(r,";"),n==="margin"&&`
    padding-left: `.concat(o,`px;
    padding-top: `).concat(a,`px;
    padding-right: `).concat(s,`px;
    margin-left:0;
    margin-top:0;
    margin-right: `).concat(i,"px ").concat(r,`;
    `),n==="padding"&&"padding-right: ".concat(i,"px ").concat(r,";")].filter(Boolean).join(""),`
  }
  
  .`).concat(ht,` {
    right: `).concat(i,"px ").concat(r,`;
  }
  
  .`).concat(pt,` {
    margin-right: `).concat(i,"px ").concat(r,`;
  }
  
  .`).concat(ht," .").concat(ht,` {
    right: 0 `).concat(r,`;
  }
  
  .`).concat(pt," .").concat(pt,` {
    margin-right: 0 `).concat(r,`;
  }
  
  body[`).concat(He,`] {
    `).concat(ks,": ").concat(i,`px;
  }
`)},Kn=function(){var e=parseInt(document.body.getAttribute(He)||"0",10);return isFinite(e)?e:0},Vs=function(){l.useEffect(function(){return document.body.setAttribute(He,(Kn()+1).toString()),function(){var e=Kn()-1;e<=0?document.body.removeAttribute(He):document.body.setAttribute(He,e.toString())}},[])},zs=function(e){var t=e.noRelative,n=e.noImportant,r=e.gapMode,o=r===void 0?"margin":r;Vs();var a=l.useMemo(function(){return js(o)},[o]);return l.createElement(Fs,{styles:Hs(a,!t,o,n?"":"!important")})},Gt=!1;if(typeof window!="undefined")try{var ct=Object.defineProperty({},"passive",{get:function(){return Gt=!0,!0}});window.addEventListener("test",ct,ct),window.removeEventListener("test",ct,ct)}catch(e){Gt=!1}var Le=Gt?{passive:!1}:!1,Bs=function(e){return e.tagName==="TEXTAREA"},$r=function(e,t){if(!(e instanceof Element))return!1;var n=window.getComputedStyle(e);return n[t]!=="hidden"&&!(n.overflowY===n.overflowX&&!Bs(e)&&n[t]==="visible")},Ws=function(e){return $r(e,"overflowY")},qs=function(e){return $r(e,"overflowX")},Gn=function(e,t){var n=t.ownerDocument,r=t;do{typeof ShadowRoot!="undefined"&&r instanceof ShadowRoot&&(r=r.host);var o=Ur(e,r);if(o){var a=Kr(e,r),s=a[1],i=a[2];if(s>i)return!0}r=r.parentNode}while(r&&r!==n.body);return!1},$s=function(e){var t=e.scrollTop,n=e.scrollHeight,r=e.clientHeight;return[t,n,r]},Us=function(e){var t=e.scrollLeft,n=e.scrollWidth,r=e.clientWidth;return[t,n,r]},Ur=function(e,t){return e==="v"?Ws(t):qs(t)},Kr=function(e,t){return e==="v"?$s(t):Us(t)},Ks=function(e,t){return e==="h"&&t==="rtl"?-1:1},Gs=function(e,t,n,r,o){var a=Ks(e,window.getComputedStyle(t).direction),s=a*r,i=n.target,c=t.contains(i),u=!1,f=s>0,h=0,p=0;do{if(!i)break;var v=Kr(e,i),b=v[0],y=v[1],d=v[2],w=y-d-a*b;(b||w)&&Ur(e,i)&&(h+=w,p+=b);var x=i.parentNode;i=x&&x.nodeType===Node.DOCUMENT_FRAGMENT_NODE?x.host:x}while(!c&&i!==document.body||c&&(t.contains(i)||t===i));return(f&&Math.abs(h)<1||!f&&Math.abs(p)<1)&&(u=!0),u},lt=function(e){return"changedTouches"in e?[e.changedTouches[0].clientX,e.changedTouches[0].clientY]:[0,0]},Yn=function(e){return[e.deltaX,e.deltaY]},Zn=function(e){return e&&"current"in e?e.current:e},Ys=function(e,t){return e[0]===t[0]&&e[1]===t[1]},Zs=function(e){return`
  .block-interactivity-`.concat(e,` {pointer-events: none;}
  .allow-interactivity-`).concat(e,` {pointer-events: all;}
`)},Xs=0,De=[];function Qs(e){var t=l.useRef([]),n=l.useRef([0,0]),r=l.useRef(),o=l.useState(Xs++)[0],a=l.useState(qr)[0],s=l.useRef(e);l.useEffect(function(){s.current=e},[e]),l.useEffect(function(){if(e.inert){document.body.classList.add("block-interactivity-".concat(o));var y=$o([e.lockRef.current],(e.shards||[]).map(Zn),!0).filter(Boolean);return y.forEach(function(d){return d.classList.add("allow-interactivity-".concat(o))}),function(){document.body.classList.remove("block-interactivity-".concat(o)),y.forEach(function(d){return d.classList.remove("allow-interactivity-".concat(o))})}}},[e.inert,e.lockRef.current,e.shards]);var i=l.useCallback(function(y,d){if("touches"in y&&y.touches.length===2||y.type==="wheel"&&y.ctrlKey)return!s.current.allowPinchZoom;var w=lt(y),x=n.current,g="deltaX"in y?y.deltaX:x[0]-w[0],S="deltaY"in y?y.deltaY:x[1]-w[1],M,R=y.target,A=Math.abs(g)>Math.abs(S)?"h":"v";if("touches"in y&&A==="h"&&R.type==="range")return!1;var T=Gn(A,R);if(!T)return!0;if(T?M=A:(M=A==="v"?"h":"v",T=Gn(A,R)),!T)return!1;if(!r.current&&"changedTouches"in y&&(g||S)&&(r.current=M),!M)return!0;var P=r.current||M;return Gs(P,d,y,P==="h"?g:S)},[]),c=l.useCallback(function(y){var d=y;if(!(!De.length||De[De.length-1]!==a)){var w="deltaY"in d?Yn(d):lt(d),x=t.current.filter(function(M){return M.name===d.type&&(M.target===d.target||d.target===M.shadowParent)&&Ys(M.delta,w)})[0];if(x&&x.should){d.cancelable&&d.preventDefault();return}if(!x){var g=(s.current.shards||[]).map(Zn).filter(Boolean).filter(function(M){return M.contains(d.target)}),S=g.length>0?i(d,g[0]):!s.current.noIsolation;S&&d.cancelable&&d.preventDefault()}}},[]),u=l.useCallback(function(y,d,w,x){var g={name:y,delta:d,target:w,should:x,shadowParent:Js(w)};t.current.push(g),setTimeout(function(){t.current=t.current.filter(function(S){return S!==g})},1)},[]),f=l.useCallback(function(y){n.current=lt(y),r.current=void 0},[]),h=l.useCallback(function(y){u(y.type,Yn(y),y.target,i(y,e.lockRef.current))},[]),p=l.useCallback(function(y){u(y.type,lt(y),y.target,i(y,e.lockRef.current))},[]);l.useEffect(function(){return De.push(a),e.setCallbacks({onScrollCapture:h,onWheelCapture:h,onTouchMoveCapture:p}),document.addEventListener("wheel",c,Le),document.addEventListener("touchmove",c,Le),document.addEventListener("touchstart",f,Le),function(){De=De.filter(function(y){return y!==a}),document.removeEventListener("wheel",c,Le),document.removeEventListener("touchmove",c,Le),document.removeEventListener("touchstart",f,Le)}},[]);var v=e.removeScrollBar,b=e.inert;return l.createElement(l.Fragment,null,b?l.createElement(a,{styles:Zs(o)}):null,v?l.createElement(zs,{noRelative:e.noRelative,gapMode:e.gapMode}):null)}function Js(e){for(var t=null;e!==null;)e instanceof ShadowRoot&&(t=e.host,e=e.host),e=e.parentNode;return t}const ec=As(Wr,Qs);var mn=l.forwardRef(function(e,t){return l.createElement(At,Se({},e,{ref:t,sideCar:ec}))});mn.classNames=At.classNames;var tc=[" ","Enter","ArrowUp","ArrowDown"],nc=[" ","Enter"],Te="Select",[Pt,Tt,rc]=ya(Te),[$e]=bt(Te,[rc,Pr]),Ot=Pr(),[oc,Ee]=$e(Te),[ac,ic]=$e(Te),Gr=e=>{const{__scopeSelect:t,children:n,open:r,defaultOpen:o,onOpenChange:a,value:s,defaultValue:i,onValueChange:c,dir:u,name:f,autoComplete:h,disabled:p,required:v,form:b}=e,y=Ot(t),[d,w]=l.useState(null),[x,g]=l.useState(null),[S,M]=l.useState(!1),R=ls(u),[A,T]=qt({prop:r,defaultProp:o!=null?o:!1,onChange:a,caller:Te}),[P,H]=qt({prop:s,defaultProp:i,onChange:c,caller:Te}),V=l.useRef(null),j=d?b||!!d.closest("form"):!0,[D,Z]=l.useState(new Set),F=Array.from(D).map(I=>I.props.value).join(";");return C.jsx(rs,E(k({},y),{children:C.jsxs(oc,{required:v,scope:t,trigger:d,onTriggerChange:w,valueNode:x,onValueNodeChange:g,valueNodeHasChildren:S,onValueNodeHasChildrenChange:M,contentId:je(),value:P,onValueChange:H,open:A,onOpenChange:T,dir:R,triggerPointerDownPosRef:V,disabled:p,children:[C.jsx(Pt.Provider,{scope:t,children:C.jsx(ac,{scope:e.__scopeSelect,onNativeOptionAdd:l.useCallback(I=>{Z(W=>new Set(W).add(I))},[]),onNativeOptionRemove:l.useCallback(I=>{Z(W=>{const _=new Set(W);return _.delete(I),_})},[]),children:n})}),j?C.jsxs(xo,{"aria-hidden":!0,required:v,tabIndex:-1,name:f,autoComplete:h,value:P,onChange:I=>H(I.target.value),disabled:p,form:b,children:[P===void 0?C.jsx("option",{value:""}):null,Array.from(D)]},F):null]})}))};Gr.displayName=Te;var Yr="SelectTrigger",Zr=l.forwardRef((e,t)=>{const y=e,{__scopeSelect:n,disabled:r=!1}=y,o=N(y,["__scopeSelect","disabled"]),a=Ot(n),s=Ee(Yr,n),i=s.disabled||r,c=X(t,s.onTriggerChange),u=Tt(n),f=l.useRef("touch"),[h,p,v]=ko(d=>{const w=u().filter(S=>!S.disabled),x=w.find(S=>S.value===s.value),g=bo(w,d,x);g!==void 0&&s.onValueChange(g.value)}),b=d=>{i||(s.onOpenChange(!0),v()),d&&(s.triggerPointerDownPosRef.current={x:Math.round(d.pageX),y:Math.round(d.pageY)})};return C.jsx(os,E(k({asChild:!0},a),{children:C.jsx($.button,E(k({type:"button",role:"combobox","aria-controls":s.contentId,"aria-expanded":s.open,"aria-required":s.required,"aria-autocomplete":"none",dir:s.dir,"data-state":s.open?"open":"closed",disabled:i,"data-disabled":i?"":void 0,"data-placeholder":wo(s.value)?"":void 0},o),{ref:c,onClick:G(o.onClick,d=>{d.currentTarget.focus(),f.current!=="mouse"&&b(d)}),onPointerDown:G(o.onPointerDown,d=>{f.current=d.pointerType;const w=d.target;w.hasPointerCapture(d.pointerId)&&w.releasePointerCapture(d.pointerId),d.button===0&&d.ctrlKey===!1&&d.pointerType==="mouse"&&(b(d),d.preventDefault())}),onKeyDown:G(o.onKeyDown,d=>{const w=h.current!=="";!(d.ctrlKey||d.altKey||d.metaKey)&&d.key.length===1&&p(d.key),!(w&&d.key===" ")&&tc.includes(d.key)&&(b(),d.preventDefault())})}))}))});Zr.displayName=Yr;var Xr="SelectValue",Qr=l.forwardRef((e,t)=>{const p=e,{__scopeSelect:n,className:r,style:o,children:a,placeholder:s=""}=p,i=N(p,["__scopeSelect","className","style","children","placeholder"]),c=Ee(Xr,n),{onValueNodeHasChildrenChange:u}=c,f=a!==void 0,h=X(t,c.onValueNodeChange);return ee(()=>{u(f)},[u,f]),C.jsx($.span,E(k({},i),{ref:h,style:{pointerEvents:"none"},children:wo(c.value)?C.jsx(C.Fragment,{children:s}):a}))});Qr.displayName=Xr;var sc="SelectIcon",Jr=l.forwardRef((e,t)=>{const a=e,{__scopeSelect:n,children:r}=a,o=N(a,["__scopeSelect","children"]);return C.jsx($.span,E(k({"aria-hidden":!0},o),{ref:t,children:r||"▼"}))});Jr.displayName=sc;var cc="SelectPortal",eo=e=>C.jsx(on,k({asChild:!0},e));eo.displayName=cc;var Oe="SelectContent",to=l.forwardRef((e,t)=>{const n=Ee(Oe,e.__scopeSelect),[r,o]=l.useState();if(ee(()=>{o(new DocumentFragment)},[]),!n.open){const a=r;return a?kt.createPortal(C.jsx(no,{scope:e.__scopeSelect,children:C.jsx(Pt.Slot,{scope:e.__scopeSelect,children:C.jsx("div",{children:e.children})})}),a):null}return C.jsx(ro,E(k({},e),{ref:t}))});to.displayName=Oe;var se=10,[no,Re]=$e(Oe),lc="SelectContentImpl",uc=Ve("SelectContent.RemoveScroll"),ro=l.forwardRef((e,t)=>{const me=e,{__scopeSelect:n,position:r="item-aligned",onCloseAutoFocus:o,onEscapeKeyDown:a,onPointerDownOutside:s,side:i,sideOffset:c,align:u,alignOffset:f,arrowPadding:h,collisionBoundary:p,collisionPadding:v,sticky:b,hideWhenDetached:y,avoidCollisions:d}=me,w=N(me,["__scopeSelect","position","onCloseAutoFocus","onEscapeKeyDown","onPointerDownOutside","side","sideOffset","align","alignOffset","arrowPadding","collisionBoundary","collisionPadding","sticky","hideWhenDetached","avoidCollisions"]),x=Ee(Oe,n),[g,S]=l.useState(null),[M,R]=l.useState(null),A=X(t,O=>S(O)),[T,P]=l.useState(null),[H,V]=l.useState(null),j=Tt(n),[D,Z]=l.useState(!1),F=l.useRef(!1);l.useEffect(()=>{if(g)return zr(g)},[g]),Fr();const I=l.useCallback(O=>{const[K,...J]=j().map(B=>B.ref.current),[q]=J.slice(-1),z=document.activeElement;for(const B of O)if(B===z||(B==null||B.scrollIntoView({block:"nearest"}),B===K&&M&&(M.scrollTop=0),B===q&&M&&(M.scrollTop=M.scrollHeight),B==null||B.focus(),document.activeElement!==z))return},[j,M]),W=l.useCallback(()=>I([T,g]),[I,T,g]);l.useEffect(()=>{D&&W()},[D,W]);const{onOpenChange:_,triggerPointerDownPosRef:Y}=x;l.useEffect(()=>{if(g){let O={x:0,y:0};const K=q=>{var z,B,ne,re;O={x:Math.abs(Math.round(q.pageX)-((B=(z=Y.current)==null?void 0:z.x)!=null?B:0)),y:Math.abs(Math.round(q.pageY)-((re=(ne=Y.current)==null?void 0:ne.y)!=null?re:0))}},J=q=>{O.x<=10&&O.y<=10?q.preventDefault():g.contains(q.target)||_(!1),document.removeEventListener("pointermove",K),Y.current=null};return Y.current!==null&&(document.addEventListener("pointermove",K),document.addEventListener("pointerup",J,{capture:!0,once:!0})),()=>{document.removeEventListener("pointermove",K),document.removeEventListener("pointerup",J,{capture:!0})}}},[g,_,Y]),l.useEffect(()=>{const O=()=>_(!1);return window.addEventListener("blur",O),window.addEventListener("resize",O),()=>{window.removeEventListener("blur",O),window.removeEventListener("resize",O)}},[_]);const[U,Q]=ko(O=>{const K=j().filter(z=>!z.disabled),J=K.find(z=>z.ref.current===document.activeElement),q=bo(K,O,J);q&&setTimeout(()=>q.ref.current.focus())}),we=l.useCallback((O,K,J)=>{const q=!F.current&&!J;(x.value!==void 0&&x.value===K||q)&&(P(O),q&&(F.current=!0))},[x.value]),Ue=l.useCallback(()=>g==null?void 0:g.focus(),[g]),Ke=l.useCallback((O,K,J)=>{const q=!F.current&&!J;(x.value!==void 0&&x.value===K||q)&&V(O)},[x.value]),ye=r==="popper"?Yt:oo,Ge=ye===Yt?{side:i,sideOffset:c,align:u,alignOffset:f,arrowPadding:h,collisionBoundary:p,collisionPadding:v,sticky:b,hideWhenDetached:y,avoidCollisions:d}:{};return C.jsx(no,{scope:n,content:g,viewport:M,onViewportChange:R,itemRefCallback:we,selectedItem:T,onItemLeave:Ue,itemTextRefCallback:Ke,focusSelectedItem:W,selectedItemText:H,position:r,isPositioned:D,searchRef:U,children:C.jsx(mn,{as:uc,allowPinchZoom:!0,children:C.jsx(yn,{asChild:!0,trapped:x.open,onMountAutoFocus:O=>{O.preventDefault()},onUnmountAutoFocus:G(o,O=>{var K;(K=x.trigger)==null||K.focus({preventScroll:!0}),O.preventDefault()}),children:C.jsx(St,{asChild:!0,disableOutsidePointerEvents:!0,onEscapeKeyDown:a,onPointerDownOutside:s,onFocusOutside:O=>O.preventDefault(),onDismiss:()=>x.onOpenChange(!1),children:C.jsx(ye,E(k(k({role:"listbox",id:x.contentId,"data-state":x.open?"open":"closed",dir:x.dir,onContextMenu:O=>O.preventDefault()},w),Ge),{onPlaced:()=>Z(!0),ref:A,style:k({display:"flex",flexDirection:"column",outline:"none"},w.style),onKeyDown:G(w.onKeyDown,O=>{const K=O.ctrlKey||O.altKey||O.metaKey;if(O.key==="Tab"&&O.preventDefault(),!K&&O.key.length===1&&Q(O.key),["ArrowUp","ArrowDown","Home","End"].includes(O.key)){let q=j().filter(z=>!z.disabled).map(z=>z.ref.current);if(["ArrowUp","End"].includes(O.key)&&(q=q.slice().reverse()),["ArrowUp","ArrowDown"].includes(O.key)){const z=O.target,B=q.indexOf(z);q=q.slice(B+1)}setTimeout(()=>I(q)),O.preventDefault()}})}))})})})})});ro.displayName=lc;var dc="SelectItemAlignedPosition",oo=l.forwardRef((e,t)=>{const A=e,{__scopeSelect:n,onPlaced:r}=A,o=N(A,["__scopeSelect","onPlaced"]),a=Ee(Oe,n),s=Re(Oe,n),[i,c]=l.useState(null),[u,f]=l.useState(null),h=X(t,T=>f(T)),p=Tt(n),v=l.useRef(!1),b=l.useRef(!0),{viewport:y,selectedItem:d,selectedItemText:w,focusSelectedItem:x}=s,g=l.useCallback(()=>{if(a.trigger&&a.valueNode&&i&&u&&y&&d&&w){const T=a.trigger.getBoundingClientRect(),P=u.getBoundingClientRect(),H=a.valueNode.getBoundingClientRect(),V=w.getBoundingClientRect();if(a.dir!=="rtl"){const z=V.left-P.left,B=H.left-z,ne=T.left-B,re=T.width+ne,ve=Math.max(re,P.width),_e=window.innerWidth-se,Ye=Vn(B,[se,Math.max(se,_e-ve)]);i.style.minWidth=re+"px",i.style.left=Ye+"px"}else{const z=P.right-V.right,B=window.innerWidth-H.right-z,ne=window.innerWidth-T.right-B,re=T.width+ne,ve=Math.max(re,P.width),_e=window.innerWidth-se,Ye=Vn(B,[se,Math.max(se,_e-ve)]);i.style.minWidth=re+"px",i.style.right=Ye+"px"}const j=p(),D=window.innerHeight-se*2,Z=y.scrollHeight,F=window.getComputedStyle(u),I=parseInt(F.borderTopWidth,10),W=parseInt(F.paddingTop,10),_=parseInt(F.borderBottomWidth,10),Y=parseInt(F.paddingBottom,10),U=I+W+Z+Y+_,Q=Math.min(d.offsetHeight*5,U),we=window.getComputedStyle(y),Ue=parseInt(we.paddingTop,10),Ke=parseInt(we.paddingBottom,10),ye=T.top+T.height/2-se,Ge=D-ye,me=d.offsetHeight/2,O=d.offsetTop+me,K=I+W+O,J=U-K;if(K<=ye){const z=j.length>0&&d===j[j.length-1].ref.current;i.style.bottom="0px";const B=u.clientHeight-y.offsetTop-y.offsetHeight,ne=Math.max(Ge,me+(z?Ke:0)+B+_),re=K+ne;i.style.height=re+"px"}else{const z=j.length>0&&d===j[0].ref.current;i.style.top="0px";const ne=Math.max(ye,I+y.offsetTop+(z?Ue:0)+me)+J;i.style.height=ne+"px",y.scrollTop=K-ye+y.offsetTop}i.style.margin=`${se}px 0`,i.style.minHeight=Q+"px",i.style.maxHeight=D+"px",r==null||r(),requestAnimationFrame(()=>v.current=!0)}},[p,a.trigger,a.valueNode,i,u,y,d,w,a.dir,r]);ee(()=>g(),[g]);const[S,M]=l.useState();ee(()=>{u&&M(window.getComputedStyle(u).zIndex)},[u]);const R=l.useCallback(T=>{T&&b.current===!0&&(g(),x==null||x(),b.current=!1)},[g,x]);return C.jsx(hc,{scope:n,contentWrapper:i,shouldExpandOnScrollRef:v,onScrollButtonChange:R,children:C.jsx("div",{ref:c,style:{display:"flex",flexDirection:"column",position:"fixed",zIndex:S},children:C.jsx($.div,E(k({},o),{ref:h,style:k({boxSizing:"border-box",maxHeight:"100%"},o.style)}))})})});oo.displayName=dc;var fc="SelectPopperPosition",Yt=l.forwardRef((e,t)=>{const i=e,{__scopeSelect:n,align:r="start",collisionPadding:o=se}=i,a=N(i,["__scopeSelect","align","collisionPadding"]),s=Ot(n);return C.jsx(as,E(k(k({},s),a),{ref:t,align:r,collisionPadding:o,style:E(k({boxSizing:"border-box"},a.style),{"--radix-select-content-transform-origin":"var(--radix-popper-transform-origin)","--radix-select-content-available-width":"var(--radix-popper-available-width)","--radix-select-content-available-height":"var(--radix-popper-available-height)","--radix-select-trigger-width":"var(--radix-popper-anchor-width)","--radix-select-trigger-height":"var(--radix-popper-anchor-height)"})}))});Yt.displayName=fc;var[hc,vn]=$e(Oe,{}),Zt="SelectViewport",ao=l.forwardRef((e,t)=>{const u=e,{__scopeSelect:n,nonce:r}=u,o=N(u,["__scopeSelect","nonce"]),a=Re(Zt,n),s=vn(Zt,n),i=X(t,a.onViewportChange),c=l.useRef(0);return C.jsxs(C.Fragment,{children:[C.jsx("style",{dangerouslySetInnerHTML:{__html:"[data-radix-select-viewport]{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}[data-radix-select-viewport]::-webkit-scrollbar{display:none}"},nonce:r}),C.jsx(Pt.Slot,{scope:n,children:C.jsx($.div,E(k({"data-radix-select-viewport":"",role:"presentation"},o),{ref:i,style:k({position:"relative",flex:1,overflow:"hidden auto"},o.style),onScroll:G(o.onScroll,f=>{const h=f.currentTarget,{contentWrapper:p,shouldExpandOnScrollRef:v}=s;if(v!=null&&v.current&&p){const b=Math.abs(c.current-h.scrollTop);if(b>0){const y=window.innerHeight-se*2,d=parseFloat(p.style.minHeight),w=parseFloat(p.style.height),x=Math.max(d,w);if(x<y){const g=x+b,S=Math.min(y,g),M=g-S;p.style.height=S+"px",p.style.bottom==="0px"&&(h.scrollTop=M>0?M:0,p.style.justifyContent="flex-end")}}}c.current=h.scrollTop})}))})]})});ao.displayName=Zt;var io="SelectGroup",[pc,yc]=$e(io),mc=l.forwardRef((e,t)=>{const a=e,{__scopeSelect:n}=a,r=N(a,["__scopeSelect"]),o=je();return C.jsx(pc,{scope:n,id:o,children:C.jsx($.div,E(k({role:"group","aria-labelledby":o},r),{ref:t}))})});mc.displayName=io;var so="SelectLabel",co=l.forwardRef((e,t)=>{const a=e,{__scopeSelect:n}=a,r=N(a,["__scopeSelect"]),o=yc(so,n);return C.jsx($.div,E(k({id:o.id},r),{ref:t}))});co.displayName=so;var xt="SelectItem",[vc,lo]=$e(xt),uo=l.forwardRef((e,t)=>{const x=e,{__scopeSelect:n,value:r,disabled:o=!1,textValue:a}=x,s=N(x,["__scopeSelect","value","disabled","textValue"]),i=Ee(xt,n),c=Re(xt,n),u=i.value===r,[f,h]=l.useState(a!=null?a:""),[p,v]=l.useState(!1),b=X(t,g=>{var S;return(S=c.itemRefCallback)==null?void 0:S.call(c,g,r,o)}),y=je(),d=l.useRef("touch"),w=()=>{o||(i.onValueChange(r),i.onOpenChange(!1))};if(r==="")throw new Error("A <Select.Item /> must have a value prop that is not an empty string. This is because the Select value can be set to an empty string to clear the selection and show the placeholder.");return C.jsx(vc,{scope:n,value:r,disabled:o,textId:y,isSelected:u,onItemTextChange:l.useCallback(g=>{h(S=>{var M;return S||((M=g==null?void 0:g.textContent)!=null?M:"").trim()})},[]),children:C.jsx(Pt.ItemSlot,{scope:n,value:r,disabled:o,textValue:f,children:C.jsx($.div,E(k({role:"option","aria-labelledby":y,"data-highlighted":p?"":void 0,"aria-selected":u&&p,"data-state":u?"checked":"unchecked","aria-disabled":o||void 0,"data-disabled":o?"":void 0,tabIndex:o?void 0:-1},s),{ref:b,onFocus:G(s.onFocus,()=>v(!0)),onBlur:G(s.onBlur,()=>v(!1)),onClick:G(s.onClick,()=>{d.current!=="mouse"&&w()}),onPointerUp:G(s.onPointerUp,()=>{d.current==="mouse"&&w()}),onPointerDown:G(s.onPointerDown,g=>{d.current=g.pointerType}),onPointerMove:G(s.onPointerMove,g=>{var S;d.current=g.pointerType,o?(S=c.onItemLeave)==null||S.call(c):d.current==="mouse"&&g.currentTarget.focus({preventScroll:!0})}),onPointerLeave:G(s.onPointerLeave,g=>{var S;g.currentTarget===document.activeElement&&((S=c.onItemLeave)==null||S.call(c))}),onKeyDown:G(s.onKeyDown,g=>{var M;((M=c.searchRef)==null?void 0:M.current)!==""&&g.key===" "||(nc.includes(g.key)&&w(),g.key===" "&&g.preventDefault())})}))})})});uo.displayName=xt;var Ze="SelectItemText",fo=l.forwardRef((e,t)=>{const w=e,{__scopeSelect:n,className:r,style:o}=w,a=N(w,["__scopeSelect","className","style"]),s=Ee(Ze,n),i=Re(Ze,n),c=lo(Ze,n),u=ic(Ze,n),[f,h]=l.useState(null),p=X(t,x=>h(x),c.onItemTextChange,x=>{var g;return(g=i.itemTextRefCallback)==null?void 0:g.call(i,x,c.value,c.disabled)}),v=f==null?void 0:f.textContent,b=l.useMemo(()=>C.jsx("option",{value:c.value,disabled:c.disabled,children:v},c.value),[c.disabled,c.value,v]),{onNativeOptionAdd:y,onNativeOptionRemove:d}=u;return ee(()=>(y(b),()=>d(b)),[y,d,b]),C.jsxs(C.Fragment,{children:[C.jsx($.span,E(k({id:c.textId},a),{ref:p})),c.isSelected&&s.valueNode&&!s.valueNodeHasChildren?kt.createPortal(a.children,s.valueNode):null]})});fo.displayName=Ze;var ho="SelectItemIndicator",po=l.forwardRef((e,t)=>{const a=e,{__scopeSelect:n}=a,r=N(a,["__scopeSelect"]);return lo(ho,n).isSelected?C.jsx($.span,E(k({"aria-hidden":!0},r),{ref:t})):null});po.displayName=ho;var Xt="SelectScrollUpButton",yo=l.forwardRef((e,t)=>{const n=Re(Xt,e.__scopeSelect),r=vn(Xt,e.__scopeSelect),[o,a]=l.useState(!1),s=X(t,r.onScrollButtonChange);return ee(()=>{if(n.viewport&&n.isPositioned){let i=function(){const u=c.scrollTop>0;a(u)};const c=n.viewport;return i(),c.addEventListener("scroll",i),()=>c.removeEventListener("scroll",i)}},[n.viewport,n.isPositioned]),o?C.jsx(vo,E(k({},e),{ref:s,onAutoScroll:()=>{const{viewport:i,selectedItem:c}=n;i&&c&&(i.scrollTop=i.scrollTop-c.offsetHeight)}})):null});yo.displayName=Xt;var Qt="SelectScrollDownButton",mo=l.forwardRef((e,t)=>{const n=Re(Qt,e.__scopeSelect),r=vn(Qt,e.__scopeSelect),[o,a]=l.useState(!1),s=X(t,r.onScrollButtonChange);return ee(()=>{if(n.viewport&&n.isPositioned){let i=function(){const u=c.scrollHeight-c.clientHeight,f=Math.ceil(c.scrollTop)<u;a(f)};const c=n.viewport;return i(),c.addEventListener("scroll",i),()=>c.removeEventListener("scroll",i)}},[n.viewport,n.isPositioned]),o?C.jsx(vo,E(k({},e),{ref:s,onAutoScroll:()=>{const{viewport:i,selectedItem:c}=n;i&&c&&(i.scrollTop=i.scrollTop+c.offsetHeight)}})):null});mo.displayName=Qt;var vo=l.forwardRef((e,t)=>{const u=e,{__scopeSelect:n,onAutoScroll:r}=u,o=N(u,["__scopeSelect","onAutoScroll"]),a=Re("SelectScrollButton",n),s=l.useRef(null),i=Tt(n),c=l.useCallback(()=>{s.current!==null&&(window.clearInterval(s.current),s.current=null)},[]);return l.useEffect(()=>()=>c(),[c]),ee(()=>{var h;const f=i().find(p=>p.ref.current===document.activeElement);(h=f==null?void 0:f.ref.current)==null||h.scrollIntoView({block:"nearest"})},[i]),C.jsx($.div,E(k({"aria-hidden":!0},o),{ref:t,style:k({flexShrink:0},o.style),onPointerDown:G(o.onPointerDown,()=>{s.current===null&&(s.current=window.setInterval(r,50))}),onPointerMove:G(o.onPointerMove,()=>{var f;(f=a.onItemLeave)==null||f.call(a),s.current===null&&(s.current=window.setInterval(r,50))}),onPointerLeave:G(o.onPointerLeave,()=>{c()})}))}),gc="SelectSeparator",go=l.forwardRef((e,t)=>{const o=e,{__scopeSelect:n}=o,r=N(o,["__scopeSelect"]);return C.jsx($.div,E(k({"aria-hidden":!0},r),{ref:t}))});go.displayName=gc;var Jt="SelectArrow",xc=l.forwardRef((e,t)=>{const i=e,{__scopeSelect:n}=i,r=N(i,["__scopeSelect"]),o=Ot(n),a=Ee(Jt,n),s=Re(Jt,n);return a.open&&s.position==="popper"?C.jsx(is,E(k(k({},o),r),{ref:t})):null});xc.displayName=Jt;var wc="SelectBubbleInput",xo=l.forwardRef((o,r)=>{var a=o,{__scopeSelect:e,value:t}=a,n=N(a,["__scopeSelect","value"]);const s=l.useRef(null),i=X(r,s),c=ss(t);return l.useEffect(()=>{const u=s.current;if(!u)return;const f=window.HTMLSelectElement.prototype,p=Object.getOwnPropertyDescriptor(f,"value").set;if(c!==t&&p){const v=new Event("change",{bubbles:!0});p.call(u,t),u.dispatchEvent(v)}},[c,t]),C.jsx($.select,E(k({},n),{style:k(k({},hr),n.style),ref:i,defaultValue:t}))});xo.displayName=wc;function wo(e){return e===""||e===void 0}function ko(e){const t=Ae(e),n=l.useRef(""),r=l.useRef(0),o=l.useCallback(s=>{const i=n.current+s;t(i),function c(u){n.current=u,window.clearTimeout(r.current),u!==""&&(r.current=window.setTimeout(()=>c(""),1e3))}(i)},[t]),a=l.useCallback(()=>{n.current="",window.clearTimeout(r.current)},[]);return l.useEffect(()=>()=>window.clearTimeout(r.current),[]),[n,o,a]}function bo(e,t,n){const o=t.length>1&&Array.from(t).every(u=>u===t[0])?t[0]:t,a=n?e.indexOf(n):-1;let s=kc(e,Math.max(a,0));o.length===1&&(s=s.filter(u=>u!==n));const c=s.find(u=>u.textValue.toLowerCase().startsWith(o.toLowerCase()));return c!==n?c:void 0}function kc(e,t){return e.map((n,r)=>e[(t+r)%e.length])}var kd=Gr,bd=Zr,Sd=Qr,Cd=Jr,Md=eo,Ed=to,Rd=ao,Ad=co,Pd=uo,Td=fo,Od=po,Nd=yo,_d=mo,Id=go,Nt="Dialog",[So]=bt(Nt),[bc,ue]=So(Nt),Co=e=>{const{__scopeDialog:t,children:n,open:r,defaultOpen:o,onOpenChange:a,modal:s=!0}=e,i=l.useRef(null),c=l.useRef(null),[u,f]=qt({prop:r,defaultProp:o!=null?o:!1,onChange:a,caller:Nt});return C.jsx(bc,{scope:t,triggerRef:i,contentRef:c,contentId:je(),titleId:je(),descriptionId:je(),open:u,onOpenChange:f,onOpenToggle:l.useCallback(()=>f(h=>!h),[f]),modal:s,children:n})};Co.displayName=Nt;var Mo="DialogTrigger",Sc=l.forwardRef((e,t)=>{const s=e,{__scopeDialog:n}=s,r=N(s,["__scopeDialog"]),o=ue(Mo,n),a=X(t,o.triggerRef);return C.jsx($.button,E(k({type:"button","aria-haspopup":"dialog","aria-expanded":o.open,"aria-controls":o.contentId,"data-state":wn(o.open)},r),{ref:a,onClick:G(e.onClick,o.onOpenToggle)}))});Sc.displayName=Mo;var gn="DialogPortal",[Cc,Eo]=So(gn,{forceMount:void 0}),Ro=e=>{const{__scopeDialog:t,forceMount:n,children:r,container:o}=e,a=ue(gn,t);return C.jsx(Cc,{scope:t,forceMount:n,children:l.Children.map(r,s=>C.jsx(Ct,{present:n||a.open,children:C.jsx(on,{asChild:!0,container:o,children:s})}))})};Ro.displayName=gn;var wt="DialogOverlay",Ao=l.forwardRef((e,t)=>{const n=Eo(wt,e.__scopeDialog),s=e,{forceMount:r=n.forceMount}=s,o=N(s,["forceMount"]),a=ue(wt,e.__scopeDialog);return a.modal?C.jsx(Ct,{present:r||a.open,children:C.jsx(Ec,E(k({},o),{ref:t}))}):null});Ao.displayName=wt;var Mc=Ve("DialogOverlay.RemoveScroll"),Ec=l.forwardRef((e,t)=>{const a=e,{__scopeDialog:n}=a,r=N(a,["__scopeDialog"]),o=ue(wt,n);return C.jsx(mn,{as:Mc,allowPinchZoom:!0,shards:[o.contentRef],children:C.jsx($.div,E(k({"data-state":wn(o.open)},r),{ref:t,style:k({pointerEvents:"auto"},r.style)}))})}),Ne="DialogContent",Po=l.forwardRef((e,t)=>{const n=Eo(Ne,e.__scopeDialog),s=e,{forceMount:r=n.forceMount}=s,o=N(s,["forceMount"]),a=ue(Ne,e.__scopeDialog);return C.jsx(Ct,{present:r||a.open,children:a.modal?C.jsx(Rc,E(k({},o),{ref:t})):C.jsx(Ac,E(k({},o),{ref:t}))})});Po.displayName=Ne;var Rc=l.forwardRef((e,t)=>{const n=ue(Ne,e.__scopeDialog),r=l.useRef(null),o=X(t,n.contentRef,r);return l.useEffect(()=>{const a=r.current;if(a)return zr(a)},[]),C.jsx(To,E(k({},e),{ref:o,trapFocus:n.open,disableOutsidePointerEvents:!0,onCloseAutoFocus:G(e.onCloseAutoFocus,a=>{var s;a.preventDefault(),(s=n.triggerRef.current)==null||s.focus()}),onPointerDownOutside:G(e.onPointerDownOutside,a=>{const s=a.detail.originalEvent,i=s.button===0&&s.ctrlKey===!0;(s.button===2||i)&&a.preventDefault()}),onFocusOutside:G(e.onFocusOutside,a=>a.preventDefault())}))}),Ac=l.forwardRef((e,t)=>{const n=ue(Ne,e.__scopeDialog),r=l.useRef(!1),o=l.useRef(!1);return C.jsx(To,E(k({},e),{ref:t,trapFocus:!1,disableOutsidePointerEvents:!1,onCloseAutoFocus:a=>{var s,i;(s=e.onCloseAutoFocus)==null||s.call(e,a),a.defaultPrevented||(r.current||(i=n.triggerRef.current)==null||i.focus(),a.preventDefault()),r.current=!1,o.current=!1},onInteractOutside:a=>{var c,u;(c=e.onInteractOutside)==null||c.call(e,a),a.defaultPrevented||(r.current=!0,a.detail.originalEvent.type==="pointerdown"&&(o.current=!0));const s=a.target;((u=n.triggerRef.current)==null?void 0:u.contains(s))&&a.preventDefault(),a.detail.originalEvent.type==="focusin"&&o.current&&a.preventDefault()}}))}),To=l.forwardRef((e,t)=>{const f=e,{__scopeDialog:n,trapFocus:r,onOpenAutoFocus:o,onCloseAutoFocus:a}=f,s=N(f,["__scopeDialog","trapFocus","onOpenAutoFocus","onCloseAutoFocus"]),i=ue(Ne,n),c=l.useRef(null),u=X(t,c);return Fr(),C.jsxs(C.Fragment,{children:[C.jsx(yn,{asChild:!0,loop:!0,trapped:r,onMountAutoFocus:o,onUnmountAutoFocus:a,children:C.jsx(St,E(k({role:"dialog",id:i.contentId,"aria-describedby":i.descriptionId,"aria-labelledby":i.titleId,"data-state":wn(i.open)},s),{ref:u,onDismiss:()=>i.onOpenChange(!1)}))}),C.jsxs(C.Fragment,{children:[C.jsx(Pc,{titleId:i.titleId}),C.jsx(Oc,{contentRef:c,descriptionId:i.descriptionId})]})]})}),xn="DialogTitle",Oo=l.forwardRef((e,t)=>{const a=e,{__scopeDialog:n}=a,r=N(a,["__scopeDialog"]),o=ue(xn,n);return C.jsx($.h2,E(k({id:o.titleId},r),{ref:t}))});Oo.displayName=xn;var No="DialogDescription",_o=l.forwardRef((e,t)=>{const a=e,{__scopeDialog:n}=a,r=N(a,["__scopeDialog"]),o=ue(No,n);return C.jsx($.p,E(k({id:o.descriptionId},r),{ref:t}))});_o.displayName=No;var Io="DialogClose",Lo=l.forwardRef((e,t)=>{const a=e,{__scopeDialog:n}=a,r=N(a,["__scopeDialog"]),o=ue(Io,n);return C.jsx($.button,E(k({type:"button"},r),{ref:t,onClick:G(e.onClick,()=>o.onOpenChange(!1))}))});Lo.displayName=Io;function wn(e){return e?"open":"closed"}var Do="DialogTitleWarning",[Ld,jo]=la(Do,{contentName:Ne,titleName:xn,docsSlug:"dialog"}),Pc=({titleId:e})=>{const t=jo(Do),n=`\`${t.contentName}\` requires a \`${t.titleName}\` for the component to be accessible for screen reader users.

If you want to hide the \`${t.titleName}\`, you can wrap it with our VisuallyHidden component.

For more information, see https://radix-ui.com/primitives/docs/components/${t.docsSlug}`;return l.useEffect(()=>{e&&(document.getElementById(e)||console.error(n))},[n,e]),null},Tc="DialogDescriptionWarning",Oc=({contentRef:e,descriptionId:t})=>{const r=`Warning: Missing \`Description\` or \`aria-describedby={undefined}\` for {${jo(Tc).contentName}}.`;return l.useEffect(()=>{var a;const o=(a=e.current)==null?void 0:a.getAttribute("aria-describedby");t&&o&&(document.getElementById(t)||console.warn(r))},[r,e,t]),null},Dd=Co,jd=Ro,Fd=Ao,Hd=Po,Vd=Oo,zd=_o,Bd=Lo;export{_u as $,os as A,zc as B,as as C,St as D,Tl as E,kl as F,vu as G,Kl as H,Zl as I,ud as J,Il as K,tu as L,lu as M,zl as N,ju as O,$ as P,ol as Q,sr as R,Ku as S,ld as T,cd as U,pr as V,gd as W,xd as X,Ru as Y,Jc as Z,Al as _,ke as a,Gu as a$,Qc as a0,Dl as a1,sl as a2,Jl as a3,Vu as a4,Uu as a5,Nl as a6,Wc as a7,il as a8,Ou as a9,sd as aA,wu as aB,Pl as aC,Kc as aD,Yc as aE,Ol as aF,Du as aG,Yu as aH,ml as aI,eu as aJ,pl as aK,dl as aL,yl as aM,Ll as aN,Qu as aO,zu as aP,wl as aQ,bl as aR,ed as aS,Fu as aT,al as aU,ou as aV,hd as aW,Ql as aX,au as aY,Cl as aZ,gu as a_,ku as aa,cu as ab,hu as ac,fu as ad,el as ae,Eu as af,md as ag,qu as ah,iu as ai,Rl as aj,$c as ak,Bu as al,Bl as am,Wl as an,Sl as ao,Nu as ap,Xc as aq,xl as ar,su as as,Iu as at,fl as au,Gc as av,Pu as aw,vd as ax,uu as ay,Au as az,jc as b,ru as b$,rd as b0,wd as b1,pd as b2,Cu as b3,Mu as b4,Su as b5,yu as b6,ad as b7,$l as b8,El as b9,Zi as bA,bd as bB,Cd as bC,Nd as bD,_d as bE,Md as bF,Ed as bG,Rd as bH,Ad as bI,Pd as bJ,Od as bK,Td as bL,Id as bM,kd as bN,Sd as bO,Fd as bP,jd as bQ,Hd as bR,Bd as bS,Vd as bT,zd as bU,Dd as bV,Ul as bW,nu as bX,tl as bY,Zu as bZ,_l as b_,ql as ba,nl as bb,Yl as bc,Ml as bd,Vl as be,Hl as bf,Hu as bg,Gl as bh,jl as bi,nd as bj,dd as bk,Tu as bl,$u as bm,Xl as bn,yd as bo,fd as bp,xu as bq,Wu as br,mu as bs,hl as bt,Lu as bu,od as bv,Ju as bw,bu as bx,Fc as by,ss as bz,Dc as c,Xu as c0,id as c1,gl as c2,Zc as c3,Uc as c4,pu as c5,td as c6,qc as c7,Fl as c8,qt as d,Ct as e,G as f,Ko as g,Ae as h,ya as i,Vc as j,bt as k,on as l,ee as m,va as n,Bc as o,Pr as p,Hc as q,l as r,is as s,rl as t,X as u,ul as v,ll as w,du as x,vl as y,cl as z};

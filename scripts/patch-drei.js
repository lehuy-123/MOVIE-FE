const fs = require('fs');
const path = require('path');

const esmHtmlPath = path.resolve(__dirname, '../node_modules/@react-three/drei/web/Html.js');
const cjsHtmlPath = path.resolve(__dirname, '../node_modules/@react-three/drei/web/Html.cjs.js');

// 1. Patch ESM Html.js
if (fs.existsSync(esmHtmlPath)) {
  let esmContent = fs.readFileSync(esmHtmlPath, 'utf8');

  const esmTarget = /React\.useLayoutEffect\(\(\) => \{\s*if \(group\.current\) \{[\s\S]*?\}, \[target, transform\]\);(\s*React\.useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);)?/;
  const esmReplacement = `React.useLayoutEffect(() => {
    if (group.current) {
      if (!root.current) {
        root.current = ReactDOM.createRoot(el);
      }
      scene.updateMatrixWorld();
      if (transform) {
        el.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;";
      } else {
        const vec = calculatePosition(group.current, camera, size);
        el.style.cssText = "position:absolute;top:0;left:0;transform:translate3d(" + vec[0] + "px," + vec[1] + "px,0);transform-origin:0 0;";
      }
      if (target && el.parentNode !== target) {
        if (prepend) target.prepend(el); else target.appendChild(el);
      }
    }
  }, [target, transform]);

  React.useEffect(() => {
    return () => {
      const r = root.current;
      root.current = null;
      setTimeout(() => {
        try {
          if (r) r.unmount();
        } catch (e) {}
        try {
          if (el && typeof el.remove === 'function') {
            el.remove();
          } else if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        } catch (e) {}
      }, 50);
    };
  }, []);`;

  if (esmTarget.test(esmContent)) {
    esmContent = esmContent.replace(esmTarget, esmReplacement);
    fs.writeFileSync(esmHtmlPath, esmContent, 'utf8');
    console.log('[patch-drei] Successfully patched ESM Html.js with safe DOM cleanup');
  } else {
    console.log('[patch-drei] ESM already up to date');
  }
}

// 2. Patch CJS Html.cjs.js
if (fs.existsSync(cjsHtmlPath)) {
  let cjsContent = fs.readFileSync(cjsHtmlPath, 'utf8');

  const cjsTarget = 'c.useEffect((()=>()=>{D.parentNode&&D.parentNode.removeChild(D);if(G.current){const e=G.current;G.current=null;setTimeout((()=>{try{e.unmount()}catch(n){}}),0)}}),[])';
  const cjsReplacement = 'c.useEffect((()=>()=>{const e=G.current;G.current=null;setTimeout((()=>{try{e&&e.unmount()}catch(n){}try{D&&"function"==typeof D.remove?D.remove():D&&D.parentNode&&D.parentNode.removeChild(D)}catch(n){}}),50)}),[])';

  if (cjsContent.includes(cjsTarget)) {
    cjsContent = cjsContent.replace(cjsTarget, cjsReplacement);
    fs.writeFileSync(cjsHtmlPath, cjsContent, 'utf8');
    console.log('[patch-drei] Successfully patched CJS Html.cjs.js with safe DOM cleanup');
  } else {
    console.log('[patch-drei] CJS already up to date');
  }
}

/* Design Systems Lab — vanilla JS, no dependencies */
const R = String.raw;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const code = (lang, src) => `<div class="code"><span class="lang">${lang}</span><pre>${esc(src.trim())}</pre></div>`;
const flash = el => { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); };
const cards = items => `<div class="flipgrid">${items.map(([t, d]) => `<button class="flip" aria-expanded="false"><b>${t}</b><span>${d}</span></button>`).join('')}</div>`;
const tabs = (id, items) => `<div class="tabs" id="${id}"><div class="tabbar" role="tablist">${items.map((t, i) => `<button data-t="${i}" role="tab" aria-selected="${i ? 'false' : 'true'}">${t[0]}</button>`).join('')}</div>${items.map((t, i) => `<div class="pane ${i ? '' : 'on'}" data-t="${i}">${t[1]}</div>`).join('')}</div>`;

/* ---------- design tokens (single source of truth for all demos) ---------- */
const T = { primary: '#6d5efc', radius: 10, space: 12 };
const tokenListeners = [];
function applyTokens() {
  const s = document.documentElement.style;
  s.setProperty('--ds-primary', T.primary);
  s.setProperty('--ds-radius', T.radius + 'px');
  s.setProperty('--ds-space', T.space + 'px');
  $('#o-radius').textContent = T.radius; $('#o-space').textContent = T.space;
  tokenListeners.forEach(f => f());
}
$('#t-primary').oninput = e => { T.primary = e.target.value; applyTokens(); };
$('#t-radius').oninput = e => { T.radius = +e.target.value; applyTokens(); };
$('#t-space').oninput = e => { T.space = +e.target.value; applyTokens(); };
const hex = () => T.primary.slice(1).toUpperCase();

/* ---------- progress ---------- */
const store = {
  get() { try { return JSON.parse(localStorage.getItem('dsl') || '{}'); } catch { return {}; } },
  set(o) { localStorage.setItem('dsl', JSON.stringify(o)); }
};

/* ---------- quizzes ---------- */
function quizHTML() { return `<section class="quiz"><h3>Check Yourself</h3><div class="qs"></div><div class="qres"></div></section>`; }
function initQuiz(root, id, bank, onFinish) {
  const qs = $('.qs', root), res = $('.qres', root); let answered = 0, score = 0;
  qs.innerHTML = bank.map((q, i) => `<div class="q" data-i="${i}"><p>${i + 1}. ${q.q}</p><div class="opts">${q.o.map((o, j) => `<button data-j="${j}"><span class="mark" aria-hidden="true"></span><span>${o}</span></button>`).join('')}</div><div class="why">${q.why}</div></div>`).join('');
  qs.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const qe = b.closest('.q'); if (qe.classList.contains('done')) return;
    const q = bank[+qe.dataset.i], j = +b.dataset.j;
    qe.classList.add('done'); answered++;
    $$('button', qe).forEach((x, k) => { x.disabled = true; if (k === q.a) { x.classList.add('right'); $('.mark', x).textContent = '✓'; x.insertAdjacentHTML('beforeend', '<span class="sr"> Correct answer</span>'); } });
    if (j === q.a) score++; else { b.classList.add('wrong'); $('.mark', b).textContent = '✕'; b.insertAdjacentHTML('beforeend', '<span class="sr"> Your answer, incorrect</span>'); }
    if (answered === bank.length) {
      res.textContent = `Score: ${score}/${bank.length} ${score === bank.length ? 'Perfect.' : score >= bank.length * .6 ? 'Nice work.' : 'Re-read the lesson and try again.'}`;
      const p = store.get(); p[id] = Math.max(p[id] || 0, score / bank.length); store.set(p); updateNav();
      onFinish && onFinish(score);
    }
  };
}

/* ---------- little step-through widget ---------- */
function stepper(el, steps) {
  let i = 0;
  const draw = () => {
    el.innerHTML = `<div class="step">${steps.map((s, k) => `<button data-k="${k}" ${k === i ? 'aria-current="step"' : ''} class="${k < i ? 'past' : ''}">${k + 1}. ${s[0]}</button>`).join('')}</div>
    <div class="stepbody">${steps[i][1]}</div>
    <div class="row" style="margin-top:8px"><button class="btn" data-d="-1">Back</button><button class="btn pri" data-d="1">Next Step</button></div>`;
  };
  el.onclick = e => {
    const d = e.target.closest('[data-d]'), s = e.target.closest('[data-k]');
    if (d) i = Math.min(steps.length - 1, Math.max(0, i + +d.dataset.d)); else if (s) i = +s.dataset.k; else return;
    draw();
  };
  draw();
}

/* ---------- shell ---------- */
const M = []; // modules, filled in modules below
let cleanup = [], cur = 0, io;
const ICONS = {
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  drop: '<path d="M12 3.5c3 3.8 6 6.8 6 10.2a6 6 0 0 1-12 0c0-3.4 3-6.4 6-10.2z"/>',
  atom: '<ellipse cx="12" cy="12" rx="9" ry="3.8"/><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(120 12 12)"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  vue: '<path d="M3.5 5h4.2L12 12.6 16.3 5h4.2L12 20z"/>',
  shield: '<path d="M12 3l8 2.8-1.3 11.2L12 21l-6.7-4L4 5.8z"/><path d="M8.8 15.5L12 8l3.2 7.5M9.9 13.2h4.2"/>',
  cube: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12L4 7.5M12 12v9"/>',
  stack: '<rect x="4" y="4" width="16" height="4.5" rx="1.5"/><rect x="4" y="9.8" width="16" height="4.5" rx="1.5"/><rect x="4" y="15.5" width="16" height="4.5" rx="1.5"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  compare: '<path d="M4 8h16M16 4l4 4-4 4M20 16H4M8 12l-4 4 4 4"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7 5.8-5.7"/>'
};
const GROUPS = [['Foundations', ['intro', 'tokens']], ['Web Frameworks', ['react', 'vue', 'angular', 'wc']], ['Native Apps', ['swiftui', 'compose']], ['Wrap Up', ['compare', 'final']]];
const groupOf = id => GROUPS.findIndex(g => g[1].includes(id));
const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>`;
function updateNav() {
  const p = store.get();
  $('#nav').innerHTML = GROUPS.map((g, gi) => `<div class="ngroup"><h3>${g[0]}</h3>${g[1].map(id => {
    const i = M.findIndex(m => m.id === id), m = M[i], pc = p[id] != null ? Math.round(p[id] * 100) : null;
    return `<button data-i="${i}" ${i === cur ? 'aria-current="page"' : ''}><span class="tile g${gi}">${svg(m.icon)}</span><span class="nl">${m.title}</span>${pc != null ? `<span class="score"><span class="sr">Quiz score </span>${pc}%</span>` : ''}</button>`;
  }).join('')}</div>`).join('');
  const done = M.filter(m => p[m.id] != null).length;
  $('#progbar').style.width = (done / M.length * 100) + '%';
  $('.prog').setAttribute('aria-valuenow', Math.round(done / M.length * 100));
  $('#proglabel').textContent = `${done} of ${M.length} quizzes completed`;
}
function go(i) {
  cur = i; location.hash = '#/' + M[i].id;
  cleanup.forEach(f => f()); cleanup = [];
  tokenListeners.length = 0;
  const m = M[i], root = $('#content');
  root.innerHTML = `<p class="eyebrow">${GROUPS[groupOf(m.id)][0]} · ${i + 1} of ${M.length}</p><h1 id="ptitle">${m.title}</h1><p class="tag">${m.tag}</p>${m.html()}${m.quiz || m.dynQuiz ? quizHTML() : ''}
    <div class="nav">${i > 0 ? `<button class="btn" data-go="${i - 1}">‹ ${M[i - 1].title}</button>` : '<span></span>'}${i < M.length - 1 ? `<button class="btn pri" data-go="${i + 1}">${M[i + 1].title} ›</button>` : ''}</div>`;
  m.init && m.init(root);
  if (m.quiz || m.dynQuiz) initQuiz($('.quiz', root), m.id, m.quiz || m.dynQuiz());
  $('#tbtitle').textContent = m.title;
  $('#tb-prev').disabled = i === 0; $('#tb-next').disabled = i === M.length - 1;
  $('#toolbar').classList.remove('scrolled');
  io && io.disconnect();
  io = new IntersectionObserver(([e]) => $('#toolbar').classList.toggle('scrolled', !e.isIntersecting), { rootMargin: '-72px 0px 0px 0px' });
  io.observe($('#ptitle'));
  document.body.classList.remove('side-open');
  updateNav(); window.scrollTo(0, 0);
}
document.addEventListener('click', e => {
  const n = e.target.closest('#nav button'); if (n) return go(+n.dataset.i);
  const g = e.target.closest('[data-go]'); if (g) return go(+g.dataset.go);
  if (e.target.closest('#tb-prev')) return go(cur - 1);
  if (e.target.closest('#tb-next')) return go(cur + 1);
  if (e.target.closest('#sbtn')) return document.body.classList.add('side-open');
  if (e.target.id === 'scrim') return document.body.classList.remove('side-open');
  const tb = e.target.closest('.tabbar button');
  if (tb) { const t = tb.closest('.tabs'); $$(':scope>.tabbar button', t).forEach(b => b.setAttribute('aria-selected', b === tb)); $$(':scope>.pane', t).forEach(p => p.classList.toggle('on', p.dataset.t === tb.dataset.t)); }
  const f = e.target.closest('.flip'); if (f) f.setAttribute('aria-expanded', f.getAttribute('aria-expanded') !== 'true');
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.body.classList.remove('side-open'); });

/* =====================================================================
   MODULE 0 — Big picture
   ===================================================================== */
M.push({
  id: 'intro', icon: 'compass', title: 'Start Here', tag: 'What is a design system, and why do six frameworks even exist?',
  html: () => `
  <div class="plain">Imagine a giant <b>LEGO box</b> that a whole company shares, plus an instruction book. The bricks are buttons, inputs and cards. The book says "our blue is <i>this</i> blue, corners are <i>this</i> round". That box + book is a <b>design system</b>.
  <br>A <b>framework</b> (React, Vue, SwiftUI…) is the <i>table you build on</i>. Web tables, iPhone tables and Android tables all need the same bricks — but each table has its own rules.</div>

  <h2>The 4 layers of a design system <small>(click each)</small></h2>
  ${cards([
    ['1 · Design tokens', 'The smallest decisions, stored as named values: <code>color.primary</code>, <code>radius.md</code>, <code>space.4</code>. Platform‑neutral — just data.'],
    ['2 · Components', 'Reusable building blocks made from tokens: Button, TextField, Card. <b>This is where frameworks come in</b> — each framework has its own way to write a component.'],
    ['3 · Patterns', 'Recipes combining components: login form, data table, empty state, navigation.'],
    ['4 · Guidelines & docs', 'The instruction book: when to use which button, accessibility rules, tone of voice. Often a Storybook or docs site.']
  ])}

  <h2>The core problem</h2>
  <div class="plain">Design says: "Primary button, 10px corners, brand purple." Then engineering has to build that <b>six times</b>, in six languages. The design system's job is to make all six builds <i>look and behave the same</i> without six people re‑deciding everything.</div>

  <h2>Same button, six dialects</h2>
  <p>Each tab is the same thing — a button labelled "Save". Notice the <i>idea</i> is identical, only the grammar changes.</p>
  ${tabs('btn6', [
    ['React', code('jsx', R`function SaveButton({ onPress }) {
  return <button className="ds-btn" onClick={onPress}>Save</button>;
}`)],
    ['Vue', code('vue', R`<script setup>
defineEmits(['press'])
</script>
<template>
  <button class="ds-btn" @click="$emit('press')">Save</button>
</template>`)],
    ['Angular', code('ts', R`@Component({
  selector: 'save-button',
  template: '<button class="ds-btn" (click)="press.emit()">Save</button>',
})
export class SaveButton { press = output<void>(); }`)],
    ['Web Component', code('js', R`class SaveButton extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' }).innerHTML =
      '<button><slot>Save</slot></button>';
  }
}
customElements.define('save-button', SaveButton);`)],
    ['SwiftUI', code('swift', R`Button("Save") { onPress() }
    .buttonStyle(.borderedProminent)`)],
    ['Compose', code('kotlin', R`Button(onClick = onPress) {
    Text("Save")
}`)]
  ])}

  <div class="tie"><b>The big idea of this whole app:</b> tokens are shared by everyone; components are re‑implemented per framework; a good design system keeps both in sync. You'll see that one more time at the end as a pipeline.</div>

  <div class="tip">Try it right now: drag the <b>Primary / Radius / Spacing</b> controls in the left sidebar, then look at this button: <button class="ds-btn">Save</button> — it's already wired to tokens.</div>`,
  quiz: [
    { q: 'What is a "design token"?', o: ['A login credential', 'A named design decision stored as data (e.g. color.primary = #6d5efc)', 'A React component', 'A Figma plugin'], a: 1, why: 'Tokens are the smallest, platform-neutral design decisions: colours, spacing, radii, type sizes.' },
    { q: 'Why do design systems need to care about frameworks?', o: ['They don\'t', 'Each platform builds components differently, but the result must look and behave the same', 'Frameworks decide the brand colours', 'Only for performance'], a: 1, why: 'Components must be implemented in each framework/platform, but share tokens and guidelines to stay consistent.' },
    { q: 'Which layer is closest to "raw data" that every platform can share?', o: ['Components', 'Patterns', 'Tokens', 'Pages'], a: 2, why: 'Tokens are just names + values, so they can be exported to CSS, Swift, Kotlin, etc.' }
  ]
});

/* =====================================================================
   MODULE 1 — Tokens lab
   ===================================================================== */
M.push({
  id: 'tokens', icon: 'drop', title: 'Design Tokens Lab', tag: 'The shared language between design, web, iOS and Android.',
  html: () => `
  <div class="plain">A token is a <b>nickname for a value</b>. Instead of writing <code>#6d5efc</code> in 400 places, you write <code>primary</code> once. Change it once → everything changes. Like a contact in your phone: "Mum" instead of a phone number.</div>

  <h2>Three tiers (click to reveal)</h2>
  ${cards([
    ['Primitive (raw)', '<code>purple-500 = #6d5efc</code><br>The palette. Says <i>what</i> the value is, not <i>what it is for</i>.'],
    ['Semantic (meaning)', '<code>color.action.primary = {purple-500}</code><br>Says what it is <i>for</i>. In dark mode it can point to a different primitive — components never notice.'],
    ['Component', '<code>button.background = {color.action.primary}</code><br>Used by one component only. Lets you tweak Button without touching Card.']
  ])}

  <h2>Playground</h2>
  <div class="panel"><span class="try">Try It</span>
  <p>The sidebar sliders edit the tokens. Watch the preview and the <b>generated code for 3 platforms</b> update live:</p>
  <div class="stage" id="tk-stage">
    <div class="ds-card"><div class="hd">Upgrade plan</div>Unlock everything for your team. <span class="chip">New</span>
      <div class="row" style="margin-top:var(--ds-space)"><button class="ds-btn">Upgrade</button><button class="ds-btn v-ghost">Later</button></div>
      <div class="ft">Cancel any time</div></div>
  </div>
  <div id="tk-out"></div></div>

  <div class="tie">Tools like <b>Style Dictionary</b> or <b>Tokens Studio</b> take one JSON file of tokens and generate CSS variables, Swift constants and Kotlin objects automatically. Designers edit tokens in Figma → code on all platforms updates. That's the shared language.</div>`,
  init(root) {
    const draw = () => {
      $('#tk-out', root).innerHTML = tabs('tkt', [
        ['CSS (web)', code('css', `:root {\n  --ds-primary: ${T.primary};\n  --ds-radius: ${T.radius}px;\n  --ds-space: ${T.space}px;\n}\n.ds-btn { background: var(--ds-primary); border-radius: var(--ds-radius); }`)],
        ['Swift (iOS)', code('swift', `enum DS {\n    static let primary = Color(hex: 0x${hex()})\n    static let radius: CGFloat = ${T.radius}\n    static let space: CGFloat = ${T.space}\n}`)],
        ['Kotlin (Android)', code('kotlin', `object DS {\n    val Primary = Color(0xFF${hex()})\n    val Radius = ${T.radius}.dp\n    val Space = ${T.space}.dp\n}`)],
        ['JSON (source of truth)', code('json', JSON.stringify({ color: { primary: { $value: T.primary, $type: 'color' } }, radius: { md: { $value: T.radius + 'px', $type: 'dimension' } }, space: { md: { $value: T.space + 'px', $type: 'dimension' } } }, null, 2))]
      ]);
    };
    draw(); tokenListeners.push(draw);
  },
  quiz: [
    { q: '"color.action.primary" pointing to "purple-500" is which tier?', o: ['Primitive', 'Semantic', 'Component', 'None'], a: 1, why: 'Semantic tokens describe purpose (action/primary) and reference primitives (purple-500).' },
    { q: 'Why have a semantic tier instead of using raw colours everywhere?', o: ['It is shorter', 'Dark mode / rebrands: change what the semantic token points to, components stay untouched', 'Browsers require it', 'It improves speed'], a: 1, why: 'Semantic indirection is what makes theming cheap.' },
    { q: 'One JSON of tokens becoming CSS + Swift + Kotlin is done by…', o: ['A React hook', 'A build tool such as Style Dictionary', 'Shadow DOM', 'Dependency injection'], a: 1, why: 'Token transformers generate each platform\'s format from a single source.' }
  ]
});

/* =====================================================================
   MODULE 2 — React
   ===================================================================== */
M.push({
  id: 'react', icon: 'atom', title: 'React', tag: 'UI = a function of state. Describe what it should look like; React figures out the changes.',
  html: () => `
  <div class="plain">In React a component is just a <b>function that returns a description of the screen</b>. When data changes, React calls your function again, compares the new description to the old one, and updates only what changed in the browser. You never say "change this text" — you say "given count = 5, the screen looks like <i>this</i>".</div>

  <h2>Key ideas (click)</h2>
  ${cards([
    ['Component', 'A function starting with a capital letter that returns UI: <code>function Button(){…}</code>.'],
    ['JSX', 'HTML-looking syntax inside JavaScript: <code>&lt;button&gt;Hi&lt;/button&gt;</code>. It compiles to plain function calls.'],
    ['Props', 'Inputs to a component, like function arguments: <code>&lt;Button variant="ghost"/&gt;</code>. Flow <b>down</b> only (parent → child).'],
    ['State (useState)', 'Memory owned by a component. Changing it via the setter triggers a re-render.'],
    ['Hooks', 'Special functions (<code>useState</code>, <code>useEffect</code>, <code>useContext</code>) that let function components have memory & side effects.'],
    ['Context', 'A way to pass data (e.g. the theme) to any depth without handing it down through every level.']
  ])}

  <h2>1. Props playground — a design system Button</h2>
  <div class="panel"><span class="try">Try It</span>
    <div class="row">
      <label class="ctl">label <input type="text" id="rb-label" value="Save" size="8"></label>
      <label class="ctl">variant <select id="rb-var"><option>primary</option><option>secondary</option><option>ghost</option></select></label>
      <label class="ctl">size <select id="rb-size"><option>sm</option><option selected>md</option><option>lg</option></select></label>
      <label class="ctl"><input type="checkbox" id="rb-dis"> disabled</label>
    </div>
    <div class="stage" id="rb-stage"></div>
    <div id="rb-code"></div>
    <p style="font-size:14px;color:var(--muted)">The props are the component's public API. A design system limits them to approved choices (3 variants, 3 sizes) so nobody invents a 4th kind of button.</p>
  </div>

  <h2>2. The render cycle</h2>
  <div class="panel"><span class="try">Try It</span>
    <div class="row"><button class="ds-btn" id="rc-btn">Clicked 0 times</button><span>Function ran: <b id="rc-n">1</b> time(s)</span></div>
    <div id="rc-log" class="log" style="margin:10px 0"></div>
    <b>Step through what happens on a click:</b>
    <div id="rc-step"></div>
  </div>

  <h2>3. Context vs. "prop drilling"</h2>
  <div class="panel"><span class="try">Try It</span>
    <div class="row">
      <label class="ctl"><input type="radio" name="rx-mode" value="drill" checked> Pass <code>theme</code> as props</label>
      <label class="ctl"><input type="radio" name="rx-mode" value="ctx"> Use Context</label>
      <button class="btn pri" id="rx-toggle">Toggle Theme</button>
    </div>
    <div id="rx-tree" style="margin-top:10px"></div>
    <div id="rx-count" style="font-weight:700"></div>
    <div id="rx-code"></div>
  </div>

  <div class="tie"><b>React design systems:</b> Material UI, Chakra UI, Ant Design, Carbon, Polaris, and <b>shadcn/ui + Radix</b> (unstyled "headless" behaviour + your tokens).
  <ul><li><b>Theme via Context</b> — a <code>ThemeProvider</code> at the top feeds tokens to all components.</li>
  <li><b>Tokens as CSS variables</b> — the modern, framework-agnostic way (what this app does!).</li>
  <li><b>Props = variants</b> — <code>variant</code>, <code>size</code> enforce the system's rules.</li>
  <li><b>Storybook</b> documents each component with live examples.</li></ul></div>`,
  init(root) {
    /* props playground */
    const drawB = () => {
      const l = $('#rb-label', root).value, v = $('#rb-var', root).value, s = $('#rb-size', root).value, d = $('#rb-dis', root).checked;
      $('#rb-stage', root).innerHTML = `<button class="ds-btn v-${v} s-${s}" ${d ? 'disabled' : ''}>${esc(l)}</button>`;
      $('#rb-code', root).innerHTML = code('jsx', `<Button variant="${v}" size="${s}"${d ? ' disabled' : ''}>\n  ${l}\n</Button>`);
    };
    $$('#rb-label,#rb-var,#rb-size,#rb-dis', root).forEach(e => e.oninput = drawB); drawB();

    /* render cycle */
    let c = 0, renders = 1; const log = $('#rc-log', root);
    const L = (t, n) => { log.insertAdjacentHTML('beforeend', `<div class="${n ? 'new' : ''}">${t}</div>`); log.scrollTop = 1e6; };
    L('// first render'); L('Counter() ran → count = 0', 1);
    $('#rc-btn', root).onclick = () => {
      c++; renders++; $('#rc-btn', root).textContent = `Clicked ${c} time${c > 1 ? 's' : ''}`; $('#rc-n', root).textContent = renders;
      L('onClick → setCount(' + c + ')'); L('Counter() ran again → count = ' + c, 1); L('diff: only the text node changed → patch DOM');
    };
    stepper($('#rc-step', root), [
      ['Click', 'You click. React calls your <code>onClick</code> handler, which calls <code>setCount(count + 1)</code>.'],
      ['Schedule', 'React does <b>not</b> change <code>count</code> immediately. It marks the component "dirty" and schedules a re-render (batching several updates together).'],
      ['Re-run function', 'React <b>calls <code>Counter()</code> again</b>. This time <code>useState</code> returns the new value, so the returned JSX describes "Clicked 1 times".'],
      ['Diff', 'React compares the new description (the "virtual DOM") against the old one and finds: only a text node changed.'],
      ['Patch DOM', 'Only that text node is updated in the real browser DOM. The button itself is untouched. Done!']
    ]);

    /* context vs drilling */
    let dark = false;
    const drawT = () => {
      const mode = $('input[name=rx-mode]:checked', root).value, drill = mode === 'drill';
      const b = (hit, txt) => hit ? `<span class="badge">${txt}</span>` : '';
      $('#rx-tree', root).innerHTML = `<div class="themed ${dark ? 'dark' : ''}">
        <div class="tree ${drill ? 'hit' : ''}"><span class="lab">&lt;App&gt;</span>${b(1, drill ? 'owns theme → passes down' : '&lt;ThemeContext.Provider&gt;')}
         <div class="tree ${drill ? 'hit' : ''}"><span class="lab">&lt;Layout&gt;</span>${b(drill, 'theme prop (just passing it on!)')}
          <div class="tree ${drill ? 'hit' : ''}"><span class="lab">&lt;Card&gt;</span>${b(drill, 'theme prop (just passing it on!)')}
           <div class="tree hit"><span class="lab">&lt;Button&gt;</span>${b(1, drill ? 'uses theme prop' : 'useContext(Theme)')}
             <button class="ds-btn s-sm" style="${dark ? 'background:#c4bcff;color:#111' : ''}">I am ${dark ? 'dark' : 'light'}</button></div></div></div></div></div>`;
      $('#rx-count', root).textContent = drill ? 'Components that had to know about "theme": 4 of 4' : 'Components that had to know about "theme": 2 (Provider + Button)';
      $('#rx-code', root).innerHTML = drill
        ? code('jsx', R`<Layout theme={theme}>      // Layout doesn't need it…
  <Card theme={theme}>      // …neither does Card…
    <Button theme={theme}/> // …only Button does`)
        : code('jsx', R`<ThemeContext.Provider value={theme}>
  <Layout><Card><Button/></Card></Layout>
</ThemeContext.Provider>

function Button() {
  const theme = useContext(ThemeContext); // grab it from anywhere below
}`);
    };
    $$('input[name=rx-mode]', root).forEach(r => r.onchange = drawT);
    $('#rx-toggle', root).onclick = () => { dark = !dark; drawT(); };
    drawT();
  },
  quiz: [
    { q: 'What does React do when state changes?', o: ['Edits the DOM directly where you point', 'Calls your component function again and updates only the differences', 'Reloads the page', 'Nothing until you call render()'], a: 1, why: 'React re-runs the function, diffs the result with the previous output, and patches the DOM.' },
    { q: 'Which data direction do props follow?', o: ['Child → parent', 'Parent → child', 'Both ways automatically', 'Sibling → sibling'], a: 1, why: 'One-way data flow: parents pass props down; children notify parents through callback props.' },
    { q: 'Best React feature for feeding a theme/tokens to deeply nested components?', o: ['Context (ThemeProvider)', 'Global variables on window', 'Re-declaring colours in each file', 'JSX fragments'], a: 0, why: 'Context avoids prop drilling; CSS variables are another popular option.' },
    { q: 'What makes "headless" libraries like Radix attractive for design systems?', o: ['They ship with fixed brand colours', 'They provide accessible behaviour but let YOUR tokens define the look', 'They only work on mobile', 'They replace React'], a: 1, why: 'Headless = behaviour + accessibility without opinionated styling.' }
  ]
});

/* =====================================================================
   MODULE 3 — Vue
   ===================================================================== */
M.push({
  id: 'vue', icon: 'vue', title: 'Vue', tag: 'HTML-first templates + reactivity that knows exactly what depends on what.',
  html: () => `
  <div class="plain">Vue lets you write a component as <b>one file with three parts</b>: <code>&lt;template&gt;</code> (the HTML), <code>&lt;script&gt;</code> (the logic) and <code>&lt;style&gt;</code> (the CSS). When you change a reactive variable, Vue <b>already knows</b> which pieces of the template use it — so it updates just those pieces, no guessing.</div>

  ${code('vue', R`<script setup>
import { ref, computed } from 'vue'
const name = ref('Ada')                       // reactive state
const greeting = computed(() => 'Hi ' + name.value) // auto-updates
</script>

<template>
  <input v-model="name">   <!-- two-way binding -->
  <p>{{ greeting }}</p>
</template>

<style scoped> p { color: var(--ds-primary); } </style>`)}

  <h2>Key ideas (click)</h2>
  ${cards([
    ['Single‑File Component', 'A <code>.vue</code> file with template + script + style together. <code>scoped</code> styles only affect that component.'],
    ['ref / reactive', 'Wrap a value in <code>ref()</code> and Vue tracks every place that reads it.'],
    ['computed', 'A value derived from other values. Cached, and recalculated only when its ingredients change.'],
    ['v-model', 'Two-way binding for inputs: typing updates the variable, changing the variable updates the input.'],
    ['v-if / v-for', 'Template directives for conditions and loops, written as HTML attributes.'],
    ['Slots', 'Holes in a component where the parent can inject content. The heart of reusable layouts like Card or Modal.']
  ])}

  <h2>1. Fine‑grained reactivity</h2>
  <div class="panel"><span class="try">Try It</span>
    <p>Type in the box and watch <b>only the things that depend on <code>name</code></b> flash. Then click the counter — a different set flashes.</p>
    <div class="row"><input type="text" id="vu-in" value="Ada" aria-label="Name"> <button class="btn" id="vu-inc">count++</button></div>
    <table style="margin-top:10px"><tr><th>Piece of template</th><th>Depends on</th><th>Live value</th></tr>
      <tr><td><code>{{ name }}</code></td><td>name</td><td><span class="dep" id="vu-a"></span></td></tr>
      <tr><td><code>{{ greeting }}</code> (computed)</td><td>name</td><td><span class="dep" id="vu-b"></span></td></tr>
      <tr><td><code>{{ name.length }}</code></td><td>name</td><td><span class="dep" id="vu-c"></span></td></tr>
      <tr><td><code>{{ count * 2 }}</code></td><td>count</td><td><span class="dep" id="vu-d"></span></td></tr>
      <tr><td><code>&lt;footer&gt;static&lt;/footer&gt;</code></td><td>nothing</td><td><span class="dep">static</span></td></tr></table>
  </div>

  <h2>2. Slots — the Card with holes</h2>
  <div class="panel"><span class="try">Try It</span>
    <div class="row">
      <label class="ctl"><input type="checkbox" id="sl-h" checked> #header slot</label>
      <label class="ctl"><input type="checkbox" id="sl-d" checked> default slot</label>
      <label class="ctl"><input type="checkbox" id="sl-f"> #footer slot</label>
    </div>
    <div class="stage" id="sl-stage"></div><div id="sl-code"></div>
    <p style="font-size:14px;color:var(--muted)">The design system owns the card's <i>frame</i> (spacing, border, radius from tokens). Teams only fill the holes — so every card looks consistent.</p>
  </div>

  <div class="tie"><b>Vue design systems:</b> Vuetify, PrimeVue, Element Plus, Quasar, Nuxt UI, Naive UI.
  <ul><li><b>Slots</b> = flexible composition inside a locked-down design.</li>
  <li><b>Scoped styles + CSS variables</b> = tokens without style leaks.</li>
  <li><b>provide / inject</b> = Vue's version of React Context for theming.</li>
  <li>Vuetify/PrimeVue expose a <b>theme config</b> object — basically your tokens.</li></ul></div>`,
  init(root) {
    let name = 'Ada', count = 0;
    const els = { a: $('#vu-a', root), b: $('#vu-b', root), c: $('#vu-c', root), d: $('#vu-d', root) };
    const set = (k, v) => { if (els[k].textContent !== String(v)) { els[k].textContent = v; flash(els[k]); } };
    const all = () => { set('a', name); set('b', 'Hi ' + name); set('c', name.length); set('d', count * 2); };
    all();
    $('#vu-in', root).oninput = e => { name = e.target.value; set('a', name); set('b', 'Hi ' + name); set('c', name.length); };
    $('#vu-inc', root).onclick = () => { count++; set('d', count * 2); };

    const drawS = () => {
      const h = $('#sl-h', root).checked, d = $('#sl-d', root).checked, f = $('#sl-f', root).checked;
      $('#sl-stage', root).innerHTML = `<div class="ds-card">${h ? '<div class="hd">Team plan</div>' : ''}${d ? '$29 / month — unlimited projects.' : ''}${f ? '<div class="ft">Billed yearly</div>' : ''}</div>`;
      $('#sl-code', root).innerHTML = code('vue', `<DsCard>\n${h ? '  <template #header>Team plan</template>\n' : ''}${d ? '  $29 / month — unlimited projects.\n' : ''}${f ? '  <template #footer>Billed yearly</template>\n' : ''}</DsCard>`);
    };
    $$('#sl-h,#sl-d,#sl-f', root).forEach(e => e.onchange = drawS); drawS();
  },
  quiz: [
    { q: 'What is a Vue "computed" value?', o: ['A value derived from other reactive values, cached and auto-updated', 'A CSS calculation', 'A server call', 'A prop'], a: 0, why: 'computed() re-evaluates only when the reactive values it read change.' },
    { q: 'v-model does what?', o: ['Loads a 3D model', 'Two-way binding between an input and a variable', 'Defines the CSS', 'Registers a route'], a: 1, why: 'Typing updates the variable; changing the variable updates the input.' },
    { q: 'Why are slots great for design systems?', o: ['They speed up the network', 'They let teams inject content while the system controls the frame/styling', 'They store tokens', 'They replace props'], a: 1, why: 'Slots give composition flexibility inside a consistent, token-driven shell.' }
  ]
});

/* =====================================================================
   MODULE 4 — Angular
   ===================================================================== */
M.push({
  id: 'angular', icon: 'shield', title: 'Angular', tag: 'The "batteries included" framework: structure, TypeScript and dependency injection built in.',
  html: () => `
  <div class="plain">If React is a box of LEGO, Angular is a <b>LEGO Technic kit with a manual</b>: routing, forms, HTTP, testing and dependency injection all come in the box, and everything is written in TypeScript. Big teams like it because every project is organised the same way.</div>

  ${code('ts', R`@Component({
  selector: 'ds-counter',
  standalone: true,
  template: '<button (click)="inc()">{{ count() }} (double: {{ double() }})</button>',
})
export class DsCounter {
  count  = signal(0);                         // reactive state
  double = computed(() => this.count() * 2);  // derived
  inc()  { this.count.update(n => n + 1); }
}`)}

  <h2>Key ideas (click)</h2>
  ${cards([
    ['Component + decorator', '<code>@Component({...})</code> attaches metadata (selector, template, styles) to a TypeScript class.'],
    ['Template syntax', '<code>{{ value }}</code> shows data, <code>[prop]="x"</code> sends data in, <code>(event)="fn()"</code> listens for events.'],
    ['Dependency Injection', 'Components <b>ask</b> for what they need in the constructor; Angular supplies it. Great for shared services like ThemeService.'],
    ['Signals', 'Modern reactive values (like Vue refs): <code>count()</code> to read, <code>.set()</code>/<code>.update()</code> to write.'],
    ['RxJS Observables', 'Streams of values over time (HTTP, user events). Powerful, but a bigger learning curve.'],
    ['Standalone components', 'Components that import what they need directly — no more big NgModules.']
  ])}

  <h2>1. Signals</h2>
  <div class="panel"><span class="try">Try It</span>
    <div class="row"><button class="btn" id="ng-inc">count.update(n =&gt; n+1)</button><button class="btn" id="ng-set">count.set(10)</button><button class="btn" id="ng-rst">count.set(0)</button></div>
    <div class="row" style="margin:10px 0">count() = <span class="dep" id="ng-c"></span> computed double() = <span class="dep" id="ng-d"></span></div>
    <div id="ng-log" class="log" style="height:90px"></div>
    <p style="font-size:14px;color:var(--muted)">Notice <code>double</code> never needs to be told to update — it's declared as a formula of <code>count</code>.</p>
  </div>

  <h2>2. Dependency Injection</h2>
  <div class="panel"><span class="try">Try It</span>
    <p>Two components, A and B, both inject a <code>ThemeService</code>. Does changing it in A affect B? Depends <i>where it's provided</i>.</p>
    <div class="row">
      <label class="ctl"><input type="radio" name="di" value="root" checked> <code>providedIn: 'root'</code> (one shared instance)</label>
      <label class="ctl"><input type="radio" name="di" value="own"> <code>providers: [ThemeService]</code> in each component</label>
    </div>
    <div class="grid" style="margin-top:10px">
      <div class="tree"><span class="lab">&lt;comp-a&gt;</span> <button class="btn" id="di-a">Change Accent in A</button><br>service id: <b id="di-ia"></b> · accent: <span class="chip" id="di-ca"></span></div>
      <div class="tree"><span class="lab">&lt;comp-b&gt;</span> <button class="btn" id="di-b">Change Accent in B</button><br>service id: <b id="di-ib"></b> · accent: <span class="chip" id="di-cb"></span></div>
    </div>
    <div id="di-code"></div>
  </div>

  <div class="tie"><b>Angular design systems:</b> <b>Angular Material</b> (Google Material 3) and the <b>CDK</b> (headless behaviours: overlays, drag-drop, a11y), PrimeNG, Spartan UI, Clarity, Carbon for Angular.
  <ul><li><b>Theming service via DI</b> — one singleton hands tokens to all components.</li>
  <li>Material 3 exposes tokens as CSS variables like <code>--mat-sys-primary</code> — override them to rebrand.</li>
  <li>Strong typing = the compiler catches wrong prop values (e.g. <code>variant="primry"</code>).</li>
  <li>Enterprises love it: <b>one way to do everything</b> keeps hundreds of devs consistent.</li></ul></div>`,
  init(root) {
    /* signals */
    let n = 0; const c = $('#ng-c', root), d = $('#ng-d', root), lg = $('#ng-log', root);
    const L = t => { lg.insertAdjacentHTML('beforeend', `<div class="new">${t}</div>`); lg.scrollTop = 1e6; };
    const upd = why => { c.textContent = n; d.textContent = n * 2; flash(c); flash(d); L(why + ' → effect(): count=' + n + ', double=' + n * 2); };
    c.textContent = 0; d.textContent = 0;
    $('#ng-inc', root).onclick = () => { n++; upd('update'); };
    $('#ng-set', root).onclick = () => { n = 10; upd('set(10)'); };
    $('#ng-rst', root).onclick = () => { n = 0; upd('set(0)'); };

    /* DI */
    const accents = ['purple', 'teal', 'orange', 'pink'];
    let id = 0, shared = { id: ++id, i: 0 }, A = { id: ++id, i: 0 }, B = { id: ++id, i: 0 };
    const draw = () => {
      const root_ = $('input[name=di]:checked', root).value === 'root';
      const a = root_ ? shared : A, b = root_ ? shared : B;
      $('#di-ia', root).textContent = '#' + a.id; $('#di-ib', root).textContent = '#' + b.id;
      $('#di-ca', root).textContent = accents[a.i % 4]; $('#di-cb', root).textContent = accents[b.i % 4];
      $('#di-code', root).innerHTML = root_
        ? code('ts', R`@Injectable({ providedIn: 'root' })   // ONE instance for the whole app
export class ThemeService { accent = signal('purple'); }

constructor() { this.theme = inject(ThemeService); } // A and B get the same object`)
        : code('ts', R`@Component({ ..., providers: [ThemeService] }) // each component gets its OWN instance
export class CompA { theme = inject(ThemeService); }`);
    };
    $('#di-a', root).onclick = () => { ($('input[name=di]:checked', root).value === 'root' ? shared : A).i++; draw(); };
    $('#di-b', root).onclick = () => { ($('input[name=di]:checked', root).value === 'root' ? shared : B).i++; draw(); };
    $$('input[name=di]', root).forEach(r => r.onchange = draw); draw();
  },
  quiz: [
    { q: 'What is dependency injection in Angular?', o: ['Angular supplies the objects (services) a class asks for', 'Injecting CSS at runtime', 'A security attack', 'Lazy-loading images'], a: 0, why: 'Classes declare what they need; Angular\'s injector creates and provides it.' },
    { q: 'With providedIn: \'root\', how many instances of the service exist?', o: ['One per component', 'One shared for the app', 'Two', 'It depends on the browser'], a: 1, why: 'Root-provided services are singletons — perfect for app-wide theme or token services.' },
    { q: 'Angular Material\'s CDK is…', o: ['A CSS file', 'A set of unstyled behaviours (overlay, a11y, drag-drop) for building your own components', 'A database', 'The router'], a: 1, why: 'The CDK is the "headless" layer many Angular design systems build upon.' }
  ]
});

/* =====================================================================
   MODULE 5 — Web Components (these demos are REAL custom elements)
   ===================================================================== */
const BTN_CSS = `button{font:inherit;font-weight:600;cursor:pointer;border:2px solid transparent;color:#fff;background:var(--ds-primary,#6d5efc);border-radius:var(--ds-radius,10px);padding:calc(var(--ds-space,12px)*.6) calc(var(--ds-space,12px)*1.6)}`;
class DsBtnShadow extends HTMLElement {
  static observedAttributes = ['variant'];
  constructor() { super(); this.attachShadow({ mode: 'open' }).innerHTML = `<style>${BTN_CSS}:host([variant=ghost]) button{background:transparent;color:var(--ds-primary,#6d5efc);border-color:var(--ds-primary,#6d5efc)}</style><button part="button"><slot></slot></button>`; this.shadowRoot.querySelector('button').addEventListener('click', () => this.dispatchEvent(new CustomEvent('ds-press', { bubbles: true, composed: true }))); }
}
class DsBtnPlain extends HTMLElement {
  static observedAttributes = ['variant'];
  connectedCallback() { this.innerHTML = `<button class="ds-btn ${this.getAttribute('variant') === 'ghost' ? 'v-ghost' : ''}">${this.textContent}</button>`; }
  attributeChangedCallback() { if (this.isConnected) this.connectedCallback(); }
}
customElements.define('ds-btn-shadow', DsBtnShadow);
customElements.define('ds-btn-plain', DsBtnPlain);

M.push({
  id: 'wc', icon: 'cube', title: 'Web Components', tag: 'The browser\'s own component system — no framework required, works inside all of them.',
  html: () => `
  <div class="plain">React, Vue and Angular are <b>libraries you download</b>. Web Components are <b>built into the browser</b>. You teach the browser a new HTML tag, like <code>&lt;ds-button&gt;</code>, and it works anywhere: plain HTML, React, Vue, Angular, even WordPress. That's why many big companies build their design system as Web Components — "write once, use in any framework".</div>

  <h2>The 3 browser features (click)</h2>
  ${cards([
    ['Custom Elements', 'Define your own tag with a JS class: <code>customElements.define("ds-button", DsButton)</code>. Tag names need a dash.'],
    ['Shadow DOM', 'A private mini-DOM inside the element. Outside CSS can\'t break it, and its CSS can\'t leak out. Like a sealed LEGO piece.'],
    ['Templates & Slots', '<code>&lt;slot&gt;</code> marks where the user\'s content goes, just like Vue slots.']
  ])}

  ${code('js', R`class DsButton extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });      // private DOM
    root.innerHTML =
      '<style>button { background: var(--ds-primary); }</style>' + // tokens pierce through!
      '<button><slot></slot></button>';                    // slot = user's label
  }
}
customElements.define('ds-button', DsButton);

// usage — in ANY framework or plain HTML:
// <ds-button variant="ghost">Save</ds-button>`)}

  <h2>1. Real elements: Shadow DOM vs no Shadow DOM</h2>
  <div class="panel"><span class="try">Try It</span>
    <p>Both buttons below are <b>real custom elements running in your browser</b>. The left uses Shadow DOM; the right does not. Press the button to apply a careless global stylesheet: <code>button { background: hotpink; border-radius: 0; font-family: serif }</code></p>
    <div class="row"><button class="btn pri" id="wc-leak">Apply Careless Global CSS</button>
    <label class="ctl">variant <select id="wc-var"><option value="">primary</option><option>ghost</option></select></label></div>
    <div class="wc-demo" id="wc-demo" style="margin-top:10px">
      <div><b>With Shadow DOM</b><br><br><ds-btn-shadow id="wc-s">Save</ds-btn-shadow><p style="font-size:13px">Protected</p></div>
      <div><b>Without Shadow DOM</b><br><br><ds-btn-plain id="wc-p">Save</ds-btn-plain><p style="font-size:13px">Exposed</p></div>
    </div>
    <p style="font-size:14px;color:var(--muted)">Notice the sidebar sliders still restyle the protected one: CSS <b>custom properties (variables)</b> deliberately cross the shadow boundary. That is exactly how design tokens reach Web Components — the one door you leave open on purpose.</p>
  </div>

  <h2>2. Three ways in and out of a component</h2>
  ${tabs('wcio', [
    ['Attributes → in', code('html', '<ds-button variant="ghost" disabled>Save</ds-button>\n<!-- declared via observedAttributes + attributeChangedCallback -->')],
    ['Events → out', code('js', "el.addEventListener('ds-press', e => save());\n// inside the component:\nthis.dispatchEvent(new CustomEvent('ds-press', { bubbles: true, composed: true }));")],
    ['Styling hooks', code('css', "/* 1. tokens (custom properties) go straight in */\nds-button { --ds-primary: crimson; }\n/* 2. ::part exposes chosen internals */\nds-button::part(button) { letter-spacing: .1em; }")]
  ])}

  <h2>Using it inside other frameworks</h2>
  <table><tr><th>Framework</th><th>How you use <code>&lt;ds-button&gt;</code></th></tr>
  <tr><td>Plain HTML</td><td>Just write the tag</td></tr>
  <tr><td>React</td><td>Write the tag; pass events with refs/listeners (React 19 supports custom element props & events natively)</td></tr>
  <tr><td>Vue</td><td>Works out of the box: <code>@ds-press="save"</code></td></tr>
  <tr><td>Angular</td><td>Add <code>CUSTOM_ELEMENTS_SCHEMA</code>, then use the tag</td></tr></table>

  <div class="tie"><b>Web Component design systems:</b> Shoelace / Web Awesome, Adobe Spectrum Web Components, Google Material Web, Carbon Web Components, GitHub's Primer elements. Most are built with <b>Lit</b> (a tiny helper library that makes writing them as pleasant as React).
  <ul><li><b>Pros:</b> framework‑agnostic, long‑lived, one implementation for every team/stack.</li>
  <li><b>Cons:</b> server‑side rendering and form integration need extra care; fewer ready-made ecosystem tools than React.</li></ul></div>`,
  init(root) {
    const demo = $('#wc-demo', root);
    $('#wc-leak', root).onclick = e => { demo.classList.toggle('leaky'); e.target.textContent = demo.classList.contains('leaky') ? 'Remove Careless CSS' : 'Apply Careless Global CSS'; };
    $('#wc-var', root).onchange = e => { $$('#wc-s,#wc-p', root).forEach(x => e.target.value ? x.setAttribute('variant', e.target.value) : x.removeAttribute('variant')); };
  },
  quiz: [
    { q: 'What is the main selling point of Web Components for design systems?', o: ['They are faster than all frameworks', 'One implementation works in React, Vue, Angular and plain HTML', 'They need no JavaScript', 'They replace CSS'], a: 1, why: 'They are a browser standard, so they are framework-agnostic.' },
    { q: 'What does Shadow DOM do?', o: ['Hides the component from users', 'Encapsulates DOM and styles so outside CSS can\'t break it', 'Makes dark mode', 'Compresses HTML'], a: 1, why: 'Shadow DOM scopes the internal markup and styles.' },
    { q: 'How do design tokens get INTO a shadow-DOM component?', o: ['They can\'t', 'CSS custom properties (variables) cross the shadow boundary', 'Via !important', 'By copying CSS into every element'], a: 1, why: 'Inherited CSS variables pass through, which makes them ideal for tokens.' },
    { q: 'Custom element tag names must…', o: ['Start with "x"', 'Contain a dash, e.g. ds-button', 'Be uppercase', 'Match the file name'], a: 1, why: 'The dash guarantees no clash with future built-in HTML tags.' }
  ]
});

/* =====================================================================
   MODULE 6 — SwiftUI
   ===================================================================== */
M.push({
  id: 'swiftui', icon: 'stack', title: 'SwiftUI', tag: 'Apple\'s declarative UI for iPhone, iPad, Mac & Watch — view = struct, style = chained modifiers.',
  html: () => `
  <div class="plain">In SwiftUI you describe the screen in Swift code: "a vertical stack containing a text and a button". Each view is a lightweight <b>struct</b>. You style it by chaining <b>modifiers</b> — little instructions applied <i>one after another</i>, like layers of clothing. And <b>order matters</b>: a shirt over a coat is not a coat over a shirt.</div>

  ${code('swift', R`struct CounterView: View {
    @State private var count = 0            // state: change it → view refreshes

    var body: some View {                   // describes the UI
        VStack(spacing: 12) {
            Text("Count: \(count)")
                .font(.title)
            Button("Add") { count += 1 }
                .buttonStyle(.borderedProminent)
        }
        .padding()
    }
}`)}

  <h2>Key ideas (click)</h2>
  ${cards([
    ['View (struct)', 'A tiny value type with a <code>body</code>. Cheap to create and throw away.'],
    ['Stacks', '<code>VStack</code> (vertical), <code>HStack</code> (horizontal), <code>ZStack</code> (layered). Layout is built from nesting these.'],
    ['Modifiers', 'Methods like <code>.padding()</code>, <code>.background()</code>, <code>.font()</code>. Each returns a <b>new wrapped view</b>.'],
    ['@State / @Binding', '<code>@State</code> owns a value; <code>@Binding</code> lets a child read &amp; write the parent\'s value (like v-model).'],
    ['@Environment', 'Values flowing down the tree automatically: colour scheme, locale, text size — and your own theme.'],
    ['Previews', 'Xcode shows your view live while you type, in light, dark and large‑text variants.']
  ])}

  <h2>1. Modifier order — the wrapping trick</h2>
  <div class="panel"><span class="try">Try It</span>
    <p>Toggle modifiers on/off and use ↑ ↓ to reorder them. Especially try swapping <code>.padding()</code> and <code>.background()</code>.</p>
    <div class="grid"><div><div id="sw-list"></div></div>
    <div><div class="stage" id="sw-stage" style="min-height:140px"></div></div></div>
    <div id="sw-code"></div>
  </div>

  <h2>2. @State drives the view</h2>
  <div class="panel"><span class="try">Try It</span>
    <div class="phone" id="sw-phone"><label><b>Notifications</b> <input type="checkbox" id="sw-on"></label>
      <p id="sw-msg" style="margin:10px 0 4px"></p>
      <input type="range" id="sw-sl" min="1" max="3" value="1" style="width:100%" aria-label="Dynamic Type size"><div style="font-size:12px">Dynamic Type size</div></div>
    ${code('swift', R`@State private var isOn = false
Toggle("Notifications", isOn: $isOn)
Text(isOn ? "You'll get alerts 🔔" : "Alerts are off 🔕")`)}
  </div>

  <div class="tie"><b>SwiftUI design systems:</b> start from Apple's <b>Human Interface Guidelines</b>, then add your own brand layer.
  <ul><li><b>Tokens</b> → Asset Catalog colours (light/dark variants built in) or a Swift <code>enum DS</code> generated by Style Dictionary.</li>
  <li><b>ButtonStyle / ViewModifier</b> → package a look once: <code>.buttonStyle(DSPrimaryButtonStyle())</code>.</li>
  <li><b>@Environment</b> → inject a theme struct down the whole tree.</li>
  <li><b>Free accessibility</b>: Dynamic Type, VoiceOver, dark mode and SF Symbols come with the platform.</li></ul>
  ${code('swift', R`struct DSPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(DS.space)
            .background(DS.primary)
            .clipShape(RoundedRectangle(cornerRadius: DS.radius))
            .opacity(configuration.isPressed ? 0.8 : 1)
    }
}`)}</div>`,
  init(root) {
    const defs = {
      foreground: { code: '.foregroundStyle(.white)' }, padding: { code: '.padding()' },
      background: { code: '.background(DS.primary)' }, corner: { code: '.clipShape(RoundedRectangle(cornerRadius: DS.radius))' },
      border: { code: '.border(Color.orange, width: 4)' }
    };
    let order = ['foreground', 'padding', 'background'], on = new Set(order);
    const rest = Object.keys(defs).filter(k => !order.includes(k)); order = order.concat(rest);
    const draw = () => {
      $('#sw-list', root).innerHTML = order.map((k, i) => `<div class="row" style="margin:4px 0;flex-wrap:nowrap"><label class="ctl" style="flex:1;min-width:0"><input type="checkbox" data-k="${k}" ${on.has(k) ? 'checked' : ''}> <code>${defs[k].code}</code></label>
        <button class="btn" data-m="${i},-1" aria-label="Move up">↑</button><button class="btn" data-m="${i},1" aria-label="Move down">↓</button></div>`).join('');
      let html = `<span style="${on.has('foreground') ? 'color:#fff;' : ''}font-weight:600">Hello</span>`;
      order.filter(k => on.has(k)).forEach(k => {
        const st = { foreground: '', padding: 'padding:18px;', background: 'background:var(--ds-primary);', corner: 'border-radius:var(--ds-radius);overflow:hidden;', border: 'border:4px solid orange;' }[k];
        if (st) html = `<div style="display:inline-block;${st}">${html}</div>`;
      });
      $('#sw-stage', root).innerHTML = html;
      $('#sw-code', root).innerHTML = code('swift', 'Text("Hello")\n' + (order.filter(k => on.has(k)).map(k => '    ' + defs[k].code).join('\n') || '    // no modifiers'));
    };
    $('#sw-list', root).onclick = e => {
      const m = e.target.closest('[data-m]'), c = e.target.closest('input[data-k]');
      if (m) { const [i, d] = m.dataset.m.split(',').map(Number), j = i + d; if (j >= 0 && j < order.length) { [order[i], order[j]] = [order[j], order[i]]; draw(); } }
      if (c) { c.checked ? on.add(c.dataset.k) : on.delete(c.dataset.k); draw(); }
    };
    tokenListeners.push(() => { }); draw();

    const msg = () => { $('#sw-msg', root).textContent = $('#sw-on', root).checked ? "You'll get alerts 🔔" : 'Alerts are off 🔕'; $('#sw-phone', root).style.fontSize = (12 + $('#sw-sl', root).value * 3) + 'px'; };
    $('#sw-on', root).onchange = msg; $('#sw-sl', root).oninput = msg; msg();
  },
  quiz: [
    { q: 'In SwiftUI, what does @State do?', o: ['Stores a value owned by the view; changing it refreshes the view', 'Declares a CSS state', 'Connects to a server', 'Marks a function as async'], a: 0, why: '@State is local, view-owned memory that triggers a re-render when changed.' },
    { q: 'Text("Hi").padding().background(.blue) vs .background(.blue).padding() — what differs?', o: ['Nothing', 'First: blue fills text + padding. Second: blue only behind the text, padding stays transparent', 'First crashes', 'Second is not allowed'], a: 1, why: 'Each modifier wraps the view produced so far; order changes what is wrapped.' },
    { q: 'Which SwiftUI feature is closest to React Context?', o: ['@Environment', '@State', 'VStack', 'Previews'], a: 0, why: 'Environment values flow down the view tree automatically.' },
    { q: 'How do you package a reusable button look in SwiftUI?', o: ['A global CSS file', 'A custom ButtonStyle (or ViewModifier)', 'A Storyboard', 'A JSON file'], a: 1, why: 'ButtonStyle/ViewModifier encapsulate styling for reuse.' }
  ]
});

/* =====================================================================
   MODULE 7 — Jetpack Compose
   ===================================================================== */
M.push({
  id: 'compose', icon: 'grid', title: 'Jetpack Compose', tag: 'Android\'s declarative UI — @Composable functions that re-run only where state is read.',
  html: () => `
  <div class="plain">Compose is to Android what SwiftUI is to iOS (and what React is to the web). You write <b>functions marked <code>@Composable</code></b> that "emit" UI. When state changes, Compose re-runs <i>only the functions that actually read that state</i> — this is called <b>recomposition</b>. Styling uses a chain of <b>Modifiers</b>, very like SwiftUI.</div>

  ${code('kotlin', R`@Composable
fun Counter() {
    var count by remember { mutableStateOf(0) }   // state that survives recomposition

    Column(Modifier.padding(16.dp)) {
        Text("Count: $count", style = MaterialTheme.typography.titleLarge)
        Button(onClick = { count++ }) { Text("Add") }
    }
}`)}

  <h2>Key ideas (click)</h2>
  ${cards([
    ['@Composable function', 'A function that describes UI. Names are Capitalised like components: <code>Button(...)</code>.'],
    ['State & remember', '<code>mutableStateOf</code> is observable state; <code>remember</code> keeps it across recompositions.'],
    ['Recomposition', 'Compose re-runs only composables that <b>read</b> the changed state, and skips the rest.'],
    ['Modifier', 'Chained, ordered decorations: <code>Modifier.padding(8.dp).background(Color.Red)</code>. Order matters, exactly as in SwiftUI.'],
    ['State hoisting', 'Move state up to the caller and pass value + callback down. Makes components reusable &amp; testable.'],
    ['Material 3 theming', '<code>MaterialTheme</code> supplies colours, typography and shapes to everything below it.']
  ])}

  <h2>1. Recomposition visualizer</h2>
  <div class="panel"><span class="try">Try It</span>
    <p>Pick which composables <b>read</b> <code>count</code>, then press the button. Only readers recompose (flash + counter goes up). Everything else is <b>skipped</b>.</p>
    <div class="row" id="cp-readers"></div>
    <div class="tree" style="margin-top:10px"><span class="lab">Screen()</span> <button class="ds-btn s-sm" id="cp-inc">count++</button>
      <div class="grid" style="margin-top:6px" id="cp-nodes"></div></div>
    <p style="font-size:14px;color:var(--muted)">Tip: a good habit is to read state in the <i>smallest</i> composable possible, so less UI re-runs.</p>
  </div>

  <h2>2. Your tokens → MaterialTheme</h2>
  <div class="panel"><span class="try">Try It</span><p>Move the sidebar sliders; this code is generated from them:</p><div id="cp-theme"></div>
    <div class="stage"><button class="ds-btn">Button</button><span class="chip">AssistChip</span></div></div>

  <div class="tie"><b>Compose design systems:</b> Material 3 is built in; many brands build a custom layer on top.
  <ul><li><b>Tokens</b> → <code>ColorScheme</code>, <code>Typography</code>, <code>Shapes</code> objects (often generated from the same token JSON).</li>
  <li><b>CompositionLocal</b> → Compose's Context: <code>LocalSpacing.current</code> reads your spacing token anywhere below.</li>
  <li><b>Dynamic colour</b> (Android 12+) lets the system wallpaper tint the theme.</li>
  <li><b>Compose Multiplatform</b> reuses the same code on iOS, desktop &amp; web.</li></ul>
  ${code('kotlin', R`val LocalSpacing = staticCompositionLocalOf { 12.dp }

MyAppTheme {                 // wraps MaterialTheme + CompositionLocalProvider
    val gap = LocalSpacing.current
    Button(modifier = Modifier.padding(gap), onClick = {}) { Text("Save") }
}`)}</div>`,
  init(root) {
    const names = ['Header', 'Counter', 'Label', 'Footer']; const reads = new Set(['Counter', 'Label']); const n = {}; names.forEach(k => n[k] = 1);
    $('#cp-readers', root).innerHTML = names.map(k => `<label class="ctl"><input type="checkbox" data-k="${k}" ${reads.has(k) ? 'checked' : ''}> ${k} reads count</label>`).join('');
    $('#cp-readers', root).onchange = e => { e.target.checked ? reads.add(e.target.dataset.k) : reads.delete(e.target.dataset.k); };
    let count = 0;
    const draw = () => { $('#cp-nodes', root).innerHTML = names.map(k => `<div class="tree" data-n="${k}"><span class="lab">${k}()</span><br>recompositions: <b>${n[k]}</b> ${reads.has(k) ? '<br>shows count = ' + count : '<br><i>doesn\'t read count</i>'}</div>`).join(''); };
    draw();
    $('#cp-inc', root).onclick = () => { count++; names.forEach(k => { if (reads.has(k)) n[k]++; }); draw(); names.forEach(k => { if (reads.has(k)) flash($(`[data-n=${k}]`, root)); }); };
    const th = () => $('#cp-theme', root).innerHTML = code('kotlin', `val Brand = lightColorScheme(\n    primary = Color(0xFF${hex()})\n)\nval BrandShapes = Shapes(medium = RoundedCornerShape(${T.radius}.dp))\n\nMaterialTheme(colorScheme = Brand, shapes = BrandShapes) {\n    Column(Modifier.padding(${T.space}.dp)) { /* your UI */ }\n}`);
    th(); tokenListeners.push(th);
  },
  quiz: [
    { q: 'What is recomposition?', o: ['Rewriting the app in Kotlin', 'Compose re-running composables that read changed state', 'Reloading the Activity', 'Compiling resources'], a: 1, why: 'Compose tracks state reads and re-executes only the affected composables.' },
    { q: 'What does `remember { mutableStateOf(0) }` do?', o: ['Saves to disk', 'Creates observable state that survives recomposition', 'Defines a theme', 'Starts a coroutine'], a: 1, why: 'remember caches the value across recompositions; mutableStateOf makes it observable.' },
    { q: 'Compose\'s equivalent of React Context / SwiftUI Environment is…', o: ['CompositionLocal', 'Modifier', 'Intent', 'Gradle'], a: 0, why: 'CompositionLocal passes values implicitly down the composable tree (e.g. theme, spacing).' }
  ]
});

/* =====================================================================
   MODULE 8 — Compare & choose
   ===================================================================== */
M.push({
  id: 'compare', icon: 'compare', title: 'Compare & Choose', tag: 'Putting it all together: how the six relate, and how one design system feeds them all.',
  html: () => `
  <h2>Side by side</h2>
  <div class="tablewrap"><table>
  <tr><th></th><th>React</th><th>Vue</th><th>Angular</th><th>Web Comp.</th><th>SwiftUI</th><th>Compose</th></tr>
  <tr><th>Runs on</th><td>Web (+ native via RN)</td><td>Web</td><td>Web</td><td>Any browser</td><td>Apple devices</td><td>Android (+ multiplatform)</td></tr>
  <tr><th>Language</th><td>JS/TS + JSX</td><td>JS/TS + templates</td><td>TypeScript</td><td>JS/TS</td><td>Swift</td><td>Kotlin</td></tr>
  <tr><th>Component =</th><td>function</td><td>.vue file</td><td>decorated class</td><td>HTMLElement class</td><td>struct View</td><td>@Composable fun</td></tr>
  <tr><th>State</th><td>useState</td><td>ref()</td><td>signal()</td><td>properties/attrs</td><td>@State</td><td>mutableStateOf</td></tr>
  <tr><th>Passing theme down</th><td>Context</td><td>provide/inject</td><td>DI service</td><td>CSS variables</td><td>@Environment</td><td>CompositionLocal</td></tr>
  <tr><th>Styling</th><td>CSS / CSS-in-JS</td><td>scoped CSS</td><td>component CSS / Sass</td><td>Shadow DOM CSS</td><td>modifiers</td><td>Modifiers</td></tr>
  <tr><th>DS examples</th><td>MUI, Radix, Polaris</td><td>Vuetify, PrimeVue</td><td>Material, PrimeNG</td><td>Shoelace, Spectrum, Lit</td><td>HIG + custom</td><td>Material 3</td></tr>
  </table></div>

  <div class="plain">Spot the pattern: <b>every one of them</b> has (1) a way to define a component, (2) a way to hold state that triggers updates, (3) a way to pass shared things like themes down the tree, and (4) a way to style. Learn one deeply and the other five are mostly vocabulary.</div>

  <h2>The pipeline: one source, six outputs</h2>
  <div class="panel"><div class="pipe"><div class="node">Figma variables</div><span class="arrow">→</span><div class="node">tokens.json</div><span class="arrow">→</span><div class="node">Style Dictionary</div><span class="arrow">→</span>
  <div style="display:grid;gap:4px"><div class="node">CSS variables → React · Vue · Angular · Web Components</div><div class="node">Swift constants → SwiftUI</div><div class="node">Kotlin / XML → Compose</div></div></div>
  <p style="text-align:center;color:var(--muted)">Designers change a value once. A build step regenerates code for every platform. Components stay "dumb" about raw values.</p></div>

  <h2>Which would you pick?</h2>
  <div class="panel"><span class="try">Try It</span>
    <p>Choose a scenario:</p>
    <div class="row" id="sc-btns"></div>
    <div id="sc-out" class="stepbody" style="margin-top:10px"></div></div>`,
  init(root) {
    const S = [
      ['Our company has 8 web teams on React, Vue and Angular', '<b>Web Components</b> (built with Lit) for the shared design system, or ship the same tokens + thin framework wrappers. One implementation, every team uses it.'],
      ['iPhone-only app', '<b>SwiftUI</b> + Apple\'s HIG, with your tokens in an Asset Catalog. You get Dynamic Type, dark mode and accessibility almost for free.'],
      ['Android-only app', '<b>Jetpack Compose</b> + Material 3, with your colour/shape tokens in a custom ColorScheme.'],
      ['Big enterprise dashboard, 200 developers', '<b>Angular</b> (strong conventions, TypeScript everywhere, Angular Material/CDK) — or React with strict internal guidelines.'],
      ['Startup building a flexible web product fast', '<b>React</b> (largest ecosystem: shadcn/ui, Radix) or <b>Vue</b> (gentlest learning curve, fantastic DX).'],
      ['Web + iOS + Android that must look identical', 'Keep <b>one token source</b>; build native components per platform (React/Vue + SwiftUI + Compose) <i>or</i> consider a cross-platform toolkit — but still share tokens and documented behaviour.']
    ];
    $('#sc-btns', root).innerHTML = S.map((s, i) => `<button class="btn" data-s="${i}">${s[0]}</button>`).join('');
    $('#sc-btns', root).onclick = e => { const b = e.target.closest('[data-s]'); if (b) { $$('#sc-btns .btn', root).forEach(x => x.classList.toggle('pri', x === b)); $('#sc-out', root).innerHTML = '' + S[b.dataset.s][1]; } };
  },
  quiz: [
    { q: 'Which pairing is the "pass shared theme down the tree" mechanism?', o: ['React Context ↔ SwiftUI @Environment ↔ Compose CompositionLocal', 'React Context ↔ Angular decorators ↔ Swift Package Manager', 'Vue slots ↔ Kotlin coroutines ↔ CSS grid', 'None exist'], a: 0, why: 'All three are implicit, tree-scoped value passing — the same idea, different names.' },
    { q: 'A company with teams on 4 different web frameworks wants ONE component set. Best fit?', o: ['Rewrite everything in React', 'Web Components', 'SwiftUI', 'Each team builds its own'], a: 1, why: 'Custom elements are framework-agnostic.' },
    { q: 'What stays identical across all six platforms in a healthy design system?', o: ['The source code', 'The design tokens & guidelines', 'The file names', 'The build tool'], a: 1, why: 'Code differs per platform; tokens and guidelines are shared.' }
  ]
});

/* =====================================================================
   MODULE 9 — Final challenge
   ===================================================================== */
M.push({
  id: 'final', icon: 'check', title: 'Final Challenge', tag: '10 random questions from everything you learned.',
  html: () => `<div class="plain">No hints this time. Questions are drawn from every module and reshuffled each visit — come back as often as you like to beat your score.</div>
    <div class="panel"><b>Cheat-sheet to review first:</b><ul>
    <li><b>Tokens</b> = named values → shared by all platforms</li>
    <li><b>React</b> function re-runs → diff · <b>Vue</b> tracks dependencies · <b>Angular</b> DI + signals · <b>Web Components</b> custom elements + Shadow DOM</li>
    <li><b>SwiftUI</b> struct + modifiers (order!) · <b>Compose</b> @Composable + recomposition</li>
    <li>Theme passing: Context · provide/inject · DI · CSS vars · @Environment · CompositionLocal</li></ul></div>`,
  dynQuiz() {
    const pool = M.filter(m => m.quiz).flatMap(m => m.quiz);
    const pick = pool.sort(() => Math.random() - .5).slice(0, 10);
    return pick.map(q => { const idx = q.o.map((_, i) => i).sort(() => Math.random() - .5); return { ...q, o: idx.map(i => q.o[i]), a: idx.indexOf(q.a) }; });
  }
});

/* ---------- boot ---------- */
applyTokens();
const start = M.findIndex(m => '#/' + m.id === location.hash);
go(start >= 0 ? start : 0);

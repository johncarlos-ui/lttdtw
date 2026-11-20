import Lenis from 'lenis';
import { framePlayer } from './frames.js';
import { filmPosition, chapterPosition } from '../lib/film-timeline.mjs';

const clamp = value => Math.max(0,Math.min(1,value));
function smoothstep(value) {
  const t=clamp(value);
  return t*t*(3-2*t);
}
const desktop = matchMedia('(min-width:821px) and (min-height:560px) and (prefers-reduced-motion:no-preference) and (pointer:fine)');
const reduced = matchMedia('(prefers-reduced-motion:reduce)');
const film = document.querySelector('.job-film');
const stage = film?.querySelector('.film-stage');
const opening = stage?.querySelector('.home-hero');
const openingTitle = opening?.querySelector('.hero-inner');
const openingContext = opening?.querySelector('.opening-context');
const filmEntry = opening?.querySelector('.film-entry');
const trace = film?.querySelector('.screen-trace');
const keys = JSON.parse(trace?.dataset.track || '[]');
const benchPoint = film?.querySelector('.bench-point');
const benchTip = benchPoint?.querySelector('.bench-tip');
const pointLeader = film?.querySelector('.bench-leader line');
const objects = JSON.parse(benchPoint?.dataset.objects || '[]');
const screenEdge = trace?.querySelector('.screen-edge');
const signalLeader = trace?.querySelector('.signal-leader');
const leadCard = film?.querySelector('[data-stop="1"] .instrument');
const panels = [...(film?.querySelectorAll('[data-film-panel]') || [])];
const chapters = [...(film?.querySelectorAll('[data-beat]') || [])];
const departments = [...document.querySelectorAll('.dept-chapter')];
const departmentLinks = [...document.querySelectorAll('.steps a')];
const words = [...document.querySelectorAll('.word-statement span')];
const sentences = [...document.querySelectorAll('.sentences span')];
const pairs = [...document.querySelectorAll('.band-3 tbody tr')];
const audit = document.querySelector('.band-6 .table-scroll');
const deptSteps = document.querySelector('.steps');
const detailsProgress = new WeakMap();
let lastDepartment = -1;
const steps = document.querySelector('.band-5 ol');
const metrics = [...(film?.querySelectorAll('[data-from][data-to]') || [])];
const linesByPanel = panels.map(panel => [...panel.querySelectorAll('[data-caption]')]);
const cuesByPanel = panels.map(panel => [...panel.querySelectorAll('[data-cue]')]);
const surfacesByPanel = panels.map(panel => [...panel.querySelectorAll('.film-caption,.instrument')]);
const numberFormat = new Intl.NumberFormat('en-US');
const frameUrls = JSON.parse(document.getElementById('job-frames')?.textContent || '[]');
let generation = 0;
let renderRequest = 0;
let mobileAnimation = 0;
let mobileObserver;
let player;
let tracker;
let lenis;
let sizeObserver;
let layout = null;
let lastOpening;
let lastStageProgress = -1;
let lastDecoded = -1;
let activeBeat = -1;
let lastMetric = -1;
let libraries;
let drawnFrame = -1;

function measureStage() {
  const box = stage.getBoundingClientRect();
  const relativeBox = el => {
    const r=el.getBoundingClientRect();
    return {left:r.left-box.left, right:r.right-box.left, top:r.top-box.top, bottom:r.bottom-box.top};
  };
  return {
    width:box.width, height:box.height,
    cards:surfacesByPanel.map(surfaces=>surfaces.map(relativeBox)),
    lead:leadCard ? relativeBox(leadCard) : null
  };
}
function invalidateLayout() {
  layout=null;
  schedule();
}

function traceScreen(visible) {
  if (!trace || !leadCard || keys.length<2) return;
  const active=visible && drawnFrame>=keys[0].frame && drawnFrame<=keys.at(-1).frame;
  trace.classList.toggle('visible',active);
  if (!active) return;
  const right=keys.findIndex((key,i)=>i && key.frame>=drawnFrame);
  const a=keys[right-1],b=keys[right];
  const fraction=(drawnFrame-a.frame)/(b.frame-a.frame);
  const box=layout;
  const scale=Math.max(box.width/1120,box.height/630);
  const dx=(box.width-1120*scale)/2,dy=(box.height-630*scale)/2;
  const xy=a.corners.map((value,i)=>(value+(b.corners[i]-value)*fraction)*scale+(i%2?dy:dx));
  screenEdge.setAttribute('d','M'+xy[0]+' '+xy[1]+' L'+xy[2]+' '+xy[3]+' L'+xy[4]+' '+xy[5]+' L'+xy[6]+' '+xy[7]+' Z');
  const card=layout.lead;
  const x=(xy[2]+xy[4])/2,y=(xy[3]+xy[5])/2;
  const endX=card.left,endY=card.top+28;
  signalLeader.setAttribute('d','M'+x+' '+y+' L'+(endX-18)+' '+endY+' H'+endX);
}

// Map measured object centers to the same cover crop that paints the canvas.
function positionBenchPoint(selected, visible, activeLine) {
  if (!benchPoint) return;
  const object = objects[selected];
  const keys = object?.points;
  const show = visible && keys?.length && drawnFrame>=keys[0][0] && drawnFrame<=keys.at(-1)[0];
  benchPoint.hidden = !show;
  if (!show) { pointLeader?.classList.remove('draw'); return; }
  const right = keys.findIndex((key,i)=>i>0 && key[0]>=drawnFrame);
  const a=keys[right-1], b=keys[right];
  const fraction=(drawnFrame-a[0])/(b[0]-a[0]);
  const box=layout;
  const scale=Math.max(box.width/1120,box.height/630);
  const x=(a[1]+(b[1]-a[1])*fraction)*scale+(box.width-1120*scale)/2;
  const y=(a[2]+(b[2]-a[2])*fraction)*scale+(box.height-630*scale)/2;
  if (x<0 || x>box.width || y<0 || y>box.height) { benchPoint.hidden=true; pointLeader?.classList.remove('draw'); return; }
  // If a card covers the prop, place its control just above the card and
  // keep the thin leader attached to the measured position in the footage.
  const px=Math.max(24,Math.min(box.width-24,x));
  let py=Math.max(32,Math.min(box.height*.84,y));
  for (const r of box.cards[selected]) {
    if (px>=r.left-24 && px<=r.right+24 && py>=r.top-24 && py<=r.bottom+24) py=r.top-25;
  }
  benchPoint.style.setProperty('--point-x', px+'px');
  benchPoint.style.setProperty('--point-y', py+'px');
  if (pointLeader && Math.hypot(px-x,py-y)>12) {
    for (const [name,value] of [['x1',px],['y1',py],['x2',x],['y2',y]]) pointLeader.setAttribute(name,String(value));
    pointLeader.classList.add('draw');
  } else pointLeader?.classList.remove('draw');
  const lines = linesByPanel[selected];
  const next = (activeLine+1)%lines.length;
  const label = object.label + ' / ' + lines[next].textContent.trim();
  if (benchTip.textContent!==lines[next].textContent.trim()) {
    benchPoint.setAttribute('aria-label',label);
    benchTip.textContent = lines[next].textContent.trim();
  }
  benchPoint.dataset.next = String(next);
}

function metricProgress(value) {
  const quantized = Math.round(clamp(value)*500);
  if (lastMetric === quantized) return;
  lastMetric = quantized;
  for (const element of metrics) {
    const from = Number(element.dataset.from), to = Number(element.dataset.to);
    const current = Math.round(from + (to-from)*quantized/500);
    element.textContent = (element.dataset.currency==='usd'?'$':'') + numberFormat.format(current);
    element.classList.toggle('changing',from!==to && value>0 && value<1);
  }
}

function animateStage(progress, near, {intro, isOpening, selected, local}) {
  const t = selected + local;
  const titleFade = clamp((intro - .13) / .23);
  const contextFade = Math.min(clamp((intro - .31) / .17),clamp((1 - intro) / .15));
  opening.inert = !isOpening;
  if (openingTitle) openingTitle.inert = !isOpening || titleFade===1;
  if (openingContext) openingContext.inert = !isOpening || contextFade===0;
  film.classList.toggle('is-opening', isOpening);
  film.classList.toggle('at-first-frame',progress<=0);
  stage.style.setProperty('--title-opacity', String(1-titleFade));
  stage.style.setProperty('--title-rise', -36*titleFade+'px');
  stage.style.setProperty('--context-opacity', String(contextFade));
  stage.style.setProperty('--context-rise', (1-clamp((intro-.31)/.17))*18+'px');
  stage.style.setProperty('--story-light', String(clamp((intro - .80) / .20)));
  if (selected !== activeBeat || isOpening !== lastOpening) {
    lastOpening = isOpening;
    activeBeat = selected;
    panels.forEach((panel,i)=>{
      panel.classList.toggle('current',i===selected);
      panel.inert = isOpening || i!==selected;
    });
    chapters.forEach((button,i)=>{
      if(i===selected) button.setAttribute('aria-current','step');
      else button.removeAttribute('aria-current');
      button.classList.toggle('passed',i<selected);
    });
    film.classList.toggle('film-summary',selected===5);
    film.classList.toggle('film-stamping',selected===6);
  }
  // Let the outgoing type clear the bench before the next line comes into focus.
  // The middle of every chapter stays completely steady for reading.
  const enter = smoothstep(local/.058);
  const leave = selected<6 ? smoothstep((1-local)/.095) : 1;
  const opacity = enter*leave;
  stage.style.setProperty('--caption-opacity',String(opacity));
  stage.style.setProperty('--chrome-opacity',String(selected===0 ? enter : 1));
  stage.style.setProperty('--caption-rise',(1-enter)*14-(1-leave)*12+'px');
  stage.style.setProperty('--beat-progress',String(local));
  stage.style.setProperty('--scene-progress',String(local));
  stage.style.setProperty('--backdrop',String(1-clamp((t-4.92)/.19)));
  const lines = linesByPanel[selected];
  let activeLine = 0;
  for (const [i, line] of lines.entries()) {
    const start = Number(line.dataset.caption);
    const end = i + 1 < lines.length ? Number(lines[i+1].dataset.caption) : 1;
    const active = local >= start && (i === lines.length - 1 || local < end);
    line.classList.toggle('is-spoken',active);
    line.classList.toggle('is-read',local>=end);
    if (active) {
      activeLine = i;
      line.setAttribute('aria-current','true');
      const phraseProgress=clamp((local-start)/(end-start));
      line.style.setProperty('--line-fill',String(.28+.72*phraseProgress));
      line.style.setProperty('--word-progress',String(clamp(phraseProgress/.72)));
    } else line.removeAttribute('aria-current');
  }
  for (const cue of cuesByPanel[selected]) {
    const amount = clamp((local-Number(cue.dataset.cue))/.05);
    cue.style.setProperty('--cue',String(amount));
    cue.style.setProperty('--cue-shift',(1-amount)*7+'px');
  }
  if (selected===2) stage.style.setProperty('--route',String(clamp(local/.44)));
  if (selected>=5) metricProgress((t-5.025)/.43);
  if (selected===6) {
    const landing = clamp(local/.42);
    stage.style.setProperty('--stamp-scale',String(1+.48*(1-landing)**2));
    stage.style.setProperty('--stamp-y',-42*(1-landing)**2+'px');
    stage.style.setProperty('--stamp-opacity',String(clamp(local/.12)));
    stage.style.setProperty('--name-opacity',String(clamp((local-.24)/.22)));
  }

  positionBenchPoint(selected, near && !isOpening && selected<5, activeLine);
  traceScreen(near && !isOpening && selected===0 && local>.06 && local<.95);
}
function through(el, start=.86, end=.32) {
  const r=el.getBoundingClientRect();
  return clamp((innerHeight*start-r.top)/(innerHeight*(start-end)+r.height));
}
function paintDetails() {
  const cut = (deptSteps?.offsetHeight || 0) + innerHeight*.28;
  const active = departments.reduce((found,panel,i)=>panel.getBoundingClientRect().top<=cut?i:found,0);
  if (active!==lastDepartment) {
    lastDepartment=active;
    departmentLinks.forEach((link,i)=>{
      if(i===active) link.setAttribute('aria-current','step');
      else link.removeAttribute('aria-current');
    });
  }
  if (!desktop.matches) return;
  const fill = (items,container,dark,light) => {
    if (!items.length) return;
    const position = through(container,.93,.36)*items.length;
    if (detailsProgress.get(container)===position) return;
    detailsProgress.set(container,position);
    items.forEach((item,i)=>{
      const amount=clamp(position-i+.22);
      const gray=Math.round(light+(dark-light)*amount);
      item.style.setProperty('--ink','rgb('+gray+' '+gray+' '+gray+')');
      if(items===sentences) item.style.setProperty('--sentence-opacity',String(.25+.75*amount));
    });
  };
  if (words.length) fill(words,words[0].parentElement,9,118);
  if (sentences.length) fill(sentences,sentences[0].parentElement,17,108);
  for (const row of pairs) {
    const p=through(row,.96,.72);
    if (detailsProgress.get(row)===p) continue;
    detailsProgress.set(row,p);
    row.style.setProperty('--row-x',(1-p)*18+'px');
    row.style.setProperty('--row-opacity',String(.45+.55*p));
  }
  if (steps) steps.style.setProperty('--line-progress',String(through(steps,.86,.26)));
  if (audit) audit.style.setProperty('--audit-opacity',String(.5+.5*through(audit,.96,.64)));
}
function paint() {
  renderRequest=0;
  if (!desktop.matches) { paintDetails(); return; }
  const bounds=film.getBoundingClientRect();
  const travel=Math.max(1,film.offsetHeight-stage.offsetHeight);
  const target=clamp(tracker ? tracker.progress : -bounds.top/travel);
  const near=bounds.top<innerHeight*1.2 && bounds.bottom>0;
  if (bounds.bottom<=innerHeight+2) paintDetails();
  if (!near && lastStageProgress===target) return;
  const position=filmPosition(target);
  if (near && player) player.seek(position.frame);
  if (layout && target===lastStageProgress && drawnFrame===lastDecoded) return;
  layout ??= measureStage();
  lastStageProgress=target;
  lastDecoded=drawnFrame;
  animateStage(target,near,position);
}
function schedule() {
  if (!renderRequest) renderRequest=requestAnimationFrame(paint);
}

function loadScript(src) {
  return new Promise((resolve,reject)=>{
    const tag=document.createElement('script');
    tag.src=src; tag.async=true;
    tag.onload=resolve; tag.onerror=reject;
    document.head.append(tag);
  });
}
function loadMotionLibraries() {
  if (!libraries) {
    const cdn='https://cdn.jsdelivr.net/npm/';
    libraries=loadScript(cdn+'gsap@3.15.1/dist/gsap.min.js')
      .then(()=>loadScript(cdn+'gsap@3.15.1/dist/ScrollTrigger.min.js'));
  }
  return libraries;
}
async function enhanceScroll(version) {
  try {
    await loadMotionLibraries();
    if(version!==generation || !desktop.matches) return;
    const {gsap,ScrollTrigger}=window;
    if(!gsap || !ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    // Native sticky geometry is identical before and after the plugin loads.
    tracker=ScrollTrigger.create({
      trigger:film, start:'top top',
      end:()=>'+='+Math.max(1,film.offsetHeight-stage.offsetHeight),
      invalidateOnRefresh:true, onUpdate:schedule, onRefresh:invalidateLayout
    });
    ScrollTrigger.refresh();
    schedule();
  } catch {
    // The locally bundled wheel driver and sticky playhead also work offline.
    schedule();
  }
}
function resetMode() {
  generation++;
  drawnFrame=-1;
  if (benchPoint) benchPoint.hidden=true;
  trace?.classList.remove('visible');
  tracker?.kill(); tracker=null;
  sizeObserver?.disconnect(); sizeObserver=null;
  layout=null; lastStageProgress=-1; lastDecoded=-1;
  lenis?.destroy(); lenis=null;
  player?.destroy(); player=null;
  mobileObserver?.disconnect();
  cancelAnimationFrame(mobileAnimation);
  activeBeat=-1;
  lastMetric=-1;
  film.classList.remove('film-summary','film-stamping','is-opening','at-first-frame','frame-ready');
  film.classList.toggle('running',desktop.matches);
  opening.inert=false;
  if(openingTitle) openingTitle.inert=false;
  if(openingContext) openingContext.inert=false;
  document.documentElement.classList.toggle('motion-details',desktop.matches);
  for (const panel of panels) { panel.inert=false; panel.classList.remove('current'); }
  for (const line of linesByPanel.flat()) {
    if (desktop.matches) {
      line.setAttribute('role','button');
      line.setAttribute('tabindex','0');
    } else {
      line.removeAttribute('role');
      line.removeAttribute('tabindex');
      line.removeAttribute('aria-current');
      line.classList.remove('is-spoken','is-read');
    }
  }
  metricProgress(1);
  if (desktop.matches) {
    const source=window.resolveStoryFrame || (path=>path);
    player=framePlayer(film.querySelector('canvas'),frameUrls.length,index=>source(frameUrls[index]),index=>{
      drawnFrame=index;
      film.classList.add('frame-ready');
    },schedule);
    if ('ResizeObserver' in window) {
      lenis=new Lenis({autoRaf:true, lerp:.18, syncTouch:false});
      lenis.on('scroll',()=>{
        tracker?.update();
        // Lenis has already advanced the document for this display tick.
        // Draw from that same position instead of chasing it on a second clock.
        if (renderRequest) cancelAnimationFrame(renderRequest);
        paint();
      });
      sizeObserver=new ResizeObserver(invalidateLayout);
      sizeObserver.observe(stage);
      for (const surface of surfacesByPanel.flat()) sizeObserver.observe(surface);
    }
    if (/^https?:$/.test(location.protocol)) enhanceScroll(generation);
  } else if (!reduced.matches && 'IntersectionObserver' in window) {
    mobileObserver = new IntersectionObserver(([entry])=>{
      if(!entry.isIntersecting) return;
      mobileObserver.disconnect();
      const start=performance.now();
      function count(now) {
        const p=clamp((now-start)/900);
        metricProgress(p);
        if(p<1) mobileAnimation=requestAnimationFrame(count);
      }
      mobileAnimation=requestAnimationFrame(count);
    },{threshold:.16});
    mobileObserver.observe(film.querySelector('.film-dashboard'));
  }
  schedule();
}
if (film && stage) {
  function goToBeat(chapter, local=.30, onComplete) {
    const distance=film.offsetHeight-stage.offsetHeight;
    const y=scrollY + film.getBoundingClientRect().top + distance*chapterPosition(chapter,local);
    if(lenis) {
      const screens=Math.abs(y-scrollY)/Math.max(1,innerHeight);
      lenis.scrollTo(y,{duration:Math.min(.72,.24+screens*.10),easing:t=>1-(1-t)**3,onComplete});
    } else {
      window.scrollTo({top:y,behavior:'instant'});
      onComplete?.();
    }
    schedule();
  }
  linesByPanel.forEach((lines,chapter)=>{
    for (const line of lines) {
      const revisit = () => {
        if (desktop.matches) goToBeat(chapter,Number(line.dataset.caption)+.062);
      };
      line.addEventListener('click',revisit);
      line.addEventListener('keydown',event=>{
        if (desktop.matches && (event.key==='Enter' || event.key===' ')) {
          event.preventDefault();
          revisit();
        }
      });
    }
  });
  benchPoint?.addEventListener('click',()=>{
    if (!desktop.matches || benchPoint.hidden) return;
    const nextLine = linesByPanel[activeBeat]?.[Number(benchPoint.dataset.next)];
    if (nextLine) goToBeat(activeBeat,Number(nextLine.dataset.caption)+.062);
  });
  filmEntry?.addEventListener('click',event=>{
    if (!desktop.matches) return;
    event.preventDefault();
    goToBeat(0,.30,()=>chapters[0]?.focus({preventScroll:true}));
  });
  for(const button of chapters) {
    button.addEventListener('click',()=>goToBeat(Number(button.dataset.beat)));
  }
  desktop.addEventListener('change',resetMode);
  reduced.addEventListener('change',resetMode);
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',invalidateLayout,{passive:true});
  window.addEventListener('pageshow',schedule);
  // Let Astro's HTML headline paint before requesting any sequence assets.
  requestAnimationFrame(()=>requestAnimationFrame(resetMode));
}

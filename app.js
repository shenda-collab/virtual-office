import { assets, employees, officers } from './data.js';

const WORLD_WIDTH = 6319;
const DPR_STORAGE_KEY = 'virtual-office-base-dpr';
const DPR_MODE_STORAGE_KEY = 'virtual-office-dpr-mode';
function isMobilePanEnabled() {
  const narrowViewport = window.matchMedia('(max-width: 768px)').matches;
  const touchInput = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  return narrowViewport && touchInput;
}
const initialViewportMode = isMobilePanEnabled() ? 'mobile' : 'desktop';
const storedBaseDpr = Number(sessionStorage.getItem(DPR_STORAGE_KEY));
const storedViewportMode = sessionStorage.getItem(DPR_MODE_STORAGE_KEY);
const baseDpr = Number.isFinite(storedBaseDpr) && storedBaseDpr > 0 && storedViewportMode === initialViewportMode
  ? storedBaseDpr
  : window.devicePixelRatio;
sessionStorage.setItem(DPR_STORAGE_KEY, String(baseDpr));
sessionStorage.setItem(DPR_MODE_STORAGE_KEY, initialViewportMode);
const panorama = document.querySelector('#panorama');
const world = document.querySelector('#world');
const peopleLayer = document.querySelector('#people');
const overlay = document.querySelector('#section-overlay');
const hint = document.querySelector('#explore-hint');
const panel = document.querySelector('#message-panel');

const sections = [
  { anchor: 471 + 497 / 2, title: 'San Gabriel Valley Medical Center', subtitle: 'AHMC Healthcare' },
  { anchor: 2115 + 497 / 2, title: 'AI COMMAND CENTER', subtitle: 'alternative medical center' },
  { anchor: 3664 + 497 / 2, title: 'a l t.', subtitle: 'alternative medical center' },
  { anchor: 5341 + 497 / 2, title: 'Case Management Office', subtitle: '' },
];
const boundaries = sections.slice(1).map((section, index) => (sections[index].anchor + section.anchor) / 2);

let scale = 1;
let current = 0;
let target = 0;
let currentY = 0;
let targetY = 0;
let maxOffset = 0;
let maxOffsetY = 0;
let activeSection = -1;
let overlayTimer;
let pointer = null;
let suppressClickUntil = 0;
let selected = null;

const clamp = value => Math.max(0, Math.min(maxOffset, value));
const clampY = value => Math.max(0, Math.min(maxOffsetY, value));

function applyWorldTransform() {
  world.style.transform = `translate3d(${-current}px,${-currentY}px,0) scale(${scale})`;
}

function resize() {
  const browserZoom = window.devicePixelRatio / baseDpr;
  const mobilePan = isMobilePanEnabled();
  const verticalOverscan = mobilePan ? 1.14 : 1;
  scale = (window.innerHeight / 900) * browserZoom * verticalOverscan;
  maxOffset = Math.max(0, WORLD_WIDTH * scale - window.innerWidth);
  maxOffsetY = mobilePan ? Math.max(0, 900 * scale - window.innerHeight) : 0;
  target = clamp(target);
  current = clamp(current);
  targetY = clampY(targetY);
  currentY = clampY(currentY);
  applyWorldTransform();
  document.querySelector('#sidebar').style.transform = `translateY(-50%) scale(${Math.min(1, scale)})`;
  detectSection();
}

function markExplored() {
  hint.classList.add('used');
}

function setTarget(value) {
  const next = clamp(value);
  if (Math.abs(next - target) > .3) markExplored();
  target = next;
}

function setVerticalTarget(value) {
  const next = clampY(value);
  if (Math.abs(next - targetY) > .3) markExplored();
  targetY = next;
}

function detectSection() {
  const focus = (current + window.innerWidth / 2) / scale;
  const sectionIndex = boundaries.findIndex(boundary => focus < boundary);
  const next = sectionIndex === -1 ? sections.length - 1 : sectionIndex;
  if (next === activeSection) return;
  activeSection = next;
  const section = sections[next];
  clearTimeout(overlayTimer);
  overlay.classList.remove('visible');
  overlay.replaceChildren();
  const accent = document.createElement('span');
  accent.className = 'section-accent';
  const copy = document.createElement('span');
  copy.className = 'section-copy';
  const title = document.createElement('span');
  title.className = 'section-title';
  title.textContent = section.title;
  const subtitle = document.createElement('span');
  subtitle.className = 'section-subtitle';
  subtitle.textContent = section.subtitle || '\u00a0';
  copy.append(title, subtitle);
  const badge = document.createElement('span');
  badge.className = 'section-badge';
  badge.textContent = 'ACTIVE';
  overlay.append(accent, copy, badge);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  overlayTimer = setTimeout(() => overlay.classList.remove('visible'), 1950);
}

function animate() {
  const difference = target - current;
  const differenceY = targetY - currentY;
  current = Math.abs(difference) < .05 ? target : current + difference * .22;
  currentY = Math.abs(differenceY) < .05 ? targetY : currentY + differenceY * .22;
  applyWorldTransform();
  detectSection();
  requestAnimationFrame(animate);
}

function createPerson(person, type, index) {
  const isEmployee = type === 'employee';
  const x = person.x;
  const y = person.y;
  const width = isEmployee ? Math.max(person.image.x - x + person.image.w, 125) : person.w;
  const height = isEmployee ? Math.max(person.image.y - y + person.image.h, 145) : person.h;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `person ${type}`;
  button.dataset.figmaNode = person.id;
  button.style.left = `${x}px`;
  button.style.top = `${y}px`;
  button.style.width = `${width}px`;
  button.style.height = `${height}px`;
  button.style.setProperty('--idle-delay', `${-(index % 9) * .37}s`);
  button.setAttribute('aria-label', `Message ${person.name}`);
  const inner = document.createElement('span');
  inner.className = 'person-inner';
  const avatar = document.createElement('img');
  avatar.className = 'avatar';
  avatar.alt = '';
  avatar.draggable = false;
  avatar.src = assets[person.asset];
  if (isEmployee) {
    avatar.style.left = `${person.image.x - x}px`;
    avatar.style.top = `${person.image.y - y}px`;
    avatar.style.width = `${person.image.w}px`;
    avatar.style.height = `${person.image.h}px`;
  } else {
    avatar.style.inset = '0';
    avatar.style.width = '100%';
    avatar.style.height = '100%';
    avatar.style.objectFit = 'cover';
    avatar.style.objectPosition = 'top';
  }
  const name = document.createElement('span');
  name.className = 'person-name';
  name.textContent = person.name;
  inner.append(avatar, name);
  button.append(inner);
  button.addEventListener('click', event => {
    event.stopPropagation();
    if (performance.now() < suppressClickUntil) return;
    selectPerson(person, button, type);
  });
  return button;
}

function deselect() {
  selected?.button.classList.remove('selected');
  selected = null;
  panel.hidden = true;
  panel.replaceChildren();
}

function selectPerson(person, button, type) {
  if (selected?.button === button) return;
  selected?.button.classList.remove('selected');
  selected = { person, button, type };
  button.classList.add('selected');
  panel.replaceChildren();
  const header = document.createElement('div');
  header.className = 'message-header';
  const avatar = document.createElement('img');
  avatar.className = 'message-avatar';
  avatar.src = assets[person.asset];
  avatar.alt = '';
  const identity = document.createElement('div');
  identity.className = 'message-identity';
  const name = document.createElement('strong');
  name.textContent = person.name;
  const role = document.createElement('span');
  role.textContent = person.role || (type === 'employee' ? 'Employee' : 'Officer');
  identity.append(name, role);
  const close = document.createElement('button');
  close.className = 'message-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Close message panel');
  close.textContent = '×';
  close.addEventListener('click', deselect);
  header.append(avatar, identity, close);
  const form = document.createElement('form');
  form.className = 'message-form';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Write a message…';
  input.required = true;
  input.setAttribute('aria-label', `Message to ${person.name}`);
  const send = document.createElement('button');
  send.type = 'submit';
  send.textContent = 'Send';
  const confirmation = document.createElement('div');
  confirmation.className = 'message-confirmation';
  confirmation.setAttribute('role', 'status');
  form.append(input, send);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!input.value.trim()) return;
    input.value = '';
    confirmation.textContent = 'Message sent in this prototype';
  });
  panel.append(header, form, confirmation);
  panel.hidden = false;
  input.focus({ preventScroll: true });
}

function createSidebar() {
  const items = [
    ['Home', 'imgHome'], ['People', 'imgUsers'], ['Messages', 'imgMessageSquare'],
    ['Calendar', 'imgCalendar'], ['Analytics', 'imgBarChart'], ['Places', 'imgMapPin'],
    ['Notifications', 'imgBell'], ['Settings', 'imgSettings'], ['Help', 'imgHelpCircle'],
  ];
  const sidebar = document.querySelector('#sidebar');
  items.forEach(([label, asset], index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.title = label;
    button.setAttribute('aria-label', label);
    if (index === 0) button.classList.add('active');
    const image = document.createElement('img');
    image.src = assets[asset];
    image.alt = '';
    button.append(image);
    button.addEventListener('click', () => {
      sidebar.querySelector('.active')?.classList.remove('active');
      button.classList.add('active');
    });
    sidebar.append(button);
  });
}

panorama.addEventListener('pointerdown', event => {
  if (event.button !== 0 && event.pointerType === 'mouse') return;
  pointer = { id: event.pointerId, startX: event.clientX, startY: event.clientY, originX: target, originY: targetY, moved: false };
  panorama.classList.add('dragging');
});
panorama.addEventListener('pointermove', event => {
  if (!pointer || pointer.id !== event.pointerId) return;
  const distanceX = event.clientX - pointer.startX;
  const distanceY = event.clientY - pointer.startY;
  if (Math.hypot(distanceX, distanceY) > 5 && !pointer.moved) {
    pointer.moved = true;
    panorama.setPointerCapture(event.pointerId);
  }
  if (pointer.moved) {
    setTarget(pointer.originX - distanceX);
    setVerticalTarget(pointer.originY - distanceY);
  }
});
function endPointer(event) {
  if (!pointer || pointer.id !== event.pointerId) return;
  if (pointer.moved) suppressClickUntil = performance.now() + 160;
  pointer = null;
  panorama.classList.remove('dragging');
  if (panorama.hasPointerCapture(event.pointerId)) panorama.releasePointerCapture(event.pointerId);
}
panorama.addEventListener('pointerup', endPointer);
panorama.addEventListener('pointercancel', endPointer);
panorama.addEventListener('wheel', event => {
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (!delta) return;
  event.preventDefault();
  const factor = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? window.innerWidth : 1;
  setTarget(target + delta * factor);
}, { passive: false });
panorama.addEventListener('click', event => {
  if (!event.target.closest('.person') && performance.now() >= suppressClickUntil) deselect();
});
window.addEventListener('resize', resize);
window.addEventListener('keydown', event => {
  if (event.key === 'Escape') deselect();
  if (event.target instanceof HTMLInputElement) return;
  if (event.key === 'ArrowRight') setTarget(target + 180);
  if (event.key === 'ArrowLeft') setTarget(target - 180);
});

employees.forEach((person, index) => peopleLayer.append(createPerson(person, 'employee', index)));
officers.forEach((person, index) => peopleLayer.append(createPerson(person, 'officer', index)));
createSidebar();
resize();
requestAnimationFrame(animate);

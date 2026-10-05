// Rotating 3D cube built from CSS 3D transforms (no library).
import { COLOUR_HEX, DARK_COLOURS, FACE_ORDER, stickerData } from './render.js';

const DEFAULT_VIEW = { x: -28, y: -38 }; // shows U, F and R

/**
 * Build a draggable 3D cube inside `container`.
 * Returns { update(cube, { letters }), reset() }.
 */
export function createCube3D(container) {
  const scene = document.createElement('div');
  scene.className = 'scene';
  const cubeEl = document.createElement('div');
  cubeEl.className = 'cube3d';
  scene.append(cubeEl);
  container.append(scene);

  const faces = {};
  for (const face of FACE_ORDER) {
    const faceEl = document.createElement('div');
    faceEl.className = `face face-${face}`;
    for (let i = 0; i < 9; i++) {
      const sticker = document.createElement('div');
      sticker.className = 'sticker3d';
      faceEl.append(sticker);
    }
    faces[face] = faceEl;
    cubeEl.append(faceEl);
  }

  let view = { ...DEFAULT_VIEW };
  const apply = () => {
    cubeEl.style.transform = `rotateX(${view.x}deg) rotateY(${view.y}deg)`;
  };
  apply();

  // Drag (mouse) or swipe (touch) to rotate. The whole area around the cube is the drag
  // zone: the tilted cube sticks out past its own box, and a touch there must not scroll.
  let drag = null;
  container.addEventListener('pointerdown', (e) => {
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, view: { ...view } };
    try {
      container.setPointerCapture(e.pointerId);
    } catch { /* not supported for this pointer */ }
    container.classList.add('dragging');
  });
  container.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    view = {
      x: drag.view.x - (e.clientY - drag.y) * 0.5,
      y: drag.view.y + (e.clientX - drag.x) * 0.5,
    };
    apply();
  });
  const endDrag = () => {
    drag = null;
    container.classList.remove('dragging');
  };
  container.addEventListener('pointerup', endDrag);
  container.addEventListener('pointercancel', endDrag);
  // iOS Safari doesn't always honour touch-action on 3D-transformed content,
  // so block page scrolling for touches that start in the drag zone explicitly
  const noScroll = (e) => e.preventDefault();
  container.addEventListener('touchstart', noScroll, { passive: false });
  container.addEventListener('touchmove', noScroll, { passive: false });

  return {
    update(cube, { letters = false } = {}) {
      const data = stickerData(cube);
      for (const face of FACE_ORDER) {
        const cells = faces[face].children;
        data[face].flat().forEach((s, i) => {
          cells[i].style.background = COLOUR_HEX[s.colour];
          cells[i].textContent = letters ? s.letter : '';
          cells[i].classList.toggle('centre', s.centre);
          cells[i].classList.toggle('buffer', s.buffer);
          cells[i].classList.toggle('dark', DARK_COLOURS.has(s.colour));
        });
      }
    },
    reset() {
      view = { ...DEFAULT_VIEW };
      apply();
    },
  };
}

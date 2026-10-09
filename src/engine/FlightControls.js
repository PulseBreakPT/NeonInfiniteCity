import * as THREE from 'three';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export class FlightControls {
  constructor(camera, canvas) {
    this.camera = camera;
    this.canvas = canvas;
    this.keys = new Set();
    this.yaw = -0.67;
    this.pitch = -0.16;
    this.velocity = new THREE.Vector3();
    this.speed = 50;
    this.boost = false;
    this.enabled = true;
    this.joy = { x: 0, y: 0 };
    this.lookPointer = null;
    this.lastTouch = { x: 0, y: 0 };
    this.isMobile = matchMedia('(pointer: coarse)').matches;

    this.onKeyDown = e => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
    };
    this.onKeyUp = e => this.keys.delete(e.code);
    this.onMouseMove = e => {
      if (document.pointerLockElement === this.canvas && this.enabled) this.rotate(e.movementX, e.movementY);
    };
    this.onTouchMove = e => {
      if (this.lookPointer !== e.pointerId || !this.enabled) return;
      this.rotate(e.clientX - this.lastTouch.x, e.clientY - this.lastTouch.y, 0.0036);
      this.lastTouch = { x: e.clientX, y: e.clientY };
    };
    this.onTouchEnd = e => { if (this.lookPointer === e.pointerId) this.lookPointer = null; };
    this.onTouchStart = e => {
      if (!this.enabled) return;
      if (e.pointerType === 'mouse') {
        if (document.pointerLockElement !== this.canvas) this.canvas.requestPointerLock?.();
      } else if (e.clientX > innerWidth * 0.44) {
        this.lookPointer = e.pointerId;
        this.lastTouch = { x: e.clientX, y: e.clientY };
        this.canvas.setPointerCapture?.(e.pointerId);
      }
    };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('pointerdown', this.onTouchStart);
    canvas.addEventListener('pointermove', this.onTouchMove);
    canvas.addEventListener('pointerup', this.onTouchEnd);
    canvas.addEventListener('pointercancel', this.onTouchEnd);
    canvas.addEventListener('wheel', e => {
      this.speed = clamp(this.speed + (e.deltaY < 0 ? 8 : -8), 22, 115);
    }, { passive: true });
    this.setupJoystick();
    this.setupHoldButtons();
  }

  setupJoystick() {
    const zone = document.getElementById('joystick');
    if (!zone) return;
    const nub = zone.querySelector('.joystick-nub');
    let pointer = null;
    const move = e => {
      if (pointer !== e.pointerId) return;
      const rect = zone.getBoundingClientRect();
      const r = 40;
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const mag = Math.max(1, Math.hypot(dx, dy));
      this.joy.x = clamp(dx / r, -1, 1);
      this.joy.y = clamp(dy / r, -1, 1);
      if (mag > r) { this.joy.x = dx / mag; this.joy.y = dy / mag; }
      nub.style.transform = `translate(${this.joy.x * r}px, ${this.joy.y * r}px)`;
    };
    const stop = e => {
      if (pointer !== e.pointerId) return;
      pointer = null;
      this.joy.x = this.joy.y = 0;
      nub.style.transform = 'translate(0, 0)';
    };
    zone.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      pointer = e.pointerId;
      zone.setPointerCapture(e.pointerId);
      move(e);
    });
    zone.addEventListener('pointermove', move);
    zone.addEventListener('pointerup', stop);
    zone.addEventListener('pointercancel', stop);
  }

  setupHoldButtons() {
    document.querySelectorAll('[data-hold]').forEach(el => {
      const code = el.dataset.hold;
      const stop = e => { e.preventDefault(); this.keys.delete(code); el.classList.remove('is-held'); };
      el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture(e.pointerId); this.keys.add(code); el.classList.add('is-held'); });
      el.addEventListener('pointerup', stop);
      el.addEventListener('pointercancel', stop);
      el.addEventListener('lostpointercapture', () => { this.keys.delete(code); el.classList.remove('is-held'); });
    });
  }

  rotate(dx, dy, sensitivity = 0.0023) {
    this.yaw -= dx * sensitivity;
    this.pitch = clamp(this.pitch - dy * sensitivity, -1.28, 1.28);
  }

  update(dt) {
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(this.pitch, this.yaw, 0);
    if (!this.enabled) { this.velocity.multiplyScalar(Math.exp(-8 * dt)); return 0; }
    const k = key => this.keys.has(key);
    const forward = Number(k('KeyW') || k('ArrowUp')) - Number(k('KeyS') || k('ArrowDown')) - this.joy.y;
    const strafe = Number(k('KeyD') || k('ArrowRight')) - Number(k('KeyA') || k('ArrowLeft')) + this.joy.x;
    const lift = Number(k('Space') || k('KeyQ') || k('KeyR')) - Number(k('ControlLeft') || k('ControlRight') || k('KeyE') || k('KeyF'));
    this.boost = k('ShiftLeft') || k('ShiftRight');
    const desired = new THREE.Vector3(strafe, lift, -forward);
    if (desired.lengthSq() > 1) desired.normalize();
    // Camera local horizontal axes. Vertical flight stays world-up.
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const vx = desired.x * cos + desired.z * sin;
    const vz = -desired.x * sin + desired.z * cos;
    desired.set(vx, lift, vz).multiplyScalar(this.speed * (this.boost ? 3.2 : 1));
    this.velocity.lerp(desired, 1 - Math.exp(-7 * dt));
    this.camera.position.addScaledVector(this.velocity, dt);
    this.camera.position.y = clamp(this.camera.position.y, 15, 390);
    return this.velocity.length();
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('pointerdown', this.onTouchStart);
    this.canvas.removeEventListener('pointermove', this.onTouchMove);
    this.canvas.removeEventListener('pointerup', this.onTouchEnd);
    this.canvas.removeEventListener('pointercancel', this.onTouchEnd);
  }
}

"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildChaletScene, FLOOR_Y, type ChaletMode } from "./modularproject-chalet-scene";

export interface ModularProjectModel3DLabels {
  alt: string;
  hint: string;
  viewLabel: string;
  shell: string;
  frame: string;
  unsupported: string;
}

type Mode = ChaletMode;

interface SceneApi {
  setMode: (mode: Mode) => void;
  dispose: () => void;
}

// Komponent ładuje się tylko w przeglądarce (ssr: false), więc sprawdzenie WebGL przy pierwszym renderze jest bezpieczne.
function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function ModularProjectModel3D({ labels }: { labels: ModularProjectModel3DLabels }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<SceneApi | null>(null);
  const [mode, setMode] = useState<Mode>("shell");
  const [supported] = useState(hasWebGL);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !supported) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    // 1,5 zamiast 2: ostrość prawie bez różnicy, a o około 45% mniej pikseli do narysowania.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    const canvas = renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", labels.alt);
    canvas.setAttribute("aria-describedby", "mp-model-hint");
    canvas.className = "focus-ring block size-full touch-pan-y rounded-v5-panel";
    host.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    camera.position.set(14, 8, 17);
    const chalet = buildChaletScene(scene, renderer);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, FLOOR_Y - 0.4, 2);
    controls.enableDamping = true;
    controls.minDistance = 8;
    controls.maxDistance = 38;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.listenToKeyEvents(canvas);
    controls.update();

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      needsRender = true;
      kick();
    };

    // Pętla działa tylko, gdy model jest widoczny, karta aktywna i coś się zmienia: przy obrocie przez
    // użytkownika, wygaszaniu bezwładności, zmianie widoku albo rozmiaru. W bezruchu nie rysuje nic (zero obciążenia GPU).
    let visible = true;
    let needsRender = true;
    let frameId = 0;
    const tick = () => {
      frameId = 0;
      if (!visible || document.hidden) return;
      const moved = controls.update();
      if (moved || needsRender) {
        renderer.render(scene, camera);
        needsRender = false;
      }
      // update() przy ruchu wywołuje "change", które już zaplanowało kolejną klatkę (kick); drugi
      // requestAnimationFrame tutaj podwajałby liczbę klatek co klatkę i zawieszał przeglądarkę.
      if (moved) kick();
    };
    const kick = () => {
      if (frameId === 0) frameId = requestAnimationFrame(tick);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) {
        needsRender = true;
        kick();
      }
    });
    intersection.observe(host);
    const onVisibility = () => {
      needsRender = true;
      kick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    controls.addEventListener("change", kick);
    kick();

    apiRef.current = {
      setMode: (next) => {
        chalet.setMode(next);
        needsRender = true;
        kick();
      },
      dispose: () => {
        cancelAnimationFrame(frameId);
        intersection.disconnect();
        resizeObserver.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        controls.dispose();
        scene.environment?.dispose();
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => {
              if ("map" in material) (material.map as THREE.Texture | null)?.dispose();
              material.dispose();
            });
          }
        });
        renderer.dispose();
        renderer.forceContextLoss();
        canvas.remove();
      },
    };

    return () => {
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [labels.alt, supported]);

  useEffect(() => {
    apiRef.current?.setMode(mode);
  }, [mode]);

  if (!supported) {
    return (
      <p className="rounded-v5-panel border border-brand-v5-line p-brand-3 text-body text-brand-v5-ink">
        {labels.unsupported}
      </p>
    );
  }

  const buttonClass = (active: boolean) =>
    `focus-ring rounded-v5-pill px-brand-3 py-1.5 text-data font-semibold transition-colors ${
      active
        ? "bg-brand-v5-amber text-brand-v5-amber-foreground"
        : "bg-brand-v5-night/75 text-brand-v5-paper backdrop-blur-sm hover:bg-brand-v5-night/90"
    }`;

  return (
    <div className="flex flex-col gap-brand-2">
      <div
        className="relative aspect-[4/3] overflow-hidden rounded-v5-panel bg-brand-v5-night sm:aspect-video"
        style={{
          backgroundImage:
            "linear-gradient(180deg, #1b2644 0%, #3d4470 30%, #b9674a 52%, #e89a5a 58%, #1c271d 60%, #0f1711 100%)",
        }}
      >
        <div ref={hostRef} className="absolute inset-0" />
        <div
          role="group"
          aria-label={labels.viewLabel}
          className="absolute bottom-brand-2 left-brand-2 flex flex-wrap gap-2"
        >
          <button type="button" aria-pressed={mode === "shell"} onClick={() => setMode("shell")} className={buttonClass(mode === "shell")}>
            {labels.shell}
          </button>
          <button type="button" aria-pressed={mode === "frame"} onClick={() => setMode("frame")} className={buttonClass(mode === "frame")}>
            {labels.frame}
          </button>
        </div>
      </div>
      <p id="mp-model-hint" className="text-data text-brand-v5-muted">
        {labels.hint}
      </p>
    </div>
  );
}

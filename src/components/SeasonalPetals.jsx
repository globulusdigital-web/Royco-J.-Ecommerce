import { useEffect, useRef } from "react";
import * as THREE from "three";

const PETAL_COUNT = 32;

function petalGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.34);
  shape.bezierCurveTo(-0.38, -0.08, -0.34, 0.3, 0, 0.48);
  shape.bezierCurveTo(0.34, 0.3, 0.38, -0.08, 0, -0.34);
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.025,
    bevelEnabled: true,
    bevelSize: 0.018,
    bevelThickness: 0.012,
    bevelSegments: 1,
  });
}

export default function SeasonalPetals() {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      return undefined;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 40);
    camera.position.z = 8;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    const geometry = petalGeometry();
    const material = new THREE.MeshPhongMaterial({
      color: 0xe9779e,
      emissive: 0x4a071e,
      shininess: 65,
      transparent: true,
      opacity: 0.66,
      side: THREE.DoubleSide,
    });
    const petals = new THREE.InstancedMesh(geometry, material, PETAL_COUNT);
    scene.add(petals);
    scene.add(new THREE.AmbientLight(0xffe0d0, 2.2));
    const light = new THREE.DirectionalLight(0xffcf87, 3.1);
    light.position.set(2, 4, 6);
    scene.add(light);

    const dummy = new THREE.Object3D();
    const states = Array.from({ length: PETAL_COUNT }, (_, index) => ({
      x: THREE.MathUtils.randFloatSpread(13),
      y: THREE.MathUtils.randFloat(-5.5, 7.5),
      z: THREE.MathUtils.randFloat(-4, 2),
      speed: THREE.MathUtils.randFloat(0.24, 0.62),
      spin: THREE.MathUtils.randFloat(0.3, 1.1) * (index % 2 ? 1 : -1),
      phase: Math.random() * Math.PI * 2,
      scale: THREE.MathUtils.randFloat(0.23, 0.52),
    }));

    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();
    window.addEventListener("resize", resize);

    let lastFrameTime = 0;
    let frame;
    const render = (frameTime = 0) => {
      const elapsed = frameTime / 1000;
      const delta = lastFrameTime ? Math.min((frameTime - lastFrameTime) / 1000, 0.04) : 0;
      lastFrameTime = frameTime;
      states.forEach((state, index) => {
        state.y -= state.speed * delta;
        if (state.y < -6.2) {
          state.y = 6.5;
          state.x = THREE.MathUtils.randFloatSpread(13);
          state.z = THREE.MathUtils.randFloat(-4, 2);
        }
        dummy.position.set(state.x + Math.sin(elapsed * 0.7 + state.phase) * 0.55, state.y, state.z);
        dummy.rotation.set(elapsed * state.spin, elapsed * state.spin * 0.63, Math.sin(elapsed + state.phase));
        dummy.scale.setScalar(state.scale);
        dummy.updateMatrix();
        petals.setMatrixAt(index, dummy.matrix);
      });
      petals.instanceMatrix.needsUpdate = true;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className="seasonal-petals" aria-hidden="true" />;
}

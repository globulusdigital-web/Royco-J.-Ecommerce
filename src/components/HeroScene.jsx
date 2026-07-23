import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function HeroScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    group.rotation.set(-0.18, -0.2, 0.08);
    scene.add(group);

    const gold = new THREE.MeshPhysicalMaterial({
      color: 0xe6b75f,
      metalness: 1,
      roughness: 0.17,
      clearcoat: 0.55,
      clearcoatRoughness: 0.18,
    });
    const rose = new THREE.MeshPhysicalMaterial({
      color: 0xa62d50,
      metalness: 0.78,
      roughness: 0.22,
      clearcoat: 0.7,
    });
    const diamond = new THREE.MeshPhysicalMaterial({
      color: 0xf1d7ff,
      metalness: 0.08,
      roughness: 0.04,
      transmission: 0.45,
      transparent: true,
      opacity: 0.94,
      thickness: 1.2,
      ior: 2.2,
    });

    const mainRing = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.22, 32, 120), gold);
    mainRing.rotation.x = Math.PI / 2.45;
    mainRing.rotation.z = -0.3;
    group.add(mainRing);

    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.53, 0.09, 24, 96), rose);
    innerRing.rotation.x = Math.PI / 2.45;
    innerRing.rotation.z = -0.3;
    group.add(innerRing);

    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.92, 2), diamond);
    gem.position.set(0.08, 1.38, 0.42);
    gem.scale.set(0.86, 1.2, 0.86);
    group.add(gem);

    const gemHalo = new THREE.Group();
    for (let index = 0; index < 12; index += 1) {
      const stone = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 1), diamond);
      const angle = (index / 12) * Math.PI * 2;
      stone.position.set(Math.cos(angle) * 1.13, 1.38 + Math.sin(angle) * 1.13, 0.25);
      gemHalo.add(stone);
    }
    group.add(gemHalo);

    const pointCount = 150;
    const positions = new Float32Array(pointCount * 3);
    for (let index = 0; index < pointCount; index += 1) {
      const radius = 2.8 + Math.random() * 2.8;
      const angle = Math.random() * Math.PI * 2;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = (Math.random() - 0.45) * 5.7;
      positions[index * 3 + 2] = (Math.random() - 0.5) * 3.4;
    }
    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particlesMaterial = new THREE.PointsMaterial({ color: 0xf4dca4, size: 0.035, transparent: true, opacity: 0.7 });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    const warmLight = new THREE.PointLight(0xffd08a, 55, 18);
    warmLight.position.set(4, 4, 6);
    scene.add(warmLight);
    const plumLight = new THREE.PointLight(0xa54dff, 38, 15);
    plumLight.position.set(-4, -1, 4);
    scene.add(plumLight);
    scene.add(new THREE.AmbientLight(0xffffff, 1.6));

    const pointer = { x: 0, y: 0 };
    const onPointerMove = (event) => {
      const rect = mount.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 0.55;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 0.42;
    };
    mount.addEventListener("pointermove", onPointerMove, { passive: true });

    const resize = () => {
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let start = performance.now();
    const render = (time) => {
      const elapsed = (time - start) / 1000;
      if (!reduceMotion) {
        group.rotation.y += (pointer.x - group.rotation.y) * 0.025;
        group.rotation.x += (-0.18 - pointer.y - group.rotation.x) * 0.025;
        group.position.y = Math.sin(elapsed * 0.8) * 0.12;
        gem.rotation.y = elapsed * 0.36;
        gem.rotation.z = elapsed * 0.18;
        gemHalo.rotation.z = elapsed * -0.1;
        particles.rotation.y = elapsed * 0.018;
      }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mount.removeEventListener("pointermove", onPointerMove);
      renderer.dispose();
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.domElement.remove();
    };
  }, []);

  return <div className="hero-scene" ref={mountRef} aria-hidden="true" />;
}

"use client";

import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Crypto currency definitions
const CRYPTO_CURRENCIES = [
  { symbol: "BTC", rate: 0.000025 },
  { symbol: "ETH", rate: 0.00035 },
  { symbol: "SOL", rate: 0.0055 },
  { symbol: "MATIC", rate: 1.25 },
];

// Format amount as crypto
const formatCryptoAmount = (amount: number) => {
  const crypto =
    CRYPTO_CURRENCIES[Math.floor(amount / 500) % CRYPTO_CURRENCIES.length];
  const cryptoAmount = amount * crypto.rate;
  if (cryptoAmount >= 1000)
    return `${(cryptoAmount / 1000).toFixed(1)}K ${crypto.symbol}`;
  if (cryptoAmount >= 1) return `${cryptoAmount.toFixed(1)} ${crypto.symbol}`;
  return `${cryptoAmount.toFixed(2)} ${crypto.symbol}`;
};

interface LaunderingTopologyProps {
  data?: {
    nodes?: any[];
    edges?: any[];
  };
}

interface TransactionParticle {
  mesh: THREE.Mesh;
  arrow: THREE.ArrowHelper;
  label?: THREE.Sprite;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  progress: number;
  speed: number;
  amount: number;
  color: number;
}

export function LaunderingTopology({ data }: LaunderingTopologyProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeTransactions, setActiveTransactions] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);

  useEffect(() => {
    if (!mountRef.current) return;

    // Use provided data or fallback to empty arrays
    const nodesData = data?.nodes || [];
    const edgesData = data?.edges || [];

    // Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0a0a0a");
    scene.fog = new THREE.Fog(0x0a0a0a, 30, 80);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 25, 35);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight,
    );
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 15;
    controls.maxDistance = 60;

    // Dramatic Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Spotlight for drama
    const spotlight1 = new THREE.SpotLight(0xff0000, 3);
    spotlight1.position.set(-20, 30, 10);
    spotlight1.angle = Math.PI / 6;
    spotlight1.penumbra = 0.5;
    scene.add(spotlight1);

    const spotlight2 = new THREE.SpotLight(0x00ffff, 2);
    spotlight2.position.set(20, 30, -10);
    spotlight2.angle = Math.PI / 6;
    spotlight2.penumbra = 0.5;
    scene.add(spotlight2);

    const topLight = new THREE.PointLight(0xffffff, 1.5, 100);
    topLight.position.set(0, 40, 0);
    scene.add(topLight);

    // --- Network Nodes (MUCH MORE VISIBLE) ---
    const nodes: {
      pos: THREE.Vector3;
      mesh: THREE.Mesh;
      label: THREE.Sprite;
      layer: string;
      pulsePhase: number;
    }[] = [];

    // Larger node geometry
    const nodeGeometry = new THREE.SphereGeometry(0.8, 32, 32);

    // Function to create text sprite for labels
    const createTextSprite = (
      text: string,
      color: string,
      fontSize: number = 64,
    ) => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d")!;
      canvas.width = 512;
      canvas.height = 256;

      context.fillStyle = color;
      context.font = `bold ${fontSize}px Arial`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, canvas.width / 2, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.9,
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(4, 2, 1);

      return sprite;
    };

    const createNode = (
      pos: [number, number, number],
      color: string,
      label: string,
      layer: string,
    ) => {
      // Main node sphere - MUCH LARGER AND BRIGHTER
      const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 1.2,
        metalness: 0.7,
        roughness: 0.2,
      });

      const mesh = new THREE.Mesh(nodeGeometry, material);
      mesh.position.set(...pos);

      // Add outer glow sphere
      const glowGeometry = new THREE.SphereGeometry(1.2, 32, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.3,
      });
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      mesh.add(glowMesh);

      // Add label above node
      const textSprite = createTextSprite(label, color);
      textSprite.position.y = 2.5;
      mesh.add(textSprite);

      return { mesh, label: textSprite };
    };

    // Layer 1: Source Wallets (Red - Illicit Sources) - VERTICAL LAYOUT
    const sourceLabels = ["SRC-1", "SRC-2", "SRC-3", "SRC-4", "SRC-5"];
    for (let i = 0; i < 5; i++) {
      const pos: [number, number, number] = [-20, 10 - i * 5, 0];
      const { mesh, label } = createNode(
        pos,
        "#ef4444",
        sourceLabels[i],
        "source",
      );
      scene.add(mesh);
      nodes.push({
        pos: new THREE.Vector3(...pos),
        mesh,
        label,
        layer: "source",
        pulsePhase: (i * Math.PI) / 3,
      });
    }

    // Layer 2: Mixing Layer (Amber - Obfuscation) - SCATTERED MIDDLE
    const mixingLabels = [
      "MIX-1",
      "MIX-2",
      "MIX-3",
      "MIX-4",
      "MIX-5",
      "MIX-6",
      "MIX-7",
      "MIX-8",
    ];
    for (let i = 0; i < 8; i++) {
      const row = Math.floor(i / 4);
      const col = i % 4;
      const pos: [number, number, number] = [
        -5 + col * 3.5,
        6 - row * 8,
        -3 + (i % 2) * 6,
      ];
      const { mesh, label } = createNode(
        pos,
        "#f59e0b",
        mixingLabels[i],
        "mixing",
      );
      scene.add(mesh);
      nodes.push({
        pos: new THREE.Vector3(...pos),
        mesh,
        label,
        layer: "mixing",
        pulsePhase: (i * Math.PI) / 4,
      });
    }

    // Layer 3: Destination (Emerald - Final) - VERTICAL RIGHT
    const destLabels = ["DEST-1", "DEST-2", "DEST-3", "DEST-4", "DEST-5"];
    for (let i = 0; i < 5; i++) {
      const pos: [number, number, number] = [20, 10 - i * 5, 0];
      const { mesh, label } = createNode(
        pos,
        "#10b981",
        destLabels[i],
        "destination",
      );
      scene.add(mesh);
      nodes.push({
        pos: new THREE.Vector3(...pos),
        mesh,
        label,
        layer: "destination",
        pulsePhase: (i * Math.PI) / 3,
      });
    }

    // --- Live Transaction Particles with ARROWS and AMOUNTS ---
    const particles: TransactionParticle[] = [];
    const particleGeometry = new THREE.SphereGeometry(0.4, 16, 16);

    const createTransactionParticle = (
      start: THREE.Vector3,
      end: THREE.Vector3,
      color: number,
      amount: number,
    ) => {
      // Glowing particle
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(particleGeometry, material);
      mesh.position.copy(start);
      scene.add(mesh);

      // Arrow pointing direction
      const direction = new THREE.Vector3().subVectors(end, start).normalize();
      const arrow = new THREE.ArrowHelper(
        direction,
        start,
        start.distanceTo(end),
        color,
        2,
        1.5,
      );
      const arrowMaterial = arrow.line.material as THREE.LineBasicMaterial;
      arrowMaterial.transparent = true;
      arrowMaterial.opacity = 0.7;
      scene.add(arrow);

      // Amount label
      const amountText = formatCryptoAmount(amount);
      const labelSprite = createTextSprite(
        amountText,
        `#${color.toString(16).padStart(6, "0")}`,
        48,
      );
      labelSprite.position.copy(start);
      scene.add(labelSprite);

      return {
        mesh,
        arrow,
        label: labelSprite,
        startPos: start.clone(),
        endPos: end.clone(),
        progress: 0,
        speed: 0.006 + Math.random() * 0.008,
        amount,
        color,
      };
    };

    // Spawn new transactions periodically
    const spawnTransaction = () => {
      const sourceNodes = nodes.filter((n) => n.layer === "source");
      const mixingNodes = nodes.filter((n) => n.layer === "mixing");
      const destNodes = nodes.filter((n) => n.layer === "destination");

      // Source -> Mixing (Red) - High amounts
      if (Math.random() > 0.5) {
        const source =
          sourceNodes[Math.floor(Math.random() * sourceNodes.length)];
        const target =
          mixingNodes[Math.floor(Math.random() * mixingNodes.length)];
        if (source && target) {
          const amount = 10000 + Math.random() * 50000;
          particles.push(
            createTransactionParticle(source.pos, target.pos, 0xff3344, amount),
          );
        }
      }

      // Mixing -> Destination (Cyan)
      if (Math.random() > 0.4) {
        const source =
          mixingNodes[Math.floor(Math.random() * mixingNodes.length)];
        const target = destNodes[Math.floor(Math.random() * destNodes.length)];
        if (source && target) {
          const amount = 5000 + Math.random() * 30000;
          particles.push(
            createTransactionParticle(source.pos, target.pos, 0x00ddff, amount),
          );
        }
      }

      // Mixing -> Mixing (layering) - Orange
      if (Math.random() > 0.7) {
        const source =
          mixingNodes[Math.floor(Math.random() * mixingNodes.length)];
        const target =
          mixingNodes[Math.floor(Math.random() * mixingNodes.length)];
        if (source && target && source !== target) {
          const amount = 8000 + Math.random() * 25000;
          particles.push(
            createTransactionParticle(source.pos, target.pos, 0xff9900, amount),
          );
        }
      }
    };

    // Grid floor for context
    const gridHelper = new THREE.GridHelper(60, 30, 0x444444, 0x222222);
    gridHelper.position.y = -15;
    scene.add(gridHelper);

    // Animation Loop
    let animationId: number;
    let lastSpawn = Date.now();
    const clock = new THREE.Clock();
    let volumeAccumulator = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Dramatic node pulsing
      nodes.forEach((node) => {
        const scale = 1 + Math.sin(time * 2 + node.pulsePhase) * 0.2;
        node.mesh.scale.setScalar(scale);

        const material = node.mesh.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity =
          1.0 + Math.sin(time * 2 + node.pulsePhase) * 0.5;

        // Rotate label to face camera
        node.label.lookAt(camera.position);
      });

      // Spawn new transactions
      if (Date.now() - lastSpawn > 400) {
        spawnTransaction();
        lastSpawn = Date.now();
      }

      // Update particles
      const particlesToRemove: TransactionParticle[] = [];
      particles.forEach((particle) => {
        particle.progress += particle.speed;

        if (particle.progress >= 1) {
          particlesToRemove.push(particle);
          volumeAccumulator += particle.amount;
        } else {
          // Update particle position
          particle.mesh.position.lerpVectors(
            particle.startPos,
            particle.endPos,
            particle.progress,
          );

          // Update arrow
          const currentLength =
            particle.startPos.distanceTo(particle.endPos) *
            (1 - particle.progress);
          particle.arrow.setLength(currentLength, 2, 1.5);
          particle.arrow.position.lerpVectors(
            particle.startPos,
            particle.endPos,
            particle.progress,
          );

          // Update arrow opacity
          const arrowMat = particle.arrow.line
            .material as THREE.LineBasicMaterial;
          arrowMat.opacity = 0.7 * (1 - particle.progress * 0.5);

          // Update label position and face camera
          if (particle.label) {
            particle.label.position.lerpVectors(
              particle.startPos,
              particle.endPos,
              particle.progress,
            );
            particle.label.position.y += 1.5;
            particle.label.lookAt(camera.position);
            (particle.label.material as THREE.SpriteMaterial).opacity =
              0.9 * (1 - particle.progress);
          }

          // Pulse particle
          const scale = 1 + Math.sin(time * 8 + particle.progress * 20) * 0.4;
          particle.mesh.scale.setScalar(scale);
        }
      });

      // Remove completed particles
      particlesToRemove.forEach((particle) => {
        scene.remove(particle.mesh);
        scene.remove(particle.arrow);
        if (particle.label) scene.remove(particle.label);

        particle.mesh.geometry.dispose();
        (particle.mesh.material as THREE.Material).dispose();
        particle.arrow.dispose();
        if (particle.label) {
          (particle.label.material as THREE.SpriteMaterial).dispose();
        }

        const index = particles.indexOf(particle);
        if (index > -1) particles.splice(index, 1);
      });

      setActiveTransactions(particles.length);
      setTotalVolume(volumeAccumulator);

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!mountRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);

      particles.forEach((particle) => {
        scene.remove(particle.mesh);
        scene.remove(particle.arrow);
        if (particle.label) scene.remove(particle.label);
        particle.mesh.geometry.dispose();
        (particle.mesh.material as THREE.Material).dispose();
        particle.arrow.dispose();
      });

      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      nodeGeometry.dispose();
      particleGeometry.dispose();
    };
  }, [data]); // Re-run when data changes

  return (
    <div className="relative w-full h-full">
      <div
        ref={mountRef}
        className="w-full h-full rounded-lg overflow-hidden"
      />
      {/* Enhanced Stats Overlay */}
      <div className="absolute top-4 right-4 space-y-2">
        <div className="bg-black/80 backdrop-blur-md border border-emerald-500/30 rounded-lg px-4 py-2 shadow-lg shadow-emerald-500/20">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500" />
            <span className="text-xs text-zinc-400">
              <span className="text-emerald-400 font-mono font-bold text-base">
                {activeTransactions}
              </span>{" "}
              live txns
            </span>
          </div>
        </div>
        <div className="bg-black/80 backdrop-blur-md border border-cyan-500/30 rounded-lg px-4 py-2 shadow-lg shadow-cyan-500/20">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">
              Total:{" "}
              <span className="text-cyan-400 font-mono font-bold">
                {formatCryptoAmount(totalVolume)}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md border border-zinc-700 rounded-lg px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
          <span className="text-xs text-zinc-300">Illicit Source</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50" />
          <span className="text-xs text-zinc-300">Mixing Layer</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
          <span className="text-xs text-zinc-300">Destination</span>
        </div>
      </div>
    </div>
  );
}

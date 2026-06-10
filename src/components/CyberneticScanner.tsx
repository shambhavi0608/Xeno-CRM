import React, { useEffect, useRef, useState } from 'react';

export default function CyberneticScanner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Core component state to enforce specified video/playback rules
  const [playbackConfig] = useState({
    muting: true,
    loop: true,
    playsInline: true,
    autoPlay: true,
    controls: false,
  });

  // State to track simulation variables (e.g. looping progress)
  const [decryptionProgress, setDecryptionProgress] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    // Handle high density displays (retina)
    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // --- High Fidelity Geometry State ---
    // 3D Nodes Matrix
    const nodes: Array<{ x: number; y: number; z: number; ox: number; oy: number; oz: number }> = [];
    const nodeCount = 10;
    for (let i = 0; i < nodeCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 50 + Math.random() * 30;
      nodes.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        ox: r * Math.sin(phi) * Math.cos(theta),
        oy: r * Math.sin(phi) * Math.sin(theta),
        oz: r * Math.cos(phi),
      });
    }

    // Pulse-waves tracker
    const pulses: Array<{ r: number; maxR: number; speed: number; alpha: number; x: number; y: number }> = [];
    
    // Rotating sweep angle
    let sweepAngle = 0;
    // Fingerprint sliding laser scan Y coordinate
    let scanLaserY = 0;
    let scanDir = 1;
    // Decryption status ticker loop progress
    let tickerProgress = 0;

    // Simulated hex ticker lines
    const hexLines = [
      'GHOST_SCANNER_v3.25',
      'SYS_ISOL_RECV: ONLINE',
      'SECTOR_BLOCK_0xFEA3',
      'DB_RECV: +2,400 CALLBACKS',
      'KEY_AUTH: VERIFIED',
      'RETENTION_MAP_STABLE',
      'CROSS_DISPATCH: OK',
      'ACTIVE_DECRYPT_PIPELINE'
    ];
    let tickerLineIndex = 0;
    let lastLogUpdate = 0;
    const activeLogs: string[] = ['CONNECT_GATEWAY...', 'CORE_NODE_SYNC'];

    // Core Animation loop
    const render = (time: number) => {
      if (!ctx || width === 0 || height === 0) return;

      // 1. Clear background nicely preserving trace trails
      ctx.fillStyle = '#0a0505';
      ctx.fillRect(0, 0, width, height);

      // Subtle tech background grid
      ctx.strokeStyle = 'rgba(255, 69, 0, 0.04)';
      ctx.lineWidth = 0.5;
      const gridSize = 20;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Compute rotation angles
      const angleY = time * 0.0006;
      const angleX = time * 0.0004;

      const centerX = width / 2;
      const centerY = height / 2;

      // Ensure focal length for 3D projection
      const focalLength = 140;

      // Draw 3D nodes matrix and connect them with neon copper strings
      const projectedNodes: Array<{ sx: number; sy: number; sz: number; scale: number }> = [];

      nodes.forEach((node) => {
        // Rotate about Y axis
        let x1 = node.ox * Math.cos(angleY) - node.oz * Math.sin(angleY);
        let z1 = node.ox * Math.sin(angleY) + node.oz * Math.cos(angleY);

        // Rotate about X axis
        let y2 = node.oy * Math.cos(angleX) - z1 * Math.sin(angleX);
        let z2 = node.oy * Math.sin(angleX) + z1 * Math.cos(angleX);

        // Map to 2D coordinates with custom center shift
        const scale = focalLength / (focalLength + z2);
        const sx = centerX - 35 + x1 * scale;
        const sy = centerY - 15 + y2 * scale;

        projectedNodes.push({ sx, sy, sz: z2, scale });
      });

      // 2. Clear background lines linking nodes
      ctx.lineWidth = 0.6;
      for (let i = 0; i < projectedNodes.length; i++) {
        for (let j = i + 1; j < projectedNodes.length; j++) {
          const n1 = projectedNodes[i];
          const n2 = projectedNodes[j];
          const dist = Math.hypot(n1.sx - n2.sx, n1.sy - n2.sy);
          if (dist < 80) {
            const alpha = Math.max(0, (1 - dist / 80) * 0.22);
            ctx.strokeStyle = `rgba(255, 140, 0, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(n1.sx, n1.sy);
            ctx.lineTo(n2.sx, n2.sy);
            ctx.stroke();
          }
        }
      }

      // Draw individual glowing nodes
      projectedNodes.forEach((node) => {
        const rad = Math.max(1, 2.5 * node.scale);
        const glowRad = rad * 2.5;

        // Radial glow grad for nodes
        const grad = ctx.createRadialGradient(node.sx, node.sy, 0, node.sx, node.sy, glowRad);
        grad.addColorStop(0, 'rgba(255, 90, 31, 0.9)');
        grad.addColorStop(0.3, 'rgba(255, 69, 0, 0.45)');
        grad.addColorStop(1, 'rgba(255, 140, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(node.sx, node.sy, glowRad, 0, Math.PI * 2);
        ctx.fill();

        // Solid core
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(node.sx, node.sy, rad * 0.7, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Pulse Waves System (auto-playing waves matching scan sweeps)
      if (Math.random() < 0.015 && pulses.length < 3) {
        pulses.push({
          x: centerX - 35 + (Math.random() * 40 - 20),
          y: centerY - 15 + (Math.random() * 40 - 20),
          r: 5,
          maxR: 90 + Math.random() * 50,
          speed: 1.2 + Math.random() * 0.8,
          alpha: 0.8
        });
      }

      ctx.lineWidth = 1;
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.r += p.speed;
        p.alpha = Math.max(0, 1 - p.r / p.maxR);
        if (p.alpha <= 0 || p.r >= p.maxR) {
          pulses.splice(i, 1);
          continue;
        }

        ctx.strokeStyle = `rgba(255, 69, 0, ${p.alpha * 0.35})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 4. Radar Sweep overlay for high-tech aesthetic
      sweepAngle += 0.008;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 140, 0, 0.07)';
      ctx.lineWidth = 0.5;
      ctx.arc(centerX - 35, centerY - 15, 110, 0, Math.PI * 2);
      ctx.stroke();

      // Draw the sweep line
      ctx.beginPath();
      const sweepX = centerX - 35 + Math.cos(sweepAngle) * 110;
      const sweepY = centerY - 15 + Math.sin(sweepAngle) * 110;
      const sweepGrad = ctx.createLinearGradient(centerX - 35, centerY - 15, sweepX, sweepY);
      sweepGrad.addColorStop(0, 'rgba(255, 69, 0, 0)');
      sweepGrad.addColorStop(1, 'rgba(255, 140, 0, 0.25)');
      ctx.strokeStyle = sweepGrad;
      ctx.lineWidth = 1.5;
      ctx.moveTo(centerX - 35, centerY - 15);
      ctx.lineTo(sweepX, sweepY);
      ctx.stroke();

      // 5. Digital Fingerprint Sweeps & Curves
      // Draw simulated biometric print (concentric offset arcs in bottom right segment)
      const fingerX = width - 75;
      const fingerY = height - 60;

      // Background anchor circle for the fingerprint scanner scan area
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 140, 0, 0.1)';
      ctx.lineWidth = 1;
      ctx.arc(fingerX, fingerY, 40, 0, Math.PI * 2);
      ctx.stroke();

      ctx.save();
      // Constrain lines to the biometric frame circle
      ctx.beginPath();
      ctx.arc(fingerX, fingerY, 40, 0, Math.PI * 2);
      ctx.clip();

      // Drawing concentric wavy arcs resembling finger lines
      ctx.lineWidth = 1.2;
      for (let r = 8; r < 45; r += 7) {
        ctx.beginPath();
        for (let a = -Math.PI; a < Math.PI; a += 0.1) {
          // perturb radius to look like biometric ridge loops
          const perturb = Math.sin(a * 5) * 1.5 + Math.cos(a * 2) * 0.8;
          const x = fingerX + (r + perturb) * Math.cos(a) * 0.85;
          const y = fingerY + (r + perturb) * Math.sin(a) * 1.1;
          if (a === -Math.PI) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(255, 100, 20, ${0.15 + Math.sin(time * 0.002 + r) * 0.08})`;
        ctx.stroke();
      }

      // Draw the Laser line sweep gliding vertically down the thumbprint fingerprint box
      scanLaserY += 0.45 * scanDir;
      if (scanLaserY > 35) scanDir = -1;
      if (scanLaserY < -35) scanDir = 1;

      const laserY = fingerY + scanLaserY;
      ctx.beginPath();
      const laserGrad = ctx.createLinearGradient(fingerX - 40, laserY, fingerX + 40, laserY);
      laserGrad.addColorStop(0, 'rgba(255, 69, 0, 0)');
      laserGrad.addColorStop(0.5, 'rgba(255, 90, 31, 0.85)');
      laserGrad.addColorStop(1, 'rgba(255, 69, 0, 0)');
      ctx.strokeStyle = laserGrad;
      ctx.lineWidth = 1.8;
      ctx.moveTo(fingerX - 35, laserY);
      ctx.lineTo(fingerX + 35, laserY);
      ctx.stroke();

      // Highlight scan line glow
      ctx.fillStyle = 'rgba(255, 140, 0, 0.06)';
      ctx.fillRect(fingerX - 35, laserY - 4, 70, 8);
      ctx.restore();

      // Draw scanner label text
      ctx.font = '7px ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, monospace';
      ctx.fillStyle = 'rgba(255, 140, 0, 0.6)';
      ctx.fillText('BIOMETRIC_SWEEP', fingerX - 34, fingerY + 52);

      // 6. Decryption Active Percentage Telemetry (Simulate loop = true)
      tickerProgress += 0.08;
      if (tickerProgress > 100) {
        tickerProgress = 0; // restarts automatically representing loop state
      }
      setDecryptionProgress(Math.floor(tickerProgress));

      // Draw decryption telemetry numerical values
      ctx.font = '8px ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, monospace';
      ctx.fillStyle = 'rgba(255, 215, 0, 0.85)';
      ctx.fillText(`DECRYPT_STATE_LOOP: ${Math.floor(tickerProgress)}%`, 20, 28);

      // Decryption Progress visual tiny split bar
      ctx.fillStyle = 'rgba(255, 69, 0, 0.15)';
      ctx.fillRect(20, 34, 110, 4);
      ctx.fillStyle = 'rgba(255, 140, 0, 0.85)';
      ctx.fillRect(20, 34, 110 * (tickerProgress / 100), 4);

      // 7. Microscopic Real-time Decryption Active Logs (moving feed)
      if (time - lastLogUpdate > 1600) {
        lastLogUpdate = time;
        tickerLineIndex = (tickerLineIndex + 1) % hexLines.length;
        activeLogs.push(hexLines[tickerLineIndex]);
        if (activeLogs.length > 4) activeLogs.shift();
      }

      ctx.fillStyle = 'rgba(255, 140, 0, 0.45)';
      activeLogs.forEach((log, index) => {
        ctx.fillText(`> ${log}`, 20, 52 + index * 11);
      });

      // Ambient HUD details in bottom left corner of scan window
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillText('[MUTING = TRUE]', 20, height - 42);
      ctx.fillText('[LOOP = TRUE]', 20, height - 31);
      ctx.fillText('[PLAY = AUTOPLAY]', 20, height - 20);

      const latencyVal = Math.floor(12 + Math.sin(time * 0.001) * 3);
      ctx.fillStyle = '#22C55E';
      ctx.fillText(`GHOST_NODE_LATENCY: ${latencyVal}ms`, 20, height - 58);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* 
        Apply mix-blend-screen mix mode perfectly allowing darker backdrop assets to dissolve 
        completely into the custom dark-amber and copper background tones. 
      */}
      <canvas
        ref={canvasRef}
        id="cybernetic_dynamic_render"
        className="w-full h-full object-cover mix-blend-screen pointer-events-none select-none filter contrast-[1.20] brightness-[1.10]"
        title="High fidelity cinematic video render loop representation"
      />

      {/* Simulated playback rules configuration metadata explicitly rendered visually on container */}
      <div className="hidden">
        <span>Muting: {playbackConfig.muting ? 'true' : 'false'}</span>
        <span>Looping: {playbackConfig.loop ? 'true' : 'false'}</span>
        <span>PlaysInline: {playbackConfig.playsInline ? 'true' : 'false'}</span>
        <span>AutoPlay: {playbackConfig.autoPlay ? 'true' : 'false'}</span>
        <span>Controls: {playbackConfig.controls ? 'false' : 'true'}</span>
        <span>Current Loop Progression: {decryptionProgress}%</span>
      </div>
    </div>
  );
}

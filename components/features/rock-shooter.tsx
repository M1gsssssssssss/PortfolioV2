"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Rock = {
  x: number;
  y: number;
  z: number;
  radius: number;
  rotation: number;
  spin: number;
  sides: number;
};

type Shot = {
  x: number;
  y: number;
  aimX: number;
  aimY: number;
  z: number;
  previousZ: number;
};

type Impact = {
  x: number;
  y: number;
  z: number;
  startedAt: number;
};

type GameState = {
  playerX: number;
  playerY: number;
  rocks: Rock[];
  shots: Shot[];
  impacts: Impact[];
  keys: Set<string>;
  firing: boolean;
  lastShot: number;
  lastSpawn: number;
  lastFrame: number;
  score: number;
  lives: number;
  starOffset: number;
};

const PLAYER_Z = 3.3;
const ROCK_START_Z = 22;
const MAX_LIVES = 3;

function createRock(): Rock {
  return {
    x: (Math.random() - 0.5) * 10,
    y: (Math.random() - 0.5) * 6,
    z: ROCK_START_Z,
    radius: 0.55 + Math.random() * 0.6,
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 2,
    sides: 7 + Math.floor(Math.random() * 4),
  };
}

export default function RockShooter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState>({
    playerX: 0,
    playerY: 0,
    rocks: [],
    shots: [],
    impacts: [],
    keys: new Set(),
    firing: false,
    lastShot: 0,
    lastSpawn: 0,
    lastFrame: 0,
    score: 0,
    lives: MAX_LIVES,
    starOffset: 0,
  });
  const [playing, setPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [gameOver, setGameOver] = useState(false);
  const [muted, setMuted] = useState(true);
  const playingRef = useRef(playing);
  const gameOverRef = useRef(gameOver);
  const mutedRef = useRef(muted);
  const audioRef = useRef<AudioContext | null>(null);

  const playShot = useCallback(() => {
    if (mutedRef.current) return;
    const AudioContextConstructor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextConstructor) return;

    audioRef.current ??= new AudioContextConstructor();
    const context = audioRef.current;
    if (context.state === "suspended") void context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(580, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(180, context.currentTime + 0.09);
    gain.gain.setValueAtTime(0.035, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.1);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.1);
  }, []);

  const startGame = useCallback(() => {
    const game = gameRef.current;
    playingRef.current = true;
    gameOverRef.current = false;
    game.playerX = 0;
    game.playerY = 0;
    game.rocks = [];
    game.shots = [];
    game.impacts = [];
    game.keys.clear();
    game.firing = false;
    game.lastShot = 0;
    game.lastSpawn = 0;
    game.lastFrame = 0;
    game.score = 0;
    game.lives = MAX_LIVES;
    setScore(0);
    setLives(MAX_LIVES);
    setGameOver(false);
    setPlaying(true);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest("input, textarea, select, button, a[href], [role='textbox']"))
      ) {
        return;
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
        event.preventDefault();
        gameRef.current.keys.add(event.key.toLowerCase());
      }
    }
    function handleKeyUp(event: KeyboardEvent) {
      gameRef.current.keys.delete(event.key.toLowerCase());
    }
    function stopInput() {
      gameRef.current.keys.clear();
      gameRef.current.firing = false;
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", stopInput);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", stopInput);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let animationFrame = 0;
    let lastUiScore = -1;
    let lastUiLives = -1;
    const game = gameRef.current;
    const keys = game.keys;

    function resizeCanvas() {
      if (!canvas) return;
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * pixelRatio);
      canvas.height = Math.round(bounds.height * pixelRatio);
      context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }

    function project(x: number, y: number, z: number, width: number, height: number) {
      const focalLength = height * 0.83;
      return {
        x: width / 2 + x * focalLength / z,
        y: height * 0.48 + y * focalLength / z,
        scale: focalLength / z,
      };
    }

    function playerWorldPosition(width: number, height: number) {
      const focalLength = height * 0.83;
      return {
        x: game.playerX * 21 * PLAYER_Z / focalLength,
        y: (height * 0.34 + game.playerY * 10) * PLAYER_Z / focalLength,
      };
    }

    function aimWorldPosition(width: number, height: number) {
      const focalLength = height * 0.83;
      return {
        x: game.playerX * (width / (2 * 4.6)) * ROCK_START_Z / focalLength,
        y: game.playerY * (height * 0.13 / 2.2) * ROCK_START_Z / focalLength,
      };
    }

    function rayPositionAtDepth(
      origin: { x: number; y: number },
      aim: { x: number; y: number },
      z: number,
    ) {
      const progress = Math.max(0, Math.min(1, (z - PLAYER_Z) / (ROCK_START_Z - PLAYER_Z)));
      return {
        x: origin.x + (aim.x - origin.x) * progress,
        y: origin.y + (aim.y - origin.y) * progress,
      };
    }

    function shotPositionAtDepth(shot: Shot, z: number) {
      return rayPositionAtDepth(shot, { x: shot.aimX, y: shot.aimY }, z);
    }

    function drawRock(rock: Rock, width: number, height: number) {
      if (!context) return;
      const lightTheme = document.documentElement.dataset.theme === "light";
      const point = project(rock.x, rock.y, rock.z, width, height);
      const radius = Math.max(2, rock.radius * point.scale);
      if (point.x < -radius || point.x > width + radius || point.y < -radius || point.y > height + radius) return;

      context.save();
      context.translate(point.x, point.y);
      context.rotate(rock.rotation);
      const vertices = Array.from({ length: rock.sides }, (_, index) => {
        const angle = (index / rock.sides) * Math.PI * 2;
        const variation = 0.76 + 0.24 * Math.sin(index * 17.13 + rock.radius * 9);
        return {
          x: Math.cos(angle) * radius * variation,
          y: Math.sin(angle) * radius * variation,
        };
      });

      context.beginPath();
      vertices.forEach((vertex, index) => {
        if (index === 0) context.moveTo(vertex.x, vertex.y);
        else context.lineTo(vertex.x, vertex.y);
      });
      context.closePath();
      const gradient = context.createRadialGradient(
        -radius * 0.3,
        -radius * 0.4,
        radius * 0.1,
        0,
        0,
        radius,
      );
      gradient.addColorStop(0, lightTheme ? "#f0f3ef" : "#aeb3b8");
      gradient.addColorStop(0.45, lightTheme ? "#a4ada6" : "#555b61");
      gradient.addColorStop(1, lightTheme ? "#465149" : "#202428");
      context.fillStyle = gradient;
      context.fill();
      context.strokeStyle = lightTheme ? "#080b09" : "rgba(232, 236, 240, 0.7)";
      context.lineWidth = Math.max(lightTheme ? 1.5 : 0.7, radius * (lightTheme ? 0.045 : 0.025));
      context.stroke();

      for (let index = 0; index < vertices.length; index += 2) {
        const a = vertices[index];
        const b = vertices[(index + 2) % vertices.length];
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.closePath();
        context.fillStyle = lightTheme
          ? index % 4 === 0 ? "rgba(5, 12, 7, 0.28)" : "rgba(255, 255, 255, 0.16)"
          : index % 4 === 0 ? "rgba(9, 11, 13, 0.28)" : "rgba(235, 239, 243, 0.08)";
        context.fill();
      }
      context.restore();
    }

    function drawPlane(width: number, height: number) {
      if (!context) return;
      const lightTheme = document.documentElement.dataset.theme === "light";
      const { x: worldX, y: worldY } = playerWorldPosition(width, height);
      const { x, y } = project(worldX, worldY, PLAYER_Z, width, height);
      const bank = (keys.has("arrowleft") || keys.has("a") ? -0.13 : 0) +
        (keys.has("arrowright") || keys.has("d") ? 0.13 : 0);

      context.save();
      context.translate(x, y);
      context.rotate(bank);
      context.shadowColor = lightTheme ? "rgba(10, 16, 12, 0.22)" : "rgba(255, 255, 255, 0.72)";
      context.shadowBlur = lightTheme ? 5 : 18;
      context.fillStyle = lightTheme ? "#f8faf8" : "#f1f3f5";
      context.beginPath();
      context.moveTo(0, -25);
      context.lineTo(6, 5);
      context.lineTo(27, 16);
      context.lineTo(27, 21);
      context.lineTo(5, 17);
      context.lineTo(4, 27);
      context.lineTo(11, 31);
      context.lineTo(11, 34);
      context.lineTo(0, 31);
      context.lineTo(-11, 34);
      context.lineTo(-11, 31);
      context.lineTo(-4, 27);
      context.lineTo(-5, 17);
      context.lineTo(-27, 21);
      context.lineTo(-27, 16);
      context.lineTo(-6, 5);
      context.closePath();
      context.fill();
      context.strokeStyle = lightTheme ? "#050806" : "rgba(10, 12, 14, 0.9)";
      context.lineWidth = lightTheme ? 2.5 : 1;
      context.stroke();
      context.shadowBlur = 0;
      context.fillStyle = lightTheme ? "#25362a" : "#ffffff";
      context.beginPath();
      context.moveTo(0, -17);
      context.lineTo(3, 5);
      context.lineTo(-3, 5);
      context.closePath();
      context.fill();
      if (lightTheme) {
        context.strokeStyle = "#050806";
        context.lineWidth = 0.8;
        context.stroke();
      }
      context.restore();
    }

    function render(timestamp: number) {
      if (!context || !canvas) return;
      if (gameOverRef.current) {
        animationFrame = requestAnimationFrame(render);
        return;
      }
      const bounds = canvas.getBoundingClientRect();
      const lightTheme = document.documentElement.dataset.theme === "light";
      const width = bounds.width;
      const height = bounds.height;
      if (!width || !height) {
        animationFrame = requestAnimationFrame(render);
        return;
      }
      if (canvas.width !== Math.round(width * Math.min(window.devicePixelRatio || 1, 2))) {
        resizeCanvas();
      }

      const delta = game.lastFrame ? Math.min((timestamp - game.lastFrame) / 1000, 0.04) : 0;
      game.lastFrame = timestamp;
      game.starOffset = (game.starOffset + delta * 0.12) % 1;
      if (playingRef.current) {
        game.playerX = Math.max(-4.6, Math.min(4.6, game.playerX +
          ((keys.has("arrowright") || keys.has("d") ? 1 : 0) -
            (keys.has("arrowleft") || keys.has("a") ? 1 : 0)) * delta * 6));
        game.playerY = Math.max(-2.2, Math.min(2.2, game.playerY +
          ((keys.has("arrowdown") || keys.has("s") ? 1 : 0) -
            (keys.has("arrowup") || keys.has("w") ? 1 : 0)) * delta * 4));
      } else {
        const target = game.rocks
          .filter((rock) => rock.z > PLAYER_Z + 3)
          .map((rock) => ({
            rock,
            position: project(rock.x, rock.y, rock.z, width, height),
          }))
          .filter(
            ({ rock, position }) =>
              position.x > -rock.radius * position.scale &&
              position.x < width + rock.radius * position.scale &&
              position.y > -rock.radius * position.scale &&
              position.y < height + rock.radius * position.scale,
          )
          .sort((a, b) => a.rock.z - b.rock.z)[0]?.rock;
        if (target) {
          const tracking = Math.min(delta * 4, 1);
          const focalLength = height * 0.83;
          const origin = playerWorldPosition(width, height);
          const depthRatio = (ROCK_START_Z - PLAYER_Z) / (target.z - PLAYER_Z);
          const aimX = origin.x + (target.x - origin.x) * depthRatio;
          const aimY = origin.y + (target.y - origin.y) * depthRatio;
          const targetX =
            (aimX * focalLength / ROCK_START_Z) / (width / (2 * 4.6));
          const targetY =
            (aimY * focalLength / ROCK_START_Z) / (height * 0.13 / 2.2);
          game.playerX += (targetX - game.playerX) * tracking;
          game.playerY += (targetY - game.playerY) * tracking;
        } else {
          game.playerX = Math.sin(timestamp / 1700) * 2.7;
          game.playerY = Math.sin(timestamp / 2300) * 0.7;
        }
      }

      context.clearRect(0, 0, width, height);
      const horizonY = height * 0.48;
      const vignette = context.createRadialGradient(
        width / 2,
        height * 0.52,
        height * 0.05,
        width / 2,
        height * 0.52,
        width * 0.72,
      );
      vignette.addColorStop(0, lightTheme ? "rgba(255, 255, 255, 0.04)" : "rgba(255, 255, 255, 0.025)");
      vignette.addColorStop(1, lightTheme ? "rgba(9, 18, 12, 0.1)" : "rgba(1, 4, 7, 0.18)");
      context.fillStyle = vignette;
      context.fillRect(0, 0, width, height);

      for (let index = 0; index < 45; index++) {
        const x = ((index * 97.37) % width);
        const y = ((index * 53.91 + game.starOffset * height * (0.3 + (index % 4) * 0.2)) % horizonY);
        const radius = index % 7 === 0 ? 1.3 : 0.7;
        context.fillStyle = lightTheme
          ? `rgba(10, 20, 13, ${0.32 + (index % 5) * 0.1})`
          : `rgba(232, 236, 240, ${0.2 + (index % 5) * 0.1})`;
        context.fillRect(x, y, radius, radius);
      }

      context.save();
      context.strokeStyle = lightTheme ? "rgba(5, 12, 7, 0.28)" : "rgba(235, 239, 243, 0.12)";
      context.lineWidth = 1;
      for (let line = -8; line <= 8; line++) {
        context.beginPath();
        context.moveTo(width / 2 + line * 8, horizonY);
        context.lineTo(width / 2 + line * width * 0.22, height);
        context.stroke();
      }
      for (let row = 0; row < 9; row++) {
        const progress = ((row / 9 + game.starOffset * 1.4) % 1);
        const y = horizonY + Math.pow(progress, 2.2) * (height - horizonY);
        context.globalAlpha = 0.15 + progress * 0.35;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }
      context.restore();

      if (timestamp - game.lastSpawn > 900) {
        game.rocks.push(createRock());
        game.lastSpawn = timestamp;
      }
      if ((!playingRef.current || game.firing || keys.has(" ")) && timestamp - game.lastShot > 220) {
        const origin = playerWorldPosition(width, height);
        const aim = aimWorldPosition(width, height);
        game.shots.push({ ...origin, aimX: aim.x, aimY: aim.y, z: PLAYER_Z, previousZ: PLAYER_Z });
        game.lastShot = timestamp;
        playShot();
      }

      game.shots = game.shots.filter((shot) => {
        shot.previousZ = shot.z;
        shot.z += delta * 22;
        const nearDepth = Math.max(PLAYER_Z, shot.z - 0.38);
        const nearPosition = shotPositionAtDepth(shot, nearDepth);
        const farPosition = shotPositionAtDepth(shot, shot.z + 0.12);
        const near = project(nearPosition.x, nearPosition.y, nearDepth, width, height);
        const far = project(farPosition.x, farPosition.y, shot.z + 0.12, width, height);
        context!.save();
        context!.lineCap = "round";
        context!.shadowColor = lightTheme ? "rgba(12, 20, 14, 0.25)" : "#ffffff";
        context!.shadowBlur = lightTheme ? 3 : 13;
        context!.strokeStyle = lightTheme ? "rgba(6, 12, 8, 0.58)" : "rgba(255, 255, 255, 0.24)";
        context!.lineWidth = Math.max(4, far.scale * 0.055);
        context!.beginPath();
        context!.moveTo(near.x, near.y);
        context!.lineTo(far.x, far.y);
        context!.stroke();
        context!.shadowBlur = 7;
        context!.strokeStyle = lightTheme ? "#a7e6c0" : "rgba(245, 247, 250, 0.96)";
        context!.lineWidth = Math.max(1.5, far.scale * 0.018);
        context!.beginPath();
        context!.moveTo(near.x, near.y);
        context!.lineTo(far.x, far.y);
        context!.stroke();
        context!.restore();
        return shot.z < ROCK_START_Z + 2;
      });

      const speed = 4.3 + Math.min(game.score * 0.012, 3.5);
      const playerWorld = playerWorldPosition(width, height);
      const aimWorld = aimWorldPosition(width, height);
      const beamActive = !playingRef.current || game.firing || keys.has(" ");
      const beamTarget = beamActive
        ? game.rocks
            .filter((rock) => {
              if (rock.z <= PLAYER_Z) return false;
              const rayPoint = rayPositionAtDepth(playerWorld, aimWorld, rock.z);
              return Math.hypot(rock.x - rayPoint.x, rock.y - rayPoint.y) < rock.radius * 0.72 + 0.2;
            })
            .sort((a, b) => a.z - b.z)[0]
        : undefined;
      const nextRocks: Rock[] = [];
      for (const rock of game.rocks) {
        const previousRockZ = rock.z;
        rock.z -= speed * delta;
        rock.rotation += rock.spin * delta;
        let hit = rock === beamTarget;
        const collisionRadius = rock.radius * 0.72;
        game.shots = game.shots.filter((shot) => {
          const previousDepthDifference = shot.previousZ - previousRockZ;
          const currentDepthDifference = shot.z - rock.z;
          const crossedDepth =
            previousDepthDifference === 0 ||
            previousDepthDifference * currentDepthDifference <= 0;
          const crossingProgress = crossedDepth
            ? previousDepthDifference === currentDepthDifference
              ? 0.5
              : previousDepthDifference /
                (previousDepthDifference - currentDepthDifference)
            : 1;
          const crossingDepth = crossedDepth
            ? shot.previousZ + (shot.z - shot.previousZ) * crossingProgress
            : shot.z;
          const shotPoint = shotPositionAtDepth(shot, crossingDepth);
          if (
            (crossedDepth || Math.abs(currentDepthDifference) < collisionRadius + 0.25) &&
            Math.hypot(shotPoint.x - rock.x, shotPoint.y - rock.y) < collisionRadius + 0.2
          ) {
            hit = true;
            return false;
          }
          return true;
        });
        if (hit) {
          game.impacts.push({ x: rock.x, y: rock.y, z: rock.z, startedAt: timestamp });
          game.score += 10;
          continue;
        }
        if (rock.z <= PLAYER_Z + 0.25) {
          if (playingRef.current && Math.hypot(rock.x - playerWorld.x, rock.y - playerWorld.y) < collisionRadius + 0.65) {
            game.lives = Math.max(0, game.lives - 1);
          }
          continue;
        }
        nextRocks.push(rock);
      }
      game.rocks = nextRocks;

      game.impacts = game.impacts.filter((impact) => {
        const progress = (timestamp - impact.startedAt) / 460;
        if (progress >= 1) return false;
        const point = project(impact.x, impact.y, impact.z, width, height);
        const radius = 5 + progress * 30;
        const alpha = 1 - progress;
        context!.save();
        context!.globalAlpha = alpha;
        context!.lineWidth = 1.4 + (1 - progress);
        context!.strokeStyle = lightTheme ? "#0a100c" : "#ffffff";
        context!.shadowColor = lightTheme ? "rgba(8, 15, 10, 0.25)" : "#e4e8ed";
        context!.shadowBlur = (lightTheme ? 4 : 18) * alpha;
        context!.beginPath();
        context!.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context!.stroke();
        context!.fillStyle = lightTheme
          ? `rgba(24, 88, 49, ${alpha * 0.75})`
          : `rgba(255, 255, 255, ${alpha * 0.75})`;
        context!.beginPath();
        context!.arc(point.x, point.y, Math.max(1, 5 * (1 - progress)), 0, Math.PI * 2);
        context!.fill();
        for (let shard = 0; shard < 8; shard++) {
          const angle = (Math.PI * 2 * shard) / 8 + impact.startedAt * 0.001;
          const innerRadius = radius * 0.48;
          const outerRadius = radius * (0.8 + (shard % 3) * 0.12);
          context!.beginPath();
          context!.moveTo(point.x + Math.cos(angle) * innerRadius, point.y + Math.sin(angle) * innerRadius);
          context!.lineTo(point.x + Math.cos(angle) * outerRadius, point.y + Math.sin(angle) * outerRadius);
          context!.stroke();
        }
        context!.restore();
        return true;
      });

      const reticle = project(aimWorld.x, aimWorld.y, ROCK_START_Z, width, height);
      context.save();
      context.strokeStyle = lightTheme ? "rgba(5, 12, 7, 0.8)" : "rgba(255, 255, 255, 0.55)";
      context.lineWidth = 1;
      context.beginPath();
      context.arc(reticle.x, reticle.y, 6, 0, Math.PI * 2);
      context.moveTo(reticle.x - 10, reticle.y);
      context.lineTo(reticle.x - 4, reticle.y);
      context.moveTo(reticle.x + 4, reticle.y);
      context.lineTo(reticle.x + 10, reticle.y);
      context.moveTo(reticle.x, reticle.y - 10);
      context.lineTo(reticle.x, reticle.y - 4);
      context.moveTo(reticle.x, reticle.y + 4);
      context.lineTo(reticle.x, reticle.y + 10);
      context.stroke();
      context.restore();

      [...game.rocks].sort((a, b) => b.z - a.z).forEach((rock) => drawRock(rock, width, height));
      if (beamActive) {
        const origin = project(playerWorld.x, playerWorld.y, PLAYER_Z, width, height);
        const pulse = 0.72 + Math.sin(timestamp * 0.035) * 0.18;
        context.save();
        context.globalAlpha = pulse;
        context.lineCap = "round";
        context.shadowColor = lightTheme ? "rgba(8, 15, 10, 0.2)" : "#ffffff";
        context.shadowBlur = lightTheme ? 3 : 18;
        context.strokeStyle = lightTheme ? "rgba(5, 12, 7, 0.72)" : "rgba(255, 255, 255, 0.24)";
        context.lineWidth = 8;
        context.beginPath();
        context.moveTo(origin.x, origin.y - 24);
        context.lineTo(reticle.x, reticle.y);
        context.stroke();
        context.shadowBlur = 8;
        context.strokeStyle = lightTheme ? "#7ba88a" : "rgba(245, 247, 250, 0.95)";
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(origin.x, origin.y - 24);
        context.lineTo(reticle.x, reticle.y);
        context.stroke();
        context.shadowBlur = 2;
        context.strokeStyle = lightTheme ? "#17211b" : "rgba(255, 255, 255, 0.94)";
        context.lineWidth = 0.7;
        context.beginPath();
        context.moveTo(origin.x, origin.y - 24);
        context.lineTo(reticle.x, reticle.y);
        context.stroke();
        context.restore();
      }
      drawPlane(width, height);

      if (game.score !== lastUiScore || game.lives !== lastUiLives) {
        setScore(game.score);
        setLives(game.lives);
        lastUiScore = game.score;
        lastUiLives = game.lives;
      }
      if (playingRef.current && game.lives <= 0) {
        setScore(game.score);
        setLives(0);
        playingRef.current = false;
        gameOverRef.current = true;
        setGameOver(true);
        setPlaying(false);
      }
      animationFrame = requestAnimationFrame(render);
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    animationFrame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      game.firing = false;
      game.keys.clear();
    };
  }, [playShot]);

  function steerToPointer(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!playing) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    gameRef.current.playerX = (x - 0.5) * 9.2;
    gameRef.current.playerY = Math.max(-2.2, Math.min(2.2, ((y - 0.48) / 0.13) * 2.2));
  }

  function setKey(key: string, pressed: boolean) {
    if (pressed) gameRef.current.keys.add(key);
    else gameRef.current.keys.delete(key);
  }

  return (
    <aside className="rock-shooter" aria-label="3D plane rock shooter game">
      <div className="rock-shooter-topline">
        <span>ARCADE / 001</span>
        <span className="rock-shooter-live"><i /> {playing ? "YOUR FLIGHT" : gameOver ? "FLIGHT OVER" : "LIVE DEMO"}</span>
      </div>

      <div className="rock-game-screen">
        <canvas
          aria-label="Game view: steer the plane and shoot the incoming rocks"
          className="rock-game-canvas"
          onPointerMove={playing ? steerToPointer : undefined}
          ref={canvasRef}
          role="img"
        />
        <div className="rock-game-hud" aria-live="polite">
          <div><span>SCORE</span><strong>{String(score).padStart(4, "0")}</strong></div>
          <div><span>SHIELD</span><strong className="rock-game-lives">{"◆".repeat(lives)}{"◇".repeat(MAX_LIVES - lives)}</strong></div>
        </div>
        {gameOver && (
          <div className="rock-game-overlay">
            <span className="rock-game-overlay-icon" aria-hidden="true">↻</span>
            <p className="rock-game-overlay-title">Flight over</p>
            <p className="rock-game-overlay-copy">You scored {score} points.</p>
            <button className="rock-game-start" onClick={startGame} type="button">
              Play again
              <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
        {playing && (
          <div className="rock-game-hint" aria-hidden="true">
            <span>MOVE</span><span>FIRE</span>
          </div>
        )}
      </div>

      <div className="rock-game-controls">
        {playing ? <span className="rock-game-instructions">
          <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move
          <kbd className="space-key">SPACE</kbd> fire
        </span> : <span className="rock-game-demo-label">LIVE DEMO</span>}
        <div className="rock-game-buttons" aria-label={playing ? "Touch controls" : "Game options"}>
          {playing && <div className="rock-game-dpad">
            <button
              aria-label="Move up"
              onPointerDown={() => setKey("w", true)}
              onPointerLeave={() => setKey("w", false)}
              onPointerUp={() => setKey("w", false)}
              type="button"
            >↑</button>
            <button
              aria-label="Move left"
              onPointerDown={() => setKey("a", true)}
              onPointerLeave={() => setKey("a", false)}
              onPointerUp={() => setKey("a", false)}
              type="button"
            >←</button>
            <button
              aria-label="Move down"
              onPointerDown={() => setKey("s", true)}
              onPointerLeave={() => setKey("s", false)}
              onPointerUp={() => setKey("s", false)}
              type="button"
            >↓</button>
            <button
              aria-label="Move right"
              onPointerDown={() => setKey("d", true)}
              onPointerLeave={() => setKey("d", false)}
              onPointerUp={() => setKey("d", false)}
              type="button"
            >→</button>
          </div>}
          <button
            aria-label={muted ? "Enable sound effects" : "Mute sound effects"}
            className={`rock-game-sound ${muted ? "" : "sound-on"}`}
            onClick={() => setMuted((current) => {
              const nextMuted = !current;
              mutedRef.current = nextMuted;
              return nextMuted;
            })}
            type="button"
          >
            {muted ? "SOUND OFF" : "SOUND ON"}
          </button>
          {playing ? <button
            className="rock-game-fire"
            onPointerDown={(event) => {
              event.preventDefault();
              gameRef.current.firing = true;
            }}
            onPointerLeave={() => {
              gameRef.current.firing = false;
            }}
            onPointerUp={() => {
              gameRef.current.firing = false;
            }}
            type="button"
          >
            FIRE
          </button> : !gameOver && <button className="rock-game-start rock-game-takeover" onClick={startGame} type="button">
            TAKE CONTROL <span aria-hidden="true">→</span>
          </button>}
        </div>
      </div>
    </aside>
  );
}

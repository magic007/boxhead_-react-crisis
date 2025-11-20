
import React, { useRef, useEffect, useCallback } from 'react';
// @ts-ignore
import Matter from 'matter-js';
import { GameState, Entity, PlayerEntity, Vector2, Bullet, Particle, WeaponType, Wall } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { GameRefs } from './game/types';
import { generateMapWalls } from './game/mapSystem';
import { initPhysics, resetGamePhysics } from './game/physicsSystem';
import { updateGame } from './game/updateSystem';
import { renderGame } from './game/renderSystem';
import { SoundSystem } from './game/soundSystem';
import { getSavedKeyMap, Action, KeyMap, subscribeToKeyMapChange } from './game/inputConfig';

interface GameCanvasProps {
  onScoreUpdate: (score: number, multiplier: number) => void;
  onHealthUpdate: (hp: number[]) => void;
  onAmmoUpdate: (p1: {weapon: string, ammo: number}, p2?: {weapon: string, ammo: number}) => void;
  onGameOver: (score: number) => void;
  gameState: GameState;
  playerCount: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  onScoreUpdate, 
  onHealthUpdate, 
  onAmmoUpdate, 
  onGameOver,
  gameState,
  playerCount
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Lazy init SoundSystem to avoid creating AudioContext on every render
  const soundSystemRef = useRef<SoundSystem | null>(null);
  if (!soundSystemRef.current) {
    soundSystemRef.current = new SoundSystem();
  }

  const callbacksRef = useRef({ onScoreUpdate, onHealthUpdate, onAmmoUpdate, onGameOver });
  useEffect(() => {
    callbacksRef.current = { onScoreUpdate, onHealthUpdate, onAmmoUpdate, onGameOver };
  }, [onScoreUpdate, onHealthUpdate, onAmmoUpdate, onGameOver]);

  const gameRefs: GameRefs = {
    engine: useRef<any>(null).current,
    players: useRef<PlayerEntity[]>([]),
    enemies: useRef<Entity[]>([]),
    obstacles: useRef<Entity[]>([]),
    items: useRef<Entity[]>([]),
    bullets: useRef<Bullet[]>([]),
    particles: useRef<Particle[]>([]),
    bloodDecals: useRef<Particle[]>([]),
    camera: useRef<Vector2>({ x: 0, y: 0 }),
    keys: useRef<Set<string>>(new Set()),
    keyMaps: useRef<Record<number, KeyMap>>({
        1: getSavedKeyMap(1),
        2: getSavedKeyMap(2)
    }),
    mouse: useRef<Vector2>({ x: 0, y: 0 }),
    isMouseDown: useRef(false),
    score: useRef(0),
    multiplier: useRef(1),
    lastKillTime: useRef(0),
    wave: useRef(1),
    frame: useRef(0),
    difficultyLevel: useRef(0),
    gameMessage: useRef<string | null>(null),
    gameMessageTimer: useRef(0),
    mapWalls: useRef<Wall[]>(generateMapWalls()),
    soundSystem: soundSystemRef as React.MutableRefObject<SoundSystem>,
    callbacks: callbacksRef
  };

  const engineRef = useRef<any>(null);
  Object.defineProperty(gameRefs, 'engine', {
    get: () => engineRef.current,
    set: (v) => { engineRef.current = v; }
  });

  useEffect(() => {
    const unsub1 = subscribeToKeyMapChange((pid, newMap) => {
        gameRefs.keyMaps.current[pid] = newMap;
    });
    return () => { unsub1(); };
  }, []);

  useEffect(() => {
    const engine = initPhysics(gameRefs);
    
    // Cleanup function
    return () => {
      Matter.World.clear(engine.world, false);
      Matter.Engine.clear(engine);
      
      // Close AudioContext on unmount to free hardware resources
      if (soundSystemRef.current && soundSystemRef.current.ctx.state !== 'closed') {
        soundSystemRef.current.ctx.close().catch(console.error);
        soundSystemRef.current = null;
      }
    };
  }, []);

  const resetGame = useCallback(() => {
    gameRefs.enemies.current = [];
    gameRefs.bullets.current = [];
    gameRefs.particles.current = [];
    gameRefs.bloodDecals.current = [];
    gameRefs.obstacles.current = [];
    gameRefs.items.current = [];
    gameRefs.score.current = 0;
    gameRefs.multiplier.current = 1;
    gameRefs.wave.current = 1;
    gameRefs.difficultyLevel.current = 0;
    gameRefs.gameMessage.current = null;
    
    resetGamePhysics(gameRefs, playerCount); // Pass playerCount to init players
    gameRefs.camera.current = { x: 0, y: 0 }; 
    
    // Resume audio context on game start
    gameRefs.soundSystem.current?.resume();
  }, [playerCount]);

  // Force reset when entering PLAYING state
  const prevGameState = useRef<GameState>(gameState);
  useEffect(() => {
    if (gameState === GameState.PLAYING && 
       (prevGameState.current === GameState.MENU || prevGameState.current === GameState.GAME_OVER)) {
        resetGame();
    }
    prevGameState.current = gameState;
  }, [gameState, resetGame]);


  useEffect(() => {
    if (gameState !== GameState.PLAYING) {
      return;
    }
    
    let animationFrameId: number;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const engine = engineRef.current;
    let lastTime = 0;

    if (!canvas || !ctx || !engine) return;

    const loop = (time: number) => {
      if (lastTime === 0) lastTime = time;
      const delta = time - lastTime;
      lastTime = time;
      
      // Cap delta to prevent huge jumps if tab receives focus after a while
      const safeDelta = Math.min(delta, 100);

      Matter.Engine.update(engine, safeDelta);
      updateGame(gameRefs, time); // Physics is handled by engine, updateGame handles logic
      renderGame(ctx, gameRefs);
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, resetGame]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      gameRefs.soundSystem.current?.resume(); // Unlock audio safely
      gameRefs.keys.current.add(e.code);
      // Weapon switching is now handled in updateSystem to support multi-player
    };
    const handleKeyUp = (e: KeyboardEvent) => gameRefs.keys.current.delete(e.code);
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      gameRefs.mouse.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };
    const handleMouseDown = () => {
        gameRefs.isMouseDown.current = true;
        gameRefs.soundSystem.current?.resume(); // Unlock audio safely
    };
    const handleMouseUp = () => gameRefs.isMouseDown.current = false;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      width={CANVAS_WIDTH} 
      height={CANVAS_HEIGHT}
      className="rounded-lg shadow-2xl shadow-black bg-black mx-auto"
    />
  );
};

export default GameCanvas;

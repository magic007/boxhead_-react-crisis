
import React, { useRef, useEffect, useCallback, useState } from 'react';
// @ts-ignore
import Matter from 'matter-js';
import { GameState, Entity, PlayerEntity, Vector2, Bullet, Particle, WeaponType, Wall, Difficulty } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { GameRefs } from './game/types';
import { generateMapWalls } from './game/mapSystem';
import { initPhysics, resetGamePhysics } from './game/physicsSystem';
import { updateGame } from './game/updateSystem';
import { renderGame } from './game/renderSystem';
import { SoundSystem } from './game/soundSystem';
import { getSavedKeyMap, Action, KeyMap, subscribeToKeyMapChange, getSavedGamepadMapping, subscribeToGamepadMappingChange } from './game/inputConfig';

interface GameCanvasProps {
  onScoreUpdate: (score: number, multiplier: number) => void;
  onHealthUpdate: (hp: number[]) => void;
  onAmmoUpdate: (p1: {weapon: string, ammo: number}, p2?: {weapon: string, ammo: number}, p3?: {weapon: string, ammo: number}) => void;
  onGameOver: (score: number) => void;
  gameState: GameState;
  playerCount: number;
  livesPerPlayer: number;
  difficulty: Difficulty;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  onScoreUpdate, 
  onHealthUpdate, 
  onAmmoUpdate, 
  onGameOver,
  gameState,
  playerCount,
  livesPerPlayer,
  difficulty
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  
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
        2: getSavedKeyMap(2),
        3: getSavedKeyMap(3)
    }),
    mouse: useRef<Vector2>({ x: 0, y: 0 }),
    isMouseDown: useRef(false),
    gamepads: useRef<Array<Gamepad | null>>([]),
    gamepadButtons: useRef<Array<Set<number>>>([]),
    gamepadToPlayer: useRef<Record<number, number>>(getSavedGamepadMapping()),
    score: useRef(0),
    multiplier: useRef(1),
    lastKillTime: useRef(0),
    wave: useRef(1),
    waveEnemiesRemaining: useRef(0),
    waveEnemiesTotal: useRef(0),
    isSpawningWave: useRef(false),
    waveCountdown: useRef(0),
    safeHouse: useRef<{ x: number; y: number; width: number; height: number } | null>(null),
    safeHouseDropped: useRef(false),
    frame: useRef(0),
    difficultyLevel: useRef(0),
    difficulty: useRef<Difficulty>(difficulty),
    gameMessage: useRef<string | null>(null),
    gameMessageTimer: useRef(0),
    mapWalls: useRef<Wall[]>(generateMapWalls()),
    canvasWidth: window.innerWidth,
    canvasHeight: window.innerHeight,
    soundSystem: soundSystemRef as React.MutableRefObject<SoundSystem>,
    callbacks: callbacksRef
  };
  
  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      const newSize = { width: window.innerWidth, height: window.innerHeight };
      setCanvasSize(newSize);
      // 更新gameRefs中的画布尺寸
      gameRefs.canvasWidth = newSize.width;
      gameRefs.canvasHeight = newSize.height;
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const engineRef = useRef<any>(null);
  Object.defineProperty(gameRefs, 'engine', {
    get: () => engineRef.current,
    set: (v) => { engineRef.current = v; }
  });

  useEffect(() => {
    const unsub1 = subscribeToKeyMapChange((pid, newMap) => {
        gameRefs.keyMaps.current[pid] = newMap;
    });
    const unsub2 = subscribeToGamepadMappingChange((mapping) => {
        gameRefs.gamepadToPlayer.current = mapping;
    });
    return () => { 
      unsub1(); 
      unsub2();
    };
  }, []);
  
  // 更新难度设置
  useEffect(() => {
    gameRefs.difficulty.current = difficulty;
  }, [difficulty]);

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
    gameRefs.waveEnemiesRemaining.current = 0;
    gameRefs.waveEnemiesTotal.current = 0;
    gameRefs.isSpawningWave.current = false;
    gameRefs.waveCountdown.current = 0;
    gameRefs.safeHouse.current = null;
    gameRefs.safeHouseDropped.current = false;
    gameRefs.difficultyLevel.current = 0;
    gameRefs.difficulty.current = difficulty;
    gameRefs.gameMessage.current = null;
    
    resetGamePhysics(gameRefs, playerCount, livesPerPlayer); // Pass playerCount and livesPerPlayer to init players
    gameRefs.camera.current = { x: 0, y: 0 }; 
    
    // Resume audio context on game start
    gameRefs.soundSystem.current?.resume();
  }, [playerCount, livesPerPlayer, difficulty]);

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

      // Update gamepad state
      const gamepadList = navigator.getGamepads();
      if (gamepadList) {
        for (let i = 0; i < gamepadList.length; i++) {
          const gamepad = gamepadList[i];
          if (gamepad) {
            gameRefs.gamepads.current[i] = gamepad;
            // Update button states
            const buttonSet = gameRefs.gamepadButtons.current[i] || new Set<number>();
            buttonSet.clear();
            for (let j = 0; j < gamepad.buttons.length; j++) {
              if (gamepad.buttons[j].pressed) {
                buttonSet.add(j);
              }
            }
            gameRefs.gamepadButtons.current[i] = buttonSet;
          }
        }
      }

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
      // 计算相对于画布实际尺寸的鼠标位置
      const scaleX = canvasRef.current.width / rect.width;
      const scaleY = canvasRef.current.height / rect.height;
      gameRefs.mouse.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };
    const handleMouseDown = () => {
        gameRefs.isMouseDown.current = true;
        gameRefs.soundSystem.current?.resume(); // Unlock audio safely
    };
    const handleMouseUp = () => gameRefs.isMouseDown.current = false;

    const handleTouchMove = (e: TouchEvent) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        
        // Find the first touch that is not on a button (controls)
        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            const target = touch.target as HTMLElement;
            if (!target.closest('button')) {
                 // 计算相对于画布实际尺寸的触摸位置
                 const scaleX = canvasRef.current.width / rect.width;
                 const scaleY = canvasRef.current.height / rect.height;
                 gameRefs.mouse.current = {
                    x: (touch.clientX - rect.left) * scaleX,
                    y: (touch.clientY - rect.top) * scaleY
                  };
                  break;
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchstart', handleTouchMove, { passive: false });

    // Gamepad event handlers
    const handleGamepadConnected = (e: GamepadEvent) => {
      const gamepad = e.gamepad;
      gameRefs.gamepads.current[gamepad.index] = gamepad;
      gameRefs.gamepadButtons.current[gamepad.index] = new Set<number>();
      gameRefs.soundSystem.current?.resume(); // Unlock audio
    };

    const handleGamepadDisconnected = (e: GamepadEvent) => {
      const gamepad = e.gamepad;
      gameRefs.gamepads.current[gamepad.index] = null;
      gameRefs.gamepadButtons.current[gamepad.index] = new Set<number>();
    };

    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    // Initialize gamepads
    const updateGamepads = () => {
      const gamepadList = navigator.getGamepads();
      if (gamepadList) {
        for (let i = 0; i < gamepadList.length; i++) {
          const gamepad = gamepadList[i];
          if (gamepad) {
            gameRefs.gamepads.current[i] = gamepad;
            if (!gameRefs.gamepadButtons.current[i]) {
              gameRefs.gamepadButtons.current[i] = new Set<number>();
            }
          }
        }
      }
    };
    updateGamepads();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchMove);
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      width={canvasSize.width} 
      height={canvasSize.height}
      className="w-full h-full bg-black"
      style={{ display: 'block' }}
    />
  );
};

export default GameCanvas;

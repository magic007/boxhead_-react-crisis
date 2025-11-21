import React, { useState, useCallback, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import UIOverlay from './components/UIOverlay';
import { KeybindingModal } from './components/KeybindingModal';
import { VirtualControls } from './components/VirtualControls';
import { GameState, WeaponType, Difficulty } from './types';
import { Action, getSavedKeyMap } from './components/game/inputConfig';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [playerCount, setPlayerCount] = useState(1);
  const [score, setScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [showVirtualControls, setShowVirtualControls] = useState(true);
  const [livesPerPlayer, setLivesPerPlayer] = useState(3);
  
  // 难度设置，从 localStorage 读取，默认中等
  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    const saved = localStorage.getItem('gameDifficulty');
    if (saved && Object.values(Difficulty).includes(saved as Difficulty)) {
      return saved as Difficulty;
    }
    return Difficulty.MEDIUM;
  });
  
  // 保存难度设置到 localStorage
  const handleDifficultyChange = useCallback((newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    localStorage.setItem('gameDifficulty', newDifficulty);
  }, []);
  
  // Player 1 Stats
  const [p1Stats, setP1Stats] = useState({
      hp: 100,
      weapon: WeaponType.PISTOL,
      ammo: -1,
      lives: 3
  });
  
  // Player 2 Stats (Optional)
  const [p2Stats, setP2Stats] = useState<{hp: number, weapon: string, ammo: number, lives: number} | null>(null);
  
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    const checkMobile = () => {
      const ua = navigator.userAgent;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      const isSmallScreen = window.innerWidth <= 1024;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      return (isMobileDevice || (isSmallScreen && hasTouch));
    };
    
    const mobile = checkMobile();
    setIsMobile(mobile);
  }, []);

  const requestFullScreen = useCallback(() => {
    const elem = document.documentElement;
    const req = elem.requestFullscreen || 
                (elem as any).mozRequestFullScreen || 
                (elem as any).webkitRequestFullScreen || 
                (elem as any).msRequestFullscreen;
    
    if (req) {
      req.call(elem).catch((err: any) => {
        console.log('Full screen request denied or failed', err);
      });
    }
  }, []);

  const handleStart = useCallback((count: number) => {
    setPlayerCount(count);
    setScore(0);
    setMultiplier(1);
    setP1Stats({ hp: 100, weapon: WeaponType.PISTOL, ammo: -1, lives: livesPerPlayer });
    setP2Stats(count === 2 ? { hp: 100, weapon: WeaponType.PISTOL, ammo: -1, lives: livesPerPlayer } : null);
    setGameState(GameState.PLAYING);
  }, [livesPerPlayer]);

  const handleGameOver = useCallback((final: number) => {
    setFinalScore(final);
    setGameState(GameState.GAME_OVER);
  }, []);

  const handleScoreUpdate = useCallback((s: number, m: number) => {
    setScore(s);
    setMultiplier(m);
  }, []);

  const handleHealthUpdate = useCallback((hps: number[], lives: number[]) => {
    setP1Stats(prev => ({ ...prev, hp: hps[0], lives: lives[0] }));
    if (hps[1] !== undefined && lives[1] !== undefined) {
        setP2Stats(prev => prev ? ({ ...prev, hp: hps[1], lives: lives[1] }) : null);
    }
  }, []);

  const handleAmmoUpdate = useCallback((p1: {weapon: string, ammo: number}, p2?: {weapon: string, ammo: number}) => {
    setP1Stats(prev => ({ ...prev, ...p1 }));
    if (p2) {
        setP2Stats(prev => prev ? ({ ...prev, ...p2 }) : null);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap = getSavedKeyMap();
      if (e.code === keyMap[Action.PAUSE]) {
        setGameState(prev => {
          if (prev === GameState.PLAYING) return GameState.PAUSED;
          if (prev === GameState.PAUSED) return GameState.PLAYING;
          return prev;
        });
      }
    };
    
    // Gamepad pause support (Start button - button 9, or Menu button - button 8)
    let lastPauseCheck = 0;
    const checkGamepadPause = () => {
      const now = Date.now();
      if (now - lastPauseCheck < 200) return; // 防抖
      lastPauseCheck = now;
      
      const gamepads = navigator.getGamepads();
      if (gamepads) {
        for (let i = 0; i < gamepads.length; i++) {
          const gamepad = gamepads[i];
          if (gamepad && (gamepad.buttons[9]?.pressed || gamepad.buttons[8]?.pressed)) {
            setGameState(prev => {
              if (prev === GameState.PLAYING) return GameState.PAUSED;
              if (prev === GameState.PAUSED) return GameState.PLAYING;
              return prev;
            });
            break;
          }
        }
      }
    };
    
    let gamepadCheckInterval: number;
    if (gameState === GameState.PLAYING || gameState === GameState.PAUSED) {
      gamepadCheckInterval = window.setInterval(checkGamepadPause, 100);
    }
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (gamepadCheckInterval) clearInterval(gamepadCheckInterval);
    };
  }, [gameState]);

  // CSS Animations
  const styles = `
    @keyframes glitch {
      0% { transform: translate(0) }
      20% { transform: translate(-2px, 2px) }
      40% { transform: translate(-2px, -2px) }
      60% { transform: translate(2px, 2px) }
      80% { transform: translate(2px, -2px) }
      100% { transform: translate(0) }
    }
    @keyframes blood-pulse {
      0%, 100% { text-shadow: 0 0 5px #8a0303, 0 0 10px #ff0000; color: #ff0000; }
      50% { text-shadow: 0 0 20px #ff0000, 0 0 30px #ff0000; color: #ff3333; }
    }
    
    .title-glitch {
      animation: blood-pulse 3s infinite;
    }
    .btn-tactical {
      background: #2a2a2a;
      border: 1px solid #4a4a4a;
      box-shadow: 0 4px 0 #1a1a1a;
      transition: all 0.1s;
      text-transform: uppercase;
      letter-spacing: 2px;
      position: relative;
      overflow: hidden;
    }
    .btn-tactical:hover {
      transform: translateY(2px);
      box-shadow: 0 2px 0 #1a1a1a;
      border-color: #fff;
    }
    .btn-tactical:active {
      transform: translateY(4px);
      box-shadow: 0 0 0 #1a1a1a;
    }
    .btn-tactical::after {
      content: '';
      position: absolute;
      top: 0; left: -100%;
      width: 100%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
      transition: 0.5s;
    }
    .btn-tactical:hover::after {
      left: 100%;
    }
    /* 干净的网格背景 */
    .bg-clean {
      background-color: #09090b;
      background-image: 
        linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
      background-size: 40px 40px;
    }
  `;

  return (
    <div className="relative w-screen h-screen bg-zinc-900 flex items-center justify-center select-none overflow-hidden">
      <style>{styles}</style>
      
      {/* Game Container */}
      <div className="relative">
        <GameCanvas 
          gameState={gameState}
          playerCount={playerCount}
          livesPerPlayer={livesPerPlayer}
          difficulty={difficulty}
          onScoreUpdate={handleScoreUpdate}
          onHealthUpdate={handleHealthUpdate}
          onAmmoUpdate={handleAmmoUpdate}
          onGameOver={handleGameOver}
        />
        
        {gameState === GameState.PLAYING && (
          <>
            <UIOverlay 
              score={score} 
              multiplier={multiplier} 
              p1Stats={p1Stats}
              p2Stats={p2Stats}
            />
            {isMobile && playerCount === 1 && showVirtualControls && (
              <VirtualControls currentWeapon={p1Stats.weapon} />
            )}
          </>
        )}

        {/* Main Menu */}
        {gameState === GameState.MENU && (
          <div className="absolute inset-0 bg-clean flex flex-col items-center justify-center text-white z-20 rounded-lg shadow-2xl border-4 border-zinc-800">
            <div className="mb-8 text-center relative">
               {/* Blood splatters decoration */}
               <div className="absolute top-0 -left-20 text-red-900 opacity-40 text-6xl font-serif select-none pointer-events-none">
                 ☠
               </div>
               
               <h1 className="text-6xl font-black mb-2 tracking-tighter title-glitch drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]" style={{ fontFamily: 'Impact, sans-serif' }}>
                 ZOMBIE CRISIS
               </h1>
               <h2 className="text-2xl font-bold tracking-[0.4em] text-zinc-500 uppercase border-t-2 border-zinc-700 pt-1.5 mt-1.5">
                 Boxhead Tribute
               </h2>
            </div>
            
            <div className="space-y-4 text-center flex flex-col items-center w-full max-w-md">
              <button 
                onClick={() => handleStart(1)}
                className="btn-tactical w-full py-3 text-lg font-bold text-zinc-100 bg-zinc-800 hover:bg-red-900 hover:text-white group"
              >
                <div className="flex items-center justify-center gap-3">
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
                     <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                     <circle cx="12" cy="7" r="4"/>
                   </svg>
                   单人行动
                </div>
              </button>
              
              <button 
                onClick={() => handleStart(2)}
                className="btn-tactical w-full py-3 text-lg font-bold text-zinc-100 bg-zinc-800 hover:bg-blue-900 hover:text-white group"
              >
                 <div className="flex items-center justify-center gap-3">
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
                     <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                     <circle cx="9" cy="7" r="4"/>
                     <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                     <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                   </svg>
                   双人合作
                </div>
              </button>
              
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="btn-tactical w-full py-3 text-lg font-bold text-zinc-400 bg-zinc-900 hover:bg-zinc-800 group"
              >
                <div className="flex items-center justify-center gap-3">
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-90 transition-transform duration-300">
                     <circle cx="12" cy="12" r="3"/>
                     <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24"/>
                   </svg>
                   系统设置
                </div>
              </button>
              
              <div className="mt-6 p-3 bg-black/40 border border-zinc-800 rounded w-full text-left backdrop-blur-sm">
                <div className="text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">操作说明</div>
                <div className="grid grid-cols-2 gap-3 text-sm font-mono text-zinc-400">
                  <div>
                    <span className="text-red-500">玩家1:</span> WASD 移动<br/>空格 攻击
                  </div>
                  <div>
                    <span className="text-blue-500">玩家2:</span> 方向键移动<br/>数字0 攻击
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-zinc-700/50 text-xs text-zinc-500 text-center flex items-center justify-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                  <span>可在系统设置中自定义按键配置</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pause Menu */}
        {gameState === GameState.PAUSED && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white z-20 backdrop-blur-sm">
            <h1 className="text-5xl font-black mb-8 text-yellow-500 tracking-widest drop-shadow-lg border-b-4 border-yellow-500 pb-3 uppercase">
              Paused
            </h1>
            
            <div className="flex flex-col gap-4 w-80">
              <button 
                onClick={() => setGameState(GameState.PLAYING)}
                className="btn-tactical py-3 text-lg font-bold text-green-400 hover:bg-green-900/30 hover:text-green-300 hover:border-green-500 flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                RESUME MISSION
              </button>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="btn-tactical py-3 text-lg font-bold text-zinc-400 hover:bg-zinc-800 flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                SETTINGS
              </button>
              <button 
                onClick={() => setGameState(GameState.MENU)}
                className="btn-tactical py-3 text-lg font-bold text-red-500 hover:bg-red-900/30 hover:text-red-400 hover:border-red-500 flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
                ABORT MISSION
              </button>
            </div>
          </div>
        )}

        {/* Keybinding Modal */}
        <KeybindingModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          showVirtualControls={showVirtualControls}
          onToggleVirtualControls={() => setShowVirtualControls(prev => !prev)}
          isMobile={isMobile}
          onRequestFullScreen={requestFullScreen}
          livesPerPlayer={livesPerPlayer}
          onLivesChange={setLivesPerPlayer}
          difficulty={difficulty}
          onDifficultyChange={handleDifficultyChange}
        />

        {/* Game Over Screen */}
        {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 bg-red-950/90 flex flex-col items-center justify-center text-white z-20 backdrop-blur-md">
            <div className="mb-6 text-center">
                <h1 className="text-5xl font-black text-white mb-1.5 drop-shadow-[0_4px_0_#000]">游戏结束</h1>
                <div className="text-xl font-bold text-red-400 tracking-[0.4em] opacity-80">行动报告</div>
            </div>
            
            <div className="bg-black/50 p-6 rounded-lg border-2 border-red-800 mb-8 text-center min-w-[350px]">
                <div className="text-sm text-red-300 uppercase tracking-widest mb-1.5">最终得分</div>
                <div className="text-5xl font-mono font-bold text-white drop-shadow-lg">
                    {finalScore.toLocaleString()}
                </div>
            </div>

            <div className="flex flex-col gap-4 w-80">
              <button 
                onClick={() => handleStart(playerCount)}
                className="btn-tactical py-3 text-lg font-bold text-white bg-red-900 hover:bg-red-800 border-red-700 hover:border-red-500 flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                重新开始
              </button>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="btn-tactical py-3 text-lg font-bold text-zinc-400 hover:bg-zinc-800 flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                设置
              </button>
              <button 
                onClick={() => setGameState(GameState.MENU)}
                className="btn-tactical py-3 text-lg font-bold text-zinc-500 hover:bg-zinc-800 hover:text-white flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                返回主菜单
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
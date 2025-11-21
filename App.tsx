import React, { useState, useCallback, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import UIOverlay from './components/UIOverlay';
import { KeybindingModal } from './components/KeybindingModal';
import { VirtualControls } from './components/VirtualControls';
import { GameState, WeaponType } from './types';
import { Action, getSavedKeyMap } from './components/game/inputConfig';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [playerCount, setPlayerCount] = useState(1);
  const [score, setScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [showVirtualControls, setShowVirtualControls] = useState(true);
  
  // Player 1 Stats
  const [p1Stats, setP1Stats] = useState({
      hp: 100,
      weapon: WeaponType.PISTOL,
      ammo: -1
  });
  
  // Player 2 Stats (Optional)
  const [p2Stats, setP2Stats] = useState<{hp: number, weapon: string, ammo: number} | null>(null);
  
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    // Prevent double alert in strict mode
    if (window.hasShownMobileAlert) return;

    const checkMobile = () => {
      const ua = navigator.userAgent;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      const isSmallScreen = window.innerWidth <= 1024;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      return (isMobileDevice || (isSmallScreen && hasTouch));
    };
    
    const mobile = checkMobile();
    setIsMobile(mobile);
    if (mobile) {
      window.hasShownMobileAlert = true;
      alert('检测到您正在使用移动设备。\n\n系统已为您启用虚拟按键操作：\n- 左侧：移动摇杆\n- 右侧：攻击与切换武器\n- 空白处：触摸瞄准');
    }
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
    if (isMobile) {
      requestFullScreen();
    }

    setPlayerCount(count);
    setScore(0);
    setMultiplier(1);
    setP1Stats({ hp: 100, weapon: WeaponType.PISTOL, ammo: -1 });
    setP2Stats(count === 2 ? { hp: 100, weapon: WeaponType.PISTOL, ammo: -1 } : null);
    setGameState(GameState.PLAYING);
  }, [isMobile, requestFullScreen]);

  const handleGameOver = useCallback((final: number) => {
    setFinalScore(final);
    setGameState(GameState.GAME_OVER);
  }, []);

  const handleScoreUpdate = useCallback((s: number, m: number) => {
    setScore(s);
    setMultiplier(m);
  }, []);

  const handleHealthUpdate = useCallback((hps: number[]) => {
    setP1Stats(prev => ({ ...prev, hp: hps[0] }));
    if (hps[1] !== undefined) {
        setP2Stats(prev => prev ? ({ ...prev, hp: hps[1] }) : null);
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
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative w-screen h-screen bg-zinc-900 flex items-center justify-center select-none">
      {/* Game Container */}
      <div className="relative">
        <GameCanvas 
          gameState={gameState}
          playerCount={playerCount}
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
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white z-10 rounded-lg">
            <h1 className="text-6xl font-bold mb-2 text-red-600 tracking-tighter">僵尸危机 3</h1>
            <h2 className="text-2xl mb-8 text-gray-300">BOXHEAD: ZOMBIE WARS</h2>
            
            {isMobile && (
               <button 
                 onClick={requestFullScreen}
                 className="absolute top-4 right-4 p-3 bg-gray-800/50 border border-white/20 rounded-full text-white active:scale-95 transition-all"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
               </button>
            )}

            <div className="space-y-4 text-center flex flex-col items-center">
              <button 
                onClick={() => handleStart(1)}
                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xl uppercase tracking-widest transition-colors border-2 border-red-800 w-64"
              >
                单人游戏 (1P)
              </button>
              <button 
                onClick={() => handleStart(2)}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl uppercase tracking-widest transition-colors border-2 border-blue-800 w-64"
              >
                双人合作 (2P)
              </button>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold text-xl uppercase tracking-widest transition-colors border-2 border-gray-500 w-64"
              >
                按键设置
              </button>
              <div className="text-sm text-gray-400 mt-8 space-y-1 font-mono">
                <p>1P: WASD + Space (攻击) + 1-5</p>
                <p>2P: Arrows + Numpad 0 (攻击) + Num 1-5</p>
              </div>
            </div>
          </div>
        )}

        {/* Pause Menu */}
        {gameState === GameState.PAUSED && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white z-10 rounded-lg backdrop-blur-sm">
            <h1 className="text-5xl font-bold mb-8 text-yellow-400 tracking-wider">游戏暂停</h1>
            
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => setGameState(GameState.PLAYING)}
                className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold text-xl border-2 border-green-400 min-w-[200px] shadow-lg"
              >
                继续游戏 (Resume)
              </button>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold text-xl border-2 border-gray-500 min-w-[200px]"
              >
                按键设置 (Settings)
              </button>
              <button 
                onClick={() => setGameState(GameState.MENU)}
                className="px-8 py-3 bg-red-900 hover:bg-red-800 text-white font-bold text-xl border-2 border-red-700 min-w-[200px]"
              >
                退出游戏 (Quit)
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
        />

        {/* Game Over Screen */}
        {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 bg-red-900/90 flex flex-col items-center justify-center text-white z-10 rounded-lg">
            <h1 className="text-5xl font-bold mb-4">游戏结束</h1>
            <p className="text-2xl mb-8">最终得分: {finalScore}</p>
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => handleStart(playerCount)}
                className="px-8 py-3 bg-black hover:bg-gray-800 text-white font-bold text-xl border-2 border-white min-w-[200px]"
              >
                再试一次 (Try Again)
              </button>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold text-xl border-2 border-gray-500 min-w-[200px]"
              >
                按键设置 (Settings)
              </button>
              <button 
                onClick={() => setGameState(GameState.MENU)}
                className="px-8 py-3 bg-red-800 hover:bg-red-700 text-white font-bold text-xl border-2 border-red-600 min-w-[200px]"
              >
                退出游戏 (Quit)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
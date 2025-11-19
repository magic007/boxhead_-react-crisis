import React, { useState, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import UIOverlay from './components/UIOverlay';
import { GameState, WeaponType } from './types';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [hp, setHp] = useState(100);
  const [weapon, setWeapon] = useState<string>(WeaponType.PISTOL);
  const [ammo, setAmmo] = useState(-1);
  const [finalScore, setFinalScore] = useState(0);

  const handleStart = useCallback(() => {
    setScore(0);
    setMultiplier(1);
    setHp(100);
    setGameState(GameState.PLAYING);
  }, []);

  const handleGameOver = useCallback((final: number) => {
    setFinalScore(final);
    setGameState(GameState.GAME_OVER);
  }, []);

  const handleScoreUpdate = useCallback((s: number, m: number) => {
    setScore(s);
    setMultiplier(m);
  }, []);

  const handleHealthUpdate = useCallback((h: number) => {
    setHp(h);
  }, []);

  const handleAmmoUpdate = useCallback((w: string, a: number) => {
    setWeapon(w);
    setAmmo(a);
  }, []);

  return (
    <div className="relative w-screen h-screen bg-zinc-900 flex items-center justify-center select-none">
      {/* Game Container */}
      <div className="relative">
        <GameCanvas 
          gameState={gameState}
          onScoreUpdate={handleScoreUpdate}
          onHealthUpdate={handleHealthUpdate}
          onAmmoUpdate={handleAmmoUpdate}
          onGameOver={handleGameOver}
        />
        
        {gameState === GameState.PLAYING && (
          <UIOverlay 
            score={score} 
            multiplier={multiplier} 
            hp={hp} 
            currentWeapon={weapon}
            ammo={ammo}
          />
        )}

        {/* Main Menu */}
        {gameState === GameState.MENU && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white z-10 rounded-lg">
            <h1 className="text-6xl font-bold mb-2 text-red-600 tracking-tighter">僵尸危机 3</h1>
            <h2 className="text-2xl mb-8 text-gray-300">BOXHEAD: ZOMBIE WARS</h2>
            
            <div className="space-y-4 text-center">
              <button 
                onClick={handleStart}
                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xl uppercase tracking-widest transition-colors border-2 border-red-800"
              >
                开始游戏 (Start Game)
              </button>
              <div className="text-sm text-gray-400 mt-8 space-y-1 font-mono">
                <p>WASD / 方向键 移动</p>
                <p>鼠标 或 J 键 攻击</p>
                <p>按键 1-5 切换武器</p>
              </div>
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 bg-red-900/90 flex flex-col items-center justify-center text-white z-10 rounded-lg">
            <h1 className="text-5xl font-bold mb-4">游戏结束</h1>
            <p className="text-2xl mb-8">最终得分: {finalScore}</p>
            <button 
              onClick={handleStart}
              className="px-8 py-3 bg-black hover:bg-gray-800 text-white font-bold text-xl border-2 border-white"
            >
              再试一次 (Try Again)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
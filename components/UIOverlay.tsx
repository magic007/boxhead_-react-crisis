import React, { useState, useEffect } from 'react';
import { WeaponType } from '../types';
import { getSavedKeyMap, Action, subscribeToKeyMapChange, KeyMap } from './game/inputConfig';

interface PlayerStats {
    hp: number;
    weapon: string;
    ammo: number;
    lives: number;
}

interface UIOverlayProps {
  score: number;
  multiplier: number;
  p1Stats: PlayerStats;
  p2Stats: PlayerStats | null;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ score, multiplier, p1Stats, p2Stats }) => {
  // Only showing P1 keys for now as P2 keymap is static/default or managed elsewhere
  const [keyMapP1, setKeyMapP1] = useState<KeyMap>(getSavedKeyMap(1));

  useEffect(() => {
    return subscribeToKeyMapChange((pid, newMap) => {
        if (pid === 1) setKeyMapP1(newMap);
    });
  }, []);

  const getKeyLabel = (action: Action) => {
      const code = keyMapP1[action];
      if (code.startsWith('Digit')) return code.replace('Digit', '');
      if (code.startsWith('Key')) return code.replace('Key', '');
      if (code.startsWith('Arrow')) return code.replace('Arrow', 'Arr');
      return code;
  };

  const getWeaponName = (type: string) => {
    switch(type) {
      case WeaponType.PISTOL: return '手枪';
      case WeaponType.UZI: return '冲锋枪';
      case WeaponType.SHOTGUN: return '霰弹枪';
      case WeaponType.FAKE_WALL: return '假墙';
      case WeaponType.BARREL: return '油桶';
      case WeaponType.CANNON: return '大炮';
      default: return type;
    }
  };

  const renderPlayerStats = (stats: PlayerStats, label: string, alignRight: boolean = false) => {
      const isLowHealth = stats.hp <= 20;
      const isCriticalHealth = stats.hp <= 10;
      
      return (
        <div className={`flex flex-col gap-0.5 md:gap-1.5 text-white ${alignRight ? 'items-end text-right' : 'items-start'}`}>
            {/* 玩家标签 */}
            <div className="font-bold text-[10px] md:text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] bg-black/20 px-1 md:px-2 py-0.5 rounded">
              {label}
            </div>
            
            {/* 血条 - 低血量时添加动画效果 */}
            <div className={`w-16 md:w-48 h-3 md:h-6 bg-black/40 rounded shadow-lg transition-all ${
              isCriticalHealth 
                ? 'border border-red-500 md:border-2 animate-pulse shadow-red-500/50 shadow-2xl' 
                : isLowHealth 
                  ? 'border border-red-400/80 md:border-2 animate-pulse' 
                  : 'border border-white/80 md:border-2'
            }`}>
              <div 
                className={`h-full transition-all duration-200 ${
                  stats.hp > 50 ? 'bg-green-500' : 
                  stats.hp > 20 ? 'bg-yellow-500' : 
                  'bg-red-600 animate-pulse'
                }`} 
                style={{ width: `${Math.max(0, stats.hp)}%` }}
              />
            </div>
            
            {/* 生命数量 - 低血量时突出显示 */}
            <div className={`bg-black/30 px-1 md:px-2.5 py-0.5 md:py-1 rounded transition-all ${
              isCriticalHealth 
                ? 'border border-red-600 md:border-2 shadow-lg shadow-red-500/50 animate-pulse' 
                : 'border border-red-500/80 md:border-2'
            }`}>
                <div className="text-[10px] md:text-sm text-white font-bold flex items-center gap-0.5 md:gap-1.5">
                  <span className={`text-xs md:text-base ${isCriticalHealth ? 'animate-bounce' : ''}`}>❤️</span>
                  <span className={`text-xs md:text-lg font-mono ${
                    isCriticalHealth ? 'text-red-400 font-black' : 'text-red-300'
                  }`}>{stats.lives}</span>
                </div>
            </div>
            
            {/* 武器和弹药信息 - 紧凑显示 */}
            <div className="bg-black/30 px-1 md:px-2.5 py-0.5 md:py-1 rounded border border-cyan-500/60">
                <div className="text-[10px] md:text-sm font-bold text-white">{getWeaponName(stats.weapon)}</div>
                <div className="text-xs md:text-xl font-mono text-cyan-300 font-bold">
                  {stats.ammo === -1 ? '∞' : stats.ammo}
                </div>
            </div>
        </div>
      );
  };

  // Weapon Icons (SVG)
  const WeaponIcon = ({ type, active }: { type: string, active: boolean }) => {
    const color = active ? "#fbbf24" : "#9ca3af"; // yellow-400 : gray-400
    const fill = active ? "rgba(251, 191, 36, 0.2)" : "transparent";
    
    switch(type) {
      case WeaponType.PISTOL:
        return (
          <svg width="32" height="32" viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {/* Handle */}
            <path d="M6 12h4v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-7z" fill={fill} />
            {/* Body */}
            <path d="M6 8h12v4H6z" fill={fill} />
            {/* Barrel Tip */}
            <path d="M18 9h2v2h-2z" />
            {/* Trigger Guard */}
            <path d="M10 12v3h2" />
            {/* Detail */}
            <line x1="8" y1="10" x2="14" y2="10" strokeWidth="0.5" />
          </svg>
        );
      case WeaponType.UZI:
        return (
          <svg width="32" height="32" viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
             {/* Main Body */}
             <rect x="4" y="7" width="12" height="7" rx="1" fill={fill} />
             {/* Barrel */}
             <line x1="16" y1="9" x2="20" y2="9" strokeWidth="2" />
             {/* Handle/Mag */}
             <path d="M8 14l-1 5h3l1-5" fill={fill} />
             {/* Stock (Folded) */}
             <path d="M4 9c-1 0-2 1-2 3v3" strokeWidth="1" />
             {/* Vents */}
             <line x1="7" y1="9" x2="7" y2="12" strokeWidth="0.5" />
             <line x1="10" y1="9" x2="10" y2="12" strokeWidth="0.5" />
             <line x1="13" y1="9" x2="13" y2="12" strokeWidth="0.5" />
          </svg>
        );
      case WeaponType.SHOTGUN:
        return (
          <svg width="32" height="32" viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {/* Stock */}
            <path d="M3 15c0-1 2-3 4-3h2v6H5c-1 0-2-2-2-3z" fill={fill} />
            {/* Body */}
            <rect x="9" y="12" width="12" height="3" fill={fill} />
            {/* Barrel */}
            <line x1="21" y1="13" x2="23" y2="13" strokeWidth="2" />
            {/* Pump */}
            <rect x="13" y="15" width="5" height="2" rx="0.5" fill={fill} />
            {/* Ribs on pump */}
            <line x1="14" y1="15" x2="14" y2="17" strokeWidth="0.5" />
            <line x1="15" y1="15" x2="15" y2="17" strokeWidth="0.5" />
            <line x1="16" y1="15" x2="16" y2="17" strokeWidth="0.5" />
          </svg>
        );
      case WeaponType.FAKE_WALL:
        return (
          <svg width="32" height="32" viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {/* Box */}
            <rect x="4" y="6" width="16" height="12" rx="1" fill={fill} />
            {/* 3D Top */}
            <path d="M4 6l3-3h16l-3 3" strokeWidth="1" />
            <path d="M20 6v12l3-3V3l-3 3" strokeWidth="1" />
            {/* Bricks */}
            <line x1="4" y1="10" x2="20" y2="10" />
            <line x1="4" y1="14" x2="20" y2="14" />
            <line x1="10" y1="6" x2="10" y2="10" />
            <line x1="14" y1="10" x2="14" y2="14" />
            <line x1="8" y1="14" x2="8" y2="18" />
            <line x1="16" y1="14" x2="16" y2="18" />
          </svg>
        );
      case WeaponType.BARREL:
        return (
           <svg width="32" height="32" viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {/* Barrel Body */}
            <path d="M6 5v14c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V5" fill={fill} />
            {/* Top Rim */}
            <ellipse cx="12" cy="5" rx="6" ry="2" />
            {/* Ribs */}
            <path d="M6 9c0 1.1 2.7 2 6 2s6-.9 6-2" />
            <path d="M6 14c0 1.1 2.7 2 6 2s6-.9 6-2" />
            {/* Flame Icon */}
            <path d="M12 13c0-2 1-2 1-3s-1-1-1-1-1 0-1 1 1 1 1 3z" fill={color} stroke="none" transform="scale(1.5) translate(-4, -2)" />
           </svg>
        );
      case WeaponType.CANNON:
        return (
          <svg width="32" height="32" viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
             {/* Wheel */}
             <circle cx="8" cy="17" r="3" fill={fill} />
             {/* Barrel */}
             <path d="M6 12l2-4h10l2 2v4l-2 2H8l-2-4z" fill={fill} />
             {/* Stand */}
             <path d="M8 17l4-5" />
             {/* Highlight */}
             <path d="M10 9h6" strokeWidth="0.5" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed top-6 md:top-4 left-0 right-0 flex justify-between px-1.5 md:px-8 pointer-events-none w-full max-w-[1200px] mx-auto z-50">
      {/* P1 Stats */}
      {renderPlayerStats(p1Stats, "P1 生命值")}

      {/* Center: Score */}
      <div className="text-center flex-shrink-0 mx-0.5 md:mx-0">
        <div className="text-sm md:text-4xl font-mono font-bold text-white tracking-wide md:tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
          {score.toString().padStart(9, '0')}
        </div>
        {multiplier > 1 && (
          <div className="text-yellow-400 text-xs md:text-2xl font-bold animate-pulse mt-0.5 md:mt-1">
             x{multiplier} 连击!
          </div>
        )}
      </div>

      {/* P2 Stats or Empty */}
      {p2Stats ? (
          renderPlayerStats(p2Stats, "P2 生命值", true)
      ) : (
          <div className="w-16 md:w-48" /> // Spacer
      )}

      {/* Bottom: Weapon Hints (Only P1 for now to save space) - Hidden on mobile */}
      {!p2Stats && (
      <div className="hidden md:flex absolute bottom-[-520px] left-1/2 -translate-x-1/2 gap-2 whitespace-nowrap">
         {[
           { type: WeaponType.PISTOL, action: Action.WEAPON_PISTOL, name: '手枪' },
           { type: WeaponType.UZI, action: Action.WEAPON_UZI, name: '冲锋枪' },
           { type: WeaponType.SHOTGUN, action: Action.WEAPON_SHOTGUN, name: '霰弹枪' },
           { type: WeaponType.FAKE_WALL, action: Action.WEAPON_WALL, name: '假墙' },
           { type: WeaponType.BARREL, action: Action.WEAPON_BARREL, name: '油桶' },
           { type: WeaponType.CANNON, action: Action.WEAPON_CANNON, name: '大炮' }
         ].map(w => {
           const isActive = p1Stats.weapon === w.type;
           return (
            <div key={w.type} className={`flex flex-col items-center bg-gray-900/80 px-3 py-2 border rounded-lg transition-all ${isActive ? 'border-yellow-400 scale-110 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'border-gray-600 opacity-70'}`}>
              <div className="mb-1">
                <WeaponIcon type={w.type} active={isActive} />
              </div>
              <div className={`text-xs font-bold ${isActive ? 'text-yellow-400' : 'text-gray-400'}`}>
                {w.name}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                [{getKeyLabel(w.action)}]
              </div>
            </div>
           );
         })}
         
         <div className="flex flex-col items-center bg-red-900/80 px-3 py-2 border border-red-500 rounded-lg ml-4">
             <div className="mb-1 text-red-400">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <circle cx="12" cy="12" r="10" />
                 <line x1="12" y1="8" x2="12" y2="16" />
                 <line x1="8" y1="12" x2="16" y2="12" />
               </svg>
             </div>
             <div className="text-xs font-bold text-red-200">攻击</div>
             <div className="text-[10px] text-red-300 mt-0.5">[{getKeyLabel(Action.SHOOT)}]</div>
         </div>
      </div>
      )}
    </div>
  );
};

export default UIOverlay;
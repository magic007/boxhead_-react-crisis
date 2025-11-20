import React, { useState, useEffect } from 'react';
import { WeaponType } from '../types';
import { getSavedKeyMap, Action, subscribeToKeyMapChange, KeyMap } from './game/inputConfig';

interface PlayerStats {
    hp: number;
    weapon: string;
    ammo: number;
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
      return (
        <div className={`flex flex-col gap-2 text-white ${alignRight ? 'items-end text-right' : 'items-start'}`}>
            <div className="font-bold text-xl drop-shadow-md">{label} (HP)</div>
            <div className="w-48 h-6 bg-gray-800 border-2 border-white">
              <div 
                className={`h-full transition-all duration-200 ${stats.hp > 50 ? 'bg-green-500' : stats.hp > 20 ? 'bg-yellow-500' : 'bg-red-600'}`} 
                style={{ width: `${Math.max(0, stats.hp)}%` }}
              />
            </div>
            <div className="mt-1">
                <div className="text-lg font-bold">{getWeaponName(stats.weapon)}</div>
                <div className="text-2xl font-mono">{stats.ammo === -1 ? '∞' : stats.ammo}</div>
            </div>
        </div>
      );
  };

  return (
    <div className="absolute top-4 left-0 right-0 flex justify-between px-8 pointer-events-none w-full max-w-[1200px] mx-auto">
      {/* P1 Stats */}
      {renderPlayerStats(p1Stats, "P1 生命值")}

      {/* Center: Score */}
      <div className="text-center">
        <div className="text-4xl font-mono font-bold text-white tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
          {score.toString().padStart(9, '0')}
        </div>
        {multiplier > 1 && (
          <div className="text-yellow-400 text-2xl font-bold animate-pulse mt-1">
             x{multiplier} 连击!
          </div>
        )}
      </div>

      {/* P2 Stats or Empty */}
      {p2Stats ? (
          renderPlayerStats(p2Stats, "P2 生命值", true)
      ) : (
          <div className="w-48" /> // Spacer
      )}

      {/* Bottom: Weapon Hints (Only P1 for now to save space) */}
      {!p2Stats && (
      <div className="absolute bottom-[-520px] left-1/2 -translate-x-1/2 flex gap-2 whitespace-nowrap">
         <div className={`bg-gray-900/80 px-2 py-1 text-xs border ${p1Stats.weapon === WeaponType.PISTOL ? 'border-yellow-400 text-yellow-400' : 'border-gray-500 text-gray-500'}`}>
           [{getKeyLabel(Action.WEAPON_PISTOL)}] 手枪
         </div>
         <div className={`bg-gray-900/80 px-2 py-1 text-xs border ${p1Stats.weapon === WeaponType.UZI ? 'border-yellow-400 text-yellow-400' : 'border-gray-500 text-gray-500'}`}>
           [{getKeyLabel(Action.WEAPON_UZI)}] 冲锋枪
         </div>
         <div className={`bg-gray-900/80 px-2 py-1 text-xs border ${p1Stats.weapon === WeaponType.SHOTGUN ? 'border-yellow-400 text-yellow-400' : 'border-gray-500 text-gray-500'}`}>
           [{getKeyLabel(Action.WEAPON_SHOTGUN)}] 霰弹枪
         </div>
         <div className={`bg-gray-900/80 px-2 py-1 text-xs border ${p1Stats.weapon === WeaponType.FAKE_WALL ? 'border-yellow-400 text-yellow-400' : 'border-gray-500 text-gray-500'}`}>
           [{getKeyLabel(Action.WEAPON_WALL)}] 假墙
         </div>
         <div className={`bg-gray-900/80 px-2 py-1 text-xs border ${p1Stats.weapon === WeaponType.BARREL ? 'border-yellow-400 text-yellow-400' : 'border-gray-500 text-gray-500'}`}>
           [{getKeyLabel(Action.WEAPON_BARREL)}] 油桶
         </div>
         <div className={`bg-gray-900/80 px-2 py-1 text-xs border ${p1Stats.weapon === WeaponType.CANNON ? 'border-yellow-400 text-yellow-400' : 'border-gray-500 text-gray-500'}`}>
           [{getKeyLabel(Action.WEAPON_CANNON)}] 大炮
         </div>
         <div className="bg-red-900/80 px-2 py-1 text-xs border border-red-500 text-red-200 ml-4">
           [{getKeyLabel(Action.SHOOT)}] 攻击
         </div>
      </div>
      )}
    </div>
  );
};

export default UIOverlay;
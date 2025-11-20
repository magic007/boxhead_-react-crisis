import React, { useState, useEffect } from 'react';
import { WeaponType } from '../types';
import { getSavedKeyMap, Action, subscribeToKeyMapChange, KeyMap } from './game/inputConfig';

interface UIOverlayProps {
  score: number;
  multiplier: number;
  hp: number;
  currentWeapon: string;
  ammo: number;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ score, multiplier, hp, currentWeapon, ammo }) => {
  const [keyMap, setKeyMap] = useState<KeyMap>(getSavedKeyMap());

  useEffect(() => {
    return subscribeToKeyMapChange((newMap) => setKeyMap(newMap));
  }, []);

  const getKeyLabel = (action: Action) => {
      const code = keyMap[action];
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
      case WeaponType.FAKE_WALL: return '假墙 (脚下)';
      case WeaponType.BARREL: return '油桶 (脚下)';
      default: return type;
    }
  };

  return (
    <div className="absolute top-4 left-0 right-0 flex justify-between px-8 pointer-events-none w-[800px] mx-auto">
      {/* 左侧: 生命值 */}
      <div className="flex flex-col gap-2">
        <div className="text-white font-bold text-xl drop-shadow-md">生命值 (HEALTH)</div>
        <div className="w-48 h-6 bg-gray-800 border-2 border-white">
          <div 
            className={`h-full transition-all duration-200 ${hp > 50 ? 'bg-green-500' : hp > 20 ? 'bg-yellow-500' : 'bg-red-600'}`} 
            style={{ width: `${Math.max(0, hp)}%` }}
          />
        </div>
      </div>

      {/* 中间: 分数 */}
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

      {/* 右侧: 武器 */}
      <div className="text-right text-white">
        <div className="text-xl font-bold mb-1">{getWeaponName(currentWeapon)}</div>
        <div className="text-3xl font-mono">
          {ammo === -1 ? '∞' : ammo}
        </div>
      </div>

      {/* 底部: 武器选择提示 */}
      <div className="absolute bottom-[-520px] left-1/2 -translate-x-1/2 flex gap-2">
         <div className={`bg-gray-900/80 px-2 py-1 text-xs border ${currentWeapon === WeaponType.PISTOL ? 'border-yellow-400 text-yellow-400' : 'border-gray-500 text-gray-500'}`}>
           [{getKeyLabel(Action.WEAPON_PISTOL)}] 手枪
         </div>
         <div className={`bg-gray-900/80 px-2 py-1 text-xs border ${currentWeapon === WeaponType.UZI ? 'border-yellow-400 text-yellow-400' : 'border-gray-500 text-gray-500'}`}>
           [{getKeyLabel(Action.WEAPON_UZI)}] 冲锋枪
         </div>
         <div className={`bg-gray-900/80 px-2 py-1 text-xs border ${currentWeapon === WeaponType.SHOTGUN ? 'border-yellow-400 text-yellow-400' : 'border-gray-500 text-gray-500'}`}>
           [{getKeyLabel(Action.WEAPON_SHOTGUN)}] 霰弹枪
         </div>
         <div className={`bg-gray-900/80 px-2 py-1 text-xs border ${currentWeapon === WeaponType.FAKE_WALL ? 'border-yellow-400 text-yellow-400' : 'border-gray-500 text-gray-500'}`}>
           [{getKeyLabel(Action.WEAPON_WALL)}] 假墙
         </div>
         <div className={`bg-gray-900/80 px-2 py-1 text-xs border ${currentWeapon === WeaponType.BARREL ? 'border-yellow-400 text-yellow-400' : 'border-gray-500 text-gray-500'}`}>
           [{getKeyLabel(Action.WEAPON_BARREL)}] 油桶
         </div>
         <div className="bg-red-900/80 px-2 py-1 text-xs border border-red-500 text-red-200 ml-4">
           [{getKeyLabel(Action.SHOOT)}] 攻击 / 放置
         </div>
      </div>
    </div>
  );
};

export default UIOverlay;
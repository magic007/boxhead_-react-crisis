import React, { useEffect, useRef, useState } from 'react';
import { WeaponType } from '../types';
import { Action, getSavedKeyMap } from './game/inputConfig';

interface VirtualControlsProps {
  currentWeapon: string;
}

export const VirtualControls: React.FC<VirtualControlsProps> = ({ currentWeapon }) => {
  const weaponSwitchRef = useRef<HTMLButtonElement>(null);

  // Prevent context menu on long press
  useEffect(() => {
    const handleContextMenu = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // Add non-passive touch event listener for weapon switch button
  useEffect(() => {
    const button = weaponSwitchRef.current;
    if (!button) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Determine next weapon key based on current weapon
      let nextAction = Action.WEAPON_PISTOL;
      
      switch (currentWeapon) {
        case WeaponType.PISTOL:
          nextAction = Action.WEAPON_UZI;
          break;
        case WeaponType.UZI:
          nextAction = Action.WEAPON_SHOTGUN;
          break;
        case WeaponType.SHOTGUN:
          nextAction = Action.WEAPON_WALL;
          break;
        case WeaponType.FAKE_WALL:
          nextAction = Action.WEAPON_BARREL;
          break;
        case WeaponType.BARREL:
          nextAction = Action.WEAPON_PISTOL;
          break;
        default:
          nextAction = Action.WEAPON_PISTOL;
      }

      const keyMap = getSavedKeyMap(1);
      const code = keyMap[nextAction];

      // Press and release quickly
      window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
      setTimeout(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
      }, 100);
    };

    button.addEventListener('touchstart', handleTouchStart, { passive: false });
    return () => {
      button.removeEventListener('touchstart', handleTouchStart);
    };
  }, [currentWeapon]);

  const getKeyForAction = (action: Action) => {
    const keyMap = getSavedKeyMap(1);
    return keyMap[action];
  }

  const simulateKey = (code: string, type: 'keydown' | 'keyup') => {
    window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
  };

  const handleTouchStart = (action: Action) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    const code = getKeyForAction(action);
    simulateKey(code, 'keydown');
  };

  const handleTouchEnd = (action: Action) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const code = getKeyForAction(action);
    simulateKey(code, 'keyup');
  };

  const handleWeaponSwitch = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Determine next weapon key based on current weapon
    let nextAction = Action.WEAPON_PISTOL;
    
    switch (currentWeapon) {
      case WeaponType.PISTOL:
        nextAction = Action.WEAPON_UZI;
        break;
      case WeaponType.UZI:
        nextAction = Action.WEAPON_SHOTGUN;
        break;
      case WeaponType.SHOTGUN:
        nextAction = Action.WEAPON_WALL;
        break;
      case WeaponType.FAKE_WALL:
        nextAction = Action.WEAPON_BARREL;
        break;
      case WeaponType.BARREL:
        nextAction = Action.WEAPON_PISTOL;
        break;
      default:
        nextAction = Action.WEAPON_PISTOL;
    }

    const code = getKeyForAction(nextAction);

    // Press and release quickly
    simulateKey(code, 'keydown');
    setTimeout(() => simulateKey(code, 'keyup'), 100);
  };

  // Layout:
  // Left bottom: D-Pad (Up, Down, Left, Right)
  // Right bottom: Attack (Large), Switch (Small)

  const btnBaseClass = "active:scale-95 transition-transform select-none touch-manipulation backdrop-blur-sm bg-white/10 border-2 border-white/30 rounded-lg flex items-center justify-center text-white shadow-lg";

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-[100] flex flex-col justify-end px-8 select-none"
      style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
    >
      <div className="flex justify-between items-end w-full pointer-events-auto">
        
        {/* D-Pad */}
        <div className="relative w-40 h-40 bg-black/20 rounded-full backdrop-blur-sm border border-white/10">
            {/* Up */}
            <button
              className={`${btnBaseClass} absolute top-2 left-1/2 -translate-x-1/2 w-12 h-12 rounded-t-xl`}
              onTouchStart={handleTouchStart(Action.MOVE_UP)}
              onTouchEnd={handleTouchEnd(Action.MOVE_UP)}
              onMouseDown={handleTouchStart(Action.MOVE_UP)}
              onMouseUp={handleTouchEnd(Action.MOVE_UP)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
            </button>
            
            {/* Down */}
            <button
              className={`${btnBaseClass} absolute bottom-2 left-1/2 -translate-x-1/2 w-12 h-12 rounded-b-xl`}
              onTouchStart={handleTouchStart(Action.MOVE_DOWN)}
              onTouchEnd={handleTouchEnd(Action.MOVE_DOWN)}
              onMouseDown={handleTouchStart(Action.MOVE_DOWN)}
              onMouseUp={handleTouchEnd(Action.MOVE_DOWN)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            
            {/* Left */}
            <button
              className={`${btnBaseClass} absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-l-xl`}
              onTouchStart={handleTouchStart(Action.MOVE_LEFT)}
              onTouchEnd={handleTouchEnd(Action.MOVE_LEFT)}
              onMouseDown={handleTouchStart(Action.MOVE_LEFT)}
              onMouseUp={handleTouchEnd(Action.MOVE_LEFT)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            
            {/* Right */}
            <button
              className={`${btnBaseClass} absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-r-xl`}
              onTouchStart={handleTouchStart(Action.MOVE_RIGHT)}
              onTouchEnd={handleTouchEnd(Action.MOVE_RIGHT)}
              onMouseDown={handleTouchStart(Action.MOVE_RIGHT)}
              onMouseUp={handleTouchEnd(Action.MOVE_RIGHT)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>

            {/* Center Deadzone (Visual only) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white/10 rounded-full" />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-end gap-4 mb-2">
          {/* Weapon Switch */}
          <button
            ref={weaponSwitchRef}
            className={`${btnBaseClass} w-14 h-14 rounded-full bg-yellow-500/20 border-yellow-400/50 text-yellow-200`}
            onMouseDown={handleWeaponSwitch}
          >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>

          {/* Attack */}
          <button
            className={`${btnBaseClass} w-20 h-20 rounded-full bg-red-600/30 border-red-500/50 text-red-200`}
            onTouchStart={handleTouchStart(Action.SHOOT)}
            onTouchEnd={handleTouchEnd(Action.SHOOT)}
            onMouseDown={handleTouchStart(Action.SHOOT)}
            onMouseUp={handleTouchEnd(Action.SHOOT)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834-1.385l-1.25 1.25M6.166 3.115l1.25 1.25" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
};


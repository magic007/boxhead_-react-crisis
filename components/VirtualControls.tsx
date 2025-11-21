import React, { useEffect, useRef, useState } from 'react';
import { WeaponType } from '../types';
import { Action, getSavedKeyMap } from './game/inputConfig';

interface VirtualControlsProps {
  currentWeapon: string;
}

export const VirtualControls: React.FC<VirtualControlsProps> = ({ currentWeapon }) => {
  const weaponSwitchRef = useRef<HTMLButtonElement>(null);
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPosition, setJoystickPosition] = useState({ x: 0, y: 0 });
  const activeKeysRef = useRef<Set<Action>>(new Set());
  const joystickTouchIdRef = useRef<number | null>(null); // 跟踪摇杆的触摸点ID

  // Prevent context menu on long press
  useEffect(() => {
    const handleContextMenu = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // Cleanup: release all keys when component unmounts
  useEffect(() => {
    return () => {
      activeKeysRef.current.forEach(action => {
        const code = getKeyForAction(action);
        simulateKey(code, 'keyup');
      });
      activeKeysRef.current.clear();
    };
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
          nextAction = Action.WEAPON_CANNON;
          break;
        case WeaponType.CANNON:
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

  // Joystick handlers
  const getJoystickCenter = () => {
    if (!joystickRef.current) return { x: 0, y: 0 };
    const rect = joystickRef.current.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  };

  const updateJoystickPosition = (clientX: number, clientY: number) => {
    const center = getJoystickCenter();
    const maxRadius = 60; // 最大拖拽半径
    
    let dx = clientX - center.x;
    let dy = clientY - center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 限制在最大半径内
    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }
    
    setJoystickPosition({ x: dx, y: dy });
    
    // 计算移动方向并发送按键事件
    const deadzone = 8; // 死区，避免轻微移动
    const threshold = maxRadius * 0.25; // 25% 的阈值，用于判断是否在对角线区域
    
    // 清除之前的按键
    activeKeysRef.current.forEach(action => {
      const code = getKeyForAction(action);
      simulateKey(code, 'keyup');
    });
    activeKeysRef.current.clear();
    
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    
    // 如果移动距离超过死区
    if (distance > deadzone) {
      // 判断是否在对角线区域（两个方向都超过阈值）
      const isDiagonal = absX > threshold && absY > threshold;
      
      if (isDiagonal) {
        // 对角线移动：同时按下两个方向键
        if (dx > 0) {
          activeKeysRef.current.add(Action.MOVE_RIGHT);
          simulateKey(getKeyForAction(Action.MOVE_RIGHT), 'keydown');
        } else {
          activeKeysRef.current.add(Action.MOVE_LEFT);
          simulateKey(getKeyForAction(Action.MOVE_LEFT), 'keydown');
        }
        
        if (dy > 0) {
          activeKeysRef.current.add(Action.MOVE_DOWN);
          simulateKey(getKeyForAction(Action.MOVE_DOWN), 'keydown');
        } else {
          activeKeysRef.current.add(Action.MOVE_UP);
          simulateKey(getKeyForAction(Action.MOVE_UP), 'keydown');
        }
      } else {
        // 单一方向移动：选择主要方向
        if (absX > absY) {
          // 水平方向为主
          if (dx > deadzone) {
            activeKeysRef.current.add(Action.MOVE_RIGHT);
            simulateKey(getKeyForAction(Action.MOVE_RIGHT), 'keydown');
          } else if (dx < -deadzone) {
            activeKeysRef.current.add(Action.MOVE_LEFT);
            simulateKey(getKeyForAction(Action.MOVE_LEFT), 'keydown');
          }
        } else {
          // 垂直方向为主
          if (dy > deadzone) {
            activeKeysRef.current.add(Action.MOVE_DOWN);
            simulateKey(getKeyForAction(Action.MOVE_DOWN), 'keydown');
          } else if (dy < -deadzone) {
            activeKeysRef.current.add(Action.MOVE_UP);
            simulateKey(getKeyForAction(Action.MOVE_UP), 'keydown');
          }
        }
      }
    }
  };

  const handleJoystickStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if ('changedTouches' in e && e.changedTouches.length > 0) {
      // 触摸事件：使用 changedTouches 获取当前触摸点（而不是 touches[0]，避免误用其他按钮的触摸点）
      const touch = e.changedTouches[0];
      joystickTouchIdRef.current = touch.identifier;
      setJoystickActive(true);
      updateJoystickPosition(touch.clientX, touch.clientY);
    } else if (!('touches' in e)) {
      // 鼠标事件
      joystickTouchIdRef.current = -1; // 使用-1表示鼠标
      setJoystickActive(true);
      updateJoystickPosition(e.clientX, e.clientY);
    }
  };

  const handleJoystickMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!joystickActive) return;
    e.preventDefault();
    e.stopPropagation();
    
    if ('touches' in e && e.touches.length > 0) {
      // 触摸事件：只处理摇杆的触摸点
      const touchId = joystickTouchIdRef.current;
      if (touchId !== null) {
        const touch = Array.from(e.touches as TouchList).find((t: Touch) => t.identifier === touchId);
        if (touch) {
          updateJoystickPosition(touch.clientX, touch.clientY);
        }
      }
    } else {
      // 鼠标事件
      updateJoystickPosition(e.clientX, e.clientY);
    }
  };

  const handleJoystickEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if ('touches' in e) {
      // 触摸事件：检查是否是摇杆的触摸点结束
      const touchId = joystickTouchIdRef.current;
      if (touchId !== null) {
        // 检查这个触摸点是否还在touches列表中
        const stillActive = Array.from(e.touches as TouchList).some((t: Touch) => t.identifier === touchId);
        if (!stillActive) {
          // 摇杆的触摸点已结束
          setJoystickActive(false);
          setJoystickPosition({ x: 0, y: 0 });
          joystickTouchIdRef.current = null;
          
          // 释放所有按键
          activeKeysRef.current.forEach(action => {
            const code = getKeyForAction(action);
            simulateKey(code, 'keyup');
          });
          activeKeysRef.current.clear();
        }
      }
    } else {
      // 鼠标事件
      setJoystickActive(false);
      setJoystickPosition({ x: 0, y: 0 });
      joystickTouchIdRef.current = null;
      
      // 释放所有按键
      activeKeysRef.current.forEach(action => {
        const code = getKeyForAction(action);
        simulateKey(code, 'keyup');
      });
      activeKeysRef.current.clear();
    }
  };

  // 全局触摸移动和结束事件处理
  useEffect(() => {
    if (!joystickActive) return;

    const handleGlobalMove = (e: TouchEvent | MouseEvent) => {
      if (!joystickActive) return;
      
      if ('touches' in e) {
        // 触摸事件：只处理摇杆的触摸点
        const touchId = joystickTouchIdRef.current;
        if (touchId !== null) {
          const touch = Array.from(e.touches as TouchList).find((t: Touch) => t.identifier === touchId);
          if (touch) {
            e.preventDefault();
            updateJoystickPosition(touch.clientX, touch.clientY);
          }
        }
      } else {
        // 鼠标事件
        e.preventDefault();
        updateJoystickPosition(e.clientX, e.clientY);
      }
    };

    const handleGlobalEnd = (e: TouchEvent | MouseEvent) => {
      if (!joystickActive) return;
      
      if ('touches' in e) {
        // 触摸事件：检查是否是摇杆的触摸点结束
        const touchId = joystickTouchIdRef.current;
        if (touchId !== null) {
          // 检查这个触摸点是否还在touches列表中
          const stillActive = Array.from(e.touches as TouchList).some((t: Touch) => t.identifier === touchId);
          if (!stillActive) {
            // 摇杆的触摸点已结束
            e.preventDefault();
            setJoystickActive(false);
            setJoystickPosition({ x: 0, y: 0 });
            joystickTouchIdRef.current = null;
            
            // 释放所有按键
            activeKeysRef.current.forEach(action => {
              const code = getKeyForAction(action);
              simulateKey(code, 'keyup');
            });
            activeKeysRef.current.clear();
          }
        }
      } else {
        // 鼠标事件
        e.preventDefault();
        setJoystickActive(false);
        setJoystickPosition({ x: 0, y: 0 });
        joystickTouchIdRef.current = null;
        
        // 释放所有按键
        activeKeysRef.current.forEach(action => {
          const code = getKeyForAction(action);
          simulateKey(code, 'keyup');
        });
        activeKeysRef.current.clear();
      }
    };

    window.addEventListener('touchmove', handleGlobalMove, { passive: false });
    window.addEventListener('touchend', handleGlobalEnd, { passive: false });
    window.addEventListener('touchcancel', handleGlobalEnd, { passive: false });
    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalEnd);

    return () => {
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalEnd);
      window.removeEventListener('touchcancel', handleGlobalEnd);
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalEnd);
    };
  }, [joystickActive]);

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
        nextAction = Action.WEAPON_CANNON;
        break;
      case WeaponType.CANNON:
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
        
        {/* Joystick - Drag-style like mobile games */}
        <div 
          ref={joystickRef}
          className="relative w-40 h-40 bg-black/20 rounded-full backdrop-blur-sm border border-white/10 touch-none"
          onTouchStart={handleJoystickStart}
          onTouchMove={handleJoystickMove}
          onTouchEnd={handleJoystickEnd}
          onMouseDown={handleJoystickStart}
          onMouseMove={handleJoystickMove}
          onMouseUp={handleJoystickEnd}
        >
          {/* Joystick Base Circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white/5 rounded-full border border-white/20" />
          
          {/* Joystick Handle - moves with drag */}
          <div 
            className="absolute top-1/2 left-1/2 w-16 h-16 bg-white/20 rounded-full border-2 border-white/40 shadow-lg transition-transform duration-75"
            style={{
              transform: `translate(calc(-50% + ${joystickPosition.x}px), calc(-50% + ${joystickPosition.y}px))`,
              opacity: joystickActive ? 1 : 0.6
            }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white/30 rounded-full" />
          </div>
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


export enum Action {
  MOVE_UP = 'MOVE_UP',
  MOVE_DOWN = 'MOVE_DOWN',
  MOVE_LEFT = 'MOVE_LEFT',
  MOVE_RIGHT = 'MOVE_RIGHT',
  SHOOT = 'SHOOT',
  WEAPON_PISTOL = 'WEAPON_PISTOL',
  WEAPON_UZI = 'WEAPON_UZI',
  WEAPON_SHOTGUN = 'WEAPON_SHOTGUN',
  WEAPON_WALL = 'WEAPON_WALL',
  WEAPON_BARREL = 'WEAPON_BARREL',
  WEAPON_CANNON = 'WEAPON_CANNON',
  WEAPON_SWITCH = 'WEAPON_SWITCH', // 循环切换武器
  PAUSE = 'PAUSE',
}

export type KeyMap = Record<Action, string>;

// 通用按键映射（暂停等全局功能）
export type GlobalKeyMap = {
  [Action.PAUSE]: string;
};

export const DEFAULT_GLOBAL_KEYMAP: GlobalKeyMap = {
  [Action.PAUSE]: 'Escape',
};

export const DEFAULT_KEYMAP_P1: KeyMap = {
  [Action.MOVE_UP]: 'KeyW',
  [Action.MOVE_DOWN]: 'KeyS',
  [Action.MOVE_LEFT]: 'KeyA',
  [Action.MOVE_RIGHT]: 'KeyD',
  [Action.SHOOT]: 'Space',
  [Action.WEAPON_PISTOL]: 'Digit1',
  [Action.WEAPON_UZI]: 'Digit2',
  [Action.WEAPON_SHOTGUN]: 'Digit3',
  [Action.WEAPON_WALL]: 'Digit4',
  [Action.WEAPON_BARREL]: 'Digit5',
  [Action.WEAPON_CANNON]: 'Digit6',
  [Action.WEAPON_SWITCH]: 'KeyQ', // 默认 Q 键循环切换武器
  [Action.PAUSE]: 'Escape', // 保留以兼容旧代码，实际使用全局映射
};

export const DEFAULT_KEYMAP_P2: KeyMap = {
  [Action.MOVE_UP]: 'ArrowUp',
  [Action.MOVE_DOWN]: 'ArrowDown',
  [Action.MOVE_LEFT]: 'ArrowLeft',
  [Action.MOVE_RIGHT]: 'ArrowRight',
  [Action.SHOOT]: 'Numpad0',
  [Action.WEAPON_PISTOL]: 'Numpad1',
  [Action.WEAPON_UZI]: 'Numpad2',
  [Action.WEAPON_SHOTGUN]: 'Numpad3',
  [Action.WEAPON_WALL]: 'Numpad4',
  [Action.WEAPON_BARREL]: 'Numpad5',
  [Action.WEAPON_CANNON]: 'Numpad6',
  [Action.WEAPON_SWITCH]: 'NumpadEnter', // 默认小键盘回车键循环切换武器
  [Action.PAUSE]: 'Escape', // 保留以兼容旧代码，实际使用全局映射
};

export const DEFAULT_KEYMAP_P3: KeyMap = {
  [Action.MOVE_UP]: 'KeyT',
  [Action.MOVE_DOWN]: 'KeyG',
  [Action.MOVE_LEFT]: 'KeyF',
  [Action.MOVE_RIGHT]: 'KeyH',
  [Action.SHOOT]: 'KeyR',
  [Action.WEAPON_PISTOL]: 'KeyY',
  [Action.WEAPON_UZI]: 'KeyU',
  [Action.WEAPON_SHOTGUN]: 'KeyI',
  [Action.WEAPON_WALL]: 'KeyO',
  [Action.WEAPON_BARREL]: 'KeyP',
  [Action.WEAPON_CANNON]: 'KeyBracketLeft',
  [Action.WEAPON_SWITCH]: 'KeyE', // 默认 E 键循环切换武器
  [Action.PAUSE]: 'Escape', // 保留以兼容旧代码，实际使用全局映射
};

export const ACTION_LABELS: Record<Action, string> = {
  [Action.MOVE_UP]: '向上移动',
  [Action.MOVE_DOWN]: '向下移动',
  [Action.MOVE_LEFT]: '向左移动',
  [Action.MOVE_RIGHT]: '向右移动',
  [Action.SHOOT]: '攻击 / 互动',
  [Action.WEAPON_PISTOL]: '选择手枪',
  [Action.WEAPON_UZI]: '选择冲锋枪',
  [Action.WEAPON_SHOTGUN]: '选择霰弹枪',
  [Action.WEAPON_WALL]: '选择假墙',
  [Action.WEAPON_BARREL]: '选择油桶',
  [Action.WEAPON_CANNON]: '选择大炮',
  [Action.WEAPON_SWITCH]: '循环切换武器',
  [Action.PAUSE]: '暂停游戏',
};

export const getSavedKeyMap = (playerId: number = 1): KeyMap => {
  try {
    const key = `boxhead_keymap_p${playerId}`;
    const saved = localStorage.getItem(key);
    let defaultMap: KeyMap;
    if (playerId === 1) {
      defaultMap = DEFAULT_KEYMAP_P1;
    } else if (playerId === 2) {
      defaultMap = DEFAULT_KEYMAP_P2;
    } else {
      defaultMap = DEFAULT_KEYMAP_P3;
    }
    if (saved) {
      return { ...defaultMap, ...JSON.parse(saved) };
    }
    return defaultMap;
  } catch (e) {
    console.error('Failed to load keymap', e);
  }
  if (playerId === 1) return DEFAULT_KEYMAP_P1;
  if (playerId === 2) return DEFAULT_KEYMAP_P2;
  return DEFAULT_KEYMAP_P3;
};

type Listener = (playerId: number, map: KeyMap) => void;
const listeners: Set<Listener> = new Set();

export const subscribeToKeyMapChange = (listener: Listener) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const saveKeyMap = (playerId: number, keyMap: KeyMap) => {
  localStorage.setItem(`boxhead_keymap_p${playerId}`, JSON.stringify(keyMap));
  listeners.forEach(l => l(playerId, keyMap));
};

// 手柄到玩家的映射：gamepadIndex -> playerId
export const getSavedGamepadMapping = (): Record<number, number> => {
  try {
    const saved = localStorage.getItem('boxhead_gamepad_mapping');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load gamepad mapping', e);
  }
  // 默认映射：手柄0 -> 玩家1, 手柄1 -> 玩家2, 手柄2 -> 玩家3
  return { 0: 1, 1: 2, 2: 3 };
};

type GamepadMappingListener = (mapping: Record<number, number>) => void;
const gamepadMappingListeners: Set<GamepadMappingListener> = new Set();

export const subscribeToGamepadMappingChange = (listener: GamepadMappingListener) => {
  gamepadMappingListeners.add(listener);
  return () => { gamepadMappingListeners.delete(listener); };
};

export const saveGamepadMapping = (mapping: Record<number, number>) => {
  localStorage.setItem('boxhead_gamepad_mapping', JSON.stringify(mapping));
  gamepadMappingListeners.forEach(l => l(mapping));
};

// 全局按键映射（暂停等通用功能）
export const getSavedGlobalKeyMap = (): GlobalKeyMap => {
  try {
    const saved = localStorage.getItem('boxhead_global_keymap');
    if (saved) {
      return { ...DEFAULT_GLOBAL_KEYMAP, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load global keymap', e);
  }
  return DEFAULT_GLOBAL_KEYMAP;
};

type GlobalKeyMapListener = (keyMap: GlobalKeyMap) => void;
const globalKeyMapListeners: Set<GlobalKeyMapListener> = new Set();

export const subscribeToGlobalKeyMapChange = (listener: GlobalKeyMapListener) => {
  globalKeyMapListeners.add(listener);
  return () => { globalKeyMapListeners.delete(listener); };
};

export const saveGlobalKeyMap = (keyMap: GlobalKeyMap) => {
  localStorage.setItem('boxhead_global_keymap', JSON.stringify(keyMap));
  globalKeyMapListeners.forEach(l => l(keyMap));
};

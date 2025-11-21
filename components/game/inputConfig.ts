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
  PAUSE = 'PAUSE',
}

export type KeyMap = Record<Action, string>;

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
  [Action.PAUSE]: 'Escape',
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
  [Action.PAUSE]: 'Escape',
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
  [Action.PAUSE]: '暂停游戏',
};

export const getSavedKeyMap = (playerId: number = 1): KeyMap => {
  try {
    const key = `boxhead_keymap_p${playerId}`;
    const saved = localStorage.getItem(key);
    const defaultMap = playerId === 1 ? DEFAULT_KEYMAP_P1 : DEFAULT_KEYMAP_P2;
    if (saved) {
      return { ...defaultMap, ...JSON.parse(saved) };
    }
    return defaultMap;
  } catch (e) {
    console.error('Failed to load keymap', e);
  }
  return playerId === 1 ? DEFAULT_KEYMAP_P1 : DEFAULT_KEYMAP_P2;
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

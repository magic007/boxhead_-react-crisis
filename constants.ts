
import { WeaponType, WeaponConfig } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// 地图大小是 Canvas 的 2 倍宽，2 倍高 (总面积 4 倍)
export const WORLD_WIDTH = 1600;
export const WORLD_HEIGHT = 1200;

export const PLAYER_SPEED = 1.5; 
export const ZOMBIE_SPEED = 0.5; // 降速 1/3
export const DEVIL_SPEED = 0.36;   // 降速 1/3

export const ZOMBIE_HP = 100;
export const DEVIL_HP = 400; 
export const PLAYER_HP = 100;

// 病毒配置
export const VIRUS_SPEED = 1.75; // 降速 2 倍
export const VIRUS_DAMAGE = 25; // 4 hits to kill player
export const DEVIL_FIRE_RATE = 2000; // 2 seconds

export const WEAPONS: Record<WeaponType, WeaponConfig> = {
  [WeaponType.PISTOL]: {
    type: WeaponType.PISTOL,
    damage: 35,
    fireRate: 250,
    speed: 12,
    spread: 0.05,
    count: 1,
    ammo: 10000, 
    color: '#00BFFF' 
  },
  [WeaponType.UZI]: {
    type: WeaponType.UZI,
    damage: 15,
    fireRate: 80,
    speed: 14,
    spread: 0.2,
    count: 1,
    ammo: 10000, 
    color: '#FFA500'
  },
  [WeaponType.SHOTGUN]: {
    type: WeaponType.SHOTGUN,
    damage: 25,
    fireRate: 800,
    speed: 10,
    spread: 0.3,
    count: 6,
    ammo: 10000, 
    color: '#FFFFFF'
  },
  [WeaponType.FAKE_WALL]: {
    type: WeaponType.FAKE_WALL,
    damage: 0,
    fireRate: 100, 
    speed: 0,
    spread: 0,
    count: 1,
    ammo: 10000, // 默认 10000
    color: '#888888',
    isDeployable: true 
  },
  [WeaponType.BARREL]: {
    type: WeaponType.BARREL,
    damage: 800, 
    fireRate: 100, 
    speed: 0,
    spread: 0,
    count: 1,
    ammo: 10000, // 默认 10000
    color: '#AA0000',
    isDeployable: true 
  },
  [WeaponType.GRENADE]: {
    type: WeaponType.GRENADE,
    damage: 1200,
    fireRate: 2000, 
    speed: 8,
    spread: 0,
    count: 1,
    ammo: -1, 
    color: '#00FF00'
  }
};

export const COLORS = {
  FLOOR: '#EDE4D4',
  WALL: '#555555',
  WALL_TOP: '#777777',
  BLOOD: '#cc0000',
  BLOOD_OLD: '#7a0000',
  PLAYER_SKIN: '#ffccaa',
  PLAYER_SHIRT: '#ffffff',
  PLAYER_HAIR: '#111111',
  ZOMBIE_SKIN: '#dddddd',
  ZOMBIE_BLOOD: '#339933', 
  DEVIL_SKIN: '#aa0000',
  OBSTACLE_WALL: '#666666',
  OBSTACLE_BARREL: '#cc3300'
};

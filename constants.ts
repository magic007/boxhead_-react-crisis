
import { WeaponType, WeaponConfig } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// 地图大小是 Canvas 的 2 倍宽，2 倍高 (总面积 4 倍)
export const WORLD_WIDTH = 1600;
export const WORLD_HEIGHT = 1200;

export const PLAYER_SPEED = 3.5; 
export const ZOMBIE_SPEED = 1.2; 
export const DEVIL_SPEED = 1.4;   

export const ZOMBIE_HP = 100; 
export const DEVIL_HP = 400; 
export const PLAYER_HP = 100;

// 病毒配置
export const VIRUS_SPEED = 6.0; 
export const VIRUS_DAMAGE = 25; 
export const DEVIL_FIRE_RATE = 2000; 

// 道具配置
export const HEALTH_PACK_VAL = 25;
export const BARREL_EXPLOSION_RANGE = 30; 

// Collision Categories
export const CAT_DEFAULT = 0x0001;
export const CAT_PLAYER = 0x0002;
export const CAT_ENEMY = 0x0004;
export const CAT_BULLET = 0x0008;
export const CAT_WALL = 0x0010;
export const CAT_OBSTACLE = 0x0020;
export const CAT_ENEMY_BULLET = 0x0040;
export const CAT_ITEM = 0x0080;

export const WEAPONS: Record<WeaponType, WeaponConfig> = {
  [WeaponType.PISTOL]: {
    type: WeaponType.PISTOL,
    damage: 35,
    fireRate: 250,
    speed: 24,
    spread: 0.05,
    count: 1,
    ammo: 10000, 
    color: '#00BFFF' 
  },
  [WeaponType.UZI]: {
    type: WeaponType.UZI,
    damage: 15,
    fireRate: 80,
    speed: 28,
    spread: 0.2,
    count: 1,
    ammo: 10000, 
    color: '#FFA500'
  },
  [WeaponType.SHOTGUN]: {
    type: WeaponType.SHOTGUN,
    damage: 25,
    fireRate: 800,
    speed: 22,
    spread: 0.3,
    count: 6,
    ammo: 10000, 
    color: '#FFFFFF'
  },
  [WeaponType.FAKE_WALL]: {
    type: WeaponType.FAKE_WALL,
    damage: 0,
    fireRate: 20, 
    speed: 0,
    spread: 0,
    count: 1,
    ammo: 10000, 
    color: '#888888',
    isDeployable: true 
  },
  [WeaponType.BARREL]: {
    type: WeaponType.BARREL,
    damage: 800, 
    fireRate: 20, 
    speed: 0,
    spread: 0,
    count: 1,
    ammo: 10000, 
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

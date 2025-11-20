
import { WeaponType, WeaponConfig } from './types';

// Canvas 尺寸
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// 地图大小是 Canvas 的 2 倍宽，2 倍高 (总面积 4 倍)
export const WORLD_WIDTH = 1600;
export const WORLD_HEIGHT = 1200;

// 角色速度配置
export const PLAYER_SPEED = 3.5; // 玩家移动速度
export const ZOMBIE_SPEED = 1.2; // 普通僵尸移动速度
export const DEVIL_SPEED = 1.4;   // 红色恶魔僵尸移动速度

// 生命值配置
export const ZOMBIE_HP = 60; // 普通僵尸生命值
export const DEVIL_HP = 120; // 红色恶魔僵尸生命值
export const PLAYER_HP = 100; // 玩家初始生命值

// 病毒(红色僵尸子弹)配置
export const VIRUS_SPEED = 3.0; // 病毒飞行速度
export const VIRUS_DAMAGE = 25; // 病毒伤害值
export const DEVIL_FIRE_RATE = 2000; // 红色僵尸攻击间隔(毫秒)

// 道具配置
export const HEALTH_PACK_VAL = 25; // 医疗包恢复量
export const BARREL_EXPLOSION_RANGE = 30; // 油桶爆炸触发范围

// 碰撞类别掩码 (用于 Matter.js 碰撞过滤)
export const CAT_DEFAULT = 0x0001; // 默认
export const CAT_PLAYER = 0x0002; // 玩家
export const CAT_ENEMY = 0x0004; // 敌人
export const CAT_BULLET = 0x0008; // 玩家子弹
export const CAT_WALL = 0x0010; // 墙壁
export const CAT_OBSTACLE = 0x0020; // 障碍物(包括油桶)
export const CAT_ENEMY_BULLET = 0x0040; // 敌人子弹
export const CAT_ITEM = 0x0080; // 掉落道具

// 武器配置表
export const WEAPONS: Record<WeaponType, WeaponConfig> = {
  [WeaponType.PISTOL]: {
    type: WeaponType.PISTOL,
    damage: 35, // 伤害
    fireRate: 250, // 射速(毫秒间隔)
    speed: 24, // 子弹飞行速度
    spread: 0.05, // 散射角度
    count: 1, // 单次发射数量
    ammo: 10000, // 初始弹药(无限)
    color: '#00BFFF' // 子弹颜色
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
    isDeployable: true // 是否为可放置物品
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
    ammo: -1, // -1 可能表示特殊逻辑或不可用
    color: '#00FF00'
  },
  [WeaponType.CANNON]: {
    type: WeaponType.CANNON,
    damage: 150, // 高伤害
    fireRate: 1500, // 低射速（1.5秒）
    speed: 18, // 中等速度
    spread: 0.02, // 低散射
    count: 1, // 单发
    ammo: 10000, // 无限弹药
    color: '#FF4500' // 橙红色
  }
};

// 颜色配置
export const COLORS = {
  FLOOR: '#EDE4D4', // 地板颜色
  WALL: '#555555', // 墙体颜色
  WALL_TOP: '#777777', // 墙顶颜色
  BLOOD: '#cc0000', // 血液颜色
  BLOOD_OLD: '#7a0000', // 旧血迹颜色
  PLAYER_SKIN: '#ffccaa', // 玩家皮肤颜色
  PLAYER_SHIRT: '#ffffff', // 玩家衣服颜色
  PLAYER_HAIR: '#111111', // 玩家头发颜色
  ZOMBIE_SKIN: '#dddddd', // 僵尸皮肤颜色
  ZOMBIE_BLOOD: '#339933', // 僵尸血液颜色
  DEVIL_SKIN: '#aa0000', // 恶魔皮肤颜色
  OBSTACLE_WALL: '#666666', // 障碍墙颜色
  OBSTACLE_BARREL: '#cc3300' // 油桶颜色
};

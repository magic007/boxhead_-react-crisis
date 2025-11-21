
export enum GameState {
  MENU,
  PLAYING,
  PAUSED,
  GAME_OVER
}

export enum EntityType {
  PLAYER,
  ZOMBIE,
  DEVIL,
  BOX,
  OBSTACLE, // 新增：障碍物类型
  ITEM_HEALTH // 新增：血包
}

export enum WeaponType {
  PISTOL = 'Pistol',
  UZI = 'Uzi',
  SHOTGUN = 'Shotgun',
  FAKE_WALL = 'FakeWall', // 新增：假墙
  BARREL = 'Barrel',      // 新增：油桶
  GRENADE = 'Grenade',    // 新增：手雷技能
  CANNON = 'Cannon'       // 新增：大炮
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Wall {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Entity {
  id: number;
  type: EntityType;
  // pos and velocity are now primarily managed by the physics body, 
  // but we keep them here for initialization or snapshotting.
  pos: Vector2; 
  velocity: Vector2;
  rotation: number; // in radians
  radius: number;
  hp: number;
  maxHp: number;
  color: string;
  isDead: boolean;
  dying?: boolean; // For death animation (physics slide)
  dyingTimer?: number;
  lastAttackTime?: number; // For entity's own attack cooldown (player firing / enemy attacking obstacles)
  lastDamageTime?: number; // For tracking incoming damage cooldown (player getting hit)
  lastHitTime?: number; // Tracks when the entity was last hit for knockback stun
  // For obstacles
  isExplosive?: boolean; // 是否易爆（油桶）
  // Physics body from Matter.js (typed as any to avoid strict lib dependency issues in types file)
  body?: any; 
}

export interface PlayerEntity extends Entity {
  playerId: number; // 1 or 2
  currentWeapon: WeaponType;
  ammo: Record<WeaponType, number>;
  score: number; // Individual score (reserved)
  multiplier: number;
}

export interface Bullet {
  id: number;
  pos: Vector2;
  velocity: Vector2;
  damage: number;
  active: boolean;
  color: string;
  isGrenade?: boolean; // 是否为手雷
  isVirus?: boolean; // 是否为恶魔病毒
  isCannon?: boolean; // 是否为大炮
  targetPos?: Vector2; // 手雷目标点
  // Physics body
  body?: any;
}

export interface Particle {
  id: number;
  pos: Vector2;
  velocity: Vector2;
  size: number;
  color: string;
  life: number; // 0 to 1
  decay: number;
  isBlood: boolean; // Blood stays on ground
  rotation: number;
}

export interface WeaponConfig {
  type: WeaponType;
  damage: number; // For guns: damage per bullet. For barrel: explosion damage.
  fireRate: number; // ms between shots/placements
  speed: number;
  spread: number; // variance in radians
  count: number; // bullets per shot
  ammo: number; // -1 for infinite
  color: string;
  isDeployable?: boolean; // True for walls/barrels
}

declare global {
  interface Window {
    hasShownMobileAlert?: boolean;
  }
}

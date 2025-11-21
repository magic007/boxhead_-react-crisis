
import React from 'react';
import { Entity, PlayerEntity, Bullet, Particle, WeaponType, Wall, Difficulty } from '../../types';
import { SoundSystem } from './soundSystem';
import { KeyMap } from './inputConfig';

// Context object containing all mutable game state refs
export interface GameRefs {
  engine: any; // Matter.Engine
  players: React.MutableRefObject<PlayerEntity[]>; // Supports multiple players
  enemies: React.MutableRefObject<Entity[]>;
  obstacles: React.MutableRefObject<Entity[]>;
  items: React.MutableRefObject<Entity[]>;
  bullets: React.MutableRefObject<Bullet[]>;
  particles: React.MutableRefObject<Particle[]>;
  bloodDecals: React.MutableRefObject<Particle[]>;
  camera: React.MutableRefObject<{ x: number, y: number }>;
  keys: React.MutableRefObject<Set<string>>;
  keyMaps: React.MutableRefObject<Record<number, KeyMap>>; // playerId -> KeyMap
  mouse: React.MutableRefObject<{ x: number, y: number }>;
  isMouseDown: React.MutableRefObject<boolean>;
  gamepads: React.MutableRefObject<Array<Gamepad | null>>; // 连接的手柄列表
  gamepadButtons: React.MutableRefObject<Array<Set<number>>>; // 每个手柄按下的按钮索引
  score: React.MutableRefObject<number>;
  multiplier: React.MutableRefObject<number>;
  lastKillTime: React.MutableRefObject<number>;
  wave: React.MutableRefObject<number>;
  frame: React.MutableRefObject<number>;
  difficultyLevel: React.MutableRefObject<number>; // 动态难度（基于分数）
  difficulty: React.MutableRefObject<Difficulty>; // 用户选择的难度设置
  gameMessage: React.MutableRefObject<string | null>; 
  gameMessageTimer: React.MutableRefObject<number>; 
  mapWalls: React.MutableRefObject<Wall[]>;
  soundSystem: React.MutableRefObject<SoundSystem>;
  callbacks: React.MutableRefObject<{
    onScoreUpdate: (score: number, multiplier: number) => void;
    onHealthUpdate: (hp: number[], lives: number[]) => void; // Array of HPs and lives
    onAmmoUpdate: (p1Info: {weapon: string, ammo: number}, p2Info?: {weapon: string, ammo: number}) => void;
    onGameOver: (score: number) => void;
  }>;
}

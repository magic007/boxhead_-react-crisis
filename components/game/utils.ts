
import { Vector2 } from '../../types';
import { GameRefs } from './types';

export const dist = (v1: Vector2, v2: Vector2) => Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2);

export const spawnParticles = (
  refs: GameRefs, 
  pos: Vector2, 
  count: number, 
  color: string, 
  speedScale: number, 
  isBlood: boolean = false
) => {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * speedScale;
    refs.particles.current.push({
      id: Math.random(),
      pos: { ...pos },
      velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      size: 2 + Math.random() * 4,
      color: color,
      life: 1.0,
      decay: 0.03 + Math.random() * 0.05,
      isBlood: isBlood,
      rotation: Math.random() * Math.PI * 2
    });
  }
};


// @ts-ignore
import Matter from 'matter-js';
import { GameRefs } from './types';
import { Bullet, Entity, EntityType, WeaponType } from '../../types';
import { COLORS, WORLD_WIDTH, WORLD_HEIGHT, PLAYER_HP } from '../../constants';
import { dist, spawnParticles } from './utils';

// Collision Categories
export const CAT_DEFAULT = 0x0001;
export const CAT_PLAYER = 0x0002;
export const CAT_ENEMY = 0x0004;
export const CAT_BULLET = 0x0008;
export const CAT_WALL = 0x0010;
export const CAT_OBSTACLE = 0x0020;
export const CAT_ENEMY_BULLET = 0x0040;

export const initPhysics = (refs: GameRefs) => {
  const Engine = Matter.Engine;
  const World = Matter.World;
  const Bodies = Matter.Bodies;

  const engine = Engine.create();
  engine.gravity.y = 0; // Top-down view, no gravity
  refs.engine = engine;

  // Create Static Walls
  const walls = refs.mapWalls.current.map(w => {
    return Bodies.rectangle(w.x, w.y, w.w, w.h, { 
      isStatic: true, 
      label: 'WALL',
      render: { fillStyle: COLORS.WALL },
      collisionFilter: { category: CAT_WALL }
    });
  });
  World.add(engine.world, walls);

  // --- Collision Handlers ---

  Matter.Events.on(engine, 'collisionStart', (event: any) => {
      event.pairs.forEach((pair: any) => {
          const bodyA = pair.bodyA;
          const bodyB = pair.bodyB;
          
          const isBulletA = bodyA.label === 'BULLET';
          const isBulletB = bodyB.label === 'BULLET';
          
          // 1. Bullet Collisions
          if (isBulletA || isBulletB) {
              const bulletBody = isBulletA ? bodyA : bodyB;
              const otherBody = isBulletA ? bodyB : bodyA;
              const bullet = bulletBody.plugin.entity as Bullet;

              if (!bullet || !bullet.active) return;

              // 1a. Enemy Bullet (Virus) hits Player
              if (bullet.isVirus) {
                  if (otherBody.label === 'PLAYER') {
                      bullet.active = false;
                      refs.player.current.hp -= bullet.damage;
                      refs.soundSystem.current?.playHit(); // Safe Sound
                      spawnParticles(refs, refs.player.current.pos, 5, '#00FF00', 3, false);
                      if (refs.player.current.hp <= 0) {
                          refs.soundSystem.current?.playGameOver(); // Safe Sound
                          refs.callbacks.current.onGameOver(refs.score.current);
                      }
                  } else if (otherBody.label === 'WALL' || otherBody.label === 'OBSTACLE') {
                      bullet.active = false;
                      spawnParticles(refs, bullet.pos, 3, '#00FF00', 2, false);
                  }
                  return;
              }

              // 1b. Player Bullet hits Enemy
              if (otherBody.label === 'ENEMY') {
                  bullet.active = false;
                  const enemy = otherBody.plugin.entity as Entity;
                  if (bullet.isGrenade) {
                      createExplosion(refs, bullet.pos, bullet.damage, 250);
                  } else {
                      enemy.hp -= bullet.damage;
                      enemy.lastHitTime = Date.now(); // Stun logic
                      
                      refs.soundSystem.current?.playHit(); // Safe Sound

                      spawnParticles(refs, enemy.pos, 3, COLORS.BLOOD, 2, true);
                      
                      // Knockback Force
                      const forceMag = 0.96 * (bullet.damage / 10); 
                      const knockbackDir = { x: bullet.velocity.x, y: bullet.velocity.y };
                      const len = Math.sqrt(knockbackDir.x * knockbackDir.x + knockbackDir.y * knockbackDir.y);
                      if (len > 0) {
                         knockbackDir.x /= len;
                         knockbackDir.y /= len;
                      }
                      Matter.Body.applyForce(otherBody, otherBody.position, {
                           x: knockbackDir.x * forceMag,
                           y: knockbackDir.y * forceMag
                      });

                      if (enemy.hp <= 0) {
                          enemy.isDead = true;
                          handleEnemyDeath(refs, enemy);
                      }
                  }
              }
              // Hit Obstacle
              else if (otherBody.label === 'OBSTACLE') {
                   bullet.active = false;
                   const obs = otherBody.plugin.entity as Entity;
                   if (bullet.isGrenade) {
                       createExplosion(refs, bullet.pos, bullet.damage, 250);
                   } else if (obs.isExplosive) {
                       obs.hp -= bullet.damage;
                   }
                   refs.soundSystem.current?.playHit(); // Safe Sound
              }
              // Hit Wall
              else if (otherBody.label === 'WALL') {
                  bullet.active = false;
                  if (bullet.isGrenade) createExplosion(refs, bullet.pos, bullet.damage, 250);
              }
          }

          // 2. Zombie Attacks Player
          if ((bodyA.label === 'PLAYER' && bodyB.label === 'ENEMY') || (bodyB.label === 'PLAYER' && bodyA.label === 'ENEMY')) {
               refs.player.current.hp -= 0.5;
               if (refs.player.current.hp <= 0) {
                   refs.soundSystem.current?.playGameOver(); // Safe Sound
                   refs.callbacks.current.onGameOver(refs.score.current);
               }
          }
      });
  });

  // Active Collisions
  Matter.Events.on(engine, 'collisionActive', (event: any) => {
      event.pairs.forEach((pair: any) => {
          const bodyA = pair.bodyA;
          const bodyB = pair.bodyB;
          
          // Zombie attacks Obstacle
          if ((bodyA.label === 'ENEMY' && bodyB.label === 'OBSTACLE') || (bodyB.label === 'ENEMY' && bodyA.label === 'OBSTACLE')) {
               const enemyBody = bodyA.label === 'ENEMY' ? bodyA : bodyB;
               const obsBody = bodyA.label === 'OBSTACLE' ? bodyA : bodyB;
               const enemy = enemyBody.plugin.entity;
               const obs = obsBody.plugin.entity;
               
               const now = Date.now();
               if (enemy && obs && !obs.isExplosive && now - (enemy.lastAttackTime || 0) > 1000) {
                   enemy.lastAttackTime = now;
                   obs.hp -= 20;
                   refs.soundSystem.current?.playHit(); // Safe Sound
                   spawnParticles(refs, obsBody.position, 3, '#cccccc', 2);
               }
          }
      });
  });

  return engine;
};

export const createExplosion = (refs: GameRefs, pos: {x: number, y: number}, damage: number, range: number = 180) => {
    refs.soundSystem.current?.playExplosion(); // Safe Sound
    spawnParticles(refs, pos, 40, '#FF4500', 10, false);
    spawnParticles(refs, pos, 20, '#555555', 8, false);

    const bodies = Matter.Composite.allBodies(refs.engine.world);
    bodies.forEach((body: any) => {
        if (body.isStatic && body.label !== 'OBSTACLE') return;
        
        const d = dist(pos, body.position);
        if (d < range) {
            // Apply Force
            const forceMagnitude = (range - d) / range * 0.02;
            const angle = Math.atan2(body.position.y - pos.y, body.position.x - pos.x);
            
            if (!body.isStatic) {
                Matter.Body.applyForce(body, body.position, {
                    x: Math.cos(angle) * forceMagnitude * (body.label === 'OBSTACLE' ? 5 : 1), 
                    y: Math.sin(angle) * forceMagnitude * (body.label === 'OBSTACLE' ? 5 : 1)
                });
            }

            // Apply Damage
            if (body.label === 'ENEMY') {
                const e = body.plugin.entity;
                if(e) {
                    e.hp -= damage;
                    if (e.hp <= 0 && !e.isDead) {
                        e.isDead = true;
                        handleEnemyDeath(refs, e);
                    }
                }
            } else if (body.label === 'PLAYER') {
                refs.player.current.hp -= damage / 10;
                if (refs.player.current.hp <= 0) {
                    refs.soundSystem.current?.playGameOver(); // Safe Sound
                    refs.callbacks.current.onGameOver(refs.score.current);
                }
            } else if (body.label === 'OBSTACLE') {
                const o = body.plugin.entity;
                if(o && !o.isDead) o.hp -= damage;
            }
        }
    });
};

const handleEnemyDeath = (refs: GameRefs, enemy: Entity) => {
    refs.soundSystem.current?.playDeath(); // Safe Sound
    if (enemy.body) Matter.World.remove(refs.engine.world, enemy.body);
    spawnParticles(refs, enemy.pos, 15, enemy.type === EntityType.DEVIL ? COLORS.DEVIL_SKIN : COLORS.ZOMBIE_BLOOD, 4, true);
                
    const now = Date.now();
    if (now - refs.lastKillTime.current < 1500) {
        refs.multiplier.current = Math.min(99, refs.multiplier.current + 1);
    } else {
        refs.multiplier.current = 1;
    }
    refs.lastKillTime.current = now;
    
    const baseScore = enemy.type === EntityType.DEVIL ? 500 : 100;
    refs.score.current += baseScore * refs.multiplier.current;

    if (refs.score.current > refs.wave.current * 5000) refs.wave.current++;
    
    // Loot Drops
    if (Math.random() < 0.1) refs.ammo.current[WeaponType.UZI] += 50;
    if (Math.random() < 0.05) refs.ammo.current[WeaponType.SHOTGUN] += 10;
    if (Math.random() < 0.05) refs.ammo.current[WeaponType.FAKE_WALL] += 5;
    if (Math.random() < 0.05) refs.ammo.current[WeaponType.BARREL] += 5;
};

export const resetGamePhysics = (refs: GameRefs) => {
    const World = Matter.World;
    const engine = refs.engine;
    if (!engine) return;

    // Clear dynamic bodies
    Matter.Composite.allBodies(engine.world).forEach((body: any) => {
        if (body.label !== 'WALL') World.remove(engine.world, body);
    });

    // Reset Player Body
    const startPos = { x: WORLD_WIDTH / 2, y: 150 };
    const playerRadius = 8;
    const playerBody = Matter.Bodies.circle(startPos.x, startPos.y, playerRadius, {
        label: 'PLAYER',
        friction: 0,
        frictionAir: 0,
        restitution: 0,
        inertia: Infinity,
        collisionFilter: { category: CAT_PLAYER }
    });
    World.add(engine.world, playerBody);

    // Reset Player Ref
    refs.player.current = {
      id: 0,
      type: EntityType.PLAYER,
      pos: startPos,
      velocity: { x: 0, y: 0 },
      rotation: 0,
      radius: playerRadius,
      hp: PLAYER_HP,
      maxHp: PLAYER_HP,
      color: COLORS.PLAYER_SKIN,
      isDead: false,
      lastAttackTime: 0,
      body: playerBody
    };
    playerBody.plugin.entity = refs.player.current;

    // Generate Random Initial Obstacles (Walls & Barrels)
    const obstacles: Entity[] = [];
    const gridSize = 16;
    const spawnZone = 300; 

    for(let i = 0; i < 60; i++) {
        const rx = Math.floor(Math.random() * (WORLD_WIDTH / gridSize)) * gridSize;
        const ry = Math.floor(Math.random() * (WORLD_HEIGHT / gridSize)) * gridSize;
        
        const dToSpawn = dist({x: rx, y: ry}, startPos);
        if (dToSpawn < spawnZone) continue;

        if (rx < 100 || rx > WORLD_WIDTH - 100 || ry < 100 || ry > WORLD_HEIGHT - 100) continue;

        const isBarrel = Math.random() > 0.6; 
        const radius = 8;
        
        let body;
        if (!isBarrel) {
             body = Matter.Bodies.rectangle(rx, ry, 16, 16, { 
                isStatic: true, 
                label: 'OBSTACLE',
                collisionFilter: { 
                    category: CAT_OBSTACLE,
                    mask: 0xFFFFFFFF ^ CAT_PLAYER 
                },
                render: { fillStyle: COLORS.OBSTACLE_WALL }
            });
        } else {
             body = Matter.Bodies.circle(rx, ry, radius, { 
                isStatic: true, 
                label: 'OBSTACLE',
                collisionFilter: { 
                    category: CAT_OBSTACLE,
                    mask: 0xFFFFFFFF ^ CAT_PLAYER 
                }
            });
        }

        Matter.World.add(engine.world, body);

        const obs: Entity = {
            id: Math.random(),
            type: EntityType.OBSTACLE,
            pos: { x: rx, y: ry },
            velocity: { x: 0, y: 0 },
            rotation: 0,
            radius: radius,
            hp: isBarrel ? 1 : 500,
            maxHp: isBarrel ? 1 : 500,
            color: isBarrel ? COLORS.OBSTACLE_BARREL : COLORS.OBSTACLE_WALL,
            isDead: false,
            isExplosive: isBarrel,
            body: body
        };
        body.plugin.entity = obs;
        obstacles.push(obs);
    }
    refs.obstacles.current = obstacles;
};

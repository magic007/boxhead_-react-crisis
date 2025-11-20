
// @ts-ignore
import Matter from 'matter-js';
import { GameRefs } from './types';
import { Bullet, Entity, PlayerEntity, EntityType, WeaponType, Vector2 } from '../../types';
import { COLORS, WORLD_WIDTH, WORLD_HEIGHT, PLAYER_HP, HEALTH_PACK_VAL, CAT_DEFAULT, CAT_PLAYER, CAT_ENEMY, CAT_BULLET, CAT_WALL, CAT_OBSTACLE, CAT_ENEMY_BULLET, CAT_ITEM } from '../../constants';
import { dist, spawnParticles } from './utils';

export { createExplosion, initPhysics, resetGamePhysics };

const initPhysics = (refs: GameRefs) => {
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
          
          // Item Pickup (Player vs Item)
          if ((bodyA.label === 'PLAYER' && bodyB.label === 'ITEM') || (bodyB.label === 'PLAYER' && bodyA.label === 'ITEM')) {
              const itemBody = bodyA.label === 'ITEM' ? bodyA : bodyB;
              const playerBody = bodyA.label === 'PLAYER' ? bodyA : bodyB;
              const item = itemBody.plugin.entity as Entity;
              const player = playerBody.plugin.entity as PlayerEntity;
              
              if (item && !item.isDead && player && !player.isDead) {
                  item.isDead = true;
                  refs.soundSystem.current?.playPickup();
                  
                  if (item.type === EntityType.ITEM_HEALTH) {
                      player.hp = Math.min(100, player.hp + HEALTH_PACK_VAL);
                      spawnParticles(refs, player.pos, 10, '#00FF00', 2, false);
                  }
              }
              return;
          }

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
                      const player = otherBody.plugin.entity as PlayerEntity;
                      if (player && !player.isDead) {
                        bullet.active = false;
                        player.hp -= bullet.damage;
                        refs.soundSystem.current?.playHit(); // Safe Sound
                        spawnParticles(refs, player.pos, 5, '#00FF00', 3, false);
                        if (player.hp <= 0) {
                            player.isDead = true; // Just mark this player as dead
                            // Game over logic is checked elsewhere (all dead)
                        }
                      }
                  } else if (otherBody.label === 'WALL' || otherBody.label === 'OBSTACLE') {
                      bullet.active = false;
                      spawnParticles(refs, bullet.pos, 3, '#00FF00', 2, false);
                  }
                  return;
              }

              // 1b. Player Bullet hits Enemy
              if (otherBody.label === 'ENEMY') {
                  const enemy = otherBody.plugin.entity as Entity;
                  // Ignore dying enemies for bullet collisions
                  if (enemy.dying) return;

                  bullet.active = false;
                  if (bullet.isGrenade) {
                      createExplosion(refs, bullet.pos, bullet.damage, 250);
                  } else if (bullet.isCannon) {
                      // 大炮子弹爆炸，防止连锁反应
                      createExplosion(refs, bullet.pos, bullet.damage, 80, true);
                  } else {
                      enemy.hp -= bullet.damage;
                      enemy.lastHitTime = Date.now(); // Stun logic
                      
                      refs.soundSystem.current?.playHit(); // Safe Sound
                      spawnParticles(refs, enemy.pos, 3, COLORS.BLOOD, 2, true);
                      
                      // --- Knockback Logic (Velocity Override) ---
                      const knockbackSpeed = bullet.damage * 0.2; // Reduced knockback scaling
                      const knockbackDir = { x: bullet.velocity.x, y: bullet.velocity.y };
                      
                      // Normalize
                      const len = Math.sqrt(knockbackDir.x * knockbackDir.x + knockbackDir.y * knockbackDir.y);
                      if (len > 0) {
                         knockbackDir.x /= len;
                         knockbackDir.y /= len;
                      }

                      // Apply velocity
                      Matter.Body.setVelocity(otherBody, {
                           x: knockbackDir.x * knockbackSpeed,
                           y: knockbackDir.y * knockbackSpeed
                      });

                      if (enemy.hp <= 0 && !enemy.dying) {
                          // Enter Dying State (Physics Slide)
                          triggerEnemyDeath(refs, enemy);
                          // Re-apply huge velocity for death fling
                          Matter.Body.setVelocity(otherBody, {
                              x: knockbackDir.x * knockbackSpeed * 1.5,
                              y: knockbackDir.y * knockbackSpeed * 1.5
                          });
                      }
                  }
              }
              // Hit Obstacle
              else if (otherBody.label === 'OBSTACLE') {
                   const obs = otherBody.plugin.entity as Entity;
                   if (bullet.isGrenade) {
                       createExplosion(refs, bullet.pos, bullet.damage, 250);
                       bullet.active = false;
                  } else if (bullet.isCannon) {
                      // 大炮子弹爆炸，防止连锁反应
                      createExplosion(refs, bullet.pos, bullet.damage, 80, true);
                      bullet.active = false;
                   } else if (obs.isExplosive) {
                       // Instant detonation for Barrels
                       obs.hp = 0;
                       bullet.active = false;
                       refs.soundSystem.current?.playHit();
                   } else {
                       // Hit Fake Wall
                       if (!bullet.isVirus) {
                           // Do nothing (Pass through)
                           return; 
                       } else {
                           // Virus hits wall
                           bullet.active = false;
                           obs.hp -= bullet.damage;
                           refs.soundSystem.current?.playHit();
                       }
                   }
              }
              // Hit Wall
              else if (otherBody.label === 'WALL') {
                  bullet.active = false;
                  if (bullet.isGrenade) {
                      createExplosion(refs, bullet.pos, bullet.damage, 250);
                  } else if (bullet.isCannon) {
                      // 大炮子弹击中墙壁也爆炸，防止连锁反应
                      createExplosion(refs, bullet.pos, bullet.damage, 80, true);
                  }
              }
          }
          
          // Zombie vs Zombie (Knockback Propagation)
          // Detect collisions between enemies to propagate momentum
          if (bodyA.label === 'ENEMY' && bodyB.label === 'ENEMY') {
              const vA = bodyA.velocity;
              const vB = bodyB.velocity;
              const speedA = Math.sqrt(vA.x * vA.x + vA.y * vA.y);
              const speedB = Math.sqrt(vB.x * vB.x + vB.y * vB.y);
              
              const transferThreshold = 1.0; // Minimum speed to cause a chain push
              
              if (speedA > transferThreshold && speedB < speedA * 0.8) {
                  // A pushes B
                  Matter.Body.setVelocity(bodyB, { x: vA.x * 0.9, y: vA.y * 0.9 });
                  // Stun B
                  if (bodyB.plugin.entity) bodyB.plugin.entity.lastHitTime = Date.now();
                  
              } else if (speedB > transferThreshold && speedA < speedB * 0.8) {
                  // B pushes A
                  Matter.Body.setVelocity(bodyA, { x: vB.x * 0.9, y: vB.y * 0.9 });
                  if (bodyA.plugin.entity) bodyA.plugin.entity.lastHitTime = Date.now();
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
               
               // Dying enemies don't attack
               if (enemy && enemy.dying) return;

               const now = Date.now();
               if (enemy && obs && now - (enemy.lastAttackTime || 0) > 1000) {
                   // Zombies don't attack explosive barrels
                   if (obs.isExplosive) return;

                   enemy.lastAttackTime = now;
                   obs.hp -= 20;
                   refs.soundSystem.current?.playHit(); // Safe Sound
                   spawnParticles(refs, obsBody.position, 3, '#cccccc', 2);
               }
          }

          // Zombie attacks Player (Continuous Damage)
          if ((bodyA.label === 'PLAYER' && bodyB.label === 'ENEMY') || (bodyB.label === 'PLAYER' && bodyA.label === 'ENEMY')) {
              const enemyBody = bodyA.label === 'ENEMY' ? bodyA : bodyB;
              const playerBody = bodyA.label === 'PLAYER' ? bodyA : bodyB;
              const enemy = enemyBody.plugin.entity;
              const player = playerBody.plugin.entity as PlayerEntity;
              
              // Dying enemies don't attack
              if (enemy && enemy.dying) return;
              if (player && player.isDead) return;

              const now = Date.now();
              if (player && now - (player.lastDamageTime || 0) > 500) {
                   player.lastDamageTime = now;
                   player.hp -= 5;
                   refs.soundSystem.current?.playHit();
                   if (player.hp <= 0) {
                       player.isDead = true;
                   }
              }
          }
      });
  });

  return engine;
};

const createExplosion = (refs: GameRefs, pos: {x: number, y: number}, damage: number, range: number = 180, preventChainReaction: boolean = false) => {
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
                const blastSpeed = 15 * (1 - d/range);
                Matter.Body.setVelocity(body, {
                    x: Math.cos(angle) * blastSpeed,
                    y: Math.sin(angle) * blastSpeed
                });
            }

            // Apply Damage
            if (body.label === 'ENEMY') {
                const e = body.plugin.entity;
                if(e) {
                    e.hp -= damage;
                    if (e.hp <= 0 && !e.dying) {
                        triggerEnemyDeath(refs, e);
                        // Blast corpse away
                         Matter.Body.setVelocity(body, {
                            x: Math.cos(angle) * 20,
                            y: Math.sin(angle) * 20
                        });
                    }
                }
            } else if (body.label === 'PLAYER') {
                const p = body.plugin.entity as PlayerEntity;
                if (p && !p.isDead) {
                    p.hp -= damage / 10;
                    if (p.hp <= 0) {
                       p.isDead = true;
                    }
                }
            } else if (body.label === 'OBSTACLE') {
                const o = body.plugin.entity;
                if(o && !o.isDead) {
                    o.hp -= damage;
                    // 如果防止连锁反应且障碍物是油桶，直接移除而不触发爆炸
                    if (preventChainReaction && o.isExplosive && o.hp <= 0) {
                        o.isDead = true;
                        if (o.body) {
                            Matter.World.remove(refs.engine.world, o.body);
                        }
                        // 只生成粒子效果，不触发爆炸
                        spawnParticles(refs, o.pos, 10, '#AA0000', 3, false);
                    }
                }
            }
        }
    });
};

const spawnItem = (refs: GameRefs, pos: Vector2, type: EntityType) => {
    const body = Matter.Bodies.rectangle(pos.x, pos.y, 16, 16, {
        isStatic: true,
        isSensor: true, 
        label: 'ITEM',
        collisionFilter: { category: CAT_ITEM, mask: CAT_PLAYER } 
    });
    
    Matter.World.add(refs.engine.world, body);
    
    const item: Entity = {
        id: Math.random(),
        type: type,
        pos: { ...pos },
        velocity: { x: 0, y: 0 },
        rotation: 0,
        radius: 8,
        hp: 1,
        maxHp: 1,
        color: '#fff',
        isDead: false,
        body: body
    };
    body.plugin.entity = item;
    refs.items.current.push(item);
};

const triggerEnemyDeath = (refs: GameRefs, enemy: Entity) => {
    enemy.dying = true;
    enemy.dyingTimer = 15; // Physics slide frames
    enemy.color = '#444444'; // Darken to show death
    
    // Change collision filter to avoid blocking bullets
    if (enemy.body) {
        enemy.body.collisionFilter = { category: CAT_DEFAULT, mask: CAT_WALL | CAT_OBSTACLE };
    }

    refs.soundSystem.current?.playDeath(); // Safe Sound
    spawnParticles(refs, enemy.pos, 15, enemy.type === EntityType.DEVIL ? COLORS.DEVIL_SKIN : COLORS.ZOMBIE_BLOOD, 4, true);
                
    // Drop Health Pack for Devil
    if (enemy.type === EntityType.DEVIL) {
        spawnItem(refs, enemy.pos, EntityType.ITEM_HEALTH);
    }

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
    
    // Loot Drops (Ammo) - Give to ALL players
    const activePlayers = refs.players.current.filter(p => !p.isDead);
    activePlayers.forEach(p => {
        if (Math.random() < 0.1) p.ammo[WeaponType.UZI] += 50;
        if (Math.random() < 0.05) p.ammo[WeaponType.SHOTGUN] += 10;
        if (Math.random() < 0.05) p.ammo[WeaponType.FAKE_WALL] += 5;
        if (Math.random() < 0.05) p.ammo[WeaponType.BARREL] += 5;
    });
};

const resetGamePhysics = (refs: GameRefs, playerCount: number = 1) => {
    const World = Matter.World;
    const engine = refs.engine;
    if (!engine) return;

    // Clear dynamic bodies
    Matter.Composite.allBodies(engine.world).forEach((body: any) => {
        if (body.label !== 'WALL') World.remove(engine.world, body);
    });

    // Reset Player Bodies
    refs.players.current = [];
    
    const playerRadius = 8;
    const startPositions = playerCount === 1 
        ? [{ x: WORLD_WIDTH / 2, y: 150 }]
        : [{ x: WORLD_WIDTH / 2 - 40, y: 150 }, { x: WORLD_WIDTH / 2 + 40, y: 150 }];

    const colors = [COLORS.PLAYER_SKIN, '#3366FF']; // P1 Red, P2 Blue

    for (let i = 0; i < playerCount; i++) {
        const pos = startPositions[i];
        const playerBody = Matter.Bodies.circle(pos.x, pos.y, playerRadius, {
            label: 'PLAYER',
            friction: 0,
            frictionAir: 0.1, 
            restitution: 0,
            density: 100, 
            inertia: Infinity,
            collisionFilter: { category: CAT_PLAYER }
        });
        World.add(engine.world, playerBody);

        const player: PlayerEntity = {
            id: i + 1,
            type: EntityType.PLAYER,
            playerId: i + 1,
            pos: pos,
            velocity: { x: 0, y: 0 },
            rotation: 0,
            radius: playerRadius,
            hp: PLAYER_HP,
            maxHp: PLAYER_HP,
            color: colors[i % colors.length],
            isDead: false,
            lastAttackTime: 0,
            lastDamageTime: 0,
            body: playerBody,
            currentWeapon: WeaponType.PISTOL,
            ammo: {
                [WeaponType.PISTOL]: 10000,
                [WeaponType.UZI]: 10000,
                [WeaponType.SHOTGUN]: 10000,
                [WeaponType.FAKE_WALL]: 10000,
                [WeaponType.BARREL]: 10000,
                [WeaponType.GRENADE]: -1,
                [WeaponType.CANNON]: 10000
            },
            score: 0,
            multiplier: 1
        };
        playerBody.plugin.entity = player;
        refs.players.current.push(player);
    }
    
    // Generate Random Initial Obstacles (Walls & Barrels)
    const obstacles: Entity[] = [];
    const gridSize = 16;
    const spawnZone = 300; 
    const startCenter = { x: WORLD_WIDTH / 2, y: 150 };

    for(let i = 0; i < 60; i++) {
        const rx = Math.floor(Math.random() * (WORLD_WIDTH / gridSize)) * gridSize;
        const ry = Math.floor(Math.random() * (WORLD_HEIGHT / gridSize)) * gridSize;
        
        const dToSpawn = dist({x: rx, y: ry}, startCenter);
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

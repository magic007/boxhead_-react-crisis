
// @ts-ignore
import Matter from 'matter-js';
import { GameRefs } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, WORLD_WIDTH, WORLD_HEIGHT, PLAYER_SPEED, ZOMBIE_SPEED, DEVIL_SPEED, WEAPONS, ZOMBIE_HP, DEVIL_HP, COLORS, DEVIL_FIRE_RATE, VIRUS_SPEED, VIRUS_DAMAGE, BARREL_EXPLOSION_RANGE, CAT_BULLET, CAT_PLAYER, CAT_ENEMY, CAT_OBSTACLE, CAT_ENEMY_BULLET, CAT_WALL, CAT_ITEM } from '../../constants';
import { WeaponType, EntityType, Entity, Bullet } from '../../types';
import { dist, spawnParticles } from './utils';
import { createExplosion } from './physicsSystem';
import { Action } from './inputConfig';

export const updateGame = (refs: GameRefs, time: number) => {
    const player = refs.player.current;
    const pBody = player.body;
    
    if (!pBody) return;

    // --- Difficulty Scaling ---
    const calculatedDifficulty = Math.floor(refs.score.current / 10000);
    if (calculatedDifficulty > refs.difficultyLevel.current) {
        refs.difficultyLevel.current = calculatedDifficulty;
        refs.gameMessage.current = `WARNING: ENEMY SURGE! (LEVEL ${calculatedDifficulty})`;
        refs.gameMessageTimer.current = 180; 
        refs.soundSystem.current?.playPickup(); 
    }

    if (refs.gameMessageTimer.current > 0) {
        refs.gameMessageTimer.current--;
        if (refs.gameMessageTimer.current <= 0) {
            refs.gameMessage.current = null;
        }
    }

    const worldMouseX = refs.mouse.current.x + refs.camera.current.x;
    const worldMouseY = refs.mouse.current.y + refs.camera.current.y;
    const map = refs.keyMap.current;
    
    // 1. Player Movement
    let moveX = 0;
    let moveY = 0;
    if (refs.keys.current.has(map[Action.MOVE_UP])) moveY -= 1;
    if (refs.keys.current.has(map[Action.MOVE_DOWN])) moveY += 1;
    if (refs.keys.current.has(map[Action.MOVE_LEFT])) moveX -= 1;
    if (refs.keys.current.has(map[Action.MOVE_RIGHT])) moveX += 1;

    if (moveX !== 0 || moveY !== 0) {
      const len = Math.sqrt(moveX * moveX + moveY * moveY);
      moveX /= len;
      moveY /= len;
      Matter.Body.setVelocity(pBody, { x: moveX * PLAYER_SPEED, y: moveY * PLAYER_SPEED });
    } else {
      Matter.Body.setVelocity(pBody, { x: 0, y: 0 });
    }

    player.pos.x = pBody.position.x;
    player.pos.y = pBody.position.y;

    // 2. Rotation (Auto-Aim)
    let targetRotation = Math.atan2(worldMouseY - player.pos.y, worldMouseX - player.pos.x);
    
    if ([WeaponType.PISTOL, WeaponType.UZI, WeaponType.SHOTGUN].includes(refs.currentWeapon.current)) {
      let nearestEnemy: Entity | null = null;
      let minDst = Infinity;
      const AUTO_AIM_RANGE = 600;

      refs.enemies.current.forEach(e => {
          if (e.dying) return; // Don't aim at dead bodies
          const d = dist(player.pos, e.pos);
          if (d < minDst) {
              minDst = d;
              nearestEnemy = e;
          }
      });

      if (nearestEnemy && minDst < AUTO_AIM_RANGE) {
          targetRotation = Math.atan2(nearestEnemy.pos.y - player.pos.y, nearestEnemy.pos.x - player.pos.x);
      }
    }
    player.rotation = targetRotation;

    // 3. Camera Follow
    const targetCamX = player.pos.x - CANVAS_WIDTH / 2;
    const targetCamY = player.pos.y - CANVAS_HEIGHT / 2;
    refs.camera.current.x += (targetCamX - refs.camera.current.x) * 0.1;
    refs.camera.current.y += (targetCamY - refs.camera.current.y) * 0.1;
    refs.camera.current.x = Math.max(0, Math.min(WORLD_WIDTH - CANVAS_WIDTH, refs.camera.current.x));
    refs.camera.current.y = Math.max(0, Math.min(WORLD_HEIGHT - CANVAS_HEIGHT, refs.camera.current.y));

    // 4. Attack / Interact
    const isAttacking = refs.isMouseDown.current || refs.keys.current.has(map[Action.SHOOT]);
    const weapon = WEAPONS[refs.currentWeapon.current];
    
    if (isAttacking && time - (player.lastAttackTime || 0) > weapon.fireRate) {
      const currentAmmo = refs.ammo.current[weapon.type];
      
      if (currentAmmo !== 0) {
         player.lastAttackTime = time;
         
         if (weapon.isDeployable) {
             handlePlacement(refs, weapon);
         } else {
             handleShooting(refs, weapon, player);
         }
      }
    }

    // 5. Enemy Spawning
    const difficulty = refs.difficultyLevel.current;
    const maxEnemies = 40 + (refs.wave.current * 5) + (difficulty * 4);
    const spawnRate = 0.08 * Math.pow(1.1, difficulty); 

    if (refs.enemies.current.length < maxEnemies) {
      if (Math.random() < spawnRate) {
        spawnEnemy(refs, player);
      }
    }

    // 6. Enemy AI & State
    refs.enemies.current.forEach(enemy => {
      if(!enemy.body) return;
      enemy.pos.x = enemy.body.position.x;
      enemy.pos.y = enemy.body.position.y;

      // Handle Dying Animation
      if (enemy.dying) {
          enemy.dyingTimer = (enemy.dyingTimer || 0) - 1;
          if (enemy.dyingTimer <= 0) {
              enemy.isDead = true;
              Matter.World.remove(refs.engine.world, enemy.body);
              enemy.body = undefined;
          }
          return; // Skip AI
      }

      const dToPlayer = dist(enemy.pos, player.pos);
      const angle = Math.atan2(player.pos.y - enemy.pos.y, player.pos.x - enemy.pos.x);
      enemy.rotation = angle;

      // Devil Virus Attack
      if (enemy.type === EntityType.DEVIL) {
         if (dToPlayer < 600 && time - (enemy.lastAttackTime || 0) > DEVIL_FIRE_RATE) {
             enemy.lastAttackTime = time;
             spawnVirus(refs, enemy, player);
         }
      }

      // Stun Check
      const isStunned = Date.now() - (enemy.lastHitTime || 0) < 300;
      if (!isStunned) {
           const speed = enemy.type === EntityType.DEVIL ? DEVIL_SPEED : ZOMBIE_SPEED;
           Matter.Body.setVelocity(enemy.body, {
               x: Math.cos(angle) * speed,
               y: Math.sin(angle) * speed
           });
      }
    });

    // 7. Cleanup & Sync
    updateBullets(refs);
    updateObstacles(refs);
    updateItems(refs); 
    refs.enemies.current = refs.enemies.current.filter(e => !e.isDead);
    updateParticles(refs);
    
    // 8. UI Callbacks
    refs.frame.current++;
    if (refs.frame.current % 10 === 0) {
      refs.callbacks.current.onScoreUpdate(refs.score.current, refs.multiplier.current);
      refs.callbacks.current.onHealthUpdate(player.hp);
      refs.callbacks.current.onAmmoUpdate(refs.currentWeapon.current, refs.ammo.current[refs.currentWeapon.current]);
    }
};

// --- Helpers for Update ---

const handlePlacement = (refs: GameRefs, weapon: any) => {
    const gridSize = 16; 
    const rawX = refs.player.current.pos.x;
    const rawY = refs.player.current.pos.y;
    
    const snapX = Math.round(rawX / gridSize) * gridSize;
    const snapY = Math.round(rawY / gridSize) * gridSize;
    const placePos = { x: snapX, y: snapY };

    const bodies = Matter.Query.point(Matter.Composite.allBodies(refs.engine.world), placePos);
    const isStacked = bodies.some((b: any) => b.label === 'OBSTACLE' || b.label === 'WALL');

    if (!isStacked) {
        refs.soundSystem.current?.playBuild(); 

        if (weapon.ammo !== -1) refs.ammo.current[weapon.type] = Math.max(0, refs.ammo.current[weapon.type] - 1);
        
        const radius = 8; 
        let body;
        
        if (weapon.type === WeaponType.FAKE_WALL) {
            body = Matter.Bodies.rectangle(placePos.x, placePos.y, 16, 16, { 
                isStatic: true, 
                label: 'OBSTACLE',
                collisionFilter: { 
                    category: CAT_OBSTACLE,
                    mask: 0xFFFFFFFF ^ CAT_PLAYER 
                },
                render: { fillStyle: weapon.color }
            });
        } else {
            body = Matter.Bodies.circle(placePos.x, placePos.y, radius, { 
                isStatic: true, 
                label: 'OBSTACLE',
                collisionFilter: { 
                    category: CAT_OBSTACLE,
                    mask: 0xFFFFFFFF ^ CAT_PLAYER 
                }
            });
        }
        Matter.World.add(refs.engine.world, body);

        const obs: Entity = {
            id: Math.random(),
            type: EntityType.OBSTACLE,
            pos: placePos,
            velocity: { x: 0, y: 0 },
            rotation: 0,
            radius: radius,
            hp: weapon.type === WeaponType.BARREL ? 1 : 500,
            maxHp: weapon.type === WeaponType.BARREL ? 1 : 500,
            color: weapon.type === WeaponType.BARREL ? COLORS.OBSTACLE_BARREL : COLORS.OBSTACLE_WALL,
            isDead: false,
            isExplosive: weapon.type === WeaponType.BARREL,
            body: body
        };
        body.plugin.entity = obs;
        refs.obstacles.current.push(obs);
    }
};

const handleShooting = (refs: GameRefs, weapon: any, player: Entity) => {
    refs.soundSystem.current?.playShoot(weapon.type); 
    if (weapon.ammo !== -1) refs.ammo.current[weapon.type] = Math.max(0, refs.ammo.current[weapon.type] - 1);
    
    for (let i = 0; i < weapon.count; i++) {
      const spread = (Math.random() - 0.5) * weapon.spread;
      const angle = player.rotation + spread;
      
      const bBody = Matter.Bodies.circle(player.pos.x + Math.cos(angle)*25, player.pos.y + Math.sin(angle)*25, 3, {
          label: 'BULLET',
          frictionAir: 0,
          isSensor: true, 
          density: 0.001,
          collisionFilter: { category: CAT_BULLET, mask: 0xFFFFFFFF ^ CAT_PLAYER } 
      });
      
      const vx = Math.cos(angle) * weapon.speed;
      const vy = Math.sin(angle) * weapon.speed;
      Matter.Body.setVelocity(bBody, { x: vx, y: vy });
      Matter.World.add(refs.engine.world, bBody);

      const bullet: Bullet = {
        id: Math.random(),
        pos: { x: bBody.position.x, y: bBody.position.y },
        velocity: { x: vx, y: vy },
        damage: weapon.damage,
        active: true,
        color: weapon.color,
        body: bBody
      };
      bBody.plugin.entity = bullet;
      refs.bullets.current.push(bullet);
    }
};

const spawnVirus = (refs: GameRefs, devil: Entity, target: Entity) => {
    refs.soundSystem.current?.playVirusShoot(); 
    const angle = Math.atan2(target.pos.y - devil.pos.y, target.pos.x - devil.pos.x);
    const bBody = Matter.Bodies.circle(devil.pos.x + Math.cos(angle)*15, devil.pos.y + Math.sin(angle)*15, 6, {
        label: 'BULLET',
        frictionAir: 0,
        isSensor: false,
        density: 0.01,
        collisionFilter: { 
            category: CAT_ENEMY_BULLET, 
            mask: CAT_PLAYER | CAT_WALL | CAT_OBSTACLE 
        } 
    });
    
    const vx = Math.cos(angle) * VIRUS_SPEED;
    const vy = Math.sin(angle) * VIRUS_SPEED;
    Matter.Body.setVelocity(bBody, { x: vx, y: vy });
    Matter.World.add(refs.engine.world, bBody);

    const bullet: Bullet = {
        id: Math.random(),
        pos: { x: bBody.position.x, y: bBody.position.y },
        velocity: { x: vx, y: vy },
        damage: VIRUS_DAMAGE,
        active: true,
        color: '#00FF00',
        isVirus: true,
        body: bBody
    };
    bBody.plugin.entity = bullet;
    refs.bullets.current.push(bullet);
};

const spawnEnemy = (refs: GameRefs, player: Entity) => {
    const baseChance = 0.1;
    const waveChance = refs.wave.current * 0.05;
    const devilChance = Math.min(0.4, baseChance + waveChance);
    
    const isDevil = Math.random() < devilChance;
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = 800;
    let spawnX = player.pos.x + Math.cos(spawnAngle) * spawnDist;
    let spawnY = player.pos.y + Math.sin(spawnAngle) * spawnDist;
    spawnX = Math.max(60, Math.min(WORLD_WIDTH - 60, spawnX));
    spawnY = Math.max(60, Math.min(WORLD_HEIGHT - 60, spawnY));

    const radius = 9;
    const body = Matter.Bodies.circle(spawnX, spawnY, radius, {
        label: 'ENEMY',
        // Low friction to allow knockback sliding
        frictionAir: 0.02,
        inertia: Infinity,
        collisionFilter: { category: CAT_ENEMY }
    });
    Matter.World.add(refs.engine.world, body);
    
    const enemy: Entity = {
      id: Math.random(),
      type: isDevil ? EntityType.DEVIL : EntityType.ZOMBIE,
      pos: { x: spawnX, y: spawnY },
      velocity: { x: 0, y: 0 },
      rotation: 0,
      radius: radius,
      hp: isDevil ? DEVIL_HP : ZOMBIE_HP,
      maxHp: isDevil ? DEVIL_HP : ZOMBIE_HP,
      color: isDevil ? COLORS.DEVIL_SKIN : COLORS.ZOMBIE_SKIN,
      isDead: false,
      body: body
    };
    body.plugin.entity = enemy;
    refs.enemies.current.push(enemy);
};

const updateBullets = (refs: GameRefs) => {
    refs.bullets.current.forEach(b => {
        if (b.body) {
           b.pos.x = b.body.position.x;
           b.pos.y = b.body.position.y;
           b.velocity = { x: b.body.velocity.x, y: b.body.velocity.y }; 
           
           if (b.pos.x < 0 || b.pos.x > WORLD_WIDTH || b.pos.y < 0 || b.pos.y > WORLD_HEIGHT) {
               b.active = false;
           }
        }
        if (!b.active && b.body) {
            Matter.World.remove(refs.engine.world, b.body);
            b.body = undefined;
        }
    });
    refs.bullets.current = refs.bullets.current.filter(b => b.active);
};

const updateObstacles = (refs: GameRefs) => {
    refs.obstacles.current.forEach(obs => {
        if (obs.body) {
            obs.pos.x = obs.body.position.x;
            obs.pos.y = obs.body.position.y;
        }
        if (obs.hp <= 0 && !obs.isDead) {
            obs.isDead = true;
            if (obs.body) Matter.World.remove(refs.engine.world, obs.body);
            if (obs.isExplosive) {
                createExplosion(refs, obs.pos, 800, BARREL_EXPLOSION_RANGE); 
            } else {
                spawnParticles(refs, obs.pos, 10, '#888888', 3, false); 
            }
        }
    });
    refs.obstacles.current = refs.obstacles.current.filter(o => !o.isDead);
};

const updateItems = (refs: GameRefs) => {
    refs.items.current.forEach(item => {
        if (item.isDead && item.body) {
            Matter.World.remove(refs.engine.world, item.body);
        }
    });
    refs.items.current = refs.items.current.filter(item => !item.isDead);
};

const updateParticles = (refs: GameRefs) => {
    // Limit particles for performance
    if (refs.particles.current.length > 200) {
        refs.particles.current.splice(0, refs.particles.current.length - 200);
    }

    refs.particles.current.forEach(p => {
      p.pos.x += p.velocity.x;
      p.pos.y += p.velocity.y;
      p.velocity.x *= 0.9;
      p.velocity.y *= 0.9;
      p.life -= p.decay;
      
      if (p.life <= 0 && p.isBlood && refs.bloodDecals.current.length < 500) {
        refs.bloodDecals.current.push({ ...p, life: 1, velocity: { x: 0, y: 0 } });
      }
    });
    refs.particles.current = refs.particles.current.filter(p => p.life > 0);
};

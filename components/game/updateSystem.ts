
// @ts-ignore
import Matter from 'matter-js';
import { GameRefs } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, WORLD_WIDTH, WORLD_HEIGHT, PLAYER_SPEED, ZOMBIE_SPEED, DEVIL_SPEED, WEAPONS, ZOMBIE_HP, DEVIL_HP, COLORS, DEVIL_FIRE_RATE, VIRUS_SPEED, VIRUS_DAMAGE } from '../../constants';
import { WeaponType, EntityType, Entity, Bullet } from '../../types';
import { dist, spawnParticles } from './utils';
import { createExplosion, CAT_BULLET, CAT_PLAYER, CAT_ENEMY, CAT_OBSTACLE, CAT_ENEMY_BULLET, CAT_WALL } from './physicsSystem';

export const updateGame = (refs: GameRefs, time: number) => {
    const player = refs.player.current;
    const pBody = player.body;
    
    if (!pBody) return;

    const worldMouseX = refs.mouse.current.x + refs.camera.current.x;
    const worldMouseY = refs.mouse.current.y + refs.camera.current.y;
    
    // 1. Player Movement
    let moveX = 0;
    let moveY = 0;
    if (refs.keys.current.has('KeyW') || refs.keys.current.has('ArrowUp')) moveY -= 1;
    if (refs.keys.current.has('KeyS') || refs.keys.current.has('ArrowDown')) moveY += 1;
    if (refs.keys.current.has('KeyA') || refs.keys.current.has('ArrowLeft')) moveX -= 1;
    if (refs.keys.current.has('KeyD') || refs.keys.current.has('ArrowRight')) moveX += 1;

    if (moveX !== 0 || moveY !== 0) {
      const len = Math.sqrt(moveX * moveX + moveY * moveY);
      moveX /= len;
      moveY /= len;
      Matter.Body.setVelocity(pBody, { x: moveX * PLAYER_SPEED, y: moveY * PLAYER_SPEED });
    } else {
      Matter.Body.setVelocity(pBody, { x: 0, y: 0 });
    }

    // Sync Render Position
    player.pos.x = pBody.position.x;
    player.pos.y = pBody.position.y;

    // 2. Rotation (Auto-Aim)
    let targetRotation = Math.atan2(worldMouseY - player.pos.y, worldMouseX - player.pos.x);
    
    if ([WeaponType.PISTOL, WeaponType.UZI, WeaponType.SHOTGUN].includes(refs.currentWeapon.current)) {
      let nearestEnemy: Entity | null = null;
      let minDst = Infinity;
      const AUTO_AIM_RANGE = 600;

      refs.enemies.current.forEach(e => {
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
    const isAttacking = refs.isMouseDown.current || refs.keys.current.has('KeyJ');
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
    if (refs.enemies.current.length < 8 + refs.wave.current * 2) {
      if (Math.random() < 0.02) {
        spawnEnemy(refs, player);
      }
    }

    // 6. Enemy AI
    refs.enemies.current.forEach(enemy => {
      if(!enemy.body) return;
      enemy.pos.x = enemy.body.position.x;
      enemy.pos.y = enemy.body.position.y;

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
      const isStunned = Date.now() - (enemy.lastHitTime || 0) < 200;
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
    // Grid Snapping Logic: 16px (Wall Diameter)
    const gridSize = 16; 
    const rawX = refs.player.current.pos.x;
    const rawY = refs.player.current.pos.y;
    
    const snapX = Math.round(rawX / gridSize) * gridSize;
    const snapY = Math.round(rawY / gridSize) * gridSize;
    const placePos = { x: snapX, y: snapY };

    const bodies = Matter.Query.point(Matter.Composite.allBodies(refs.engine.world), placePos);
    const isStacked = bodies.some((b: any) => b.label === 'OBSTACLE' || b.label === 'WALL');

    if (!isStacked) {
        refs.soundSystem.current?.playBuild(); // Safe Sound

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
    refs.soundSystem.current?.playShoot(weapon.type); // Safe Sound
    if (weapon.ammo !== -1) refs.ammo.current[weapon.type] = Math.max(0, refs.ammo.current[weapon.type] - 1);
    
    for (let i = 0; i < weapon.count; i++) {
      const spread = (Math.random() - 0.5) * weapon.spread;
      const angle = player.rotation + spread;
      
      const bBody = Matter.Bodies.circle(player.pos.x + Math.cos(angle)*20, player.pos.y + Math.sin(angle)*20, 3, {
          label: 'BULLET',
          frictionAir: 0,
          isSensor: false,
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
    refs.soundSystem.current?.playVirusShoot(); // Safe Sound
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
    const isDevil = Math.random() < Math.min(0.05 * refs.wave.current, 0.3);
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = 800;
    let spawnX = player.pos.x + Math.cos(spawnAngle) * spawnDist;
    let spawnY = player.pos.y + Math.sin(spawnAngle) * spawnDist;
    spawnX = Math.max(60, Math.min(WORLD_WIDTH - 60, spawnX));
    spawnY = Math.max(60, Math.min(WORLD_HEIGHT - 60, spawnY));

    const radius = 9;
    const body = Matter.Bodies.circle(spawnX, spawnY, radius, {
        label: 'ENEMY',
        frictionAir: 0.05,
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
                createExplosion(refs, obs.pos, 800); 
            } else {
                spawnParticles(refs, obs.pos, 10, '#888888', 3, false); 
            }
        }
    });
    refs.obstacles.current = refs.obstacles.current.filter(o => !o.isDead);
};

const updateParticles = (refs: GameRefs) => {
    refs.particles.current.forEach(p => {
      p.pos.x += p.velocity.x;
      p.pos.y += p.velocity.y;
      p.velocity.x *= 0.9;
      p.velocity.y *= 0.9;
      p.life -= p.decay;
      
      if (p.life <= 0 && p.isBlood && refs.bloodDecals.current.length < 1000) {
        refs.bloodDecals.current.push({ ...p, life: 1, velocity: { x: 0, y: 0 } });
      }
    });
    refs.particles.current = refs.particles.current.filter(p => p.life > 0);
};


// @ts-ignore
import Matter from 'matter-js';
import { GameRefs } from './types';
import { WORLD_WIDTH, WORLD_HEIGHT, PLAYER_SPEED, ZOMBIE_SPEED, DEVIL_SPEED, WEAPONS, ZOMBIE_HP, DEVIL_HP, PLAYER_HP, COLORS, DEVIL_FIRE_RATE, VIRUS_SPEED, VIRUS_DAMAGE, BARREL_EXPLOSION_RANGE, CAT_BULLET, CAT_PLAYER, CAT_ENEMY, CAT_OBSTACLE, CAT_ENEMY_BULLET, CAT_WALL, CAT_ITEM, DIFFICULTY_CONFIG } from '../../constants';
import { WeaponType, EntityType, Entity, Bullet, PlayerEntity } from '../../types';
import { dist, spawnParticles } from './utils';
import { createExplosion } from './physicsSystem';
import { Action } from './inputConfig';

export const updateGame = (refs: GameRefs, time: number) => {
    const players = refs.players.current;
    
    // Handle lives system: revive players with remaining lives
    players.forEach(player => {
        if (player.isDead && player.lives > 0) {
            // Player died but has lives remaining - revive them
            player.lives--;
            player.isDead = false;
            player.hp = PLAYER_HP;
            player.maxHp = PLAYER_HP;
            
            // Reset player position to spawn point
            const startPositions = players.length === 1 
                ? [{ x: WORLD_WIDTH / 2, y: 150 }]
                : [{ x: WORLD_WIDTH / 2 - 40, y: 150 }, { x: WORLD_WIDTH / 2 + 40, y: 150 }];
            const spawnPos = startPositions[player.playerId - 1] || { x: WORLD_WIDTH / 2, y: 150 };
            
            if (player.body) {
                Matter.Body.setPosition(player.body, spawnPos);
                Matter.Body.setVelocity(player.body, { x: 0, y: 0 });
            }
            player.pos = spawnPos;
            
            // Show message
            refs.gameMessage.current = `P${player.playerId} 复活！（剩余生命: ${player.lives}）`;
            refs.gameMessageTimer.current = 120;
            refs.soundSystem.current?.playPickup();
        }
    });
    
    const activePlayers = players.filter(p => !p.isDead);
    
    if (players.length > 0 && activePlayers.length === 0) {
        // All players dead (no lives remaining)
        refs.callbacks.current.onGameOver(refs.score.current);
        return;
    }
    
    // --- Difficulty Scaling ---
    const calculatedDifficulty = Math.floor(refs.score.current / 10000);
    if (calculatedDifficulty > refs.difficultyLevel.current) {
        refs.difficultyLevel.current = calculatedDifficulty;
        refs.gameMessage.current = `警告：敌人大量涌现！（等级 ${calculatedDifficulty}）`;
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
    
    // Update each player
    players.forEach(player => {
        if (player.isDead) return;
        
        const pBody = player.body;
        const map = refs.keyMaps.current[player.playerId]; // Use playerId as key
        if (!map) return;
        
        // Gamepad support: use mapping to find which gamepad controls this player
        // Find the gamepad index that maps to this player
        let gamepadIndex: number | null = null;
        for (const [gIndex, pId] of Object.entries(refs.gamepadToPlayer.current)) {
          if (pId === player.playerId) {
            gamepadIndex = parseInt(gIndex, 10);
            break;
          }
        }
        
        const gamepad = gamepadIndex !== null ? refs.gamepads.current[gamepadIndex] : null;
        const gamepadButtons = gamepadIndex !== null ? (refs.gamepadButtons.current[gamepadIndex] || new Set<number>()) : new Set<number>();
        const hasGamepad = gamepad !== null && gamepad !== undefined;
        
        // 0. Weapon Switching
        // Keyboard input
        if (refs.keys.current.has(map[Action.WEAPON_PISTOL])) player.currentWeapon = WeaponType.PISTOL;
        if (refs.keys.current.has(map[Action.WEAPON_UZI])) player.currentWeapon = WeaponType.UZI;
        if (refs.keys.current.has(map[Action.WEAPON_SHOTGUN])) player.currentWeapon = WeaponType.SHOTGUN;
        if (refs.keys.current.has(map[Action.WEAPON_WALL])) player.currentWeapon = WeaponType.FAKE_WALL;
        if (refs.keys.current.has(map[Action.WEAPON_BARREL])) player.currentWeapon = WeaponType.BARREL;
        if (refs.keys.current.has(map[Action.WEAPON_CANNON])) player.currentWeapon = WeaponType.CANNON;
        
        // Gamepad weapon selection (D-pad)
        if (hasGamepad) {
            if (gamepadButtons.has(12)) player.currentWeapon = WeaponType.PISTOL; // D-pad Up
            if (gamepadButtons.has(13)) player.currentWeapon = WeaponType.UZI; // D-pad Down
            if (gamepadButtons.has(14)) player.currentWeapon = WeaponType.SHOTGUN; // D-pad Left
            if (gamepadButtons.has(15)) player.currentWeapon = WeaponType.FAKE_WALL; // D-pad Right
        }
        
        // 循环切换武器（与虚拟按键功能相同）
        // Keyboard
        if (refs.keys.current.has(map[Action.WEAPON_SWITCH])) {
            // 防抖：200ms 内只切换一次
            const lastSwitchTime = (player as any).lastWeaponSwitchTime || 0;
            if (time - lastSwitchTime > 200) {
                (player as any).lastWeaponSwitchTime = time;
                
                // 根据当前武器切换到下一个（循环顺序：PISTOL -> UZI -> SHOTGUN -> FAKE_WALL -> BARREL -> CANNON -> PISTOL）
                switch (player.currentWeapon) {
                    case WeaponType.PISTOL:
                        player.currentWeapon = WeaponType.UZI;
                        break;
                    case WeaponType.UZI:
                        player.currentWeapon = WeaponType.SHOTGUN;
                        break;
                    case WeaponType.SHOTGUN:
                        player.currentWeapon = WeaponType.FAKE_WALL;
                        break;
                    case WeaponType.FAKE_WALL:
                        player.currentWeapon = WeaponType.BARREL;
                        break;
                    case WeaponType.BARREL:
                        player.currentWeapon = WeaponType.CANNON;
                        break;
                    case WeaponType.CANNON:
                        player.currentWeapon = WeaponType.PISTOL;
                        break;
                    default:
                        player.currentWeapon = WeaponType.PISTOL;
                        break;
                }
            }
        }
        
        // Gamepad weapon switch (X button or RB/LB)
        if (hasGamepad) {
            const lastSwitchTime = (player as any).lastWeaponSwitchTime || 0;
            if (gamepadButtons.has(2) || gamepadButtons.has(5)) { // X button or RB
                if (time - lastSwitchTime > 200) {
                    (player as any).lastWeaponSwitchTime = time;
                    switch (player.currentWeapon) {
                        case WeaponType.PISTOL:
                            player.currentWeapon = WeaponType.UZI;
                            break;
                        case WeaponType.UZI:
                            player.currentWeapon = WeaponType.SHOTGUN;
                            break;
                        case WeaponType.SHOTGUN:
                            player.currentWeapon = WeaponType.FAKE_WALL;
                            break;
                        case WeaponType.FAKE_WALL:
                            player.currentWeapon = WeaponType.BARREL;
                            break;
                        case WeaponType.BARREL:
                            player.currentWeapon = WeaponType.CANNON;
                            break;
                        case WeaponType.CANNON:
                            player.currentWeapon = WeaponType.PISTOL;
                            break;
                        default:
                            player.currentWeapon = WeaponType.PISTOL;
                            break;
                    }
                }
            }
            // LB: previous weapon
            if (gamepadButtons.has(4)) {
                if (time - lastSwitchTime > 200) {
                    (player as any).lastWeaponSwitchTime = time;
                    switch (player.currentWeapon) {
                        case WeaponType.PISTOL:
                            player.currentWeapon = WeaponType.CANNON;
                            break;
                        case WeaponType.UZI:
                            player.currentWeapon = WeaponType.PISTOL;
                            break;
                        case WeaponType.SHOTGUN:
                            player.currentWeapon = WeaponType.UZI;
                            break;
                        case WeaponType.FAKE_WALL:
                            player.currentWeapon = WeaponType.SHOTGUN;
                            break;
                        case WeaponType.BARREL:
                            player.currentWeapon = WeaponType.FAKE_WALL;
                            break;
                        case WeaponType.CANNON:
                            player.currentWeapon = WeaponType.BARREL;
                            break;
                        default:
                            player.currentWeapon = WeaponType.PISTOL;
                            break;
                    }
                }
            }
        }

        // 1. Player Movement
        let moveX = 0;
        let moveY = 0;
        
        // Keyboard input
        if (refs.keys.current.has(map[Action.MOVE_UP])) moveY -= 1;
        if (refs.keys.current.has(map[Action.MOVE_DOWN])) moveY += 1;
        if (refs.keys.current.has(map[Action.MOVE_LEFT])) moveX -= 1;
        if (refs.keys.current.has(map[Action.MOVE_RIGHT])) moveX += 1;
        
        // Gamepad left stick input
        if (hasGamepad && gamepad.axes.length >= 2) {
            const deadzone = 0.15; // 死区，避免摇杆轻微偏移
            const stickX = Math.abs(gamepad.axes[0]) > deadzone ? gamepad.axes[0] : 0;
            const stickY = Math.abs(gamepad.axes[1]) > deadzone ? gamepad.axes[1] : 0;
            moveX += stickX;
            moveY += stickY;
        }

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

        // 2. Rotation
        // P1 uses Mouse, P2 uses Movement Direction (or maybe aiming keys if we had them)
        // For P2 (Keyboard only), let's make them face moving direction if moving, or last direction.
        // Or better: strict 8-way shooting if we had shoot keys. But we only have 1 shoot key.
        // So auto-aim is critical for P2.
        
        let targetRotation = player.rotation;
        
        // Gamepad right stick aiming (takes priority)
        if (hasGamepad && gamepad.axes.length >= 4) {
            const deadzone = 0.15;
            const rightStickX = Math.abs(gamepad.axes[2]) > deadzone ? gamepad.axes[2] : 0;
            const rightStickY = Math.abs(gamepad.axes[3]) > deadzone ? gamepad.axes[3] : 0;
            if (rightStickX !== 0 || rightStickY !== 0) {
                targetRotation = Math.atan2(rightStickY, rightStickX);
            } else if (player.playerId === 1) {
                // P1: Mouse Aim (fallback if no right stick input)
                targetRotation = Math.atan2(worldMouseY - player.pos.y, worldMouseX - player.pos.x);
            } else if (moveX !== 0 || moveY !== 0) {
                // P2: Face movement direction by default
                targetRotation = Math.atan2(moveY, moveX);
            }
        } else if (player.playerId === 1) {
            // P1: Mouse Aim
            targetRotation = Math.atan2(worldMouseY - player.pos.y, worldMouseX - player.pos.x);
        } else if (moveX !== 0 || moveY !== 0) {
             // P2: Face movement direction by default
             targetRotation = Math.atan2(moveY, moveX);
        }
        
        // Auto-Aim Override (for gun weapons)
        if ([WeaponType.PISTOL, WeaponType.UZI, WeaponType.SHOTGUN, WeaponType.CANNON].includes(player.currentWeapon)) {
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
              // Simple auto-aim logic: if P2 is not moving or moving roughly towards enemy, lock on?
              // For P1, mouse overrides unless mouse is close to player? No, Boxhead usually has strict mouse aim.
              // But the existing code had auto-aim. Let's keep it.
              // Existing logic: "if nearestEnemy < range, aim at it". This overrides mouse.
              targetRotation = Math.atan2(nearestEnemy.pos.y - player.pos.y, nearestEnemy.pos.x - player.pos.x);
          }
        }
        player.rotation = targetRotation;

        // 4. Attack / Interact
        // P1 can use MouseDown OR Key. P2 uses Key.
        // Gamepad: A button (button 0) or RT (button 7)
        const isP1MouseDown = player.playerId === 1 && refs.isMouseDown.current;
        const isKeyAttack = refs.keys.current.has(map[Action.SHOOT]);
        const isGamepadAttack = hasGamepad && (gamepadButtons.has(0) || gamepadButtons.has(7)); // A button or RT
        
        const isAttacking = isP1MouseDown || isKeyAttack || isGamepadAttack;
        const weapon = WEAPONS[player.currentWeapon];
        
        if (isAttacking && time - (player.lastAttackTime || 0) > weapon.fireRate) {
          const currentAmmo = player.ammo[weapon.type];
          
          if (currentAmmo !== 0) {
             player.lastAttackTime = time;
             
             if (weapon.isDeployable) {
                 handlePlacement(refs, weapon, player);
             } else {
                 handleShooting(refs, weapon, player);
             }
          }
        }
    }); // End Player Loop

    // 3. Camera Follow (Midpoint of all active players)
    if (activePlayers.length > 0) {
        let sumX = 0; 
        let sumY = 0;
        activePlayers.forEach(p => {
            sumX += p.pos.x;
            sumY += p.pos.y;
        });
        const avgX = sumX / activePlayers.length;
        const avgY = sumY / activePlayers.length;

        // 获取画布实际尺寸
        const canvasWidth = refs.canvasWidth || window.innerWidth;
        const canvasHeight = refs.canvasHeight || window.innerHeight;
        
        const targetCamX = avgX - canvasWidth / 2;
        const targetCamY = avgY - canvasHeight / 2;
        
        refs.camera.current.x += (targetCamX - refs.camera.current.x) * 0.1;
        refs.camera.current.y += (targetCamY - refs.camera.current.y) * 0.1;
        refs.camera.current.x = Math.max(0, Math.min(WORLD_WIDTH - canvasWidth, refs.camera.current.x));
        refs.camera.current.y = Math.max(0, Math.min(WORLD_HEIGHT - canvasHeight, refs.camera.current.y));
    }
    
    // 5. Enemy Spawning - Wave System
    const userDifficulty = refs.difficulty.current; // 用户选择的难度设置
    const difficultyConfig = DIFFICULTY_CONFIG[userDifficulty];
    const playerCount = Math.max(1, activePlayers.length);
    
    // 检查当前波次是否完成（所有怪物都被消灭）
    const aliveEnemies = refs.enemies.current.filter(e => !e.isDead && !e.dying);
    const currentEnemyCount = aliveEnemies.length;
    
    // 处理倒计时
    if (refs.waveCountdown.current > 0) {
        refs.waveCountdown.current--;
        const secondsLeft = Math.ceil(refs.waveCountdown.current / 60);
        if (secondsLeft > 0) {
            refs.gameMessage.current = `下一波将在 ${secondsLeft} 秒后开始...`;
            refs.gameMessageTimer.current = 60; // 持续显示
        }
        
        // 倒计时结束，开始新的一波
        if (refs.waveCountdown.current === 0) {
            refs.wave.current++;
            refs.isSpawningWave.current = true;
            
            // 销毁安全屋并重置掉落标志
            refs.safeHouse.current = null;
            refs.safeHouseDropped.current = false; // 重置，新一波可以掉落安全屋道具
            
            // 计算当前波的怪物数量：基础数量 + 波次增长 + 玩家数量加成 + 难度加成
            const baseWaveEnemies = 20 + (refs.wave.current * 10); // 第1波30只，第2波40只，第3波50只...
            const playerMultiplier = 1 + (playerCount - 1) * 0.5; // 多玩家增加50%每玩家
            const difficultyMultiplier = difficultyConfig.maxEnemiesMultiplier;
            const waveEnemiesTotal = Math.floor(baseWaveEnemies * playerMultiplier * difficultyMultiplier);
            
            refs.waveEnemiesTotal.current = waveEnemiesTotal;
            refs.waveEnemiesRemaining.current = waveEnemiesTotal;
            
            // 显示波次消息
            refs.gameMessage.current = `第 ${refs.wave.current} 波开始！`;
            refs.gameMessageTimer.current = 120; // 2秒（60fps）
        }
    }
    // 如果还没有开始第一波，直接开始
    else if (refs.waveEnemiesTotal.current === 0 && refs.waveEnemiesRemaining.current === 0) {
        refs.wave.current = 1;
        refs.isSpawningWave.current = true;
        
        // 重置安全屋状态
        refs.safeHouse.current = null;
        refs.safeHouseDropped.current = false;
        
        // 计算当前波的怪物数量
        const baseWaveEnemies = 20 + (refs.wave.current * 10); // 第1波30只，第2波40只，第3波50只...
        const playerMultiplier = 1 + (playerCount - 1) * 0.5;
        const difficultyMultiplier = difficultyConfig.maxEnemiesMultiplier;
        const waveEnemiesTotal = Math.floor(baseWaveEnemies * playerMultiplier * difficultyMultiplier);
        
        refs.waveEnemiesTotal.current = waveEnemiesTotal;
        refs.waveEnemiesRemaining.current = waveEnemiesTotal;
        
        // 显示波次消息
        refs.gameMessage.current = `第 ${refs.wave.current} 波开始！`;
        refs.gameMessageTimer.current = 120;
    }
    // 如果波次完成（剩余怪物数为0且不在生成中且没有倒计时），启动5秒倒计时
    else if (!refs.isSpawningWave.current && refs.waveEnemiesRemaining.current === 0 && currentEnemyCount === 0 && refs.waveCountdown.current === 0) {
        refs.waveCountdown.current = 300; // 5秒倒计时（60fps * 5）
        refs.gameMessage.current = `第 ${refs.wave.current} 波完成！下一波将在 5 秒后开始...`;
        refs.gameMessageTimer.current = 60;
    }
    
    // 如果正在生成波次且没有倒计时，持续生成怪物
    if (refs.isSpawningWave.current && refs.waveEnemiesRemaining.current > 0 && refs.waveCountdown.current === 0) {
        // 每帧有一定概率生成怪物，但限制同时存在的怪物数量
        const maxConcurrentEnemies = Math.min(30, Math.floor(refs.waveEnemiesTotal.current * 0.6)); // 最多同时存在60%的怪物
        
        if (currentEnemyCount < maxConcurrentEnemies) {
            // 生成率：根据剩余怪物数调整，剩余越多生成越快
            const spawnRate = Math.min(0.15, 0.05 + (refs.waveEnemiesRemaining.current / refs.waveEnemiesTotal.current) * 0.1);
            
            if (Math.random() < spawnRate) {
                const target = activePlayers[Math.floor(Math.random() * activePlayers.length)];
                if (target) {
                    spawnEnemy(refs, target);
                    refs.waveEnemiesRemaining.current--;
                }
            }
        }
        
        // 如果所有怪物都已生成，标记生成完成
        if (refs.waveEnemiesRemaining.current === 0) {
            refs.isSpawningWave.current = false;
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

      // Find closest player (排除在安全屋内的玩家)
      let nearestPlayer: Entity | null = null;
      let minDist = Infinity;
      
      activePlayers.forEach(p => {
          // 检查玩家是否在安全屋内
          const safeHouse = refs.safeHouse.current;
          let isInSafeHouse = false;
          if (safeHouse) {
              isInSafeHouse = p.pos.x >= safeHouse.x && 
                             p.pos.x <= safeHouse.x + safeHouse.width &&
                             p.pos.y >= safeHouse.y && 
                             p.pos.y <= safeHouse.y + safeHouse.height;
          }
          
          // 如果玩家在安全屋内，僵尸无法发现
          if (isInSafeHouse) return;
          
          const d = dist(enemy.pos, p.pos);
          if (d < minDist) {
              minDist = d;
              nearestPlayer = p;
          }
      });

      if (!nearestPlayer) return; // No target

      const angle = Math.atan2(nearestPlayer.pos.y - enemy.pos.y, nearestPlayer.pos.x - enemy.pos.x);
      enemy.rotation = angle;

      // Devil Virus Attack
      if (enemy.type === EntityType.DEVIL) {
         const dToTarget = minDist;
         if (dToTarget < 600 && time - (enemy.lastAttackTime || 0) > DEVIL_FIRE_RATE) {
             enemy.lastAttackTime = time;
             spawnVirus(refs, enemy, nearestPlayer);
         }
      }

      // Stun Check
      const isStunned = Date.now() - (enemy.lastHitTime || 0) < 300;
      if (!isStunned) {
           const baseSpeed = enemy.type === EntityType.DEVIL ? DEVIL_SPEED : ZOMBIE_SPEED;
           const difficultyConfig = DIFFICULTY_CONFIG[refs.difficulty.current];
           const speed = baseSpeed * difficultyConfig.speedMultiplier;
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
      
      // Prepare data for UI
      const hps = players.map(p => p.hp);
      const lives = players.map(p => p.lives);
      refs.callbacks.current.onHealthUpdate(hps, lives);
      
      const p1 = players[0];
      const p2 = players[1]; // undefined if single player
      const p3 = players[2]; // undefined if less than 3 players
      
      const p1Info = { weapon: p1.currentWeapon, ammo: p1.ammo[p1.currentWeapon] };
      const p2Info = p2 ? { weapon: p2.currentWeapon, ammo: p2.ammo[p2.currentWeapon] } : undefined;
      const p3Info = p3 ? { weapon: p3.currentWeapon, ammo: p3.ammo[p3.currentWeapon] } : undefined;
      
      refs.callbacks.current.onAmmoUpdate(p1Info, p2Info, p3Info);
    }
};

// --- Helpers for Update ---

const handlePlacement = (refs: GameRefs, weapon: any, player: PlayerEntity) => {
    const gridSize = 32; 
    const rawX = player.pos.x;
    const rawY = player.pos.y;
    
    const snapX = Math.round(rawX / gridSize) * gridSize;
    const snapY = Math.round(rawY / gridSize) * gridSize;
    const placePos = { x: snapX, y: snapY };

    const bodies = Matter.Query.point(Matter.Composite.allBodies(refs.engine.world), placePos);
    const isStacked = bodies.some((b: any) => b.label === 'OBSTACLE' || b.label === 'WALL');

    if (!isStacked) {
        refs.soundSystem.current?.playBuild(); 

        if (weapon.ammo !== -1) player.ammo[weapon.type] = Math.max(0, player.ammo[weapon.type] - 1);
        
        const radius = 16; 
        let body;
        
        if (weapon.type === WeaponType.FAKE_WALL) {
            body = Matter.Bodies.rectangle(placePos.x, placePos.y, 32, 32, { 
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

const handleShooting = (refs: GameRefs, weapon: any, player: PlayerEntity) => {
    refs.soundSystem.current?.playShoot(weapon.type); 
    if (weapon.ammo !== -1) player.ammo[weapon.type] = Math.max(0, player.ammo[weapon.type] - 1);
    
    // 大炮子弹更大
    const bulletRadius = weapon.type === WeaponType.CANNON ? 6 : 3;
    
    for (let i = 0; i < weapon.count; i++) {
      const spread = (Math.random() - 0.5) * weapon.spread;
      const angle = player.rotation + spread;
      
      const bBody = Matter.Bodies.circle(player.pos.x + Math.cos(angle)*25, player.pos.y + Math.sin(angle)*25, bulletRadius, {
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
        isCannon: weapon.type === WeaponType.CANNON,
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
    const difficultyConfig = DIFFICULTY_CONFIG[refs.difficulty.current];
    const baseDevilChance = Math.min(0.4, baseChance + waveChance);
    const devilChance = baseDevilChance * difficultyConfig.devilChanceMultiplier;
    
    const isDevil = Math.random() < devilChance;
    
    // 只在地图边缘生成怪物
    const edge = Math.floor(Math.random() * 4); // 0=上, 1=右, 2=下, 3=左
    const margin = 60; // 边缘边距
    let spawnX: number, spawnY: number;
    
    switch(edge) {
        case 0: // 上边缘
            spawnX = margin + Math.random() * (WORLD_WIDTH - margin * 2);
            spawnY = margin;
            break;
        case 1: // 右边缘
            spawnX = WORLD_WIDTH - margin;
            spawnY = margin + Math.random() * (WORLD_HEIGHT - margin * 2);
            break;
        case 2: // 下边缘
            spawnX = margin + Math.random() * (WORLD_WIDTH - margin * 2);
            spawnY = WORLD_HEIGHT - margin;
            break;
        case 3: // 左边缘
            spawnX = margin;
            spawnY = margin + Math.random() * (WORLD_HEIGHT - margin * 2);
            break;
        default:
            spawnX = margin;
            spawnY = margin;
    }

    const radius = 18;
    const body = Matter.Bodies.circle(spawnX, spawnY, radius, {
        label: 'ENEMY',
        // Low friction to allow knockback sliding
        frictionAir: 0.02,
        inertia: Infinity,
        collisionFilter: { category: CAT_ENEMY }
    });
    Matter.World.add(refs.engine.world, body);
    
    const enemyHp = Math.round((isDevil ? DEVIL_HP : ZOMBIE_HP) * difficultyConfig.hpMultiplier);
    
    const enemy: Entity = {
      id: Math.random(),
      type: isDevil ? EntityType.DEVIL : EntityType.ZOMBIE,
      pos: { x: spawnX, y: spawnY },
      velocity: { x: 0, y: 0 },
      rotation: 0,
      radius: radius,
      hp: enemyHp,
      maxHp: enemyHp,
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
                createExplosion(refs, obs.pos, 1200, BARREL_EXPLOSION_RANGE); 
            } else {
                spawnParticles(refs, obs.pos, 10, '#888888', 3, false); 
            }
        }
    });
    refs.obstacles.current = refs.obstacles.current.filter(o => !o.isDead);
};

const updateItems = (refs: GameRefs) => {
    const now = Date.now();
    const HEALTH_PACK_LIFETIME = 20000; // 血包20秒后自动销毁
    
    refs.items.current.forEach(item => {
        // 检查血包是否超时
        if (item.type === EntityType.ITEM_HEALTH && item.spawnTime) {
            if (now - item.spawnTime > HEALTH_PACK_LIFETIME) {
                item.isDead = true;
            }
        }
        
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

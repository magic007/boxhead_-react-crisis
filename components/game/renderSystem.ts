
import { GameRefs } from './types';
import { WORLD_WIDTH, WORLD_HEIGHT, COLORS, WEAPONS, CANVAS_WIDTH } from '../../constants';
import { Entity, PlayerEntity, EntityType, WeaponType } from '../../types';

// 缓存地板纹理
let floorPattern: CanvasPattern | null = null;

// 辅助函数：调整颜色明暗度以实现立体效果
const shadeColor = (color: string, percent: number): string => {
    // 解析颜色
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);

    // 调整亮度
    R = Math.min(255, Math.max(0, R + percent));
    G = Math.min(255, Math.max(0, G + percent));
    B = Math.min(255, Math.max(0, B + percent));

    // 转换回十六进制
    const RR = R.toString(16).padStart(2, '0');
    const GG = G.toString(16).padStart(2, '0');
    const BB = B.toString(16).padStart(2, '0');

    return `#${RR}${GG}${BB}`;
};

const getFloorPattern = (ctx: CanvasRenderingContext2D) => {
    if (floorPattern) return floorPattern;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const c = canvas.getContext('2d');
    if (!c) return null;
    
    // 基础地板颜色 - 温暖的沙色/米色
    c.fillStyle = '#f0e6d2'; // 稍微亮一点，更干净
    c.fillRect(0, 0, 64, 64);
    
    // 瓷砖缝隙
    c.strokeStyle = '#d8d0c0'; // 浅灰色缝隙
    c.lineWidth = 2;
    c.strokeRect(0, 0, 64, 64);
    
    // 简单的内部高光（保持一点立体感）
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.fillRect(0, 0, 64, 2);
    c.fillRect(0, 0, 2, 64);

    floorPattern = ctx.createPattern(canvas, 'repeat');
    return floorPattern;
}

const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

export const renderGame = (ctx: CanvasRenderingContext2D, refs: GameRefs) => {
    ctx.save();
    ctx.translate(-refs.camera.current.x, -refs.camera.current.y);

    // 1. Background (Textured Floor)
    const pattern = getFloorPattern(ctx);
    if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    } else {
    ctx.fillStyle = COLORS.FLOOR;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    }
    
    // 2. Blood Decals (Realistic Splatters)
    refs.bloodDecals.current.forEach(d => {
      ctx.save();
      ctx.translate(d.pos.x, d.pos.y);
      ctx.rotate(d.rotation);
      ctx.fillStyle = '#8a0303'; // 干涸的血迹颜色
      ctx.globalAlpha = 0.7;
      
      // 绘制不规则血迹
      ctx.beginPath();
      const s = d.size;
      ctx.moveTo(-s/2, -s/4);
      ctx.bezierCurveTo(-s/2, -s, s/2, -s, s/2, -s/4);
      ctx.bezierCurveTo(s, 0, s, s/2, s/2, s/2);
      ctx.bezierCurveTo(0, s, -s/2, s/2, -s/2, s/2);
      ctx.fill();
      
      // 额外的小斑点
      ctx.beginPath();
      ctx.arc(s/1.5, -s/2, s/5, 0, Math.PI*2);
      ctx.fill();
      
      ctx.restore();
    });

    // 3. Obstacles (Barrels & Crates)
    refs.obstacles.current.forEach(obs => {
        ctx.save();
        ctx.translate(obs.pos.x, obs.pos.y);
        
        const healthRatio = obs.hp / obs.maxHp;
        
        if (obs.isExplosive && obs.body) {
            // --- 油漆桶 (Barrel) - 极简金属质感图标 ---
           ctx.rotate(obs.body.angle);
            const width = obs.radius * 1.3;
            const height = obs.radius * 2.1;
            const cornerRadius = Math.min(width, height) * 0.22;
            const stripeHeight = height * 0.28;
            const padding = width * 0.1;
            const shadowDepth = height * 0.35;
            const shadowLength = width * 0.4;
            const shadowRightSkew = width * 0.08;

            // 浅阴影（左侧斜倒，顶部与桶底对齐）
            ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
            ctx.beginPath();
            ctx.moveTo(-width / 2, height / 2);
            ctx.lineTo(width / 2, height / 2);
            ctx.lineTo(width / 2 + shadowRightSkew, height / 2 - shadowDepth);
            ctx.lineTo(-width / 2 - shadowLength, height / 2 - shadowDepth);
            ctx.closePath();
            ctx.fill();

            // 主体（深灰金属，扁平渐变）
            const bodyGrad = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
            bodyGrad.addColorStop(0, '#1f1f22');
            bodyGrad.addColorStop(0.5, '#303035');
            bodyGrad.addColorStop(1, '#3f3f45');
            ctx.fillStyle = bodyGrad;
            drawRoundedRect(ctx, -width / 2, -height / 2, width, height, cornerRadius);
            ctx.fill();

            // 红色环形条纹
            ctx.fillStyle = '#d62828';
            drawRoundedRect(
                ctx,
                -width / 2 + padding,
                -stripeHeight / 2,
                width - padding * 2,
                stripeHeight,
                stripeHeight * 0.25
            );
            ctx.fill(); 

            // 顶部高光线
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-width / 2 + padding, -height / 2 + padding);
            ctx.lineTo(width / 2 - padding, -height / 2 + padding);
            ctx.stroke();

            // 底部分割线
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.beginPath();
            ctx.moveTo(-width / 2 + padding, height / 2 - padding);
            ctx.lineTo(width / 2 - padding, height / 2 - padding);
            ctx.stroke();

            // 边框
            ctx.strokeStyle = '#0f0f11';
            ctx.lineWidth = 2;
            drawRoundedRect(ctx, -width / 2, -height / 2, width, height, cornerRadius);
            ctx.stroke();

        } else {
            // --- 木箱/假墙 (Crate/Wall) - 长方形 ---
            const size = obs.radius * 1.4; // 更窄
            const half = size / 2;
            const shadowDepth = size * 0.35;
            const shadowLength = size * 0.55;
            const shadowSkew = size * 0.1;
            
            // 阴影（左侧斜倒，顶部与箱底对齐）
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.beginPath();
            ctx.moveTo(-half, half);
            ctx.lineTo(half, half);
            ctx.lineTo(half + shadowSkew, half - shadowDepth);
            ctx.lineTo(-half - shadowLength, half - shadowDepth);
            ctx.closePath();
            ctx.fill();
            
            // 箱子主体 (木纹) - 光源从右下，从左上暗到右下亮
            const gradFront = ctx.createLinearGradient(-half, -half, half, half);
            gradFront.addColorStop(0, '#6d4320');
            gradFront.addColorStop(0.5, '#8b5a2b');
            gradFront.addColorStop(1, '#a67c52');
            ctx.fillStyle = gradFront;
            ctx.fillRect(-half, -half, size, size);
            
            // 木板纹理线条
            ctx.strokeStyle = '#6d4320';
            ctx.lineWidth = 1.5;
            const plankH = size / 3;
            for(let i=1; i<3; i++) {
                ctx.beginPath();
                ctx.moveTo(-half, -half + i*plankH);
                ctx.lineTo(half, -half + i*plankH);
                ctx.stroke();
            }
            
            // 垂直木板线
            for(let i=1; i<3; i++) {
                ctx.beginPath();
                ctx.moveTo(-half + i*(size/3), -half);
                ctx.lineTo(-half + i*(size/3), half);
                ctx.stroke();
            }
            
            // 钉子（四个角）
            const nailPositions = [
                [-half + 4, -half + 4],
                [half - 4, -half + 4],
                [-half + 4, half - 4],
                [half - 4, half - 4]
            ];
            
            nailPositions.forEach(([x, y]) => {
                // 钉子主体
                ctx.fillStyle = '#3e2714';
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI*2);
                ctx.fill();
            });
            
            // 边框 (金属加固条)
            ctx.strokeStyle = '#4a3326';
            ctx.lineWidth = 2;
            ctx.strokeRect(-half, -half, size, size);
            
            // 交叉加固
            ctx.strokeStyle = '#5c4033';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-half + 3, -half + 3);
            ctx.lineTo(half - 3, half - 3);
            ctx.moveTo(half - 3, -half + 3);
            ctx.lineTo(-half + 3, half - 3);
            ctx.stroke();
        }
        
        // Damage Overlay (Crack effect)
        if (healthRatio < 1) {
            ctx.fillStyle = `rgba(0, 0, 0, ${0.5 * (1 - healthRatio)})`;
             if (obs.isExplosive) {
                ctx.beginPath(); ctx.arc(0, 0, obs.radius, 0, Math.PI * 2); ctx.fill();
             } else {
                const s = obs.radius * 2;
                ctx.fillRect(-s/2, -s/2, s, s);
             }
        }

        ctx.restore();
    });

    // 4. Walls (简化的墙体)
    refs.mapWalls.current.forEach(w => {
       ctx.save();
       ctx.translate(w.x, w.y);
       
       // 墙体主体 - 光源从右下，从左上暗到右下亮
       const wallGrad = ctx.createLinearGradient(-w.w/2, -w.h/2, w.w/2, w.h/2);
       wallGrad.addColorStop(0, '#4a4a4a');
       wallGrad.addColorStop(0.5, '#6a6a6a');
       wallGrad.addColorStop(1, '#8a8a8a');
       ctx.fillStyle = wallGrad;
       ctx.fillRect(-w.w/2, -w.h/2, w.w, w.h);
       
       // 砖缝纹理
       ctx.strokeStyle = 'rgba(0,0,0,0.4)';
       ctx.lineWidth = 1.5;
       ctx.beginPath();
       // Horizontal lines
       for(let i=-w.h/2; i<w.h/2; i+=20) {
           ctx.moveTo(-w.w/2, i);
           ctx.lineTo(w.w/2, i);
       }
       // Vertical lines (staggered)
       for(let i=-w.h/2; i<w.h/2; i+=20) {
           const offset = (i % 40 === 0) ? 0 : 20;
           for(let j=-w.w/2 + offset; j<w.w/2; j+=40) {
               ctx.moveTo(j, i);
               ctx.lineTo(j, i+20);
           }
       }
       ctx.stroke();
       
       // 边框
       ctx.strokeStyle = 'rgba(0,0,0,0.6)';
       ctx.lineWidth = 2;
       ctx.strokeRect(-w.w/2, -w.h/2, w.w, w.h);

       ctx.restore();
    });
    
    // 5. Items (Health Packs - 简化的医疗包)
    refs.items.current.forEach(item => {
        if (item.type === EntityType.ITEM_HEALTH) {
            ctx.save();
            ctx.translate(item.pos.x, item.pos.y);
            
            // Float Animation
            const floatY = Math.sin(Date.now() * 0.005) * 3;
            ctx.translate(0, floatY);
            
            const s = 18; // 更小的尺寸
            const shadowDepth = s * 0.4;
            const shadowLength = s * 0.6;
            const shadowSkew = s * 0.12;
            
            // 阴影（左侧斜倒，顶部贴合底部）
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.moveTo(-s/2, s/2);
            ctx.lineTo(s/2, s/2);
            ctx.lineTo(s/2 + shadowSkew, s/2 - shadowDepth);
            ctx.lineTo(-s/2 - shadowLength, s/2 - shadowDepth);
            ctx.closePath();
            ctx.fill();
            
            // Box Body (White) - 光源从右下，从左上暗到右下亮
            const boxGrad = ctx.createLinearGradient(-s/2, -s/2, s/2, s/2);
            boxGrad.addColorStop(0, '#dddddd');
            boxGrad.addColorStop(0.5, '#eeeeee');
            boxGrad.addColorStop(1, '#ffffff');
            ctx.fillStyle = boxGrad;
            ctx.fillRect(-s/2, -s/2, s, s);
            
            // Red Cross
            ctx.fillStyle = '#ff0000';
            const cs = 10;
            const cw = 3;
            ctx.fillRect(-cw/2, -cs/2, cw, cs);
            ctx.fillRect(-cs/2, -cw/2, cs, cw);
            
            // Box border
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-s/2, -s/2, s, s);
            
            ctx.restore();
        }
    });

    // 6. Entities (Characters)
    // Sort by Y to handle simple depth
    const allEntities = [
        ...refs.enemies.current,
        ...refs.players.current.filter(p => !p.isDead)
    ].sort((a, b) => a.pos.y - b.pos.y);

    allEntities.forEach(e => {
        if (e.type === EntityType.PLAYER) drawPlayer(ctx, e as PlayerEntity);
        else drawZombie(ctx, e);
    });

    // 7. Bullets (Glowing Tracers)
    refs.bullets.current.forEach(b => {
      ctx.save();
      ctx.translate(b.pos.x, b.pos.y);
      
      if (b.isVirus) {
        // Virus: Green slimy blob
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00ff00';
        
        const wobble = Math.sin(Date.now() * 0.02) * 1;
        ctx.fillStyle = '#33ff33';
        ctx.beginPath();
        ctx.arc(0, 0, 5 + wobble, 0, Math.PI * 2);
        ctx.fill();
        
        // Core
        ctx.fillStyle = '#ccffcc';
        ctx.beginPath();
        ctx.arc(-2, -2, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Bullet
        const isCannon = b.damage >= 150;
        const isGrenade = b.isGrenade;
        
        if (isGrenade) {
            // Grenade Drawing
            ctx.rotate(Date.now() * 0.01);
            ctx.fillStyle = '#228b22'; // Green
            ctx.fillRect(-4, -4, 8, 8);
            ctx.fillStyle = '#000';
            ctx.fillRect(-1, -5, 2, 2); // Pin
        } else {
            // Standard / Cannon Bullet
            const bulletSize = isCannon ? 6 : 2.5;
            
            ctx.shadowBlur = isCannon ? 15 : 5;
          ctx.shadowColor = b.color;
        
            ctx.fillStyle = '#fff'; // White hot core
        ctx.beginPath();
        ctx.arc(0, 0, bulletSize, 0, Math.PI * 2); 
        ctx.fill();
        
            // Trail
          ctx.shadowBlur = 0;
            if (Math.abs(b.velocity.x) > 0.1 || Math.abs(b.velocity.y) > 0.1) {
                const angle = Math.atan2(b.velocity.y, b.velocity.x);
                ctx.rotate(angle);
                
                const grad = ctx.createLinearGradient(0, 0, -20, 0);
                grad.addColorStop(0, b.color);
                grad.addColorStop(1, 'rgba(255,255,255,0)');
                
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(0, bulletSize);
                ctx.lineTo(- (isCannon ? 30 : 15), 0);
                ctx.lineTo(0, -bulletSize);
                ctx.fill();
            }
        }
      }
      ctx.restore();
    });

    // 8. Particles (Glowing)
    refs.particles.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      // Square particles look digital/retro, circles look smoother
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.size/2, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });

    // 9. Placement Preview
    refs.players.current.forEach(p => {
        if (p.isDead) return;
        const weaponConfig = WEAPONS[p.currentWeapon];
        if (weaponConfig.isDeployable) {
            const px = p.pos.x;
            const py = p.pos.y;
            
            ctx.save();
            ctx.translate(px, py);
            ctx.globalAlpha = 0.5;
            if (p.currentWeapon === WeaponType.BARREL) {
                ctx.fillStyle = '#ff0000';
                ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
            } else {
                ctx.fillStyle = '#8b5a2b';
                ctx.fillRect(-8, -8, 16, 16); 
            }
            ctx.globalAlpha = 1.0;
            ctx.restore();
        }
    });

    ctx.restore();

    // 10. Game Message
    if (refs.gameMessage.current) {
        ctx.save();
        ctx.font = '900 36px "Arial Black", Gadget, sans-serif';
        ctx.textAlign = 'center';
        const hue = (Date.now() / 10) % 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.strokeText(refs.gameMessage.current, CANVAS_WIDTH / 2, 120);
        ctx.fillText(refs.gameMessage.current, CANVAS_WIDTH / 2, 120);
        ctx.restore();
    }
};

// --- Character Drawing Functions ---

const drawPlayer = (ctx: CanvasRenderingContext2D, p: PlayerEntity) => {
    ctx.save();
    ctx.translate(p.pos.x, p.pos.y);
    
    // HUD (HP Bar) - 增强版带动画效果
    ctx.save();
    ctx.rotate(0); 
    
    const hpPercent = (p.hp / p.maxHp) * 100;
    const isLowHealth = hpPercent <= 20;
    const isCriticalHealth = hpPercent <= 10;
    
    // 脉冲效果（使用时间实现动画）
    const pulseValue = Math.sin(Date.now() / 200) * 0.5 + 0.5; // 0-1之间波动
    
    // 血条背景（黑色半透明）
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(-16, -36, 32, 5);
    
    // 血条边框 - 低血量时改变颜色和效果
    if (isCriticalHealth) {
        // 危急状态：红色边框 + 脉冲效果
        ctx.strokeStyle = `rgba(220, 38, 38, ${0.8 + pulseValue * 0.2})`;
        ctx.lineWidth = 2 + pulseValue * 1;
        // 红色发光效果
        ctx.shadowColor = 'rgba(220, 38, 38, 0.8)';
        ctx.shadowBlur = 4 + pulseValue * 4;
    } else if (isLowHealth) {
        // 低血量：橙红色边框 + 轻微脉冲
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.7 + pulseValue * 0.2})`;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
        ctx.shadowBlur = 2;
    } else {
        // 正常状态：白色边框
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
    }
    ctx.strokeRect(-16, -36, 32, 5);
    ctx.shadowBlur = 0; // 重置阴影
    
    // 血条填充 - 根据血量改变颜色
    let hpColor;
    if (hpPercent > 50) {
        hpColor = '#22c55e'; // 绿色
    } else if (hpPercent > 20) {
        hpColor = '#eab308'; // 黄色
    } else {
        // 低血量时红色脉冲效果
        const redIntensity = Math.floor(185 + pulseValue * 70);
        hpColor = `rgb(${redIntensity}, 30, 30)`;
    }
    
    ctx.fillStyle = hpColor;
    const hpWidth = 30 * (p.hp / p.maxHp);
    ctx.fillRect(-15, -35, hpWidth, 3);
    
    ctx.restore();

    const size = p.radius * 1.6; // 更窄
    const shadowDepth = size * 0.45;
    const shadowLength = size * 0.75;
    const shadowSkew = size * 0.15;
    
    // 阴影（左侧斜倒，与脚底齐平）
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.moveTo(-size/2, size/2);
    ctx.lineTo(size/2, size/2);
    ctx.lineTo(size/2 + shadowSkew, size/2 - shadowDepth);
    ctx.lineTo(-size/2 - shadowLength, size/2 - shadowDepth);
    ctx.closePath();
    ctx.fill();
    
    ctx.rotate(p.rotation);
    
    // Body 主体 - 光源从右下，从左上暗到右下亮
    const bodyGrad = ctx.createLinearGradient(-size/2, -size/2, size/2, size/2);
    bodyGrad.addColorStop(0, shadeColor(p.color, -20));
    bodyGrad.addColorStop(0.5, p.color);
    bodyGrad.addColorStop(1, shadeColor(p.color, 20));
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(-size/2, -size/2, size, size);
    
    // Body Border
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.strokeRect(-size/2, -size/2, size, size);
    
    // Head 主体 - 光源从右下，从左上暗到右下亮
    const headSize = size * 0.7;
    const headGrad = ctx.createLinearGradient(-headSize/2, -headSize/2, headSize/2, headSize/2);
    headGrad.addColorStop(0, shadeColor(COLORS.PLAYER_SKIN, -15));
    headGrad.addColorStop(0.5, COLORS.PLAYER_SKIN);
    headGrad.addColorStop(1, shadeColor(COLORS.PLAYER_SKIN, 15));
    ctx.fillStyle = headGrad;
    ctx.fillRect(-headSize/2, -headSize/2, headSize, headSize);
    ctx.strokeRect(-headSize/2, -headSize/2, headSize, headSize);
    
    // Hair
      ctx.fillStyle = COLORS.PLAYER_HAIR;
    ctx.fillRect(-headSize/2, -headSize/2, headSize, headSize * 0.4);
    
    // Eyes (simple)
    ctx.fillStyle = '#000';
    const eyeSize = 2;
    const eyeY = -headSize * 0.15;
    ctx.fillRect(headSize * 0.15, eyeY, eyeSize, eyeSize);
    ctx.fillRect(headSize * 0.15, -eyeY, eyeSize, eyeSize);
    
    // Hands (简化为圆形)
    ctx.fillStyle = COLORS.PLAYER_SKIN;
    ctx.beginPath(); ctx.arc(size/2, -size/3, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(size/2, size/3, 3, 0, Math.PI*2); ctx.fill();
    
    // Weapon (Visual representation)
    drawWeaponHeld(ctx, p.currentWeapon);

    ctx.restore();
}

const drawWeaponHeld = (ctx: CanvasRenderingContext2D, type: WeaponType) => {
    ctx.save();
    ctx.translate(12, 0); // Move to front of player
    
    // Weapon shadow
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 3;

    if (type === WeaponType.PISTOL) {
        ctx.fillStyle = '#333';
        ctx.fillRect(0, -2, 10, 4); // Longer Barrel
        ctx.fillStyle = '#111';
        ctx.fillRect(-2, -2, 4, 4); // Grip area
    } else if (type === WeaponType.UZI) {
        ctx.fillStyle = '#333';
        ctx.fillRect(0, -3, 12, 6); 
        ctx.fillStyle = '#000';
        ctx.fillRect(2, 3, 3, 5); // Mag
    } else if (type === WeaponType.SHOTGUN) {
        ctx.fillStyle = '#5c4033'; // Wood stock
        ctx.fillRect(-6, -3, 10, 6);
        ctx.fillStyle = '#333'; // Metal barrel
        ctx.fillRect(4, -2, 14, 4);
    } else if (type === WeaponType.CANNON) {
        ctx.fillStyle = '#111';
        ctx.fillRect(-4, -6, 20, 12);
        ctx.fillStyle = '#444'; // Highlights
        ctx.fillRect(4, -5, 12, 2);
    }
    // Throwable/Placeables held in hand
    else if (type === WeaponType.GRENADE) {
        ctx.fillStyle = 'green';
        ctx.beginPath(); ctx.arc(4, 0, 5, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.stroke();
    }

    ctx.restore();
}

const drawZombie = (ctx: CanvasRenderingContext2D, z: Entity) => {
    ctx.save();
    ctx.translate(z.pos.x, z.pos.y);
    
    const size = z.radius * 1.6; // 更窄
    const isDevil = z.type === EntityType.DEVIL;
    const shadowDepth = size * 0.45;
    const shadowLength = size * 0.75;
    const shadowSkew = size * 0.15;
    
    // Colors
    const skinColor = isDevil ? '#cc0000' : '#a8b0a0'; // Red skin / Pale Green skin
    const shirtColor = isDevil ? '#800000' : '#555555'; // Red for devil, Grey for zombie
    const bloodColor = '#8a0303';

    // 1. Shadow（左侧斜倒，顶部贴合脚底）
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.moveTo(-size/2, size/2);
    ctx.lineTo(size/2, size/2);
    ctx.lineTo(size/2 + shadowSkew, size/2 - shadowDepth);
    ctx.lineTo(-size/2 - shadowLength, size/2 - shadowDepth);
    ctx.closePath();
    ctx.fill();
    
    ctx.rotate(z.rotation);

    // 2. Arms (Forward Reaching - 简化)
    const armLength = size * 0.8;
    const armWidth = size * 0.2;
    const shoulderY = size * 0.3;
    
    // Arm gradient - 光源从右下，对角线渐变
    const armGrad = ctx.createLinearGradient(0, -armWidth/2, armLength, armWidth/2);
    armGrad.addColorStop(0, shadeColor(skinColor, -15));
    armGrad.addColorStop(0.5, skinColor);
    armGrad.addColorStop(1, shadeColor(skinColor, 15));
    ctx.fillStyle = armGrad;
    
    // Left Arm (Top)
    ctx.fillRect(0, -shoulderY - armWidth/2, armLength, armWidth);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, -shoulderY - armWidth/2, armLength, armWidth);
    
    // Right Arm (Bottom)
    ctx.fillRect(0, shoulderY - armWidth/2, armLength, armWidth);
    ctx.strokeRect(0, shoulderY - armWidth/2, armLength, armWidth);
    
    // Hands (Bloodied tips)
    ctx.fillStyle = bloodColor;
    ctx.fillRect(armLength - 2, -shoulderY - armWidth/2, 3, armWidth);
    ctx.fillRect(armLength - 2, shoulderY - armWidth/2, 3, armWidth);

    // 3. Body - 光源从右下，从左上暗到右下亮
    const bodyGrad = ctx.createLinearGradient(-size/2, -size/2, size/2, size/2);
    bodyGrad.addColorStop(0, shadeColor(shirtColor, -20));
    bodyGrad.addColorStop(0.5, shirtColor);
    bodyGrad.addColorStop(1, shadeColor(shirtColor, 20));
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(-size/2, -size/2, size, size);
    
    // Body border
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.strokeRect(-size/2, -size/2, size, size);
    
    // Blood stains on body
    if (!isDevil) {
        ctx.fillStyle = '#3a5a3a';
        ctx.fillRect(-size/4, size/4, 4, 4);
        ctx.fillStyle = bloodColor;
        ctx.fillRect(0, -size/4, 5, 5);
    }

    // 4. Head - 光源从右下，从左上暗到右下亮
    const headSize = size * 0.7;
    
    // Head gradient
    const headGrad = ctx.createLinearGradient(-headSize/2, -headSize/2, headSize/2, headSize/2);
    headGrad.addColorStop(0, shadeColor(skinColor, -20));
    headGrad.addColorStop(0.5, skinColor);
    headGrad.addColorStop(1, shadeColor(skinColor, 20));
    ctx.fillStyle = headGrad;
    ctx.fillRect(-headSize/2, -headSize/2, headSize, headSize);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.strokeRect(-headSize/2, -headSize/2, headSize, headSize);

    // Eyes
    const eyeSize = headSize * 0.2;
    const eyeX = headSize/2 - eyeSize; 
    const eyeY = headSize * 0.25;
    
    if (isDevil) {
        // Devil eyes with glow
        ctx.fillStyle = '#ffff00'; 
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 8;
        ctx.fillRect(eyeX, -eyeY - eyeSize/2, eyeSize, eyeSize);
        ctx.fillRect(eyeX, eyeY - eyeSize/2, eyeSize, eyeSize);
        ctx.shadowBlur = 0;
    } else {
        // Zombie hollow eyes
        ctx.fillStyle = '#111'; 
        ctx.fillRect(eyeX, -eyeY - eyeSize/2, eyeSize, eyeSize);
        ctx.fillRect(eyeX, eyeY - eyeSize/2, eyeSize, eyeSize);
    }

    // Mouth (for devil)
    if (isDevil) {
        ctx.fillStyle = '#330000';
        ctx.fillRect(eyeX + 2, -eyeSize/2, 2, eyeSize); 
    }

    ctx.restore();
}

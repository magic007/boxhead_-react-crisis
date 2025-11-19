
import { GameRefs } from './types';
import { WORLD_WIDTH, WORLD_HEIGHT, COLORS, WEAPONS, CANVAS_WIDTH } from '../../constants';
import { Entity, EntityType, WeaponType } from '../../types';

export const renderGame = (ctx: CanvasRenderingContext2D, refs: GameRefs) => {
    ctx.save();
    ctx.translate(-refs.camera.current.x, -refs.camera.current.y);

    // Background
    ctx.fillStyle = COLORS.FLOOR;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    
    // Grid
    ctx.strokeStyle = '#e5dccb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for(let x=0; x<=WORLD_WIDTH; x+=100) { ctx.moveTo(x,0); ctx.lineTo(x,WORLD_HEIGHT); }
    for(let y=0; y<=WORLD_HEIGHT; y+=100) { ctx.moveTo(0,y); ctx.lineTo(WORLD_WIDTH,y); }
    ctx.stroke();

    // Blood Decals
    refs.bloodDecals.current.forEach(d => {
      ctx.save();
      ctx.translate(d.pos.x, d.pos.y);
      ctx.rotate(d.rotation);
      ctx.fillStyle = COLORS.BLOOD_OLD;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(-d.size/2, -d.size/2, d.size, d.size);
      ctx.restore();
    });

    // Obstacles
    refs.obstacles.current.forEach(obs => {
        ctx.save();
        ctx.translate(obs.pos.x, obs.pos.y);
        
        if (obs.isExplosive && obs.body) {
           ctx.rotate(obs.body.angle);
        }

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        
        if (obs.isExplosive) {
            ctx.beginPath();
            ctx.arc(2, 2, obs.radius, 0, Math.PI * 2);
            ctx.fill(); 
            ctx.fillStyle = obs.color;
            ctx.beginPath();
            ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#550000';
            ctx.stroke();
            // Detail
            ctx.beginPath();
            ctx.moveTo(0, -obs.radius);
            ctx.lineTo(0, obs.radius);
            ctx.moveTo(-obs.radius, 0);
            ctx.lineTo(obs.radius, 0);
            ctx.stroke();

            ctx.fillStyle = '#fff';
            ctx.font = '8px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('TNT', 0, 3);
        } else {
            const size = obs.radius * 2;
            ctx.fillRect(-size/2 + 4, -size/2 + 4, size, size); 
            ctx.fillStyle = obs.color;
            ctx.fillRect(-size/2, -size/2, size, size);
            ctx.strokeStyle = '#444';
            ctx.strokeRect(-size/2, -size/2, size, size);
            ctx.beginPath();
            ctx.moveTo(-size/2, -size/2);
            ctx.lineTo(size/2, size/2);
            ctx.moveTo(size/2, -size/2);
            ctx.lineTo(-size/2, size/2);
            ctx.stroke();
        }
        
        // Damage Overlay
        const healthRatio = obs.hp / obs.maxHp;
        if (healthRatio < 1) {
            ctx.fillStyle = `rgba(0, 0, 0, ${0.6 * (1 - healthRatio)})`;
             if (obs.isExplosive) {
                ctx.beginPath();
                ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
                ctx.fill();
             } else {
                const s = obs.radius * 2;
                ctx.fillRect(-s/2, -s/2, s, s);
             }
        }

        ctx.restore();
    });

    // Walls
    refs.mapWalls.current.forEach(w => {
       ctx.save();
       ctx.translate(w.x, w.y);
       ctx.fillStyle = COLORS.WALL;
       ctx.fillRect(-w.w/2, -w.h/2, w.w, w.h);
       ctx.fillStyle = COLORS.WALL_TOP;
       ctx.fillRect(-w.w/2, -w.h/2, w.w, w.h - 10);
       ctx.strokeStyle = '#333';
       ctx.lineWidth = 2;
       ctx.strokeRect(-w.w/2, -w.h/2, w.w, w.h);
       ctx.restore();
    });
    
    // Items (Health Packs)
    refs.items.current.forEach(item => {
        if (item.type === EntityType.ITEM_HEALTH) {
            ctx.save();
            ctx.translate(item.pos.x, item.pos.y);
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 5;
            
            // White Box
            ctx.fillStyle = '#ffffff';
            const s = 16;
            ctx.fillRect(-s/2, -s/2, s, s);
            
            // Red Cross
            ctx.fillStyle = '#ff0000';
            const cs = 10;
            const cw = 4;
            ctx.fillRect(-cw/2, -cs/2, cw, cs);
            ctx.fillRect(-cs/2, -cw/2, cs, cw);
            
            ctx.restore();
        }
    });

    // Entities
    refs.enemies.current.forEach(e => drawEntity(ctx, e, refs));
    if (!refs.player.current.isDead) drawEntity(ctx, refs.player.current, refs);

    // Bullets
    refs.bullets.current.forEach(b => {
      ctx.save();
      ctx.translate(b.pos.x, b.pos.y);
      
      if (b.isVirus) {
        // Draw Virus
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00FF00';
        ctx.fillStyle = '#00FF00';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        // Draw Standard Bullet
        ctx.fillStyle = b.color;
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(0, 0, b.isGrenade ? 4 : 2, 0, Math.PI * 2); 
        ctx.fill();

        if (!b.isGrenade) {
            const trailLen = 10; 
            if (Math.abs(b.velocity.x) > 0.1 || Math.abs(b.velocity.y) > 0.1) {
                const angle = Math.atan2(b.velocity.y, b.velocity.x);
                ctx.rotate(angle);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(-trailLen, 0);
                ctx.stroke();
            }
        }
      }
      ctx.restore();
    });

    // Particles
    refs.particles.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fillRect(p.pos.x - p.size/2, p.pos.y - p.size/2, p.size, p.size);
      ctx.globalAlpha = 1.0;
    });

    // Placement Preview
    if (WEAPONS[refs.currentWeapon.current].isDeployable) {
        const px = refs.player.current.pos.x;
        const py = refs.player.current.pos.y;
        
        ctx.save();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.translate(px, py);
        ctx.beginPath();
        if (refs.currentWeapon.current === WeaponType.BARREL) {
            ctx.arc(0, 0, 10, 0, Math.PI*2);
        } else {
            ctx.rect(-8, -8, 16, 16); 
        }
        ctx.stroke();
        ctx.restore();
    }

    ctx.restore();

    // Render Game Message (Screen Space, not World Space)
    if (refs.gameMessage.current) {
        ctx.save();
        ctx.font = 'bold 30px Courier New';
        ctx.textAlign = 'center';
        // Flash effect
        ctx.fillStyle = Math.floor(Date.now() / 200) % 2 === 0 ? '#ff0000' : '#ffff00';
        ctx.fillText(refs.gameMessage.current, CANVAS_WIDTH / 2, 100);
        ctx.strokeText(refs.gameMessage.current, CANVAS_WIDTH / 2, 100);
        ctx.restore();
    }
};

const drawEntity = (ctx: CanvasRenderingContext2D, e: Entity, refs: GameRefs) => {
    ctx.save();
    ctx.translate(e.pos.x, e.pos.y);
    
    // Info HUD for player
    if (e.type === EntityType.PLAYER) {
      ctx.save();
      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      let weaponName = "手枪";
      const cw = refs.currentWeapon.current;
      if (cw === WeaponType.UZI) weaponName = "冲锋枪";
      if (cw === WeaponType.SHOTGUN) weaponName = "霰弹枪";
      if (cw === WeaponType.FAKE_WALL) weaponName = "假墙";
      if (cw === WeaponType.BARREL) weaponName = "油桶";
      
      ctx.fillText(weaponName, 0, -e.radius - 10);
      ctx.fillStyle = 'red';
      ctx.fillRect(-10, -e.radius - 6, 20, 3);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(-10, -e.radius - 6, 20 * (e.hp / e.maxHp), 3);
      ctx.restore();
    }

    ctx.rotate(e.rotation);
    
    const s = e.radius * 2; 
    ctx.fillStyle = '#000000'; 
    ctx.fillRect(-s/2 - 1, -s/2 - 1, s + 2, s + 2);
    ctx.fillStyle = e.type === EntityType.PLAYER ? COLORS.PLAYER_SHIRT : e.color;
    ctx.fillRect(-s/2, -s/2, s, s);

    ctx.fillStyle = e.type === EntityType.PLAYER ? COLORS.PLAYER_SKIN : '#cccccc';
    if (e.type === EntityType.DEVIL) ctx.fillStyle = '#ff0000';
    const headSize = s * 0.6;
    ctx.fillRect(-headSize/2 + 2, -headSize/2, headSize, headSize);

    if (e.type === EntityType.PLAYER) {
      ctx.fillStyle = COLORS.PLAYER_HAIR;
      ctx.fillRect(-headSize/2 + 2, -headSize/2, headSize, headSize * 0.5);
    } else if (e.type === EntityType.ZOMBIE) {
      ctx.fillStyle = '#333333';
      ctx.fillRect(-headSize/2 + 2, -headSize/2, headSize, headSize * 0.3);
    }

    ctx.fillStyle = COLORS.PLAYER_SKIN;
    if (e.type !== EntityType.PLAYER) ctx.fillStyle = e.color;
    ctx.fillRect(s/2 - 2, -s/2, 3, 3); 
    ctx.fillRect(s/2 - 2, s/2 - 3, 3, 3);

    ctx.restore();
};

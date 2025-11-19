
import { Wall } from '../../types';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../../constants';

const WALL_THICKNESS = 40;
const WALL_GAP = 240;

const createWallRow = (y: number, gapCenterX: number): Wall[] => {
  const gapStart = gapCenterX - WALL_GAP / 2;
  const gapEnd = gapCenterX + WALL_GAP / 2;
  
  const walls: Wall[] = [];
  // Left segment
  if (gapStart > 0) {
    const w = gapStart;
    walls.push({ x: w/2, y: y, w: w, h: WALL_THICKNESS });
  }
  // Right segment
  if (gapEnd < WORLD_WIDTH) {
    const w = WORLD_WIDTH - gapEnd;
    walls.push({ x: gapEnd + w/2, y: y, w: w, h: WALL_THICKNESS });
  }
  return walls;
};

export const generateMapWalls = (): Wall[] => {
  return [
    // Borders
    { x: WORLD_WIDTH/2, y: -WALL_THICKNESS/2, w: WORLD_WIDTH + 200, h: WALL_THICKNESS }, // Top
    { x: WORLD_WIDTH/2, y: WORLD_HEIGHT + WALL_THICKNESS/2, w: WORLD_WIDTH + 200, h: WALL_THICKNESS }, // Bottom
    { x: -WALL_THICKNESS/2, y: WORLD_HEIGHT/2, w: WALL_THICKNESS, h: WORLD_HEIGHT + 200 }, // Left
    { x: WORLD_WIDTH + WALL_THICKNESS/2, y: WORLD_HEIGHT/2, w: WALL_THICKNESS, h: WORLD_HEIGHT + 200 }, // Right
    
    // Internal Walls (Staggered Gaps)
    // Wall 1 (Top): Gap on Left side
    ...createWallRow(400, 400),
    
    // Wall 2 (Middle): Gap in Center
    ...createWallRow(800, WORLD_WIDTH / 2),
    
    // Wall 3 (Bottom): Gap on Right side
    ...createWallRow(1100, WORLD_WIDTH - 400),
  ];
};

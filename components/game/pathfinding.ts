// @ts-ignore
import Matter from 'matter-js';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../../constants';

export interface PathNode {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic cost to goal
  f: number; // Total cost (g + h)
  parent: PathNode | null;
}

// Grid-based pathfinding for zombie AI
const GRID_SIZE = 32; // Match obstacle grid size
const COLS = Math.ceil(WORLD_WIDTH / GRID_SIZE);
const ROWS = Math.ceil(WORLD_HEIGHT / GRID_SIZE);

// Cache for obstacle grid (updated periodically, not every frame)
let obstacleGrid: boolean[][] = [];
let gridLastUpdate = 0;
const GRID_UPDATE_INTERVAL = 20; // Update every 20 frames (~333ms at 60fps) - more responsive to map changes

/**
 * Initialize or update the obstacle grid based on current world state
 */
export const updateObstacleGrid = (engine: any, frameCount: number): boolean[][] => {
  // Only update periodically to save performance (but always initialize on first call)
  if (obstacleGrid.length > 0 && frameCount - gridLastUpdate < GRID_UPDATE_INTERVAL) {
    return obstacleGrid;
  }
  
  gridLastUpdate = frameCount;
  
  // Initialize grid (false = walkable, true = blocked)
  const grid: boolean[][] = [];
  for (let y = 0; y < ROWS; y++) {
    grid[y] = [];
    for (let x = 0; x < COLS; x++) {
      grid[y][x] = false;
    }
  }
  
  // Mark cells with obstacles and walls as blocked
  const bodies = Matter.Composite.allBodies(engine.world);
  bodies.forEach((body: any) => {
    if (body.label === 'WALL' || body.label === 'OBSTACLE') {
      const minX = Math.floor((body.bounds.min.x) / GRID_SIZE);
      const maxX = Math.ceil((body.bounds.max.x) / GRID_SIZE);
      const minY = Math.floor((body.bounds.min.y) / GRID_SIZE);
      const maxY = Math.ceil((body.bounds.max.y) / GRID_SIZE);
      
      for (let y = Math.max(0, minY); y < Math.min(ROWS, maxY); y++) {
        for (let x = Math.max(0, minX); x < Math.min(COLS, maxX); x++) {
          grid[y][x] = true;
        }
      }
    }
  });
  
  obstacleGrid = grid;
  return grid;
};

/**
 * Convert world position to grid coordinates
 */
const worldToGrid = (worldX: number, worldY: number): { x: number, y: number } => {
  return {
    x: Math.floor(worldX / GRID_SIZE),
    y: Math.floor(worldY / GRID_SIZE)
  };
};

/**
 * Convert grid coordinates to world position (center of cell)
 */
const gridToWorld = (gridX: number, gridY: number): { x: number, y: number } => {
  return {
    x: gridX * GRID_SIZE + GRID_SIZE / 2,
    y: gridY * GRID_SIZE + GRID_SIZE / 2
  };
};

/**
 * Manhattan distance heuristic with relaxed weight
 * Lower weight allows A* to explore more paths, better for complex mazes
 */
const heuristic = (a: { x: number, y: number }, b: { x: number, y: number }): number => {
  // Use weighted Manhattan distance (0.8 weight makes it less greedy)
  // This helps find paths through staggered gaps in walls
  return (Math.abs(a.x - b.x) + Math.abs(a.y - b.y)) * 0.8;
};

/**
 * Get valid neighbors for a grid cell
 */
const getNeighbors = (node: { x: number, y: number }, grid: boolean[][]): { x: number, y: number }[] => {
  const neighbors: { x: number, y: number }[] = [];
  
  // Safety check
  if (!grid || grid.length === 0) return neighbors;
  
  const directions = [
    { x: 0, y: -1 },  // Up
    { x: 1, y: 0 },   // Right
    { x: 0, y: 1 },   // Down
    { x: -1, y: 0 },  // Left
    { x: 1, y: -1 },  // Up-Right (diagonal)
    { x: 1, y: 1 },   // Down-Right (diagonal)
    { x: -1, y: 1 },  // Down-Left (diagonal)
    { x: -1, y: -1 }  // Up-Left (diagonal)
  ];
  
  for (const dir of directions) {
    const newX = node.x + dir.x;
    const newY = node.y + dir.y;
    
    // Check bounds
    if (newX < 0 || newX >= COLS || newY < 0 || newY >= ROWS) continue;
    
    // Safety check for grid row
    if (!grid[newY] || grid[newY].length === 0) continue;
    if (!grid[node.y] || grid[node.y].length === 0) continue;
    
    // Check if blocked
    if (grid[newY][newX]) continue;
    
    // For diagonal movement, check if path is clear (no corner cutting)
    if (dir.x !== 0 && dir.y !== 0) {
      if (grid[node.y][newX] || grid[newY][node.x]) continue;
    }
    
    neighbors.push({ x: newX, y: newY });
  }
  
  return neighbors;
};

/**
 * A* Pathfinding Algorithm
 * Returns path as array of world coordinates, or null if no path found
 */
export const findPath = (
  startWorld: { x: number, y: number },
  goalWorld: { x: number, y: number },
  grid: boolean[][],
  maxIterations: number = 1000 // Increased from 300 to handle complex paths through staggered walls
): { x: number, y: number }[] | null => {
  const start = worldToGrid(startWorld.x, startWorld.y);
  const goal = worldToGrid(goalWorld.x, goalWorld.y);
  
  // Validate start and goal
  if (start.x < 0 || start.x >= COLS || start.y < 0 || start.y >= ROWS) return null;
  if (goal.x < 0 || goal.x >= COLS || goal.y < 0 || goal.y >= ROWS) return null;
  
  // Validate grid is properly initialized
  if (!grid || grid.length === 0 || !grid[goal.y] || grid[goal.y].length === 0) return null;
  
  // If goal is blocked, try to find nearest walkable cell
  if (grid[goal.y][goal.x]) {
    let found = false;
    // Increased search radius from 3 to 8 for better obstacle avoidance
    for (let radius = 1; radius <= 8 && !found; radius++) {
      for (let dy = -radius; dy <= radius && !found; dy++) {
        for (let dx = -radius; dx <= radius && !found; dx++) {
          const newX = goal.x + dx;
          const newY = goal.y + dy;
          if (newX >= 0 && newX < COLS && newY >= 0 && newY < ROWS && !grid[newY][newX]) {
            goal.x = newX;
            goal.y = newY;
            found = true;
          }
        }
      }
    }
    if (!found) return null; // No walkable cell near goal
  }
  
  const openSet: PathNode[] = [];
  const closedSet = new Set<string>();
  
  const startNode: PathNode = {
    x: start.x,
    y: start.y,
    g: 0,
    h: heuristic(start, goal),
    f: heuristic(start, goal),
    parent: null
  };
  
  openSet.push(startNode);
  let iterations = 0;
  
  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;
    
    // Find node with lowest f score
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    
    // Check if we reached the goal
    if (current.x === goal.x && current.y === goal.y) {
      // Reconstruct path
      const path: { x: number, y: number }[] = [];
      let node: PathNode | null = current;
      
      while (node !== null) {
        path.unshift(gridToWorld(node.x, node.y));
        node = node.parent;
      }
      
      // Remove first node (current position) to get only waypoints ahead
      if (path.length > 1) {
        path.shift();
      }
      
      return path;
    }
    
    closedSet.add(`${current.x},${current.y}`);
    
    // Check neighbors
    const neighbors = getNeighbors({ x: current.x, y: current.y }, grid);
    
    for (const neighbor of neighbors) {
      const key = `${neighbor.x},${neighbor.y}`;
      if (closedSet.has(key)) continue;
      
      // Calculate movement cost (diagonal = 1.414, straight = 1)
      const isDiagonal = neighbor.x !== current.x && neighbor.y !== current.y;
      const moveCost = isDiagonal ? 1.414 : 1;
      const newG = current.g + moveCost;
      
      // Check if this neighbor is already in open set
      const existingNode = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
      
      if (existingNode) {
        // Update if we found a better path
        if (newG < existingNode.g) {
          existingNode.g = newG;
          existingNode.f = newG + existingNode.h;
          existingNode.parent = current;
        }
      } else {
        // Add new node to open set
        const h = heuristic(neighbor, goal);
        openSet.push({
          x: neighbor.x,
          y: neighbor.y,
          g: newG,
          h: h,
          f: newG + h,
          parent: current
        });
      }
    }
  }
  
  // No path found
  return null;
};

/**
 * Check if there's a clear line of sight between two points (no obstacles)
 * Uses Bresenham's line algorithm for efficient raycasting
 */
export const hasLineOfSight = (
  startWorld: { x: number, y: number },
  endWorld: { x: number, y: number },
  grid: boolean[][],
  maxDistance: number = 500 // Only check LOS up to this distance
): boolean => {
  // Don't waste time checking very long distances
  const dx = endWorld.x - startWorld.x;
  const dy = endWorld.y - startWorld.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance > maxDistance) return false;
  
  // Validate grid
  if (!grid || grid.length === 0) return true; // If no grid, assume clear
  
  const start = worldToGrid(startWorld.x, startWorld.y);
  const end = worldToGrid(endWorld.x, endWorld.y);
  
  // Bresenham's line algorithm
  const dx0 = Math.abs(end.x - start.x);
  const dy0 = Math.abs(end.y - start.y);
  const sx = start.x < end.x ? 1 : -1;
  const sy = start.y < end.y ? 1 : -1;
  let err = dx0 - dy0;
  
  let x = start.x;
  let y = start.y;
  
  // Check each cell along the line
  for (let i = 0; i < 200; i++) { // Limit iterations to prevent infinite loop
    // Check bounds and obstacles
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
    if (!grid[y] || grid[y].length === 0) return true;
    if (grid[y][x]) return false; // Hit an obstacle
    
    // Reached target
    if (x === end.x && y === end.y) return true;
    
    // Continue along line
    const e2 = 2 * err;
    if (e2 > -dy0) {
      err -= dy0;
      x += sx;
    }
    if (e2 < dx0) {
      err += dx0;
      y += sy;
    }
  }
  
  return true; // If we got here without hitting obstacles, assume clear
};

/**
 * Simplified pathfinding for when direct path might work
 * Returns next position to move towards
 */
export const getNextMovePosition = (
  currentPos: { x: number, y: number },
  targetPos: { x: number, y: number },
  path: { x: number, y: number }[] | null
): { x: number, y: number } => {
  // If we have a path, follow it
  if (path && path.length > 0) {
    return path[0];
  }
  
  // Otherwise, move directly towards target (fallback)
  return targetPos;
};


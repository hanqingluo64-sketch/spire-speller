

import { MapNode, NodeType } from '../types';

const MAP_HEIGHT = 15; 
const MAP_WIDTH = 7; 

// --- SEEDED RANDOM SYSTEM ---
let _seed = Date.now();

export function initSeed(seed: number) {
    _seed = seed;
}

// Simple Linear Congruential Generator
function seededRandom(): number {
    _seed = (_seed * 9301 + 49297) % 233280;
    return _seed / 233280;
}

// Helper to determine randomness source
function rng(): number {
    return seededRandom();
}

export function generateMap(seed?: number): MapNode[] {
  if (seed !== undefined) {
      initSeed(seed);
  }
  
  const nodes: MapNode[] = [];
  const nodeGrid: (MapNode | null)[][] = Array(MAP_HEIGHT).fill(null).map(() => Array(MAP_WIDTH).fill(null));

  // --- STEP 1: GENERATE SKELETON (PATHS) ---
  
  // 1. Starting Points (Floor 0)
  const startCount = rng() > 0.5 ? 3 : 4;
  const startLanes = new Set<number>();
  while(startLanes.size < startCount) {
      startLanes.add(Math.floor(rng() * MAP_WIDTH));
  }

  // Create start nodes
  startLanes.forEach(x => {
      createNode(0, x, nodeGrid, nodes);
  });

  // 2. Propagate Upwards (Floor 0 -> 13)
  for (let y = 0; y < MAP_HEIGHT - 1; y++) {
      const currentNodes = gridRowToNodes(nodeGrid, y);
      
      currentNodes.forEach(parent => {
          const px = getNodeXIndex(parent.id);
          
          // Determine possible next moves: Left (x-1), Center (x), Right (x+1)
          const possibleMoves = [px];
          if (px > 0) possibleMoves.push(px - 1);
          if (px < MAP_WIDTH - 1) possibleMoves.push(px + 1);

          // Decision: How many paths branch out from here?
          const rand = rng();
          let branchCount = 1;
          if (rand > 0.7) branchCount = 2;
          if (rand > 0.95) branchCount = 3;

          // Shuffle moves and pick
          // Fisher-Yates shuffle using rng
          for (let i = possibleMoves.length - 1; i > 0; i--) {
              const j = Math.floor(rng() * (i + 1));
              [possibleMoves[i], possibleMoves[j]] = [possibleMoves[j], possibleMoves[i]];
          }
          const targets = possibleMoves.slice(0, branchCount);

          targets.forEach(tx => {
              // Get or Create child node
              let child = nodeGrid[y+1][tx];
              if (!child) {
                  child = createNode(y+1, tx, nodeGrid, nodes);
              }
              
              // Link
              if (!parent.next.includes(child.id)) {
                  parent.next.push(child.id);
                  child.parents.push(parent.id);
              }
          });
      });

      // Cleanup: Ensure every node on Y has a child.
      currentNodes.forEach(n => {
          if (n.next.length === 0) {
             let tx = getNodeXIndex(n.id);
             let child = nodeGrid[y+1][tx];
             if (!child) {
                 if (tx > 0) child = nodeGrid[y+1][tx-1];
                 if (!child && tx < MAP_WIDTH-1) child = nodeGrid[y+1][tx+1];
                 if (!child) child = createNode(y+1, tx, nodeGrid, nodes);
             }
             n.next.push(child.id);
             child.parents.push(n.id);
          }
      });
  }

  // --- STEP 2: BOSS NODE ---
  const bossNode: MapNode = {
      id: 'BOSS_NODE',
      x: 50,
      y: MAP_HEIGHT, // Floor 15 (Top)
      type: 'BOSS',
      status: 'LOCKED',
      next: [],
      parents: []
  };
  nodes.push(bossNode);

  // Connect Floor 14 (Campfires) to Boss
  const lastFloorNodes = gridRowToNodes(nodeGrid, MAP_HEIGHT - 1);
  lastFloorNodes.forEach(n => {
      n.next.push(bossNode.id);
      bossNode.parents.push(n.id);
  });

  // --- STEP 3: ASSIGN TYPES ---
  assignNodeTypes(nodes);

  return nodes;
}

// Rehydrate map statuses based on visited history
export function rehydrateMap(nodes: MapNode[], visitedIds: string[], currentNodeId: string | null): MapNode[] {
    return nodes.map(node => {
        if (visitedIds.includes(node.id)) {
            return { ...node, status: 'COMPLETED' };
        }
        
        // If we have a current node, calculate available next steps
        if (currentNodeId) {
            const current = nodes.find(n => n.id === currentNodeId);
            if (current && current.next.includes(node.id)) {
                return { ...node, status: 'AVAILABLE' };
            }
            if (node.id === currentNodeId) {
                 return { ...node, status: 'COMPLETED' };
            }
        } else {
             // Floor 0 nodes are available if no node is selected yet
             if (node.y === 0) return { ...node, status: 'AVAILABLE' };
        }
        
        // Default to what generateMap produced (LOCKED usually) or UNREACHABLE
        // We set everything else to LOCKED/UNREACHABLE based on logic
        return { ...node, status: 'LOCKED' };
    });
}

function createNode(y: number, xIndex: number, grid: (MapNode | null)[][], list: MapNode[]): MapNode {
    const step = 80 / (MAP_WIDTH - 1);
    const basePercent = 10 + (xIndex * step);
    const jitter = (rng() * 4) - 2; 

    const node: MapNode = {
        id: `node_${y}_${xIndex}`,
        x: basePercent + jitter,
        y: y,
        type: 'MONSTER', 
        status: 'LOCKED',
        next: [],
        parents: []
    };
    grid[y][xIndex] = node;
    list.push(node);
    return node;
}

function getNodeXIndex(id: string): number {
    return parseInt(id.split('_')[2]);
}

function gridRowToNodes(grid: (MapNode | null)[][], y: number): MapNode[] {
    return grid[y].filter(n => n !== null) as MapNode[];
}

function assignNodeTypes(nodes: MapNode[]) {
    nodes.forEach(node => {
        if (node.type === 'BOSS') return;

        const y = node.y;

        // FIXED RULES
        if (y === 0) {
            node.type = 'MONSTER'; 
            node.status = 'AVAILABLE';
            return;
        }
        if (y === 8) {
            node.type = 'TREASURE';
            return;
        }
        if (y === 14) {
            node.type = 'CAMPFIRE';
            return;
        }

        // RANDOM RULES
        const rand = rng();

        const canElite = y >= 6;
        const canShop = y >= 2;
        const canRest = y >= 6 && y !== 8 && y !== 13; 

        if (canElite && rand < 0.15) {
            node.type = 'ELITE';
        } else if (canShop && rand < 0.20) { 
            node.type = 'SHOP';
        } else if (canRest && rand < 0.28) {
             node.type = 'CAMPFIRE';
        } else if (rand < 0.50) {
            node.type = 'EVENT';
        } else {
            node.type = 'MONSTER';
        }
    });
}
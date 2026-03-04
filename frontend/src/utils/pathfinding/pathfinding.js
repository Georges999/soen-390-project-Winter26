/**
 * Pathfinding Module
 * 
 * Implements Dijkstra and A* shortest path algorithms for indoor navigation.
 * Uses MinHeap priority queue for efficient node selection.
 */

import { MinHeap } from './priorityQueue.js';
import { euclideanDistance, buildMultiFloorGraph, getNodeFloor } from './graphBuilder.js';

/**
 * Dijkstra's shortest path algorithm
 * 
 * @param {Map<string, Array<{to: string, weight: number}>>} graph - Adjacency list graph
 * @param {Map<string, Object>} nodes - Map of node data
 * @param {string} startId - Starting node ID
 * @param {string} endId - Destination node ID
 * @returns {{pathNodeIds: string[], totalWeight: number} | null} Path result or null if no path
 */
function dijkstra(graph, nodes, startId, endId) {
  // Validate inputs
  if (!graph.has(startId)) {
    return null;
  }
  if (!graph.has(endId)) {
    return null;
  }

  const distances = new Map();
  const previous = new Map();
  const visited = new Set();
  const pq = new MinHeap();

  // Initialize distances
  graph.forEach((_, nodeId) => {
    distances.set(nodeId, Infinity);
  });
  distances.set(startId, 0);

  // Start with the source node
  pq.insert(startId, 0);

  while (!pq.isEmpty()) {
    const { node: currentId } = pq.pop();

    // Skip if already visited
    if (visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);

    // Found destination
    if (currentId === endId) {
      break;
    }

    // Process neighbors
    const neighbors = graph.get(currentId) || [];
    for (const { to: neighborId, weight } of neighbors) {
      if (visited.has(neighborId)) {
        continue;
      }

      const newDistance = distances.get(currentId) + weight;

      if (newDistance < distances.get(neighborId)) {
        distances.set(neighborId, newDistance);
        previous.set(neighborId, currentId);
        pq.insert(neighborId, newDistance);
      }
    }
  }

  // Check if path exists
  if (!visited.has(endId)) {
    return null;
  }

  // Reconstruct path
  const pathNodeIds = [];
  let current = endId;
  while (current !== undefined) {
    pathNodeIds.unshift(current);
    current = previous.get(current);
  }

  return {
    pathNodeIds,
    totalWeight: distances.get(endId)
  };
}

/**
 * A* shortest path algorithm with Euclidean distance heuristic
 * 
 * @param {Map<string, Array<{to: string, weight: number}>>} graph - Adjacency list graph
 * @param {Map<string, Object>} nodes - Map of node data
 * @param {string} startId - Starting node ID
 * @param {string} endId - Destination node ID
 * @returns {{pathNodeIds: string[], totalWeight: number} | null} Path result or null if no path
 */
function aStar(graph, nodes, startId, endId) {
  // Validate inputs
  if (!graph.has(startId) || !nodes.has(startId)) {
    return null;
  }
  if (!graph.has(endId) || !nodes.has(endId)) {
    return null;
  }

  const endNode = nodes.get(endId);

  /**
   * Heuristic function: Euclidean distance to goal
   * @param {string} nodeId - Current node ID
   * @returns {number} Estimated distance to goal
   */
  const heuristic = (nodeId) => {
    const node = nodes.get(nodeId);
    if (!node) return Infinity;
    return euclideanDistance(node, endNode);
  };

  const gScore = new Map(); // Cost from start to node
  const fScore = new Map(); // gScore + heuristic
  const previous = new Map();
  const visited = new Set();
  const pq = new MinHeap();

  // Initialize scores
  graph.forEach((_, nodeId) => {
    gScore.set(nodeId, Infinity);
    fScore.set(nodeId, Infinity);
  });

  gScore.set(startId, 0);
  fScore.set(startId, heuristic(startId));

  // Start with the source node
  pq.insert(startId, fScore.get(startId));

  while (!pq.isEmpty()) {
    const { node: currentId } = pq.pop();

    // Skip if already visited
    if (visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);

    // Found destination
    if (currentId === endId) {
      break;
    }

    // Process neighbors
    const neighbors = graph.get(currentId) || [];
    for (const { to: neighborId, weight } of neighbors) {
      if (visited.has(neighborId)) {
        continue;
      }

      const tentativeGScore = gScore.get(currentId) + weight;

      if (tentativeGScore < gScore.get(neighborId)) {
        // This path is better
        previous.set(neighborId, currentId);
        gScore.set(neighborId, tentativeGScore);
        fScore.set(neighborId, tentativeGScore + heuristic(neighborId));
        pq.insert(neighborId, fScore.get(neighborId));
      }
    }
  }

  // Check if path exists
  if (!visited.has(endId)) {
    return null;
  }

  // Reconstruct path
  const pathNodeIds = [];
  let current = endId;
  while (current !== undefined) {
    pathNodeIds.unshift(current);
    current = previous.get(current);
  }

  return {
    pathNodeIds,
    totalWeight: gScore.get(endId)
  };
}

/**
 * Unified API for finding shortest path
 * 
 * @param {Object} options - Options object
 * @param {Object} options.floorsData - Floor data with nodes and edges
 * @param {string} options.startNodeId - Starting node ID
 * @param {string} options.endNodeId - Destination node ID
 * @param {string} [options.algorithm='astar'] - Algorithm to use ('astar' or 'dijkstra')
 * @returns {Object} Result object with path data or error
 */
function findShortestPath({ floorsData, startNodeId, endNodeId, algorithm = 'astar' }) {
  // Validate input parameters
  if (!floorsData) {
    return {
      ok: false,
      reason: 'floorsData is required'
    };
  }

  if (!startNodeId) {
    return {
      ok: false,
      reason: 'startNodeId is required'
    };
  }

  if (!endNodeId) {
    return {
      ok: false,
      reason: 'endNodeId is required'
    };
  }

  // Build graph from floor data
  const { graph, nodes, floorMap } = buildMultiFloorGraph(floorsData);

  // Check for empty graph
  if (graph.size === 0) {
    return {
      ok: false,
      reason: 'empty graph - no nodes found'
    };
  }

  // Validate start node exists
  if (!nodes.has(startNodeId)) {
    return {
      ok: false,
      reason: `start node "${startNodeId}" not found`
    };
  }

  // Validate end node exists
  if (!nodes.has(endNodeId)) {
    return {
      ok: false,
      reason: `end node "${endNodeId}" not found`
    };
  }

  // Check if nodes are on the same floor
  const startFloor = getNodeFloor(startNodeId, floorMap);
  const endFloor = getNodeFloor(endNodeId, floorMap);

  if (startFloor !== endFloor) {
    return {
      ok: false,
      reason: 'different floors not supported yet',
      startFloor,
      endFloor
    };
  }

  // Run pathfinding algorithm
  let result;
  const algorithmUsed = algorithm.toLowerCase() === 'dijkstra' ? 'dijkstra' : 'astar';

  if (algorithmUsed === 'dijkstra') {
    result = dijkstra(graph, nodes, startNodeId, endNodeId);
  } else {
    result = aStar(graph, nodes, startNodeId, endNodeId);
  }

  // Check if path was found
  if (!result || !result.pathNodeIds || result.pathNodeIds.length === 0) {
    return {
      ok: false,
      reason: 'no path found'
    };
  }

  // Build path coordinates for drawing on map
  const pathCoords = result.pathNodeIds.map((nodeId) => {
    const node = nodes.get(nodeId);
    return {
      id: node.id,
      x: node.x,
      y: node.y,
      floor: node.floor,
      label: node.label,
      type: node.type
    };
  });

  return {
    ok: true,
    algorithm: algorithmUsed,
    totalWeight: result.totalWeight,
    pathNodeIds: result.pathNodeIds,
    pathCoords
  };
}

export {
  dijkstra,
  aStar,
  findShortestPath
};

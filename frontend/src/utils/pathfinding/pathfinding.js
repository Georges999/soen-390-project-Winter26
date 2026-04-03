/**
 * Pathfinding Module - Dijkstra and A* algorithms for indoor navigation
 */
import { MinHeap } from './priorityQueue.js';
import { euclideanDistance, buildMultiFloorGraph, getNodeFloor } from './graphBuilder.js';

function dijkstra(graph, _nodes, startId, endId, accessibleOnly = false) {
  if (!graph.has(startId) || !graph.has(endId)) return null;

  const distances = new Map();
  const previous = new Map();
  const visited = new Set();
  const pq = new MinHeap();

  graph.forEach((_, nodeId) => distances.set(nodeId, Infinity));
  distances.set(startId, 0);
  pq.insert(startId, 0);

  while (!pq.isEmpty()) {
    const { node: currentId } = pq.pop();
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    if (currentId === endId) break;

    for (const { to: neighborId, weight, accessible } of graph.get(currentId) || []) {
      if (visited.has(neighborId)) continue;
      if (accessibleOnly && accessible === false) continue;
      const newDistance = distances.get(currentId) + weight;
      if (newDistance < distances.get(neighborId)) {
        distances.set(neighborId, newDistance);
        previous.set(neighborId, currentId);
        pq.insert(neighborId, newDistance);
      }
    }
  }

  if (!visited.has(endId)) return null;

  const pathNodeIds = [];
  let current = endId;
  while (current !== undefined) {
    pathNodeIds.unshift(current);
    current = previous.get(current);
  }
  return { pathNodeIds, totalWeight: distances.get(endId) };
}

function aStar(graph, nodes, startId, endId, accessibleOnly = false) {
  if (!graph.has(startId) || !nodes.has(startId) || !graph.has(endId) || !nodes.has(endId)) return null;

  const endNode = nodes.get(endId);
  const heuristic = (nodeId) => {
    const node = nodes.get(nodeId);
    return node ? euclideanDistance(node, endNode) : Infinity;
  };

  const gScore = new Map();
  const fScore = new Map();
  const previous = new Map();
  const visited = new Set();
  const pq = new MinHeap();

  graph.forEach((_, nodeId) => {
    gScore.set(nodeId, Infinity);
    fScore.set(nodeId, Infinity);
  });

  gScore.set(startId, 0);
  fScore.set(startId, heuristic(startId));
  pq.insert(startId, fScore.get(startId));

  while (!pq.isEmpty()) {
    const { node: currentId } = pq.pop();
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    if (currentId === endId) break;

    for (const { to: neighborId, weight, accessible } of graph.get(currentId) || []) {
      if (visited.has(neighborId)) continue;
      if (accessibleOnly && accessible === false) continue;
      const tentativeGScore = gScore.get(currentId) + weight;
      if (tentativeGScore < gScore.get(neighborId)) {
        previous.set(neighborId, currentId);
        gScore.set(neighborId, tentativeGScore);
        fScore.set(neighborId, tentativeGScore + heuristic(neighborId));
        pq.insert(neighborId, fScore.get(neighborId));
      }
    }
  }

  if (!visited.has(endId)) return null;

  const pathNodeIds = [];
  let current = endId;
  while (current !== undefined) {
    pathNodeIds.unshift(current);
    current = previous.get(current);
  }
  return { pathNodeIds, totalWeight: gScore.get(endId) };
}

/**
 * Find the nearest elevator node on a given floor.
 */
function findNearestElevator(nodes, fromNodeId, floorId) {
  const fromNode = nodes.get(fromNodeId);
  if (!fromNode) return null;

  let nearest = null;
  let minDist = Infinity;
  nodes.forEach((node, nodeId) => {
    if (node.type === 'elevator' && node.floor === floorId) {
      const dist = euclideanDistance(fromNode, node);
      if (dist < minDist) {
        minDist = dist;
        nearest = nodeId;
      }
    }
  });
  return nearest;
}

/**
 * Find the nearest stairs or elevator node on a given floor (non-accessible mode).
 * Prefers stairs but falls back to elevator if no stairs exist.
 */
function findNearestConnector(nodes, fromNodeId, floorId) {
  const fromNode = nodes.get(fromNodeId);
  if (!fromNode) return null;

  let nearestStairs = null;
  let minStairsDist = Infinity;
  let nearestElevator = null;
  let minElevatorDist = Infinity;

  nodes.forEach((node, nodeId) => {
    if (node.floor !== floorId) return;
    const dist = euclideanDistance(fromNode, node);
    if (node.type === 'stairs' || node.type === 'escalator') {
      if (dist < minStairsDist) {
        minStairsDist = dist;
        nearestStairs = nodeId;
      }
    } else if (node.type === 'elevator') {
      if (dist < minElevatorDist) {
        minElevatorDist = dist;
        nearestElevator = nodeId;
      }
    }
  });

  return nearestStairs || nearestElevator;
}

function validateInputs(floorsData, startNodeId, endNodeId) {
  if (!floorsData) return { ok: false, reason: 'floorsData is required' };
  if (!startNodeId) return { ok: false, reason: 'startNodeId is required' };
  if (!endNodeId) return { ok: false, reason: 'endNodeId is required' };

  if (floorsData.graph && floorsData.nodes) {
    if (floorsData.graph.size === 0) return { ok: false, reason: 'empty graph - no nodes found' };
    if (!floorsData.nodes.has(startNodeId)) return { ok: false, reason: `start node "${startNodeId}" not found` };
    if (!floorsData.nodes.has(endNodeId)) return { ok: false, reason: `end node "${endNodeId}" not found` };
  }

  return null;
}

function resolveConnector(nodes, startNodeId, startFloor, accessible) {
  const connectorId = accessible
    ? findNearestElevator(nodes, startNodeId, startFloor)
    : findNearestConnector(nodes, startNodeId, startFloor);

  if (!connectorId) {
    return {
      ok: false,
      connectorId: null,
      reason: accessible ? 'No elevator found on this floor' : 'No stairs or elevator found on this floor',
    };
  }

  return { ok: true, connectorId, reason: null };
}

function resolveAlgorithm(algorithm) {
  const normalizedAlgorithm = typeof algorithm === 'string' ? algorithm.toLowerCase() : '';
  return normalizedAlgorithm === 'dijkstra' ? 'dijkstra' : 'astar';
}

function buildPathCoords(pathNodeIds, nodes) {
  return pathNodeIds
    .map((nodeId) => {
      const node = nodes.get(nodeId);
      return node ? { id: node.id, x: node.x, y: node.y, floor: node.floor, label: node.label, type: node.type } : null;
    })
    .filter(Boolean);
}

function findShortestPath({ floorsData, startNodeId, endNodeId, algorithm = 'astar', accessible = false }) {
  const inputError = validateInputs(floorsData, startNodeId, endNodeId);
  if (inputError) return inputError;

  const { graph, nodes, floorMap } = buildMultiFloorGraph(floorsData);
  const graphError = validateInputs({ graph, nodes }, startNodeId, endNodeId);
  if (graphError) return graphError;

  const startFloor = getNodeFloor(startNodeId, floorMap);
  const endFloor = getNodeFloor(endNodeId, floorMap);

  // Cross-floor routing: route to the nearest vertical connector on the start floor
  let effectiveEndNodeId = endNodeId;
  if (startFloor !== endFloor) {
    // Find nearest stairs or elevator on the start floor to guide user there
    const connectorResult = resolveConnector(nodes, startNodeId, startFloor, accessible);
    if (!connectorResult.ok) return { ok: false, reason: connectorResult.reason };
    effectiveEndNodeId = connectorResult.connectorId;
  }

  const algorithmUsed = resolveAlgorithm(algorithm);
  const result = algorithmUsed === 'dijkstra' 
    ? dijkstra(graph, nodes, startNodeId, effectiveEndNodeId, accessible) 
    : aStar(graph, nodes, startNodeId, effectiveEndNodeId, accessible);

  if (!result?.pathNodeIds?.length) {
    if (accessible) return { ok: false, reason: 'no accessible path found (try disabling accessibility)' };
    return { ok: false, reason: 'no path found' };
  }

  const pathCoords = buildPathCoords(result.pathNodeIds, nodes);

  return { ok: true, algorithm: algorithmUsed, totalWeight: result.totalWeight, pathNodeIds: result.pathNodeIds, pathCoords, accessible };
}

export { dijkstra, aStar, findShortestPath, findNearestElevator, findNearestConnector };

/**
 * Pathfinding Module - Dijkstra and A* algorithms for indoor navigation
 */
import { MinHeap } from './priorityQueue.js';
import { euclideanDistance, buildMultiFloorGraph, getNodeFloor } from './graphBuilder.js';

function dijkstra(graph, _nodes, startId, endId, options = {}) {
  if (!graph.has(startId) || !graph.has(endId)) return null;
  const accessibleOnly = options.accessibleOnly === true;

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
      if (accessibleOnly && accessible === false) continue;
      if (visited.has(neighborId)) continue;
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

function aStar(graph, nodes, startId, endId, options = {}) {
  if (!graph.has(startId) || !nodes.has(startId) || !graph.has(endId) || !nodes.has(endId)) return null;
  const accessibleOnly = options.accessibleOnly === true;

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
      if (accessibleOnly && accessible === false) continue;
      if (visited.has(neighborId)) continue;
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

function findShortestPath({ floorsData, startNodeId, endNodeId, algorithm = 'astar', accessibleOnly = false }) {
  if (!floorsData) return { ok: false, reason: 'floorsData is required' };
  if (!startNodeId) return { ok: false, reason: 'startNodeId is required' };
  if (!endNodeId) return { ok: false, reason: 'endNodeId is required' };

  const { graph, nodes, floorMap } = buildMultiFloorGraph(floorsData);

  if (graph.size === 0) return { ok: false, reason: 'empty graph - no nodes found' };
  if (!nodes.has(startNodeId)) return { ok: false, reason: `start node "${startNodeId}" not found` };
  if (!nodes.has(endNodeId)) return { ok: false, reason: `end node "${endNodeId}" not found` };

  const startFloor = getNodeFloor(startNodeId, floorMap);
  const endFloor = getNodeFloor(endNodeId, floorMap);
  if (startFloor !== endFloor) return { ok: false, reason: 'different floors not supported yet', startFloor, endFloor };

  const normalizedAlgorithm = typeof algorithm === 'string' ? algorithm.toLowerCase() : '';
  const algorithmUsed = normalizedAlgorithm === 'dijkstra' ? 'dijkstra' : 'astar';
  const routingOptions = { accessibleOnly };
  const result = algorithmUsed === 'dijkstra' 
    ? dijkstra(graph, nodes, startNodeId, endNodeId, routingOptions) 
    : aStar(graph, nodes, startNodeId, endNodeId, routingOptions);

  if (!result?.pathNodeIds?.length) return { ok: false, reason: 'no path found' };

  const pathCoords = result.pathNodeIds
    .map((nodeId) => {
      const node = nodes.get(nodeId);
      return node ? { id: node.id, x: node.x, y: node.y, floor: node.floor, label: node.label, type: node.type } : null;
    })
    .filter(Boolean);

  return { ok: true, algorithm: algorithmUsed, totalWeight: result.totalWeight, pathNodeIds: result.pathNodeIds, pathCoords };
}

export { dijkstra, aStar, findShortestPath };

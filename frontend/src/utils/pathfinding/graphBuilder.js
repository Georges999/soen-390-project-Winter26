/**
 * Graph Builder - Converts floor mapping JSON into adjacency list graph
 */

function euclideanDistance(nodeA, nodeB) {
  const dx = nodeA.x - nodeB.x;
  const dy = nodeA.y - nodeB.y;
  return Math.hypot(dx, dy);
}

function mergeAllNodes(floorData) {
  const nodesMap = new Map();
  const addNodes = (arr, defaultType) => {
    if (!Array.isArray(arr)) return;
    arr.forEach((node) => {
      nodesMap.set(node.id, {
        id: node.id, x: node.x, y: node.y,
        type: node.type || defaultType,
        label: node.label || '',
        floor: floorData.label || node.floor || ''
      });
    });
  };
  addNodes(floorData.nodes, 'hallway');
  addNodes(floorData.rooms, 'room');
  addNodes(floorData.pois, 'poi');
  return nodesMap;
}

function isStairsNode(nodeId, nodesMap) {
  const node = nodesMap.get(nodeId);
  return node?.type === 'stairs';
}

function isElevatorNode(nodeId, nodesMap) {
  const node = nodesMap.get(nodeId);
  return node?.type === 'elevator';
}

function buildGraph(floorData) {
  const graph = new Map();
  const nodesMap = mergeAllNodes(floorData);
  nodesMap.forEach((_, nodeId) => graph.set(nodeId, []));

  if (Array.isArray(floorData.edges)) {
    const processedEdges = new Set();
    floorData.edges.forEach((edge) => {
      const { from, to } = edge;
      if (!nodesMap.has(from) || !nodesMap.has(to)) return;
      
      const edgeKey = [from, to].sort((a, b) => a.localeCompare(b)).join('->');
      if (processedEdges.has(edgeKey)) return;
      processedEdges.add(edgeKey);

      const baseWeight = edge.weight ?? euclideanDistance(nodesMap.get(from), nodesMap.get(to));
      const accessible = !isStairsNode(from, nodesMap) && !isStairsNode(to, nodesMap);

      // Penalise edges that pass through room/classroom nodes so the
      // pathfinder prefers hallway-only routes.  The penalty only affects
      // the "entering-room" direction; leaving a room toward a hallway
      // keeps normal weight so start/end room nodes are still reachable.
      const ROOM_PENALTY = 1000;
      const fromIsRoom = nodesMap.get(from)?.type === 'room' || nodesMap.get(from)?.type === 'classroom';
      const toIsRoom   = nodesMap.get(to)?.type   === 'room' || nodesMap.get(to)?.type   === 'classroom';

      // hallway → room  (entering a room): penalise
      // room → hallway  (leaving a room):  normal weight
      const weightToRoom   = toIsRoom   ? baseWeight + ROOM_PENALTY : baseWeight;
      const weightFromRoom = fromIsRoom ? baseWeight + ROOM_PENALTY : baseWeight;

      graph.get(from).push({ to, weight: weightToRoom, accessible });
      graph.get(to).push({ to: from, weight: weightFromRoom, accessible });
    });
  }
  return { graph, nodes: nodesMap };
}

function buildMultiFloorGraph(floorsData) {
  const combinedGraph = new Map();
  const combinedNodes = new Map();
  const floorMap = new Map();

  if (!floorsData?.floors) return { graph: combinedGraph, nodes: combinedNodes, floorMap };

  Object.entries(floorsData.floors).forEach(([floorId, floorData]) => {
    const { graph, nodes } = buildGraph(floorData);
    nodes.forEach((nodeData, nodeId) => {
      combinedNodes.set(nodeId, { ...nodeData, floor: floorId });
      floorMap.set(nodeId, floorId);
    });
    graph.forEach((edges, nodeId) => {
      if (!combinedGraph.has(nodeId)) combinedGraph.set(nodeId, []);
      combinedGraph.get(nodeId).push(...edges);
    });
  });
  return { graph: combinedGraph, nodes: combinedNodes, floorMap };
}

function getNodeFloor(nodeId, floorMap) {
  return floorMap.get(nodeId) || null;
}

export { euclideanDistance, mergeAllNodes, buildGraph, buildMultiFloorGraph, getNodeFloor, isStairsNode, isElevatorNode };

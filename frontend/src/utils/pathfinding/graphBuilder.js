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

      // Penalise edges that touch room/classroom nodes so the
      // pathfinder strongly prefers hallway-only routes.
      // BOTH directions are penalised — this prevents rooms from being
      // used as transit shortcuts (hallway→room→hallway).
      // The start / end room is still reachable because the penalty is
      // small compared to a huge detour; but using TWO room edges
      // (enter + leave) makes the shortcut far too expensive.
      const ROOM_TRANSIT_PENALTY = 50000;
      const fromType = nodesMap.get(from)?.type || '';
      const toType   = nodesMap.get(to)?.type   || '';
      const fromIsRoom = fromType === 'room' || fromType === 'classroom';
      const toIsRoom   = toType   === 'room' || toType   === 'classroom';

      // Both directions penalised when a room/classroom is involved
      const weightForward  = toIsRoom   || fromIsRoom ? baseWeight + ROOM_TRANSIT_PENALTY : baseWeight;
      const weightBackward = fromIsRoom || toIsRoom   ? baseWeight + ROOM_TRANSIT_PENALTY : baseWeight;

      graph.get(from).push({ to, weight: weightForward, accessible });
      graph.get(to).push({ to: from, weight: weightBackward, accessible });
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

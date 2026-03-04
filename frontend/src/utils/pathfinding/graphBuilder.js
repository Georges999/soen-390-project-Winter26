/**
 * Graph Builder
 * 
 * Converts floor mapping JSON data into an adjacency list graph structure.
 * Handles undirected edges and computes weights using Euclidean distance
 * when not provided.
 */

/**
 * Calculate Euclidean distance between two nodes
 * @param {Object} nodeA - First node with x, y coordinates
 * @param {Object} nodeB - Second node with x, y coordinates
 * @returns {number} Euclidean distance
 */
function euclideanDistance(nodeA, nodeB) {
  const dx = nodeA.x - nodeB.x;
  const dy = nodeA.y - nodeB.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Merge all node types (nodes, rooms, pois) into a single map
 * @param {Object} floorData - Floor data containing nodes, rooms, and pois arrays
 * @returns {Map<string, Object>} Map of nodeId to node data
 */
function mergeAllNodes(floorData) {
  const nodesMap = new Map();

  // Process regular nodes (hallways)
  if (floorData.nodes && Array.isArray(floorData.nodes)) {
    floorData.nodes.forEach((node) => {
      nodesMap.set(node.id, {
        id: node.id,
        x: node.x,
        y: node.y,
        type: node.type || 'hallway',
        label: node.label || '',
        floor: floorData.label || node.floor || ''
      });
    });
  }

  // Process rooms (classrooms, offices, etc.)
  if (floorData.rooms && Array.isArray(floorData.rooms)) {
    floorData.rooms.forEach((room) => {
      nodesMap.set(room.id, {
        id: room.id,
        x: room.x,
        y: room.y,
        type: room.type || 'room',
        label: room.label || '',
        floor: floorData.label || room.floor || ''
      });
    });
  }

  // Process points of interest (washrooms, elevators, stairs, etc.)
  if (floorData.pois && Array.isArray(floorData.pois)) {
    floorData.pois.forEach((poi) => {
      nodesMap.set(poi.id, {
        id: poi.id,
        x: poi.x,
        y: poi.y,
        type: poi.type || 'poi',
        label: poi.label || '',
        floor: floorData.label || poi.floor || ''
      });
    });
  }

  return nodesMap;
}

/**
 * Build adjacency list graph from floor data
 * Edges are treated as UNDIRECTED (bidirectional)
 * 
 * @param {Object} floorData - Floor data with nodes and edges
 * @returns {{graph: Map<string, Array<{to: string, weight: number}>>, nodes: Map<string, Object>}}
 */
function buildGraph(floorData) {
  const graph = new Map();
  const nodesMap = mergeAllNodes(floorData);

  // Initialize adjacency list for all nodes
  nodesMap.forEach((_, nodeId) => {
    graph.set(nodeId, []);
  });

  // Process edges
  if (floorData.edges && Array.isArray(floorData.edges)) {
    const processedEdges = new Set();

    floorData.edges.forEach((edge) => {
      const { from, to } = edge;

      // Skip if either node doesn't exist
      if (!nodesMap.has(from) || !nodesMap.has(to)) {
        return;
      }

      // Create unique edge key to handle duplicates
      const edgeKey = [from, to].sort().join('->');
      if (processedEdges.has(edgeKey)) {
        return; // Skip duplicate edge
      }
      processedEdges.add(edgeKey);

      // Calculate weight: use provided weight or compute Euclidean distance
      let weight = edge.weight;
      if (weight === undefined || weight === null) {
        const nodeA = nodesMap.get(from);
        const nodeB = nodesMap.get(to);
        weight = euclideanDistance(nodeA, nodeB);
      }

      // Add bidirectional edges (undirected graph)
      graph.get(from).push({ to, weight });
      graph.get(to).push({ to: from, weight });
    });
  }

  return { graph, nodes: nodesMap };
}

/**
 * Build a combined graph from multiple floors
 * @param {Object} floorsData - Object containing floors data
 * @returns {{graph: Map<string, Array<{to: string, weight: number}>>, nodes: Map<string, Object>, floorMap: Map<string, string>}}
 */
function buildMultiFloorGraph(floorsData) {
  const combinedGraph = new Map();
  const combinedNodes = new Map();
  const floorMap = new Map(); // Maps nodeId to floorId

  if (!floorsData || !floorsData.floors) {
    return { graph: combinedGraph, nodes: combinedNodes, floorMap };
  }

  // Process each floor
  Object.entries(floorsData.floors).forEach(([floorId, floorData]) => {
    const { graph, nodes } = buildGraph(floorData);

    // Merge nodes
    nodes.forEach((nodeData, nodeId) => {
      combinedNodes.set(nodeId, {
        ...nodeData,
        floor: floorId
      });
      floorMap.set(nodeId, floorId);
    });

    // Merge graph edges
    graph.forEach((edges, nodeId) => {
      if (!combinedGraph.has(nodeId)) {
        combinedGraph.set(nodeId, []);
      }
      combinedGraph.get(nodeId).push(...edges);
    });
  });

  return { graph: combinedGraph, nodes: combinedNodes, floorMap };
}

/**
 * Get the floor ID for a given node
 * @param {string} nodeId - Node identifier
 * @param {Map<string, string>} floorMap - Map of nodeId to floorId
 * @returns {string | null} Floor ID or null if not found
 */
function getNodeFloor(nodeId, floorMap) {
  return floorMap.get(nodeId) || null;
}

export {
  euclideanDistance,
  mergeAllNodes,
  buildGraph,
  buildMultiFloorGraph,
  getNodeFloor
};

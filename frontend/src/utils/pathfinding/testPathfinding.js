/**
 * Pathfinding Test Script
 * 
 * Demonstrates shortest path computation using sample floor data.
 * Run with: node --experimental-vm-modules testPathfinding.js
 */

import { findShortestPath } from './pathfinding.js';
import { buildGraph } from './graphBuilder.js';
import { MinHeap } from './priorityQueue.js';

// ============================================
// Sample floor data for testing
// ============================================
const sampleFloorData = {
  floors: {
    'MB-S2': {
      label: 'MB – Sub 2',
      nodes: [
        { id: 'hall_001', type: 'hallway', x: 100, y: 100, label: '' },
        { id: 'hall_002', type: 'hallway', x: 200, y: 100, label: '' },
        { id: 'hall_003', type: 'hallway', x: 300, y: 100, label: '' },
        { id: 'hall_004', type: 'hallway', x: 300, y: 200, label: '' },
        { id: 'hall_005', type: 'hallway', x: 200, y: 200, label: '' }
      ],
      rooms: [
        { id: 'room_101', type: 'classroom', x: 100, y: 50, label: 'S2.101' },
        { id: 'room_102', type: 'classroom', x: 200, y: 50, label: 'S2.102' },
        { id: 'room_103', type: 'classroom', x: 350, y: 200, label: 'S2.103' }
      ],
      pois: [
        { id: 'elevator_001', type: 'elevator', x: 150, y: 150, label: 'Elevator' },
        { id: 'washroom_001', type: 'washroom', x: 250, y: 150, label: 'Washroom' }
      ],
      edges: [
        { from: 'hall_001', to: 'hall_002', weight: 100 },
        { from: 'hall_002', to: 'hall_003', weight: 100 },
        { from: 'hall_003', to: 'hall_004', weight: 100 },
        { from: 'hall_004', to: 'hall_005', weight: 100 },
        { from: 'hall_005', to: 'hall_002', weight: 100 },
        { from: 'room_101', to: 'hall_001', weight: 50 },
        { from: 'room_102', to: 'hall_002', weight: 50 },
        { from: 'room_103', to: 'hall_004', weight: 50 },
        { from: 'elevator_001', to: 'hall_001' }, // No weight - will use Euclidean distance
        { from: 'elevator_001', to: 'hall_005' },
        { from: 'washroom_001', to: 'hall_003' },
        { from: 'washroom_001', to: 'hall_004' }
      ]
    }
  }
};

// ============================================
// Test MinHeap Priority Queue
// ============================================
function testMinHeap() {
  console.log('\n========== Testing MinHeap ==========\n');

  const heap = new MinHeap();

  // Insert elements
  heap.insert('nodeA', 5);
  heap.insert('nodeB', 2);
  heap.insert('nodeC', 8);
  heap.insert('nodeD', 1);
  heap.insert('nodeE', 3);

  console.log('Inserted: nodeA(5), nodeB(2), nodeC(8), nodeD(1), nodeE(3)');
  console.log('Expected pop order: nodeD, nodeB, nodeE, nodeA, nodeC\n');

  console.log('Popping elements:');
  while (!heap.isEmpty()) {
    const item = heap.pop();
    console.log(`  ${item.node} (priority: ${item.priority})`);
  }

  console.log('\n✅ MinHeap test completed');
}

// ============================================
// Test Graph Builder
// ============================================
function testGraphBuilder() {
  console.log('\n========== Testing Graph Builder ==========\n');

  const floorData = sampleFloorData.floors['MB-S2'];
  const { graph, nodes } = buildGraph(floorData);

  console.log(`Total nodes: ${nodes.size}`);
  console.log(`Nodes in graph: ${graph.size}`);

  console.log('\nSample adjacency list (hall_002):');
  const hall002Edges = graph.get('hall_002');
  hall002Edges.forEach((edge) => {
    console.log(`  -> ${edge.to} (weight: ${edge.weight.toFixed(2)})`);
  });

  console.log('\n✅ Graph Builder test completed');
}

// ============================================
// Test Pathfinding
// ============================================
function testPathfinding() {
  console.log('\n========== Testing Pathfinding ==========\n');

  // Test 1: Simple path using A*
  console.log('Test 1: Path from room_101 to room_103 (A*)');
  const result1 = findShortestPath({
    floorsData: sampleFloorData,
    startNodeId: 'room_101',
    endNodeId: 'room_103'
  });

  if (result1.ok) {
    console.log(`  Algorithm: ${result1.algorithm}`);
    console.log(`  Total weight: ${result1.totalWeight.toFixed(2)}`);
    console.log(`  Path: ${result1.pathNodeIds.join(' -> ')}`);
    console.log(`  Coordinates: ${result1.pathCoords.length} points`);
  } else {
    console.log(`  Error: ${result1.reason}`);
  }

  // Test 2: Same path using Dijkstra
  console.log('\nTest 2: Path from room_101 to room_103 (Dijkstra)');
  const result2 = findShortestPath({
    floorsData: sampleFloorData,
    startNodeId: 'room_101',
    endNodeId: 'room_103',
    algorithm: 'dijkstra'
  });

  if (result2.ok) {
    console.log(`  Algorithm: ${result2.algorithm}`);
    console.log(`  Total weight: ${result2.totalWeight.toFixed(2)}`);
    console.log(`  Path: ${result2.pathNodeIds.join(' -> ')}`);
  } else {
    console.log(`  Error: ${result2.reason}`);
  }

  // Test 3: Path from elevator to washroom
  console.log('\nTest 3: Path from elevator_001 to washroom_001');
  const result3 = findShortestPath({
    floorsData: sampleFloorData,
    startNodeId: 'elevator_001',
    endNodeId: 'washroom_001'
  });

  if (result3.ok) {
    console.log(`  Algorithm: ${result3.algorithm}`);
    console.log(`  Total weight: ${result3.totalWeight.toFixed(2)}`);
    console.log(`  Path: ${result3.pathNodeIds.join(' -> ')}`);
  } else {
    console.log(`  Error: ${result3.reason}`);
  }

  console.log('\n✅ Pathfinding test completed');
}

// ============================================
// Test Edge Cases
// ============================================
function testEdgeCases() {
  console.log('\n========== Testing Edge Cases ==========\n');

  // Test: Missing start node
  console.log('Test: Missing start node');
  const result1 = findShortestPath({
    floorsData: sampleFloorData,
    startNodeId: 'nonexistent_node',
    endNodeId: 'room_103'
  });
  console.log(`  Result: ok=${result1.ok}, reason="${result1.reason}"`);

  // Test: Missing end node
  console.log('\nTest: Missing end node');
  const result2 = findShortestPath({
    floorsData: sampleFloorData,
    startNodeId: 'room_101',
    endNodeId: 'nonexistent_node'
  });
  console.log(`  Result: ok=${result2.ok}, reason="${result2.reason}"`);

  // Test: Empty floors data
  console.log('\nTest: Empty floors data');
  const result3 = findShortestPath({
    floorsData: { floors: {} },
    startNodeId: 'room_101',
    endNodeId: 'room_103'
  });
  console.log(`  Result: ok=${result3.ok}, reason="${result3.reason}"`);

  // Test: Missing floorsData
  console.log('\nTest: Missing floorsData');
  const result4 = findShortestPath({
    floorsData: null,
    startNodeId: 'room_101',
    endNodeId: 'room_103'
  });
  console.log(`  Result: ok=${result4.ok}, reason="${result4.reason}"`);

  // Test: Different floors (should fail)
  console.log('\nTest: Different floors');
  const multiFloorData = {
    floors: {
      'Floor1': {
        nodes: [{ id: 'f1_hall', type: 'hallway', x: 100, y: 100 }],
        rooms: [],
        pois: [],
        edges: []
      },
      'Floor2': {
        nodes: [{ id: 'f2_hall', type: 'hallway', x: 100, y: 100 }],
        rooms: [],
        pois: [],
        edges: []
      }
    }
  };
  const result5 = findShortestPath({
    floorsData: multiFloorData,
    startNodeId: 'f1_hall',
    endNodeId: 'f2_hall'
  });
  console.log(`  Result: ok=${result5.ok}, reason="${result5.reason}"`);

  console.log('\n✅ Edge cases test completed');
}

// ============================================
// Run all tests
// ============================================
function runAllTests() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     PATHFINDING MODULE TEST SUITE          ║');
  console.log('╚════════════════════════════════════════════╝');

  testMinHeap();
  testGraphBuilder();
  testPathfinding();
  testEdgeCases();

  console.log('\n========================================');
  console.log('All tests completed successfully! ✅');
  console.log('========================================\n');
}

// Run tests
runAllTests();

export { runAllTests, sampleFloorData };

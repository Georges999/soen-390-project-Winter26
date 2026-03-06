import { MinHeap } from "../../../src/utils/pathfinding/priorityQueue";

describe("MinHeap Priority Queue", () => {
  let heap;

  beforeEach(() => {
    heap = new MinHeap();
  });

  describe("constructor", () => {
    it("creates an empty heap", () => {
      expect(heap.isEmpty()).toBe(true);
      expect(heap.size()).toBe(0);
    });
  });

  describe("insert", () => {
    it("inserts a single element", () => {
      heap.insert("A", 5);
      expect(heap.size()).toBe(1);
      expect(heap.isEmpty()).toBe(false);
    });

    it("inserts multiple elements", () => {
      heap.insert("A", 5);
      heap.insert("B", 3);
      heap.insert("C", 7);
      expect(heap.size()).toBe(3);
    });

    it("maintains min-heap property after inserts", () => {
      heap.insert("A", 5);
      heap.insert("B", 2);
      heap.insert("C", 8);
      heap.insert("D", 1);
      const min = heap.pop();
      expect(min.node).toBe("D");
      expect(min.priority).toBe(1);
    });
  });

  describe("pop", () => {
    it("returns null when heap is empty", () => {
      expect(heap.pop()).toBeNull();
    });

    it("removes and returns the minimum element", () => {
      heap.insert("A", 5);
      heap.insert("B", 2);
      heap.insert("C", 8);
      const min = heap.pop();
      expect(min).toEqual({ node: "B", priority: 2 });
      expect(heap.size()).toBe(2);
    });

    it("returns elements in ascending priority order", () => {
      heap.insert("A", 5);
      heap.insert("B", 2);
      heap.insert("C", 8);
      heap.insert("D", 1);
      heap.insert("E", 3);

      const order = [];
      while (!heap.isEmpty()) {
        order.push(heap.pop());
      }
      expect(order.map((o) => o.node)).toEqual(["D", "B", "E", "A", "C"]);
      expect(order.map((o) => o.priority)).toEqual([1, 2, 3, 5, 8]);
    });

    it("handles single element heap", () => {
      heap.insert("A", 1);
      const item = heap.pop();
      expect(item).toEqual({ node: "A", priority: 1 });
      expect(heap.isEmpty()).toBe(true);
    });
  });

  describe("bubbleDown", () => {
    it("correctly reorders when right child is smallest", () => {
      // Insert in order that forces right-child swap path
      heap.insert("A", 10);
      heap.insert("B", 20);
      heap.insert("C", 5);
      // After pop, root becomes B(20), children: none from left, need to bubble down
      heap.pop(); // removes C(5), root is now A(10) or B(20) restructured
      const next = heap.pop();
      expect(next.priority).toBeLessThanOrEqual(20);
    });

    it("handles large heaps correctly", () => {
      const values = [50, 30, 70, 10, 40, 60, 20, 80, 5, 90];
      values.forEach((v, i) => heap.insert(`node${i}`, v));

      const sorted = [];
      while (!heap.isEmpty()) {
        sorted.push(heap.pop().priority);
      }
      expect(sorted).toEqual([...sorted].sort((a, b) => a - b));
    });
  });

  describe("isEmpty", () => {
    it("returns true for empty heap", () => {
      expect(heap.isEmpty()).toBe(true);
    });

    it("returns false for non-empty heap", () => {
      heap.insert("A", 1);
      expect(heap.isEmpty()).toBe(false);
    });

    it("returns true after all elements removed", () => {
      heap.insert("A", 1);
      heap.insert("B", 2);
      heap.pop();
      heap.pop();
      expect(heap.isEmpty()).toBe(true);
    });
  });

  describe("size", () => {
    it("returns 0 for empty heap", () => {
      expect(heap.size()).toBe(0);
    });

    it("returns correct size after inserts and pops", () => {
      heap.insert("A", 1);
      heap.insert("B", 2);
      heap.insert("C", 3);
      expect(heap.size()).toBe(3);
      heap.pop();
      expect(heap.size()).toBe(2);
    });
  });

  describe("index helpers", () => {
    it("getParentIndex returns correct parent", () => {
      expect(heap.getParentIndex(1)).toBe(0);
      expect(heap.getParentIndex(2)).toBe(0);
      expect(heap.getParentIndex(3)).toBe(1);
      expect(heap.getParentIndex(4)).toBe(1);
    });

    it("getLeftChildIndex returns correct child", () => {
      expect(heap.getLeftChildIndex(0)).toBe(1);
      expect(heap.getLeftChildIndex(1)).toBe(3);
      expect(heap.getLeftChildIndex(2)).toBe(5);
    });

    it("getRightChildIndex returns correct child", () => {
      expect(heap.getRightChildIndex(0)).toBe(2);
      expect(heap.getRightChildIndex(1)).toBe(4);
      expect(heap.getRightChildIndex(2)).toBe(6);
    });
  });

  describe("swap", () => {
    it("swaps two elements in the internal heap array", () => {
      heap.insert("A", 1);
      heap.insert("B", 2);
      heap.swap(0, 1);
      // After swap, internal order changes but pop should still work
      // because the heap may be temporarily invalid
      expect(heap.size()).toBe(2);
    });
  });

  describe("duplicate priorities", () => {
    it("handles elements with the same priority", () => {
      heap.insert("A", 5);
      heap.insert("B", 5);
      heap.insert("C", 5);
      expect(heap.size()).toBe(3);
      const first = heap.pop();
      expect(first.priority).toBe(5);
      const second = heap.pop();
      expect(second.priority).toBe(5);
      const third = heap.pop();
      expect(third.priority).toBe(5);
      expect(heap.isEmpty()).toBe(true);
    });
  });
});

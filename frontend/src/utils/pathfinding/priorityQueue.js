/**
 * MinHeap Priority Queue
 * 
 * A lightweight priority queue implementation using a binary min-heap.
 * Used by Dijkstra and A* algorithms for efficient node selection.
 * 
 * Time Complexity:
 * - insert: O(log n)
 * - pop: O(log n)
 * - isEmpty: O(1)
 */

class MinHeap {
  constructor() {
    this.heap = [];
  }

  /**
   * Get parent index of a node
   * @param {number} index - Current node index
   * @returns {number} Parent index
   */
  getParentIndex(index) {
    return Math.floor((index - 1) / 2);
  }

  /**
   * Get left child index of a node
   * @param {number} index - Current node index
   * @returns {number} Left child index
   */
  getLeftChildIndex(index) {
    return 2 * index + 1;
  }

  /**
   * Get right child index of a node
   * @param {number} index - Current node index
   * @returns {number} Right child index
   */
  getRightChildIndex(index) {
    return 2 * index + 2;
  }

  /**
   * Swap two elements in the heap
   * @param {number} i - First index
   * @param {number} j - Second index
   */
  swap(i, j) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  /**
   * Insert a node with given priority into the heap
   * @param {string} node - Node identifier
   * @param {number} priority - Priority value (lower = higher priority)
   */
  insert(node, priority) {
    this.heap.push({ node, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  /**
   * Move element up to maintain heap property
   * @param {number} index - Index of element to bubble up
   */
  bubbleUp(index) {
    while (index > 0) {
      const parentIndex = this.getParentIndex(index);
      if (this.heap[parentIndex].priority <= this.heap[index].priority) {
        break;
      }
      this.swap(parentIndex, index);
      index = parentIndex;
    }
  }

  /**
   * Remove and return the element with minimum priority
   * @returns {{node: string, priority: number} | null} Element with minimum priority
   */
  pop() {
    if (this.isEmpty()) {
      return null;
    }

    if (this.heap.length === 1) {
      return this.heap.pop();
    }

    const min = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.bubbleDown(0);
    return min;
  }

  /**
   * Move element down to maintain heap property
   * @param {number} index - Index of element to bubble down
   */
  bubbleDown(index) {
    const length = this.heap.length;

    while (true) {
      const leftChildIndex = this.getLeftChildIndex(index);
      const rightChildIndex = this.getRightChildIndex(index);
      let smallest = index;

      // Compare with left child
      if (
        leftChildIndex < length &&
        this.heap[leftChildIndex].priority < this.heap[smallest].priority
      ) {
        smallest = leftChildIndex;
      }

      // Compare with right child
      if (
        rightChildIndex < length &&
        this.heap[rightChildIndex].priority < this.heap[smallest].priority
      ) {
        smallest = rightChildIndex;
      }

      // If smallest is still the current index, heap property is satisfied
      if (smallest === index) {
        break;
      }

      this.swap(index, smallest);
      index = smallest;
    }
  }

  /**
   * Check if the heap is empty
   * @returns {boolean} True if heap is empty
   */
  isEmpty() {
    return this.heap.length === 0;
  }

  /**
   * Get the current size of the heap
   * @returns {number} Number of elements in heap
   */
  size() {
    return this.heap.length;
  }
}

export { MinHeap };

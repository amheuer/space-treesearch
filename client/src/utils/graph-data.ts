import adjacencyList from '../data/adjacency-list.json';
import type { AdjacencyList } from '../utils/graph-utils';

export const getAdjacencyList = (): AdjacencyList => adjacencyList;

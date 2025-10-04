// src/components/Graph.tsx
import React, { useEffect, useRef } from 'react';
import Sigma from 'sigma';
import { fromAdjacencyList } from '../utils/graph-utils';
import type { AdjacencyList } from '../utils/graph-utils';

const GraphComponent: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sigmaInstance = useRef<Sigma | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const dag: AdjacencyList = {
      A: ['B','C'],
      B: ['D'],
      D: [],
      E: ['A','D'],
    };

    const graph = fromAdjacencyList(dag);

    // Initialize sigma with container and graph
    sigmaInstance.current = new Sigma(graph, containerRef.current);

    // Cleanup on unmount
    return () => {
      if (sigmaInstance.current) {
        sigmaInstance.current.kill();
        sigmaInstance.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} style={{ width: '600px', height: '400px' }} />;
};

export default GraphComponent;

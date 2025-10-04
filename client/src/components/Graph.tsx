// src/components/Graph.tsx
import React, { useEffect, useRef } from 'react';
import Sigma from 'sigma';
import Graph from 'graphology';

const GraphComponent: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sigmaInstance = useRef<Sigma | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create a new graphology graph
    const graph = new Graph();

    // Add some nodes
    graph.addNode('n1', { label: 'Node 1', x: 0, y: 0, size: 10, color: '#f00' });
    graph.addNode('n2', { label: 'Node 2', x: 3, y: 1, size: 10, color: '#0f0' });
    graph.addNode('n3', { label: 'Node 3', x: 1, y: 3, size: 10, color: '#00f' });

    // Add edges
    graph.addEdge('n1', 'n2');
    graph.addEdge('n2', 'n3');
    graph.addEdge('n3', 'n1');

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

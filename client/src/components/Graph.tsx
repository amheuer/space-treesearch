// src/components/Graph.tsx
import React, { useEffect, useRef } from 'react';
import Sigma from 'sigma';
import { fromAdjacencyList } from '../utils/graph-utils';
import type { AdjacencyList } from '../utils/graph-utils';
import type { Paper } from '../models/Paper';

const GraphComponent: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sigmaInstance = useRef<Sigma | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const dag: AdjacencyList = {
      "123456": {
        author: "Alice Johnson",
        title: "Exploring Quantum Entanglement",
        summary: "An in-depth analysis of quantum entanglement and its applications in quantum computing.",
        journal: "Journal of Quantum Physics",
        references: ["654321", "234567"],
        embedding: [0.12, 0.98, 0.34, 0.56, 0.77, 0.22, 0.11, 0.89]
      },
      "654321": {
        author: "Bob Smith",
        title: "Foundations of Quantum Mechanics",
        summary: "A comprehensive overview of the principles of quantum mechanics.",
        journal: "Physics Review Letters",
        references: ["234567"],
        embedding: [0.33, 0.44, 0.22, 0.88, 0.90, 0.11, 0.55, 0.67]
      },
      "234567": {
        author: "Catherine Lee",
        title: "Quantum Computing Algorithms",
        summary: "Survey of algorithms designed specifically for quantum computers.",
        journal: "Computing Surveys",
        references: [],
        embedding: [0.78, 0.12, 0.99, 0.54, 0.32, 0.10, 0.45, 0.66]
      }
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

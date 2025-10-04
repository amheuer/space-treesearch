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
        references: ["654321", "345678"],
        embedding: [0.12, 0.98, 0.34, 0.56, 0.77, 0.22, 0.11, 0.89]
      },
      "654321": {
        author: "Bob Smith",
        title: "Foundations of Quantum Mechanics",
        summary: "A comprehensive overview of the principles of quantum mechanics.",
        journal: "Physics Review Letters",
        references: ["234567", "456789"],
        embedding: [0.33, 0.44, 0.22, 0.88, 0.90, 0.11, 0.55, 0.67]
      },
      "234567": {
        author: "Catherine Lee",
        title: "Quantum Computing Algorithms",
        summary: "Survey of algorithms designed specifically for quantum computers.",
        journal: "Computing Surveys",
        references: ["567890"],
        embedding: [0.78, 0.12, 0.99, 0.54, 0.32, 0.10, 0.45, 0.66]
      },
      "345678": {
        author: "David Kim",
        title: "Quantum Error Correction",
        summary: "Techniques for error correction in quantum computers.",
        journal: "Quantum Information Journal",
        references: ["234567"],
        embedding: [0.21, 0.43, 0.65, 0.87, 0.32, 0.54, 0.76, 0.98]
      },
      "456789": {
        author: "Eva Green",
        title: "Quantum Cryptography",
        summary: "Security protocols based on quantum mechanics.",
        journal: "Cryptography Today",
        references: [],
        embedding: [0.11, 0.22, 0.33, 0.44, 0.55, 0.66, 0.77, 0.88]
      },
      "567890": {
        author: "Frank White",
        title: "Quantum Machine Learning",
        summary: "Applications of machine learning in quantum systems.",
        journal: "Machine Learning Quarterly",
        references: [],
        embedding: [0.99, 0.88, 0.77, 0.66, 0.55, 0.44, 0.33, 0.22]
      },
      // Additional test papers
      "678901": {
        author: "Grace Hopper",
        title: "Quantum Simulation Techniques",
        summary: "Methods for simulating quantum systems on classical computers.",
        journal: "Simulation Science",
        references: ["567890", "789012"],
        embedding: [0.23, 0.45, 0.67, 0.89, 0.12, 0.34, 0.56, 0.78]
      },
      "789012": {
        author: "Henry Ford",
        title: "Quantum Annealing Applications",
        summary: "Exploring optimization problems solved by quantum annealing.",
        journal: "Optimization Monthly",
        references: ["890123"],
        embedding: [0.34, 0.56, 0.78, 0.90, 0.12, 0.23, 0.45, 0.67]
      },
      "890123": {
        author: "Irene Curie",
        title: "Quantum Sensors",
        summary: "Development and use of quantum sensors in measurement science.",
        journal: "Sensors & Measurement",
        references: [],
        embedding: [0.45, 0.67, 0.89, 0.12, 0.34, 0.56, 0.78, 0.90]
      },
      "901234": {
        author: "Jack Black",
        title: "Quantum Networks",
        summary: "Protocols and architectures for quantum communication networks.",
        journal: "Networking Today",
        references: ["890123", "123456"],
        embedding: [0.56, 0.78, 0.90, 0.12, 0.23, 0.45, 0.67, 0.89]
      },
      "112233": {
        author: "Karen White",
        title: "Quantum Optics",
        summary: "Light-matter interactions at the quantum level.",
        journal: "Optics Letters",
        references: ["234567", "901234"],
        embedding: [0.67, 0.89, 0.12, 0.34, 0.56, 0.78, 0.90, 0.23]
      },
      "223344": {
        author: "Leo Brown",
        title: "Quantum Materials",
        summary: "Properties and applications of quantum materials.",
        journal: "Materials Science",
        references: ["345678"],
        embedding: [0.78, 0.90, 0.12, 0.23, 0.45, 0.67, 0.89, 0.34]
      },
      "334455": {
        author: "Mona Lisa",
        title: "Quantum Thermodynamics",
        summary: "Thermodynamic principles in quantum systems.",
        journal: "Thermodynamics Journal",
        references: ["223344", "456789"],
        embedding: [0.89, 0.12, 0.34, 0.56, 0.78, 0.90, 0.23, 0.45]
      },
      "445566": {
        author: "Nina Simone",
        title: "Quantum Imaging",
        summary: "Techniques for imaging using quantum properties of light.",
        journal: "Imaging Science",
        references: ["112233"],
        embedding: [0.90, 0.23, 0.45, 0.67, 0.89, 0.12, 0.34, 0.56]
      },
      "556677": {
        author: "Oscar Wilde",
        title: "Quantum Control",
        summary: "Control theory applied to quantum systems.",
        journal: "Control Systems",
        references: ["445566", "567890"],
        embedding: [0.12, 0.34, 0.56, 0.78, 0.90, 0.23, 0.45, 0.67]
      },
      "667788": {
        author: "Paula Abdul",
        title: "Quantum Information Theory",
        summary: "Fundamental limits and protocols in quantum information.",
        journal: "Information Theory Letters",
        references: ["556677", "789012"],
        embedding: [0.23, 0.45, 0.67, 0.89, 0.12, 0.34, 0.56, 0.78]
      },
      "778899": {
        author: "Quincy Jones",
        title: "Quantum Algorithms for Chemistry",
        summary: "Quantum algorithms tailored for chemical simulations.",
        journal: "Chemical Computing",
        references: ["667788", "901234"],
        embedding: [0.34, 0.56, 0.78, 0.90, 0.12, 0.23, 0.45, 0.67]
      }
    };

    const graph = fromAdjacencyList(dag);

    // Initialize sigma with container and graph
    const renderer = new Sigma(graph, containerRef.current!, {
      labelWeight: 'bold',
      labelColor: { color: '#35a2d5ff' },
      nodeReducer: (node, data) => {
        return {
          ...data,
          label: data.label,
          color: data.color || '#0077cc',
        };
      }
    });

    sigmaInstance.current = renderer;

    renderer.on("enterNode", ({ node }) => {
      const graph = renderer.getGraph();

      // Helper to collect downstream nodes recursively
      const collectDownstream = (startNode: string, visited = new Set<string>(), directEdges: string[] = []) => {
        if (visited.has(startNode)) return;
        visited.add(startNode);
        const outgoing = graph.outEdges(startNode);
        outgoing.forEach(edge => {
          const target = graph.target(edge);
          directEdges.push(edge); // collect direct edge from startNode to target
          collectDownstream(target, visited, directEdges);
        });
      };

      // Helper to collect upstream nodes recursively
      const collectUpstream = (startNode: string, visited = new Set<string>()) => {
        if (visited.has(startNode)) return;
        visited.add(startNode);
        const incoming = graph.inEdges(startNode);
        incoming.forEach(edge => {
          const source = graph.source(edge);
          collectUpstream(source, visited);
        });
      };

      // Collect all downstream nodes and direct edges
      const downstreamNodes = new Set<string>();
      const directEdges: string[] = [];
      collectDownstream(node, downstreamNodes, directEdges);

      // Collect all upstream nodes
      const upstreamNodes = new Set<string>();
      collectUpstream(node, upstreamNodes);

      // Highlight downstream nodes and edges
      downstreamNodes.forEach(downNode => {
        graph.setNodeAttribute(downNode, "color", "orange");
        graph.setNodeAttribute(downNode, "labelColor", { color: "#ffa500" });
        graph.outEdges(downNode).forEach(edge => {
          graph.setEdgeAttribute(edge, "color", "#ffa500");
        });
      });

      graph.outEdges(node).forEach(edge => {
        graph.setEdgeAttribute(edge, "color", "#ffa500");
      });

      // Highlight upstream nodes and edges
      upstreamNodes.forEach(upNode => {
        graph.setNodeAttribute(upNode, "color", "purple");
        graph.setNodeAttribute(upNode, "labelColor", { color: "#a020f0" });
        graph.inEdges(upNode).forEach(edge => {
          graph.setEdgeAttribute(edge, "color", "#a020f0");
        });
      });

      // Highlight the entered node
      graph.setNodeAttribute(node, "color", "red"); 
      graph.setNodeAttribute(node, "labelColor", { color: "#ff0000" }); 
      renderer.refresh();
    });

    renderer.on("leaveNode", ({ node }) => {
      const graph = renderer.getGraph();

      // Reset all edges to their original color
      graph.forEachEdge(edge => {
        graph.setEdgeAttribute(edge, "color", "#444444ff");
      });

      // Reset all nodes to their original color and label color
      graph.forEachNode(n => {
        graph.setNodeAttribute(n, "color", "#0077cc");
        graph.setNodeAttribute(n, "labelColor", { color: "#ffffff" });
      });

      renderer.refresh();
    });

    // Cleanup on unmount
    return () => {
      if (sigmaInstance.current) {
        sigmaInstance.current.kill();
        sigmaInstance.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100vw', height: '100vh' }} />;
};

export default GraphComponent;

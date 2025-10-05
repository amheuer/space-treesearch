// src/components/Graph.tsx
import React, { useEffect, useRef } from 'react';
import SearchBar from './SearchBar';
import Sigma from 'sigma';
import { fromAdjacencyList } from '../utils/graph-utils';
import { getAdjacencyList } from '../utils/graph-data';
import type { AdjacencyList } from '../utils/graph-utils';
import type { Paper } from '../models/Paper';

// Extend window type for setSelectedNode
declare global {
  interface Window {
    setSelectedNode: (nodeId: string | null) => void;
  }
}

const GraphComponent: React.FC = () => {
  window.setSelectedNode = (nodeId: string | null) => {
    selectedNode.current = nodeId;
    (window as any).selectedNode = nodeId;
  };
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sigmaInstance = useRef<Sigma | null>(null);
  const selectedNode = useRef<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const dag = getAdjacencyList();
    const graph = fromAdjacencyList(dag);

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
      selectedNode.current = node;
    });

    renderer.on("leaveNode", () => {
      selectedNode.current = null;
    });

    // Per-frame loop to apply effects based on selectedNode
    let animationFrameId: number;
    const graphInstance = renderer.getGraph();
    const applyNodeEffects = () => {
      if (selectedNode.current) {
        // Highlight logic for selectedNode
        const node = selectedNode.current;

        // Reset all nodes/edges first
        graphInstance.forEachEdge(edge => {
          graphInstance.setEdgeAttribute(edge, "color", "#444444ff");
        });
        graphInstance.forEachNode(n => {
          graphInstance.setNodeAttribute(n, "color", "#0077cc");
          graphInstance.setNodeAttribute(n, "labelColor", { color: "#ffffff" });
        });

        // Effects only for selectedNode
        const collectDownstream = (startNode: string, visited = new Set<string>(), directEdges: string[] = []) => {
          if (visited.has(startNode)) return;
          visited.add(startNode);
          const outgoing = graphInstance.outEdges(startNode);
          outgoing.forEach(edge => {
            const target = graphInstance.target(edge);
            directEdges.push(edge);
            collectDownstream(target, visited, directEdges);
          });
        };

        const collectUpstream = (startNode: string, visited = new Set<string>()) => {
          if (visited.has(startNode)) return;
          visited.add(startNode);
          const incoming = graphInstance.inEdges(startNode);
          incoming.forEach(edge => {
            const source = graphInstance.source(edge);
            collectUpstream(source, visited);
          });
        };

        const downstreamNodes = new Set<string>();
        const directEdges: string[] = [];
        collectDownstream(node, downstreamNodes, directEdges);

        const upstreamNodes = new Set<string>();
        collectUpstream(node, upstreamNodes);

        downstreamNodes.forEach(downNode => {
          const gold = "#ffb62dff";
          graphInstance.setNodeAttribute(downNode, "color", gold);
          graphInstance.outEdges(downNode).forEach(edge => {
            graphInstance.setEdgeAttribute(edge, "color", gold);
          });
        });

        graphInstance.outEdges(node).forEach(edge => {
          graphInstance.setEdgeAttribute(edge, "color", "#ffa500");
        });

        upstreamNodes.forEach(upNode => {
          const purple = "#e32cffff";
          graphInstance.setNodeAttribute(upNode, "color", purple);
          graphInstance.inEdges(upNode).forEach(edge => {
            graphInstance.setEdgeAttribute(edge, "color", purple);
          });
        });

        graphInstance.setNodeAttribute(node, "color", "#84f1ffff");
      } else {
        // Reset all nodes/edges if no selectedNode
        graphInstance.forEachEdge(edge => {
          graphInstance.setEdgeAttribute(edge, "color", "#444444ff");
        });
        graphInstance.forEachNode(n => {
          graphInstance.setNodeAttribute(n, "color", "#0077cc");
          graphInstance.setNodeAttribute(n, "labelColor", { color: "#ffffff" });
        });
      }
      renderer.refresh();
      animationFrameId = window.requestAnimationFrame(applyNodeEffects);
    };
    animationFrameId = window.requestAnimationFrame(applyNodeEffects);

    // Cleanup animation frame on unmount
    return () => {
      if (sigmaInstance.current) {
        sigmaInstance.current.kill();
        sigmaInstance.current = null;
      }
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100vw', height: '100vh' }} />
  );
};

export default GraphComponent;

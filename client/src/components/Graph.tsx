/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/Graph.tsx
import React, { useEffect, useRef, useState } from 'react';
import Sigma from 'sigma';
import { fromAdjacencyList, getSavedPapers, setSavedPapers } from '../utils/graph-utils';
import { getAdjacencyList } from '../utils/graph-data';
import { createNodeImageProgram } from "@sigma/node-image";
import '/src/assets/frosted-glass.css';

declare global {
  interface Window {
    setSelectedNode: (nodeId: string | null) => void;
    getClickedNode: () => string | null;
    setClickedNode: (nodeId: string | null) => void;
  }
}

const GraphComponent: React.FC = () => {
  window.setSelectedNode = (nodeId: string | null) => {
    selectedNode.current = nodeId;
    (window as any).selectedNode = nodeId;
  };
  window.setClickedNode = (nodeId: string | null) => {
    clickSelectedNode.current = nodeId;
    selectedNode.current = null;
    (window as any).selectedNode = null;
  };
  
  window.getClickedNode = () => {
    return clickSelectedNode.current;
  };

  const containerRef = useRef<HTMLDivElement | null>(null);
  const sigmaInstance = useRef<Sigma | null>(null);
  const selectedNode = useRef<string | null>(null);
  const clickSelectedNode = useRef<string | null>(null);
  const hoveredNode = useRef<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    nodeId: string | null;
  }>({ visible: false, x: 0, y: 0, nodeId: null });

  const handleSavePaper = () => {
    if (contextMenu.nodeId) {
      const currentSavedPapers = getSavedPapers();
      if (!currentSavedPapers.includes(contextMenu.nodeId)) {
        setSavedPapers([...currentSavedPapers, contextMenu.nodeId]);
      }
      setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const dag = getAdjacencyList();
    const graph = fromAdjacencyList(dag);

    const renderer = new Sigma(graph, containerRef.current!, {
      labelWeight: 'bold',
      labelSize: 12,
      labelRenderedSizeThreshold: 8,
      labelColor: { color: '#35a2d5ff' },
      nodeProgramClasses: {
        image: createNodeImageProgram(),
      },
      defaultNodeColor: '#0077cc',
      nodeReducer: (_node, data) => {
        return {
          ...data,
          label: data.label,
        };
      }
    });

    sigmaInstance.current = renderer;

    renderer.on("enterNode", ({ node }) => {
      hoveredNode.current = node;
      if (!clickSelectedNode.current) {
        selectedNode.current = node;
        (window as any).selectedNode = node;
      }
    });

    renderer.on("leaveNode", () => {
      hoveredNode.current = null;
      if (!clickSelectedNode.current) {
        selectedNode.current = null;
        (window as any).selectedNode = null;
      }
    });

    renderer.on("clickNode", ({ node }) => {
      clickSelectedNode.current = node;
      selectedNode.current = null;
      (window as any).selectedNode = null;
    });

    renderer.on("clickStage", () => {
      clickSelectedNode.current = null;
      setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
    });

    const container = containerRef.current;
    const handleContextMenu = (event: MouseEvent) => {
        if (hoveredNode.current) {
            event.preventDefault();
            setContextMenu({
                visible: true,
                x: event.clientX,
                y: event.clientY,
                nodeId: hoveredNode.current,
            });
        }
    };
    container.addEventListener('contextmenu', handleContextMenu);

    let animationFrameId: number;
    const graphInstance = renderer.getGraph();
    
    // Function to apply downstream and upstream highlighting
    const applyDownstreamUpstreamHighlighting = (node: string) => {
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
    };
    
    const applyNodeEffects = () => {
      if (clickSelectedNode.current) {
        const node = clickSelectedNode.current;
        
        graphInstance.forEachEdge(edge => {
          graphInstance.setEdgeAttribute(edge, "color", "#212121ff");
        });
        graphInstance.forEachNode(n => {
          graphInstance.setNodeAttribute(n, "color", "#0077cc32");
          graphInstance.setNodeAttribute(n, "labelColor", { color: "#ffffff" });
        });

        applyDownstreamUpstreamHighlighting(node);
        
        graphInstance.setNodeAttribute(node, "color", "#f2ff00ff");
        graphInstance.setNodeAttribute(node, "labelColor", { color: "#000000" });
        
      } else if (selectedNode.current) {
        const node = selectedNode.current;

        graphInstance.forEachEdge(edge => {
          graphInstance.setEdgeAttribute(edge, "color", "#0000002a");
        });
        graphInstance.forEachNode(n => {
          graphInstance.setNodeAttribute(n, "color", "#0077cc32");
          graphInstance.setNodeAttribute(n, "labelColor", { color: "#ffffff" });
        });

        // Apply downstream and upstream highlighting
        applyDownstreamUpstreamHighlighting(node);

        graphInstance.setNodeAttribute(node, "color", "#84f1ffff");
      } else {
        // Reset all nodes/edges if no selectedNode
        graphInstance.forEachEdge(edge => {
          graphInstance.setEdgeAttribute(edge, "color", "#121212ff");
        });
        graphInstance.forEachNode(n => {
          graphInstance.setNodeAttribute(n, "color", "#0077cc32");
          graphInstance.setNodeAttribute(n, "labelColor", { color: "#ffffff" });
        });
      }
      renderer.refresh();
      animationFrameId = window.requestAnimationFrame(applyNodeEffects);
    };
    animationFrameId = window.requestAnimationFrame(applyNodeEffects);

    return () => {
      if (sigmaInstance.current) {
        sigmaInstance.current.kill();
        sigmaInstance.current = null;
      }
      container.removeEventListener('contextmenu', handleContextMenu);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div>
      <div ref={containerRef} style={{ width: '100vw', height: '100vh' }} />
      {contextMenu.visible && (
        <div
          className="frosted-glass"
          style={{
            position: 'absolute',
            top: contextMenu.y,
            left: contextMenu.x,
            padding: '5px',
            zIndex: 1000,
          }}
        >
          <button onClick={handleSavePaper} className="frosted-glass">Save Paper</button>
        </div>
      )}
    </div>
  );
};

export default GraphComponent;

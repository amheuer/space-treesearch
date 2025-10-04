import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { topologicalGenerations } from 'graphology-dag';
import type { Paper } from '../models/Paper';


export type AdjacencyList = {
  [key: string]: Paper;
};

export function fromAdjacencyList(adjList: AdjacencyList): Graph {
  const graph = new Graph({ type: 'directed' });

  for (const node in adjList) {
    if (!graph.hasNode(node)) {
      graph.addNode(node, {
        size: 10 + adjList[node].references.length * 5,
        color: '#0077cc', 
        label: adjList[node].title,
      });
    }
  }
  
  for (const source in adjList) {
    for (const target of adjList[source].references) {
      if (!graph.hasNode(target)) {
        graph.addNode(target, { size: 10, color: '#cccccc' }); // default size/color for missing refs
      }
      graph.addEdge(source, target, {
        size: 10, 
        color: '#444444ff' 
      });
    }
  }

  const generations = topologicalGenerations(graph);
  const totalGenerations = generations.length;
  const spacing = 10;
  const jitterAmount = 50;

  generations.forEach((generation, index) => {
    const yPosition = (totalGenerations - 1 - index) * 150;
    const totalNodes = generation.length;
    const startX = (totalNodes - 1) * -spacing / 2;

    generation.forEach((nodeId, nodeIndex) => {
      const baseX = startX + nodeIndex * spacing;
      const randomX = baseX + (Math.random() - 0.5) * jitterAmount;

      graph.setNodeAttribute(nodeId, 'x', randomX);
      graph.setNodeAttribute(nodeId, 'y', yPosition);
    });
  });

forceAtlas2.assign(graph, {
  iterations: 30,
  settings: {
    scalingRatio: 2,
    linLogMode: true,   
  }
});


  return graph;
}

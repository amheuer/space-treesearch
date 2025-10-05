import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { topologicalGenerations } from 'graphology-dag';
import type { Paper } from '../models/Paper';
import type { Experiment } from '../models/Experiment';


export type AdjacencyList = {
  [key: string]: Paper;
};

export function fromAdjacencyList(adjList: AdjacencyList): Graph {
  const referenceCounts: Record<string, number> = {};
  const graph = new Graph({ type: 'directed' });

  for (const node in adjList) {
    if (!graph.hasNode(node)) {
      graph.addNode(node, {
        label: adjList[node].title,
      });
    }
  }
  
  for (const source in adjList) {
    for (const target of adjList[source].references) {
      if (!graph.hasNode(target)) {
        graph.addNode(target, { color: '#cccccc' }); // default size/color for missing refs
      }
      graph.addEdge(source, target, {
        size: 10, 
        color: '#444444ff' 
      });
      adjList[target].citations = (adjList[target].citations || 0) + 1;
    }
  }

  const generations = topologicalGenerations(graph);
  const totalGenerations = generations.length;
  const spacing = 10;
  const jitterAmount = 1500;

  generations.forEach((generation, index) => {
    const yPosition = (totalGenerations - 1 - index) * 150;
    const totalNodes = generation.length;
    const startX = (totalNodes - 1) * -spacing / 2;

    generation.forEach((nodeId, nodeIndex) => {
      const baseX = startX + nodeIndex * spacing;
      const randomX = baseX + (Math.random() - 0.5) * jitterAmount;
      const inDegree = adjList[nodeId].citations || 0;
      graph.setNodeAttribute(nodeId, 'size', 10 + inDegree * 5);
      graph.setNodeAttribute(nodeId, 'x', randomX);
      graph.setNodeAttribute(nodeId, 'y', yPosition);
    });
  });

forceAtlas2.assign(graph, {
  iterations: 10,
  settings: {
    scalingRatio: 2,
    linLogMode: true,   
  }
});


  return graph;
}

export function fromExperimentsSample(experimentMap: { [key: string]: Experiment }): Graph {
  const graph = new Graph({ type: 'directed' });

  for (const experiment in experimentMap) {
    graph.addNode(experiment, {
      label: experimentMap[experiment].name,
    });
  }

  return graph;
}
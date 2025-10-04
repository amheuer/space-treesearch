import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { topologicalGenerations } from 'graphology-dag';


export type AdjacencyList = {
  [key: string]: string[];
};

export function fromAdjacencyList(adjList: AdjacencyList): Graph {
  const graph = new Graph({ type: 'directed' });

  for (const node in adjList) {
    if (!graph.hasNode(node)) graph.addNode(node);
  }

  for (const source in adjList) {
    for (const target of adjList[source]) {
      if (!graph.hasNode(target)) graph.addNode(target);
      graph.addEdge(source, target);
    }
  }

  const generations = topologicalGenerations(graph);
  const totalGenerations = generations.length;
  const spacing = 10;
  const jitterAmount = 10;

  generations.forEach((generation, index) => {
    const yPosition = (totalGenerations - 1 - index) * 150;
    const totalNodes = generation.length;
    const startX = (totalNodes - 1) * -spacing / 2;

    generation.forEach((nodeId, nodeIndex) => {
      const baseX = startX + nodeIndex * spacing;
      const randomX = baseX + (Math.random() - 0.5) * jitterAmount;
      const randomY = yPosition + (Math.random() - 0.5) * jitterAmount * 0.5;

      graph.setNodeAttribute(nodeId, 'x', randomX);
      graph.setNodeAttribute(nodeId, 'y', randomY);
    });
  });

forceAtlas2.assign(graph, {
  iterations: 10,
  settings: {
    scalingRatio: 2,
  }
});


  return graph;
}

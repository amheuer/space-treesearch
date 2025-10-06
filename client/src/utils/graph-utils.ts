/* eslint-disable @typescript-eslint/no-unused-vars */
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { topologicalGenerations } from 'graphology-dag';
import type { Paper } from '../models/Paper';
import type { Experiment } from '../models/Experiment';
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';

let savedPapers: string[] = [];

export function setSavedPapers(papers: string[]) {
  savedPapers = papers;
  window.dispatchEvent(new CustomEvent('saved-papers-updated'));
}

export function getSavedPapers() {
  return savedPapers;
}



export type AdjacencyList = {
  [key: string]: Paper;
};

export function fromAdjacencyList(adjList: AdjacencyList): Graph {
  const graph = new Graph({ type: 'directed' });

  for (const node in adjList) {
    if (!graph.hasNode(node)) {
      graph.addNode(node, {
        label: format(adjList[node].label) || adjList[node].title,
      });
    }
  }
  
  for (const source in adjList) {
    for (const target of adjList[source].references) {
      if (adjList[target]) { 
        if (!graph.hasNode(target)) {
          graph.addNode(target, { ...adjList[target], label: format(adjList[target].label) || adjList[target].title});
        }
        if (!wouldCreateCycle(graph, source, target)) {
          graph.addEdge(source, target, { type: 'arrow', size: 2 });
          adjList[target].citations = (adjList[target].citations || 0) + 1;
        }
      }
    }
  }

  const generations = topologicalGenerations(graph);
  const totalGenerations = generations.length;
  const spacing = 10;
  const jitterAmount = 4000;

  generations.forEach((generation, index) => {
    const yPosition = (totalGenerations - 1 - index) * 150;
    const totalNodes = generation.length;
    const startX = (totalNodes - 1) * -spacing / 2;

    generation.forEach((nodeId, nodeIndex) => {
      const baseX = startX + nodeIndex * spacing;
      const randomX = baseX + (Math.random() - 0.5) * jitterAmount;
      if (adjList[nodeId]) {
        const inDegree = adjList[nodeId].citations || 0;
        graph.setNodeAttribute(nodeId, 'size', 5 + inDegree * .25);
        graph.setNodeAttribute(nodeId, 'x', randomX);
        graph.setNodeAttribute(nodeId, 'y', yPosition);
      }
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


function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));

  if (normA === 0 || normB === 0) return -1; // Avoid division by zero

  return dotProduct / (normA * normB);
}

export async function embedInput(input: string): Promise<number[]>{
  const ai = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_API_KEY!);
  const prompt = `Please provide a summary in around 500 characters and have 3 bullet points of the biggest takeways for a paper that could be written based on the following description ${input}}`;
  const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  const textResponse = await model.generateContent(prompt);
  
  const summary = textResponse.response.text();

  const embed_model = ai.getGenerativeModel({ model: 'gemini-embedding-001' });
  const request = {
    content: {
        parts: [{ text: summary }],
        role: 'user'
    },
    taskType: TaskType.SEMANTIC_SIMILARITY,
    };
    const response = await embed_model.embedContent(request);
    const embDoc = response.embedding;
    if (!embDoc || !embDoc.values) throw new Error('No embedding returned from model');
      return Array.isArray(embDoc.values) ? embDoc.values : Array.from(embDoc.values);

}

export function findClosestEmbedding(
  papers: AdjacencyList,
  inputEmbedding: number[]
): string | null {
  let closestId: string | null = null;
  let highestSimilarity = -Infinity;

  for (const [id, doc] of Object.entries(papers)) {
    if (doc.vector) {
      const similarity = cosineSimilarity(inputEmbedding, doc.vector);
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        closestId = id;
      }
    }
  }

  return closestId;
}

function wouldCreateCycle(graph: Graph, source: string, target: string): boolean {
  if (!graph.hasNode(source) || !graph.hasNode(target)) return false;

  // Traverse from target: if we can reach source, then a cycle would be created
  const visited = new Set<string>();
  const stack = [target];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    if (current === source) return true; // Cycle would be created

    if (!visited.has(current)) {
      visited.add(current);
      graph.outboundNeighbors(current).forEach(neighbor => {
        if (!visited.has(neighbor)) {
          stack.push(neighbor);
        }
      });
    }
  }

  return false;
}

  const format = (label: string | undefined) => {
    if (!label) return '';
    return label.replace(/\*/g, '');
  };

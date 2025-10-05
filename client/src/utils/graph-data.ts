import adjacencyList from '../data/adjacency-list.json';
import type { AdjacencyList } from '../utils/graph-utils';
import type { Experiment } from '../models/Experiment';
import experimentsSample from '../data/experiments-sample.json';

type ExperimentMap = { [key: string]: Experiment };

export const getAdjacencyList = (): AdjacencyList => adjacencyList;

export const getExperimentsSample = (): ExperimentMap => experimentsSample;

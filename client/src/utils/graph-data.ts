import mergedData from '../data/unified_data.json' assert { type: 'json' };
import type { AdjacencyList } from '../utils/graph-utils';
import type { Experiment } from '../models/Experiment';
import experimentsSample from '../data/experiments-sample.json';

type ExperimentMap = { [key: string]: Experiment };

export const getAdjacencyList = (): AdjacencyList => mergedData as AdjacencyList;

export const getExperimentsSample = (): ExperimentMap => experimentsSample;

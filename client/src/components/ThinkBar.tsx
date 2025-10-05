/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import type {KeyboardEvent} from 'react';
import { getAdjacencyList } from '../utils/graph-data';
import { embedInput, findClosestEmbedding } from '../utils/graph-utils'; 

const ThinkBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [papers, setPapers] = useState<any>({});

  useEffect(() => {
    const adj = getAdjacencyList();
    setPapers(adj);
  }, []);

  const handleLookup = async () => {
    if (query.trim().length < 3) return;

    try {
      const embedding = await embedInput(query);
      const closestId = findClosestEmbedding(papers, embedding);

      if (closestId && typeof window.setClickedNode === 'function') {
        window.setClickedNode(closestId);
        setQuery(''); 
      }
    } catch (err) {
      console.error('Error during embedding search:', err);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLookup();
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <input
        type="text"
        placeholder="Search by concept or idea..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        className="frosted-glass"
        style={{ width: '100%', padding: '8px', fontSize: '16px' }}
      />
    </div>
  );
};

export default ThinkBar

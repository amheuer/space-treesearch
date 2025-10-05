/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { getAdjacencyList } from '../utils/graph-data';
import CollapsiblePanel from './CollapsiblePanel';
import '/src/assets/scroll-box.css';

const PaperInfoBox: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [paper, setPaper] = useState<any>(null);
  const [persistedNode, setPersistedNode] = useState<string | null>(null);

  useEffect(() => {
    let lastNode: string | null = null;

    const checkSelectedNode = () => {
      const hoveredNode = (window as any).selectedNode || null;
      const clickedNode = window.getClickedNode ? window.getClickedNode() : null;

      // Prioritize clicked node over hovered node
      const activeNode = clickedNode || hoveredNode;

      // Only update if there is a new active node
      if (activeNode && activeNode !== lastNode) {
        setSelectedNode(activeNode);
        setPersistedNode(activeNode); // Persist for display even if hover ends

        const adj = getAdjacencyList();
        setPaper(adj[activeNode] || null);

        lastNode = activeNode;
      }
    };

    const interval = setInterval(checkSelectedNode, 100);
    checkSelectedNode();
    return () => clearInterval(interval);
  }, []);

const formatSummary = (summary: string) => {
  if (!summary) return '';
  let formatted = summary.replace(/ \*\*/g, '');
  formatted = formatted.replace(/\*\* /g, '\n');
  formatted = formatted.replace(/(^|\n)\*/g, '$1•');
  return formatted;
};

  if (!paper || !persistedNode) return null;

  const paperUrl = `https://www.ncbi.nlm.nih.gov/pmc/articles/${persistedNode}`;
  return (
    <CollapsiblePanel
      header={
        <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
          {paper.title}
          {' '}
          <a href={paperUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#84f1ff', fontSize: '0.95rem', marginLeft: 8, textDecoration: 'underline' }}>
            View Paper
          </a>
        </div>
      }
      className="frosted-glass"
      style={{
        minHeight: '12px',
        padding: '12px',
        maxWidth: '600px',
        width: '100%',
        marginBottom: '16px',
      }}
      defaultCollapsed={false}
    >
      <div className="scroll-box">
        <div style={{ fontSize: '0.95rem', marginBottom: 2 }}><strong>Author:</strong> {paper.author}</div>
        <div style={{ fontSize: '0.95rem', marginBottom: 2 }}><strong>Journal:</strong> {paper.journal}</div>
        <div style={{ fontSize: '0.95rem', marginBottom: 2 }}><strong>Year:</strong> {paper.year}</div>
        <div style={{ fontSize: '0.95rem', marginBottom: 2 }}><strong>Summary:</strong> {formatSummary(paper.summary)}</div>
        <div style={{ fontSize: '0.95rem' }}><strong>References:</strong> {paper.references && paper.references.length > 0 ? paper.references.join(', ') : 'None'}</div>
        <div style={{ fontSize: '0.95rem', marginBottom: 2 }}><strong>Cited By:</strong> {paper.citations}</div>             
      </div>
    </CollapsiblePanel>
  );
};

export default PaperInfoBox;

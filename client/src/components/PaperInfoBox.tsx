import React, { useEffect, useState } from 'react';
import { getAdjacencyList } from '../utils/graph-data';

const PaperInfoBox: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [paper, setPaper] = useState<any>(null);

  useEffect(() => {
    // Listen for changes to selected node using polling (since window.setSelectedNode is not an event)
    let lastNode: string | null = null;
    const checkSelectedNode = () => {
      const nodeId = (window as any).selectedNode || null;
      if (nodeId !== lastNode) {
        setSelectedNode(nodeId);
        if (nodeId) {
          const adj = getAdjacencyList();
          setPaper(adj[nodeId] || null);
        } else {
          setPaper(null);
        }
        lastNode = nodeId;
      }
    };
    const interval = setInterval(checkSelectedNode, 100);
    checkSelectedNode();
    return () => clearInterval(interval);
  }, []);

  if (!paper || !selectedNode) return null;

  const paperUrl = `https://www.ncbi.nlm.nih.gov/pmc/articals/${selectedNode}`;
  return (
    <div style={{
      width: '100%',
      padding: '12px',
      background: 'rgba(69,69,69,0.65)',
      borderRadius: '6px',
      border: '1px solid #fff',
      color: '#fff',
      boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)'
    }}>
      <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 4 }}>
        {paper.title}
        {' '}
        <a href={paperUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#84f1ff', fontSize: '0.95rem', marginLeft: 8, textDecoration: 'underline' }}>
          View Paper
        </a>
      </div>
      <div style={{ fontSize: '0.95rem', marginBottom: 4 }}><strong>Author:</strong> {paper.author}</div>
      <div style={{ fontSize: '0.95rem', marginBottom: 4 }}><strong>Journal:</strong> {paper.journal}</div>
      <div style={{ fontSize: '0.95rem', marginBottom: 4 }}><strong>Summary:</strong> {paper.summary}</div>
      <div style={{ fontSize: '0.95rem' }}><strong>References:</strong> {paper.references && paper.references.length > 0 ? paper.references.join(', ') : 'None'}</div>
    </div>
  );
};

export default PaperInfoBox;

import React, { useState, useEffect } from 'react';
import { getAdjacencyList } from '../utils/graph-data';

interface NodeOption {
  id: string;
  title: string;
}

const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<NodeOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const adj = getAdjacencyList();
    const opts: NodeOption[] = Object.entries(adj).map(([id, paper]) => ({
      id,
      title: paper.title,
    }));
    setOptions(opts);
  }, []);

  const filtered = options.filter(
    opt =>
      opt.id.includes(query) ||
      opt.title.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (nodeId: string) => {
    setQuery('');
    setShowDropdown(false);
    if (typeof window.setSelectedNode === 'function') {
      window.setSelectedNode(nodeId);
    }
  };

  return (
  <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, width: 350 }}>
      <input
        type="text"
        placeholder="Search node by title or ID..."
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setShowDropdown(true);
        }}
        className="frosted-glass"
        style={{ width: '100%', padding: '8px', fontSize: '16px' }}
      />
      {showDropdown && query && (
        <div className="frosted-glass" style={{ maxHeight: 200, overflowY: 'auto', marginTop: 2 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '8px', color: '#888' }}>No results</div>
          ) : (
            filtered.slice(0, 10).map(opt => (
              <div
                key={opt.id}
                style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                onClick={() => handleSelect(opt.id)}
              >
                <strong>{opt.title}</strong> <span style={{ color: '#aaa' }}>({opt.id})</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;

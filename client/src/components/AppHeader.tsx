import React from 'react';
import CollapsiblePanel from './CollapsiblePanel';

const AppHeader: React.FC = () => (
  <CollapsiblePanel
    header={
      <h2 style={{ margin: '0 0 8px 0', fontWeight: 700, fontSize: '1.5rem' }}>Space Treesearch</h2>
    }
    className="frosted-glass"
    style={{
      width: '100%',
      padding: '16px',
      textAlign: 'left',
      fontFamily: 'inherit',
      color: '#fff',
      marginBottom: '16px',
    }}
    defaultCollapsed={false}
  >
    <div style={{ fontSize: '1rem', lineHeight: 1.5 }}>
      <p>A graph knowledge engine to explore the connections between space biology papers.</p>
    </div>
    {/* PaperInfoBox removed, now rendered separately in App.tsx */}
  </CollapsiblePanel>
);

export default AppHeader;

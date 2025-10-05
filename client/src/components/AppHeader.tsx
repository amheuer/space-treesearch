import React from 'react';

const AppHeader: React.FC = () => (
  <div style={{
    width: '100%',
    padding: '16px',
    textAlign: 'left',
    fontFamily: 'inherit',
    color: '#fff',
    background: 'rgba(69,69,69,0.65)',
    borderRadius: '8px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid #fff'
  }}>
      <h2 style={{ margin: '0 0 8px 0', fontWeight: 700, fontSize: '1.5rem' }}>Space Treesearch</h2>
    <div style={{ fontSize: '1rem', lineHeight: 1.5 }}>
      <p>A graph knowledge engine to explore the connections between space biology papers.</p>
    </div>
  {/* PaperInfoBox removed, now rendered separately in App.tsx */}
  </div>
);

export default AppHeader;

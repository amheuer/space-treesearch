import React from 'react';
import SearchBar from './SearchBar';
import Tools from './Tools';
import ThinkBar from './ThinkBar';

const RightBar: React.FC = () => (
  <div style={{
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 12,
    width: 350,
    marginRight: 40,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'stretch',
  }}>
    <div style={{ width: '100%' }}>
      <SearchBar />
    </div>
    <div style={{ width: '100%' }}>
      <ThinkBar />
    </div>
    <div style={{ width: '100%', marginTop: '8px' }}>
      <Tools />
    </div>
  </div>
);

export default RightBar;

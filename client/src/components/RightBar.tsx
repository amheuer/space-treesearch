import React from 'react';
import SearchBar from './SearchBar';

const RightBar: React.FC = () => (
  <div style={{
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 12,
    width: 370,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    alignItems: 'stretch',
  }}>
    <SearchBar />
  </div>
);

export default RightBar;

import React from 'react';
import AppHeader from './AppHeader';
import PaperInfoBox from './PaperInfoBox';

const LeftBar: React.FC = () => (
  <div className="hide-on-mobile" style={{
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 12,
    width: 370,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    alignItems: 'stretch',
  }}>
    <AppHeader />
    <PaperInfoBox />
  </div>
);

export default LeftBar;

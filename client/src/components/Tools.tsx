import React, { useState } from 'react';
import CollapsiblePanel from './CollapsiblePanel';

type ToolState = 'none' | 'suggest' | 'compare' | 'experiment';

const Tools: React.FC = () => {
  const [selectedState, setSelectedState] = useState<ToolState>('none');

  const renderContent = () => {
    switch (selectedState) {
      case 'none':
        return (
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#fff' }}>No Tool Selected</h4>
            <p style={{ margin: '0', color: '#ccc', fontSize: '14px' }}>
              Select a tool from the options above to get started.
            </p>
          </div>
        );
      case 'suggest':
        return (
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#fff' }}>Suggest Tools</h4>
            <p style={{ margin: '0', color: '#ccc', fontSize: '14px' }}>
              This is a template for suggest tools. Features will be implemented here.
            </p>
          </div>
        );
      case 'compare':
        return (
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#fff' }}>Compare Options</h4>
            <p style={{ margin: '0', color: '#ccc', fontSize: '14px' }}>
              This is a template for compare options. Filtering capabilities will be added here.
            </p>
          </div>
        );
      case 'experiment':
        return (
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#fff' }}>Experiment Tools</h4>
            <p style={{ margin: '0', color: '#ccc', fontSize: '14px' }}>
              This is a template for experiment functionality. Export options will be implemented here.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <CollapsiblePanel
      header={<span style={{ color: '#fff', fontWeight: '500' }}>Tools</span>}
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
      {/* Button Row */}
      <div style={{ 
        display: 'flex', 
        gap: '8px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.0)',
        marginBottom: '8px',
      }}>
        {(['suggest', 'compare', 'experiment'] as ToolState[]).map((state) => (
          <button
            key={state}
            onClick={() => setSelectedState(selectedState === state ? 'none' : state)}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: selectedState === state
                ? '2px solid rgba(255, 255, 255, 0.8)' 
                : '1px solid rgba(255, 255, 255, 0.2)',
              background: 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '400',
              textTransform: 'capitalize',
              transition: 'all 0.2s ease',
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {state}
          </button>
        ))}
      </div>
      
      {renderContent()}
    </CollapsiblePanel>
  );
};

export default Tools;

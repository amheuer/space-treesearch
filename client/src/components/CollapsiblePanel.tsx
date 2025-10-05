import React, { useState } from 'react';

interface CollapsiblePanelProps {
  header: React.ReactNode;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  className?: string;
  style?: React.CSSProperties;
  collapseIcon?: React.ReactNode;
  expandIcon?: React.ReactNode;
}

const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  header,
  children,
  defaultCollapsed = false,
  className = '',
  style = {},
  collapseIcon = '\u25b2',
  expandIcon = '\u25bc',
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className={className} style={style}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>{header}</div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand' : 'Collapse'}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: '1.2rem',
            cursor: 'pointer',
            minWidth: '24px',
            outline: 'none',
            marginLeft: 8,
          }}
        >
          {collapsed ? expandIcon : collapseIcon}
        </button>
      </div>
      {!collapsed && <div>{children}</div>}
    </div>
  );
};

export default CollapsiblePanel;

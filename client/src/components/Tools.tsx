import React, { useState, useEffect } from 'react';
import { idiate, compare } from '../utils/tool-utils';
import { getAdjacencyList } from '../utils/graph-data';
import CollapsiblePanel from './CollapsiblePanel';

type ToolState = 'none' | 'suggest' | 'compare' | 'experiment';

const Tools: React.FC = () => {
  const [selectedState, setSelectedState] = useState<ToolState>('none');
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastProcessedNode, setLastProcessedNode] = useState<string | null>(null);
  
  // Compare tool state
  const [firstCompareNode, setFirstCompareNode] = useState<string | null>(null);
  const [compareResults, setCompareResults] = useState<string | null>(null);

  // Monitor for node clicks and handle suggest/compare modes
  useEffect(() => {
    const checkForNodeClick = () => {
      const clickedNode = window.getClickedNode();
      
      if (clickedNode && clickedNode !== lastProcessedNode) {
        setLastProcessedNode(clickedNode);
        
        // Get the paper data for the clicked node
        const adjacencyList = getAdjacencyList();
        const paper = adjacencyList[clickedNode];
        
        if (paper) {
          if (selectedState === 'suggest') {
            // Handle suggest mode
            setIsLoading(true);
            setSuggestions(null);
            
            // Update global selectedNode so PaperInfoBox shows the current paper
            (window as any).selectedNode = clickedNode;
            
            idiate(paper)
              .then((result) => {
                setSuggestions(result || 'No suggestions available.');
                setIsLoading(false);
              })
              .catch((error) => {
                console.error('Error getting suggestions:', error);
                setSuggestions('Error generating suggestions. Please try again.');
                setIsLoading(false);
              });
          } else if (selectedState === 'compare') {
            // Handle compare mode
            if (!firstCompareNode || compareResults) {
              // First node selected OR starting new comparison after results
              setFirstCompareNode(clickedNode);
              setCompareResults(null);
              
              // Only update global selectedNode when starting new comparison after results
              if (compareResults) {
                (window as any).selectedNode = clickedNode;
              }
            } else if (clickedNode !== firstCompareNode) {
              // Second node selected - perform comparison
              setIsLoading(true);
              setCompareResults(null);
              
              // Update global selectedNode so PaperInfoBox shows the second paper
              (window as any).selectedNode = clickedNode;
              
              const firstPaper = adjacencyList[firstCompareNode];
              if (firstPaper) {
                compare(firstPaper, paper)
                  .then((result) => {
                    setCompareResults(result || 'No comparison available.');
                    setIsLoading(false);
                  })
                  .catch((error) => {
                    console.error('Error comparing papers:', error);
                    setCompareResults('Error generating comparison. Please try again.');
                    setIsLoading(false);
                  });
              }
            } else {
              // Same node clicked - reset to start new comparison
              setFirstCompareNode(clickedNode);
              setCompareResults(null);
            }
          }
        }
      }
    };

    // Check for node clicks periodically
    const interval = setInterval(checkForNodeClick, 100);
    
    return () => clearInterval(interval);
  }, [selectedState, lastProcessedNode, firstCompareNode]);

  // Handle tool switching with existing node selection
  useEffect(() => {
    const clickedNode = window.getClickedNode();
    
    if (selectedState === 'suggest' && clickedNode) {
      // Switch to suggest mode with node already selected - generate suggestions immediately
      const adjacencyList = getAdjacencyList();
      const paper = adjacencyList[clickedNode];
      
      if (paper) {
        setIsLoading(true);
        setSuggestions(null);
        
        idiate(paper)
          .then((result) => {
            setSuggestions(result || 'No suggestions available.');
            setIsLoading(false);
          })
          .catch((error) => {
            console.error('Error getting suggestions:', error);
            setSuggestions('Error generating suggestions. Please try again.');
            setIsLoading(false);
          });
      }
    } else if (selectedState === 'compare') {
      // Switch to compare mode with node already selected
      if (clickedNode && !firstCompareNode) {
        setFirstCompareNode(clickedNode);
        setCompareResults(null);
      }
    }
  }, [selectedState, firstCompareNode]);

  // Reset compare state when switching tools
  useEffect(() => {
    if (selectedState !== 'compare') {
      setFirstCompareNode(null);
      setCompareResults(null);
    }
    if (selectedState !== 'suggest') {
      setSuggestions(null);
    }
  }, [selectedState]);

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
            {isLoading ? (
              <p style={{ margin: '0', color: '#ccc', fontSize: '14px' }}>
                Generating suggestions...
              </p>
            ) : suggestions ? (
              <div style={{ margin: '0', color: '#ccc', fontSize: '14px' }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>Follow-up Research Approaches:</p>
                <div style={{ whiteSpace: 'pre-line', lineHeight: '1.4' }}>
                  {suggestions}
                </div>
              </div>
            ) : (
              <p style={{ margin: '0', color: '#ccc', fontSize: '14px' }}>
                Click on a node to get AI-generated suggestions for follow-up research approaches.
              </p>
            )}
          </div>
        );
      case 'compare':
        return (
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#fff' }}>Compare Papers</h4>
            {isLoading ? (
              <p style={{ margin: '0', color: '#ccc', fontSize: '14px' }}>
                Generating comparison...
              </p>
            ) : compareResults ? (
              <div style={{ margin: '0', color: '#ccc', fontSize: '14px' }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>Paper Comparison:</p>
                <div style={{ whiteSpace: 'pre-line', lineHeight: '1.4' }}>
                  {compareResults}
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#999' }}>
                  Click another node to start a new comparison.
                </p>
              </div>
            ) : firstCompareNode ? (
              <p style={{ margin: '0', color: '#ccc', fontSize: '14px' }}>
                First paper selected. Click on another node to compare.
              </p>
            ) : (
              <p style={{ margin: '0', color: '#ccc', fontSize: '14px' }}>
                Click on a node to select the first paper for comparison.
              </p>
            )}
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

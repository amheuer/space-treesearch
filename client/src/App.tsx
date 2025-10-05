import GraphComponent from './components/Graph';
import RightBar from './components/RightBar';
import LeftBar from './components/LeftBar';
import './App.css'
import './assets/frosted-glass.css'

function App() {
  return (
    <>
      <LeftBar />
      <RightBar />
      <GraphComponent />
    </>
  );
}

export default App

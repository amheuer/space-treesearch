import { useState } from 'react'
import GraphComponent from './components/Graph';
import SearchBar from './components/SearchBar';
import LeftBar from './components/LeftBar';
import './App.css'
import './assets/frosted-glass.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <LeftBar />
      <SearchBar />
      <GraphComponent />
    </>
  );
}

export default App

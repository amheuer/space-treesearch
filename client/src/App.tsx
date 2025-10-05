import { useState } from 'react'
import reactLogo from './assets/react.svg'
import GraphComponent from './components/Graph';
import viteLogo from '/vite.svg'
import './App.css'
import './assets/frosted-glass.css'

function App() {
  const [count, setCount] = useState(0)

  return (
        <GraphComponent />
  )
}

export default App

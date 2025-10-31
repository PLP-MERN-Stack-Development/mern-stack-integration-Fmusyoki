import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './App.css'
import Home from "./pages/Home"
import Blogs from "./pages/Blogs"
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';



function App() {
  return (
    <>
    <SignedOut>
      <SignInButton />
    </SignedOut>
    <SignedIn>
      <UserButton />
    </SignedIn>
    <Router>
      <Routes>
        <Route path="/" element={<Home />} /> 
        <Route path="/blogs" element={<Blogs/>} />
      </Routes>
    </Router>
    </>
  )
}

export default App

import React from "react";
import Navbar from "./navbar";
import Footer from "./footer";

const Base = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans">
      <Navbar />
      <main className="flex-1 p-8 font-sans">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Base;
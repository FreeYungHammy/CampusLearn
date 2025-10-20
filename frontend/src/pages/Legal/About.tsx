import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import "./legal.css";

const About: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <Header />
      <main className="site-main">
        <div className="container legal-container">
          <div className="legal-page">
            <div className="legal-topbar">
              <button className="btn btn-outline" onClick={() => navigate(-1)}>
                ← Back
              </button>
            </div>
            <div className="legal-card">
              <h1>About CampusLearn</h1>
              <p>
                CampusLearn is a peer-powered learning platform designed to connect
                students and tutors, provide study resources, and foster collaborative
                learning communities.
              </p>
              <h2>Our Mission</h2>
              <p>
                Empower students with accessible, high-quality learning experiences that
                scale with modern technology and AI assistance.
              </p>
              <h2>What We Offer</h2>
              <ul>
                <li>Find and book sessions with vetted tutors.</li>
                <li>Join discussions and Q&A forums.</li>
                <li>Share and explore learning content.</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default About;



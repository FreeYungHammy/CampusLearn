import React from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import Footer from "../../components/Footer";
import "./legal.css";

const About: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <main className="site-main">
        <div className="container legal-container">
          <PageHeader
            title="About CampusLearn"
            subtitle="Learn more about our mission and what we offer"
            icon="fas fa-info-circle"
          />
          <div className="legal-page">
            <div className="legal-topbar">
              <button className="btn btn-outline" onClick={() => navigate(-1)}>
                ← Back
              </button>
            </div>
            <div className="legal-card">
              <p>
                CampusLearn is a peer-powered learning platform designed to connect students and tutors, provide study resources, and foster collaborative learning communities.
              </p>
              
              <h2>Our Mission</h2>
              <p>
                To provide accessible, high-quality learning experiences through personalized tutoring and collaborative learning.
              </p>

              <h2>What We Offer</h2>
              <ul>
                <li>Find and book sessions with vetted tutors</li>
                <li>Join discussions and Q&A forums</li>
                <li>Share and explore learning content</li>
                <li>Track your academic progress</li>
                <li>Connect with peers and study groups</li>
                <li>Access educational resources and materials</li>
              </ul>

              <h2>Our Values</h2>
              <ul>
                <li>Accessibility - Making education available to everyone</li>
                <li>Innovation - Using technology to improve learning</li>
                <li>Community - Building supportive learning environments</li>
                <li>Excellence - Maintaining high standards in education</li>
                <li>Privacy - Protecting user data and ensuring security</li>
              </ul>

              <h2>Our Impact</h2>
              <p>
                CampusLearn has helped students improve their academic performance and connected them with expert tutors in a supportive learning community.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default About;



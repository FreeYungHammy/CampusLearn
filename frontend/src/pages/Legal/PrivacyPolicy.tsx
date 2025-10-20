import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import "./legal.css";

const PrivacyPolicy: React.FC = () => {
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
              <h1>Privacy Policy</h1>
              <p>
                This Privacy Policy explains how CampusLearn collects, uses, and
                protects your information. This is example content and can be replaced
                with your actual policy.
              </p>
              <h2>Information We Collect</h2>
              <ul>
                <li>Account details you provide (name, email).</li>
                <li>Usage data such as pages visited and features used.</li>
                <li>Device and browser metadata for performance and security.</li>
              </ul>
              <h2>How We Use Information</h2>
              <ul>
                <li>To provide core platform functionality.</li>
                <li>To improve reliability, performance, and user experience.</li>
                <li>To communicate updates related to your account.</li>
              </ul>
              <h2>Your Choices</h2>
              <p>
                You may request access or deletion of your personal information by
                contacting us. We will process requests in accordance with applicable
                regulations.
              </p>
              <p>Last updated: October 2025</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;



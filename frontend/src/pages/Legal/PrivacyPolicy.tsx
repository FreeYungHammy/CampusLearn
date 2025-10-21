import React from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import Footer from "../../components/Footer";
import "./legal.css";

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <main className="site-main">
        <div className="container legal-container">
          <PageHeader
            title="Privacy Policy"
            subtitle="How we collect, use, and protect your information"
            icon="fas fa-shield-alt"
          />
          <div className="legal-page">
            <div className="legal-topbar">
              <button className="btn btn-outline" onClick={() => navigate(-1)}>
                ← Back
              </button>
            </div>
            <div className="legal-card">
              <p>
                This Privacy Policy explains how CampusLearn collects, uses, and protects your information when you use our platform.
              </p>
              
              <h2>Information We Collect</h2>
              <ul>
                <li>Account details you provide (name, email, student ID)</li>
                <li>Usage data such as pages visited and features used</li>
                <li>Communication data including messages and forum posts</li>
                <li>Device and browser information for technical support</li>
                <li>Educational content you upload or create</li>
              </ul>

              <h2>How We Use Information</h2>
              <ul>
                <li>To provide and improve our services</li>
                <li>To match you with tutors and learning resources</li>
                <li>To track your progress and provide recommendations</li>
                <li>To facilitate communication between users</li>
                <li>To ensure platform security and prevent misuse</li>
                <li>To send important updates about your account</li>
              </ul>

              <h2>Data Security</h2>
              <p>
                We use standard security measures to protect your data, including encryption and secure servers.
              </p>

              <h2>Your Rights</h2>
              <ul>
                <li>Access your personal data</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your account</li>
                <li>Opt out of non-essential communications</li>
              </ul>

              <h2>Data Sharing</h2>
              <p>
                We do not sell your personal information. We may share data only with your consent or for legal compliance.
              </p>

              <p><strong>Last updated:</strong> December 2024</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;



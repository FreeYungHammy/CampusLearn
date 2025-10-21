import React from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import Footer from "../../components/Footer";
import "./legal.css";

const TermsOfService: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <main className="site-main">
        <div className="container legal-container">
          <PageHeader
            title="Terms of Service"
            subtitle="The terms and conditions for using CampusLearn"
            icon="fas fa-file-contract"
          />
          <div className="legal-page">
            <div className="legal-topbar">
              <button className="btn btn-outline" onClick={() => navigate(-1)}>
                ← Back
              </button>
            </div>
            <div className="legal-card">
              <p>
                These Terms of Service govern your use of CampusLearn. By using our platform, you agree to these terms.
              </p>
              
              <h2>Account Requirements</h2>
              <ul>
                <li>You must provide accurate information when creating your account</li>
                <li>You are responsible for keeping your account secure</li>
                <li>You must be at least 13 years old to use our services</li>
                <li>You are responsible for all activities under your account</li>
              </ul>

              <h2>Acceptable Use</h2>
              <p>You agree to use CampusLearn for educational purposes only. You will not:</p>
              <ul>
                <li>Violate any laws or regulations</li>
                <li>Infringe on others' intellectual property rights</li>
                <li>Harass or harm other users</li>
                <li>Share inappropriate or harmful content</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with the platform's functionality</li>
              </ul>

              <h2>Content and Ownership</h2>
              <p>
                You retain ownership of content you create. By uploading content, you grant us a license to host and display it for educational purposes.
              </p>

              <h2>Service Availability</h2>
              <p>
                We strive to maintain service availability but cannot guarantee uninterrupted access. We may modify or suspend services with notice.
              </p>

              <h2>Limitation of Liability</h2>
              <p>
                CampusLearn is provided "as is" without warranties. We are not liable for indirect or consequential damages.
              </p>

              <h2>Termination</h2>
              <p>
                We may suspend or terminate your account if you violate these Terms. You may terminate your account at any time.
              </p>

              <p><strong>Effective date:</strong> December 2024</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;



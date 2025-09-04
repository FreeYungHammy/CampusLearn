import React from "react";

const MyContent = () => {
  return (
    <div className="content-view" id="mycontent-view">
      <h2 className="section-title">
        <i className="fas fa-folder"></i>
        <span id="content-title">My Content</span>
      </h2>
      <div className="content-browser">
        <div className="breadcrumb">
          <a href="#">My Content</a>
        </div>
        <div id="content-display">
          {/* Content will be loaded here dynamically */}
        </div>
      </div>
    </div>
  );
};

export default MyContent;

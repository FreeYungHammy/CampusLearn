import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  icon: string;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  subtitle, 
  icon, 
  className = "" 
}) => {
  return (
    <div className={`page-header-card ${className}`}>
      <h1 className="page-header-title">
        <i className={icon}></i> {title}
      </h1>
      <p className="page-header-subtitle">{subtitle}</p>
    </div>
  );
};

export default PageHeader;

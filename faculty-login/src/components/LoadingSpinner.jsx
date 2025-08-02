import React from 'react';

const LoadingSpinner = ({ message = "Loading...", size = "large", variant = "fullscreen" }) => {
  const spinnerSizes = {
    small: "w-6 h-6",
    medium: "w-8 h-8", 
    large: "w-12 h-12"
  };

  const textSizes = {
    small: "text-sm",
    medium: "text-base",
    large: "text-lg"
  };

  if (variant === "fullscreen") {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className={`spinner ${spinnerSizes[size]}`}></div>
          <p className={`loading-text ${textSizes[size]}`}>{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="loading-inline">
      <div className="loading-spinner">
        <div className={`spinner ${spinnerSizes[size]}`}></div>
        <p className={`loading-text ${textSizes[size]}`}>{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner; 
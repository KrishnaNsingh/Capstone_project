import { useEffect, useState } from "react";

export default function DebugInfo() {
  const [debugInfo, setDebugInfo] = useState({
    backendUrl: "",
    userAgent: "",
    timestamp: "",
  });

  useEffect(() => {
    setDebugInfo({
      backendUrl: import.meta.env.VITE_BACKEND_URL || "Not set",
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  }, []);

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 className="font-bold text-blue-800">Debug Information</h3>
      <div className="mt-2 space-y-1">
        <div className="text-sm">
          <span className="font-mono font-bold">Backend URL:</span>{" "}
          <span className="font-mono">{debugInfo.backendUrl}</span>
        </div>
        <div className="text-sm">
          <span className="font-mono font-bold">Timestamp:</span>{" "}
          <span className="font-mono">{debugInfo.timestamp}</span>
        </div>
      </div>
    </div>
  );
}
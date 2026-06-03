import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
});

export default function MermaidViewer({ chart }) {
  const containerRef = useRef(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (chart && containerRef.current) {
      setErrorMsg(null);

      // Aggressive cleanup of common LLM Mermaid syntax hallucinations
      let cleanChart = chart
        .replace(/```mermaid/gi, '') // Remove opening markdown
        .replace(/```/gi, '')        // Remove closing markdown
        .replace(/\|>/g, '|')        // FIX: Changes `-->|Text|>` to `-->|Text|`
        .replace(/->>/g, '-->')      // FIX: Changes bad arrow `->>` to `-->`
        .trim();

      const renderChart = async () => {
        try {
          // Generate a unique ID for this render to prevent React StrictMode conflicts
          const id = `mermaid-chart-${Math.random().toString(36).substr(2, 9)}`;
          
          // Clear previous render
          containerRef.current.innerHTML = '';
          
          // Render new SVG
          const { svg } = await mermaid.render(id, cleanChart);
          containerRef.current.innerHTML = svg;
          
        } catch (error) {
          console.error("Mermaid syntax error:", error);
          setErrorMsg(error.message || "Failed to render diagram.");
        }
      };

      renderChart();
    }
  }, [chart]);

  return (
    <div className="w-full">
      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-4 border border-red-200 overflow-auto">
          <strong>Syntax Error Fixed/Caught:</strong> <br />
          {errorMsg}
        </div>
      )}
      <div 
        className="w-full overflow-x-auto flex justify-center bg-white p-4 rounded-lg shadow-inner min-h-[200px]" 
        ref={containerRef}
      />
    </div>
  );
}
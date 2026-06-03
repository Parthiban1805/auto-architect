import React, { useEffect, useState } from 'react';
import { Button } from './ui/Button';

export function Sidebar({ onSelectProject, selectedProjectId, onNewProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjects = async () => {
    try {
      const response = await fetch('http://localhost:8000/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      setProjects(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    
    // Listen for custom event to refresh projects
    const handleRefresh = () => {
      fetchProjects();
    };
    window.addEventListener('refreshProjects', handleRefresh);
    return () => window.removeEventListener('refreshProjects', handleRefresh);
  }, []);

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col h-screen sticky top-0 shrink-0">
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center font-bold shadow-lg shadow-brand-500/20">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <h2 className="font-bold text-slate-100 tracking-wide text-lg">Architect</h2>
      </div>
      
      <div className="p-4 border-b border-slate-800">
        <Button onClick={onNewProject} className="w-full bg-slate-800 hover:bg-slate-700 text-white border-slate-700 shadow-none">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          New Blueprint
        </Button>
      </div>

      <div className="p-4 flex-grow overflow-y-auto">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Past Projects</h3>
        
        {loading ? (
          <div className="flex justify-center p-4">
             <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="text-red-400 text-xs p-3 bg-red-900/20 rounded-lg border border-red-900/50">{error}</div>
        ) : projects.length === 0 ? (
          <div className="text-slate-500 text-sm italic text-center py-4 bg-slate-800/50 rounded-lg">No past projects found.</div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className={`w-full text-left p-3 rounded-lg transition-all duration-200 group ${
                  selectedProjectId === project.id 
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 shadow-inner' 
                    : 'hover:bg-slate-800 border border-transparent'
                }`}
              >
                <div className="text-[10px] text-slate-500 mb-1.5 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {new Date(project.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className={`text-xs truncate ${selectedProjectId === project.id ? 'text-brand-100' : 'text-slate-300 group-hover:text-slate-100'}`}>
                  {project.transcript_snippet}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
